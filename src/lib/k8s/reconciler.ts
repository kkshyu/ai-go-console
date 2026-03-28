/**
 * Kubernetes State Reconciler
 *
 * Periodically syncs k8s resource state back to the database.
 * Detects:
 * - Pods that crashed but DB says "running" → update to "error"
 * - Deployments with 0 ready replicas but DB says "running" → update to "error"
 * - Pods that recovered → update to "running"
 */

import { prisma } from "@/lib/db";
import { coreApi, appsApi, config, isK8sNotFound } from "./client";
import { devPodName, prodDeploymentName } from "./manifests";
import { getPodStatus } from "./exec";

const RECONCILE_INTERVAL_MS = 60_000; // 1 minute

let reconcileTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background reconciliation loop.
 */
export function startReconciler(): void {
  if (reconcileTimer) return;

  reconcileTimer = setInterval(async () => {
    try {
      await reconcile();
    } catch (err) {
      console.error("[Reconciler] Error:", err);
    }
  }, RECONCILE_INTERVAL_MS);

  console.log("[Reconciler] Started (interval: 60s)");
}

/**
 * Stop the reconciliation loop.
 */
export function stopReconciler(): void {
  if (reconcileTimer) {
    clearInterval(reconcileTimer);
    reconcileTimer = null;
    console.log("[Reconciler] Stopped");
  }
}

/**
 * Run a single reconciliation pass.
 */
export async function reconcile(): Promise<void> {
  // Get all apps that should be running or developing
  const apps = await prisma.app.findMany({
    where: {
      status: { in: ["running", "developing"] },
    },
    include: {
      user: {
        select: { organizationId: true, organization: { select: { slug: true } } },
      },
    },
  });

  for (const app of apps) {
    const orgSlug = app.user.organization?.slug;
    if (!orgSlug) continue;

    try {
      if (app.status === "developing") {
        await reconcileDevApp(orgSlug, app);
      } else if (app.status === "running") {
        await reconcileProdApp(orgSlug, app);
      }
    } catch (err) {
      // Don't let one app's error affect others
      console.warn(`[Reconciler] Failed to reconcile ${app.slug}:`, err);
    }
  }
}

async function reconcileDevApp(
  orgSlug: string,
  app: { id: string; slug: string; status: string },
): Promise<void> {
  const podName = devPodName(orgSlug, app.slug);
  const status = await getPodStatus(config.devNamespace, podName);

  if (status === "not_found" || status === "error") {
    // Pod is gone or crashed — update DB
    console.warn(`[Reconciler] Dev pod ${podName} is ${status}, updating app to error`);
    await prisma.app.update({
      where: { id: app.id },
      data: { status: "error" },
    });
  }
}

async function reconcileProdApp(
  orgSlug: string,
  app: { id: string; slug: string; status: string },
): Promise<void> {
  const deployName = prodDeploymentName(orgSlug, app.slug);

  try {
    const deployment = await appsApi().readNamespacedDeployment({
      name: deployName,
      namespace: config.prodNamespace,
    });

    const replicas = deployment.spec?.replicas || 0;
    const readyReplicas = deployment.status?.readyReplicas || 0;

    if (replicas > 0 && readyReplicas === 0) {
      // Deployment exists but no ready replicas — might be crashing
      const unavailableCondition = deployment.status?.conditions?.find(
        (c) => c.type === "Available" && c.status === "False",
      );

      if (unavailableCondition) {
        console.warn(
          `[Reconciler] Prod deployment ${deployName} unavailable: ${unavailableCondition.message}`,
        );
        await prisma.app.update({
          where: { id: app.id },
          data: { status: "error" },
        });
      }
    }
  } catch (err: unknown) {
    if (isK8sNotFound(err)) {
      // Deployment doesn't exist — mark as error
      console.warn(`[Reconciler] Prod deployment ${deployName} not found, updating to error`);
      await prisma.app.update({
        where: { id: app.id },
        data: { status: "error" },
      });
    }
  }
}
