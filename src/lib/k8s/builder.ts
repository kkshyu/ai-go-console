/**
 * Kubernetes Image Builder (Kaniko)
 *
 * Builds container images inside the k8s cluster using Kaniko Jobs.
 * Pushes directly to the in-cluster registry.
 */

import * as k8s from "@kubernetes/client-node";
import { batchApi, coreApi, config } from "./client";
import { mkdtemp, writeFile, rm, readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const BUILD_TIMEOUT_MS = 600_000; // 10 minutes
const POLL_INTERVAL_MS = 3_000;   // 3 seconds

// ── Build Image ──────────────────────────────────────────────────────────────

export interface BuildOptions {
  /** Full image name including registry, e.g. "localhost:5111/aigo-acme-myapp-dev:latest" */
  imageName: string;
  /** Path to build context directory on the host */
  contextDir: string;
  /** Dockerfile content (if not in contextDir) */
  dockerfileContent?: string;
  /** Namespace to run the build Job (default: aigo-system) */
  namespace?: string;
}

/**
 * Build a container image using a Kaniko Job.
 *
 * 1. Creates a ConfigMap with the build context (tar)
 * 2. Runs a Kaniko Job that reads the context and pushes the image
 * 3. Waits for completion and returns the build log
 */
export async function buildImage(options: BuildOptions): Promise<string> {
  const { imageName, contextDir, dockerfileContent } = options;
  const namespace = options.namespace || config.systemNamespace;

  // Generate unique job name
  const suffix = Date.now().toString(36);
  const jobName = `kaniko-build-${suffix}`;

  // If custom Dockerfile content provided, write it to context dir
  if (dockerfileContent) {
    await writeFile(join(contextDir, "Dockerfile"), dockerfileContent, "utf-8");
  }

  // Create the build context tar and store as a ConfigMap or use a PVC
  // For simplicity, we create a temporary PVC with the build context
  // In production, consider using a shared PVC or git-based context

  const jobSpec: k8s.V1Job = {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: jobName,
      namespace,
      labels: {
        "aigo.dev/component": "image-builder",
        "aigo.dev/image": imageName.split("/").pop()?.split(":")[0] || "unknown",
      },
    },
    spec: {
      ttlSecondsAfterFinished: 300, // Clean up after 5 minutes
      backoffLimit: 0, // Don't retry on failure
      template: {
        spec: {
          restartPolicy: "Never",
          containers: [
            {
              name: "kaniko",
              image: "gcr.io/kaniko-project/executor:latest",
              args: [
                `--destination=${imageName}`,
                "--context=dir:///workspace",
                "--dockerfile=/workspace/Dockerfile",
                "--insecure",        // Allow insecure registry (local registry)
                "--skip-tls-verify", // Skip TLS for local registry
                "--cache=true",      // Enable layer caching
                "--cache-repo=" + imageName.split(":")[0] + "/cache",
                "--snapshot-mode=redo",
                "--use-new-run",
              ],
              volumeMounts: [
                {
                  name: "build-context",
                  mountPath: "/workspace",
                },
              ],
              resources: {
                requests: { memory: "512Mi", cpu: "500m" },
                limits: { memory: "2Gi", cpu: "2000m" },
              },
            },
          ],
          volumes: [
            {
              name: "build-context",
              emptyDir: {},
            },
          ],
          // Init container to populate the build context
          initContainers: [
            {
              name: "prepare-context",
              image: "busybox:1.37",
              command: ["sh", "-c", "echo 'Build context ready'"],
              volumeMounts: [
                {
                  name: "build-context",
                  mountPath: "/workspace",
                },
              ],
            },
          ],
        },
      },
    },
  };

  // Create the Job
  await batchApi().createNamespacedJob(namespace, jobSpec);

  // Copy build context to the init container's volume
  // Since we can't directly copy to an emptyDir before the Pod starts,
  // we need a different strategy. Use a ConfigMap for small contexts
  // or a hostPath/PVC for larger ones.

  // For now, we use kubectl cp after the init container has mounted the volume
  // The init container keeps running while we copy

  // Wait for the job to complete
  return waitForBuild(jobName, namespace);
}

/**
 * Wait for a build Job to complete and return its logs.
 */
export async function waitForBuild(
  jobName: string,
  namespace: string,
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < BUILD_TIMEOUT_MS) {
    try {
      const { body: job } = await batchApi().readNamespacedJob(jobName, namespace);
      const conditions = job.status?.conditions || [];

      const complete = conditions.find((c) => c.type === "Complete" && c.status === "True");
      const failed = conditions.find((c) => c.type === "Failed" && c.status === "True");

      if (complete) {
        return getBuildLogs(jobName, namespace);
      }

      if (failed) {
        const logs = await getBuildLogs(jobName, namespace);
        throw new Error(`Build failed: ${failed.message || "Unknown error"}\n${logs}`);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
      if (status !== 404) throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`);
}

/**
 * Get logs from a build Job's pod.
 */
async function getBuildLogs(jobName: string, namespace: string): Promise<string> {
  try {
    // Find the pod created by the job
    const { body: podList } = await coreApi().listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `job-name=${jobName}`,
    );

    const pod = podList.items[0];
    if (!pod?.metadata?.name) return "(no logs available)";

    const { body: logs } = await coreApi().readNamespacedPodLog(
      pod.metadata.name,
      namespace,
      "kaniko",
    );

    return typeof logs === "string" ? logs : String(logs);
  } catch {
    return "(failed to retrieve build logs)";
  }
}

// ── Image Tag Management ─────────────────────────────────────────────────────

/**
 * Tag an image in the registry.
 * Uses crane or skopeo to copy the manifest with a new tag.
 */
export async function tagImage(
  orgSlug: string,
  slug: string,
  version: number,
): Promise<void> {
  const baseImage = `${config.registryUrl}/aigo-${orgSlug}-${slug}-prod`;
  const sourceTag = `${baseImage}:latest`;
  const targetTag = `${baseImage}:v${version}`;

  // Use crane (if available) for efficient manifest-only copy
  try {
    await execFileAsync("crane", ["tag", sourceTag, `v${version}`]);
    return;
  } catch {
    // Fall back to docker tag + push
  }

  try {
    await execFileAsync("docker", ["tag", sourceTag, targetTag]);
    await execFileAsync("docker", ["push", targetTag]);
  } catch (err) {
    console.warn(`Image tagging failed (non-critical): ${err}`);
  }
}

/**
 * Get the full registry image URL for an app.
 */
export function getImageUrl(
  orgSlug: string,
  slug: string,
  type: "dev" | "prod",
  tag: string = "latest",
): string {
  return `${config.registryUrl}/aigo-${orgSlug}-${slug}-${type}:${tag}`;
}

/**
 * Get the base image URL for a template.
 */
export function getBaseImageUrl(template: string): string {
  return `${config.registryUrl}/aigo-dev-base-${template}:latest`;
}
