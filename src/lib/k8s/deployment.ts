/**
 * Kubernetes Production Deployment Manager
 *
 * Drop-in replacement for docker.ts.
 * Manages production app containers as k8s Deployments in the aigo-prod namespace.
 */

import { coreApi, appsApi, config, strategicMergePatchOptions, isK8sNotFound } from "./client";
import {
  prodDeploymentName,
  prodServiceName,
  generateProdDeploymentSpec,
  generateProdServiceSpec,
} from "./manifests";
import { tagImage as tagRegistryImage, getInClusterImageUrl } from "./builder";
import { isClusterAvailable } from "./client";

// ── Safe Deployment Wrapper ─────────────────────────────────────────────────

/**
 * Deploy with safety: if K8s deployment fails, returns an error
 * instead of leaving the system in an inconsistent state.
 * The caller is responsible for DB status rollback on failure.
 */
export async function deployWithSafety(
  orgSlug: string,
  slug: string,
  version: number,
  internalPort: number,
  envVars: Record<string, string> = {},
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const output = await startApp(orgSlug, slug, version, internalPort, envVars);
    await tagImage(orgSlug, slug, version);
    return { success: true, output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown deployment error";
    // Attempt to clean up partial deployment
    try {
      await stopApp(orgSlug, slug);
    } catch {
      // Ignore cleanup errors
    }
    return { success: false, output: "", error: msg };
  }
}

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
    await appsApi().readNamespacedDeployment({ name: deployName, namespace: ns });
    // Exists — patch it (rolling update)
    await appsApi().patchNamespacedDeployment(
      { name: deployName, namespace: ns, body: deploySpec },
      strategicMergePatchOptions,
    );
  } catch (err: unknown) {
    if (isK8sNotFound(err)) {
      await appsApi().createNamespacedDeployment({ namespace: ns, body: deploySpec });
    } else {
      throw err;
    }
  }

  // Create Service (if not exists)
  try {
    await coreApi().readNamespacedService({ name: svcName, namespace: ns });
  } catch (err: unknown) {
    if (isK8sNotFound(err)) {
      const svcSpec = generateProdServiceSpec(orgSlug, slug, internalPort);
      await coreApi().createNamespacedService({ namespace: ns, body: svcSpec });
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
  const image = getInClusterImageUrl(orgSlug, slug, "prod", `v${version}`);

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
    { name: deployName, namespace: ns, body: patch },
    strategicMergePatchOptions,
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
      { name: deployName, namespace: ns, body: { spec: { replicas: 0 } } },
      strategicMergePatchOptions,
    );
    return `Stopped ${deployName}`;
  } catch (err: unknown) {
    if (isK8sNotFound(err)) return `${deployName} not found`;
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
    { name: deployName, namespace: ns, body: patch },
    strategicMergePatchOptions,
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
    const deployment = await appsApi().readNamespacedDeployment({ name: deployName, namespace: ns });
    const replicas = deployment.spec?.replicas || 0;
    const readyReplicas = deployment.status?.readyReplicas || 0;

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

  try {
    // Find pods by Deployment labels
    const podList = await coreApi().listNamespacedPod({
      namespace: ns,
      labelSelector: `aigo.dev/org=${orgSlug},aigo.dev/app=${slug},aigo.dev/type=prod`,
    });

    const pod = podList.items[0];
    if (!pod?.metadata?.name) return "No pods found";

    const logBody = await coreApi().readNamespacedPodLog({
      name: pod.metadata.name,
      namespace: ns,
      container: "app",
      tailLines: lines,
    });

    return typeof logBody === "string" ? logBody : String(logBody);
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
    await appsApi().deleteNamespacedDeployment({ name: deployName, namespace: ns });
  } catch (err: unknown) {
    if (!isK8sNotFound(err)) throw err;
  }

  // Delete Service
  try {
    await coreApi().deleteNamespacedService({ name: svcName, namespace: ns });
  } catch (err: unknown) {
    if (!isK8sNotFound(err)) throw err;
  }
}

// ── Health Check ─────────────────────────────────────────────────────────────

/**
 * Check if k8s is available (replaces isDockerAvailable).
 */
export { isClusterAvailable as isDockerAvailable };
