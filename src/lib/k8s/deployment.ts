/**
 * Kubernetes Production Deployment Manager
 *
 * Drop-in replacement for docker.ts.
 * Manages production app containers as k8s Deployments in the aigo-prod namespace.
 */

import { coreApi, appsApi, config } from "./client";
import {
  prodDeploymentName,
  prodServiceName,
  generateProdDeploymentSpec,
  generateProdServiceSpec,
} from "./manifests";
import { tagImage as tagRegistryImage, getImageUrl } from "./builder";
import { isClusterAvailable } from "./client";
import * as k8s from "@kubernetes/client-node";

// ── Tag Image ────────────────────────────────────────────────────────────────

export async function tagImage(
  orgSlug: string,
  slug: string,
  version: number,
): Promise<void> {
  await tagRegistryImage(orgSlug, slug, version);
}

// ── Start App (Deploy) ───────────────────────────────────────────────────────

/**
 * Deploy a production app as a k8s Deployment + Service.
 * Equivalent to `docker compose up -d --build`.
 */
export async function startApp(
  orgSlug: string,
  slug: string,
  version: number,
  internalPort: number,
  envVars: Record<string, string> = {},
): Promise<string> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);
  const svcName = prodServiceName(orgSlug, slug);

  // Create or update Deployment
  const deploySpec = generateProdDeploymentSpec({
    slug,
    orgSlug,
    version,
    internalPort,
    envVars,
  });

  try {
    // Try to read existing deployment
    await appsApi().readNamespacedDeployment(deployName, ns);
    // Exists — patch it (rolling update)
    await appsApi().patchNamespacedDeployment(
      deployName,
      ns,
      deploySpec,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { "Content-Type": "application/strategic-merge-patch+json" } },
    );
  } catch (err: unknown) {
    const errStatus = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (errStatus === 404) {
      await appsApi().createNamespacedDeployment(ns, deploySpec);
    } else {
      throw err;
    }
  }

  // Create Service (if not exists)
  try {
    await coreApi().readNamespacedService(svcName, ns);
  } catch (err: unknown) {
    const errStatus = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (errStatus === 404) {
      const svcSpec = generateProdServiceSpec(orgSlug, slug, internalPort);
      await coreApi().createNamespacedService(ns, svcSpec);
    }
  }

  return `Deployed ${deployName} v${version}`;
}

/**
 * Start app from a specific tagged image version (rollback).
 * Updates the Deployment's image to the versioned tag.
 */
export async function startAppFromImage(
  orgSlug: string,
  slug: string,
  version: number,
): Promise<string> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);
  const image = getImageUrl(orgSlug, slug, "prod", `v${version}`);

  // Patch the Deployment with the new image
  const patch = {
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: "app",
              image,
            },
          ],
        },
        metadata: {
          annotations: {
            "aigo.dev/version": String(version),
            "aigo.dev/rolled-back-at": new Date().toISOString(),
          },
        },
      },
    },
  };

  await appsApi().patchNamespacedDeployment(
    deployName,
    ns,
    patch,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { "Content-Type": "application/strategic-merge-patch+json" } },
  );

  return `Rolled back ${deployName} to v${version}`;
}

// ── Stop App ─────────────────────────────────────────────────────────────────

/**
 * Stop a production app by scaling its Deployment to 0 replicas.
 * Preserves the Deployment for quick restarts.
 */
export async function stopApp(orgSlug: string, slug: string): Promise<string> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);

  try {
    await appsApi().patchNamespacedDeployment(
      deployName,
      ns,
      { spec: { replicas: 0 } },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { "Content-Type": "application/strategic-merge-patch+json" } },
    );
    return `Stopped ${deployName}`;
  } catch (err: unknown) {
    const errStatus = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (errStatus === 404) return `${deployName} not found`;
    throw err;
  }
}

// ── Restart App ──────────────────────────────────────────────────────────────

/**
 * Restart a production app by triggering a rolling restart.
 */
export async function restartApp(orgSlug: string, slug: string): Promise<string> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);

  // Trigger rolling restart by updating an annotation
  const patch = {
    spec: {
      template: {
        metadata: {
          annotations: {
            "aigo.dev/restarted-at": new Date().toISOString(),
          },
        },
      },
    },
  };

  await appsApi().patchNamespacedDeployment(
    deployName,
    ns,
    patch,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { "Content-Type": "application/strategic-merge-patch+json" } },
  );

  return `Restarted ${deployName}`;
}

// ── Get Status ───────────────────────────────────────────────────────────────

/**
 * Get production app status from the Deployment.
 */
export async function getAppDockerStatus(
  orgSlug: string,
  slug: string,
): Promise<"running" | "stopped" | "error"> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);

  try {
    const { body } = await appsApi().readNamespacedDeployment(deployName, ns);
    const replicas = body.spec?.replicas || 0;
    const readyReplicas = body.status?.readyReplicas || 0;

    if (replicas === 0) return "stopped";
    if (readyReplicas > 0) return "running";
    return "error";
  } catch {
    return "stopped";
  }
}

// ── Get Logs ─────────────────────────────────────────────────────────────────

/**
 * Get production app logs from the Deployment's Pod.
 */
export async function getAppLogs(
  orgSlug: string,
  slug: string,
  lines: number = 100,
): Promise<string> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);

  try {
    // Find pods by Deployment labels
    const { body: podList } = await coreApi().listNamespacedPod(
      ns,
      undefined,
      undefined,
      undefined,
      undefined,
      `aigo.dev/org=${orgSlug},aigo.dev/app=${slug},aigo.dev/type=prod`,
    );

    const pod = podList.items[0];
    if (!pod?.metadata?.name) return "No pods found";

    const { body } = await coreApi().readNamespacedPodLog(
      pod.metadata.name,
      ns,
      "app",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      lines,
    );

    return typeof body === "string" ? body : String(body);
  } catch {
    return "No logs available";
  }
}

// ── Remove App ───────────────────────────────────────────────────────────────

/**
 * Completely remove a production app (Deployment + Service).
 */
export async function removeApp(orgSlug: string, slug: string): Promise<void> {
  const ns = config.prodNamespace;
  const deployName = prodDeploymentName(orgSlug, slug);
  const svcName = prodServiceName(orgSlug, slug);

  // Delete Deployment
  try {
    await appsApi().deleteNamespacedDeployment(deployName, ns);
  } catch (err: unknown) {
    const errStatus = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (errStatus !== 404) throw err;
  }

  // Delete Service
  try {
    await coreApi().deleteNamespacedService(svcName, ns);
  } catch (err: unknown) {
    const errStatus = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (errStatus !== 404) throw err;
  }
}

// ── Health Check ─────────────────────────────────────────────────────────────

/**
 * Check if k8s is available (replaces isDockerAvailable).
 */
export { isClusterAvailable as isDockerAvailable };
