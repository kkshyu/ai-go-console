/**
 * Kubernetes Dev Container Sandbox
 *
 * Drop-in replacement for docker-sandbox.ts.
 * Manages dev containers as k8s Pods in the aigo-dev namespace,
 * and provides file I/O via k8s exec API.
 */

import { coreApi, config, isK8sNotFound } from "./client";
import {
  execInPod,
  copyToPod,
  copyBufferToPod,
  copyFromPod,
  readFileFromPod,
  installPackagesInPod,
  getPodStatus,
} from "./exec";
import {
  devPodName,
  devServiceName,
  generateDevPodSpec,
  generateDevServiceSpec,
} from "./manifests";
import { getImageUrl, getInClusterImageUrl, getBaseImageUrl } from "./builder";
import { getTemplate } from "@/lib/templates";
import { CONSOLE_BRIDGE_SCRIPT } from "@/lib/console-bridge";

// ── Types ────────────────────────────────────────────────────────────────────

export type ContainerType = "dev" | "prod";

// ── Naming Helpers (compatible with docker-sandbox API) ──────────────────────

export function devContainerName(orgSlug: string, slug: string): string {
  return devPodName(orgSlug, slug);
}

export function prodContainerName(orgSlug: string, slug: string): string {
  return `prod-${orgSlug}-${slug}`;
}

export async function resolveContainerName(
  orgSlug: string,
  slug: string,
  type: ContainerType = "dev",
): Promise<string> {
  return type === "prod"
    ? prodContainerName(orgSlug, slug)
    : devContainerName(orgSlug, slug);
}

// ── Npm Package Validation ───────────────────────────────────────────────────

function isValidNpmPackageName(pkg: string): boolean {
  return /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+(@[a-z0-9._^~>=<|-]+)?$/i.test(pkg);
}

// ── Container Lifecycle ──────────────────────────────────────────────────────

/**
 * Create a dev container (Pod + Service) in the aigo-dev namespace.
 * Returns the Pod name.
 */
export async function createDevContainer(
  orgSlug: string,
  slug: string,
  template: string,
  port: number,
  envVars: Record<string, string> = {},
): Promise<string> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  const podName = devPodName(orgSlug, slug);
  const ns = config.devNamespace;

  // Check if pod already exists
  const status = await getPodStatus(ns, podName);
  if (status !== "not_found") {
    // Pod exists — remove it first to create fresh
    await removeDevContainer(orgSlug, slug);
  }

  // Generate Pod spec
  const podSpec = generateDevPodSpec({
    slug,
    orgSlug,
    template,
    internalPort: tmpl.internalDevPort,
    envVars,
    devCommand: [tmpl.devCommand, ...(tmpl.devArgs || [])],
  });

  // Override image to use the app-specific dev image (in-cluster URL for k8s pods)
  const image = getInClusterImageUrl(orgSlug, slug, "dev");
  if (podSpec.spec?.containers?.[0]) {
    podSpec.spec.containers[0].image = image;
  }

  // Create Pod
  await coreApi().createNamespacedPod({ namespace: ns, body: podSpec });

  // Create Service (if not exists)
  const svcName = devServiceName(orgSlug, slug);
  try {
    await coreApi().readNamespacedService({ name: svcName, namespace: ns });
  } catch (err: unknown) {
    if (isK8sNotFound(err)) {
      const svcSpec = generateDevServiceSpec(orgSlug, slug, tmpl.internalDevPort);
      await coreApi().createNamespacedService({ namespace: ns, body: svcSpec });
    }
  }

  // Wait for Pod to be ready before returning
  await waitForPodReady(orgSlug, slug);

  return podName;
}

/**
 * Start an existing dev container.
 * In k8s, Pods are always running once created. If the Pod was deleted
 * (our "stop" equivalent), this recreates it.
 */
export async function startDevContainer(orgSlug: string, slug: string): Promise<void> {
  const podName = devPodName(orgSlug, slug);
  const ns = config.devNamespace;
  const status = await getPodStatus(ns, podName);

  if (status === "running") return; // Already running

  // If not found, the consumer should call createDevContainer first.
  // This matches the Docker behavior where start() only works on existing containers.
  if (status === "not_found") {
    throw new Error(`Dev container ${podName} not found. Create it first.`);
  }
}

/**
 * Stop a running dev container.
 * In k8s, we delete the Pod (there's no "stop" concept).
 * The Service is kept for quick restarts.
 */
export async function stopDevContainer(orgSlug: string, slug: string): Promise<void> {
  const podName = devPodName(orgSlug, slug);
  const ns = config.devNamespace;

  try {
    await coreApi().deleteNamespacedPod({ name: podName, namespace: ns });
  } catch (err: unknown) {
    if (!isK8sNotFound(err)) throw err;
  }
}

/**
 * Remove a dev container and its Service.
 */
export async function removeDevContainer(orgSlug: string, slug: string): Promise<void> {
  const podName = devPodName(orgSlug, slug);
  const svcName = devServiceName(orgSlug, slug);
  const ns = config.devNamespace;

  // Delete Pod
  try {
    await coreApi().deleteNamespacedPod({ name: podName, namespace: ns });
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

/**
 * Get the status of a dev container.
 */
export async function getDevContainerStatus(
  orgSlug: string,
  slug: string,
): Promise<"running" | "stopped" | "not_found"> {
  const podName = devPodName(orgSlug, slug);
  const status = await getPodStatus(config.devNamespace, podName);

  switch (status) {
    case "running":
      return "running";
    case "pending":
      return "running"; // Treat pending as running (starting up)
    case "not_found":
      return "not_found";
    default:
      return "stopped";
  }
}

/**
 * Get container status by type (dev or prod).
 */
export async function getContainerStatus(
  orgSlug: string,
  slug: string,
  type: ContainerType = "dev",
): Promise<"running" | "stopped" | "not_found"> {
  if (type === "dev") return getDevContainerStatus(orgSlug, slug);

  // Prod: check Deployment's pod
  const podName = prodContainerName(orgSlug, slug);
  const status = await getPodStatus(config.prodNamespace, podName);

  switch (status) {
    case "running":
      return "running";
    case "not_found":
      return "not_found";
    default:
      return "stopped";
  }
}

/**
 * Get logs from a dev container.
 */
export async function getDevContainerLogs(
  orgSlug: string,
  slug: string,
  lines: number = 100,
): Promise<string> {
  const podName = devPodName(orgSlug, slug);
  const ns = config.devNamespace;

  try {
    const logBody = await coreApi().readNamespacedPodLog({
      name: podName,
      namespace: ns,
      container: "app",
      tailLines: lines,
    });
    return typeof logBody === "string" ? logBody : String(logBody);
  } catch {
    return "No logs available";
  }
}

/**
 * Recreate a dev container with new environment variables.
 * Preserves files by exporting and re-importing.
 */
export async function recreateDevContainer(
  orgSlug: string,
  slug: string,
  template: string,
  port: number,
  envVars: Record<string, string> = {},
): Promise<void> {
  const { mkdtemp, rm } = await import("fs/promises");
  const { join } = await import("path");
  const { tmpdir } = await import("os");

  const tmpDir = await mkdtemp(join(tmpdir(), "aigo-recreate-"));
  try {
    await exportSource(orgSlug, slug, tmpDir);
    await removeDevContainer(orgSlug, slug);
    await createDevContainer(orgSlug, slug, template, port, envVars);

    // Wait for Pod to be ready
    await waitForPodReady(orgSlug, slug);

    // Re-inject files
    const podName = devPodName(orgSlug, slug);
    await copyFromHostToPod(config.devNamespace, podName, tmpDir, "/app");
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── File Operations ──────────────────────────────────────────────────────────

/**
 * Write files into a container via k8s exec.
 */
export async function writeFiles(
  orgSlug: string,
  slug: string,
  files: Array<{ path: string; content: string }>,
  containerType: ContainerType = "dev",
): Promise<void> {
  if (files.length === 0) return;

  const ns = containerType === "prod" ? config.prodNamespace : config.devNamespace;
  const podName = containerType === "prod"
    ? prodContainerName(orgSlug, slug)
    : devPodName(orgSlug, slug);

  await copyToPod(ns, podName, files, { basePath: "/app" });
}

/**
 * Write binary file into a container.
 */
export async function writeFileBuffer(
  orgSlug: string,
  slug: string,
  targetPath: string,
  buffer: Buffer,
  containerType: ContainerType = "dev",
): Promise<void> {
  const ns = containerType === "prod" ? config.prodNamespace : config.devNamespace;
  const podName = containerType === "prod"
    ? prodContainerName(orgSlug, slug)
    : devPodName(orgSlug, slug);

  await copyBufferToPod(ns, podName, `/app/${targetPath}`, buffer);
}

/**
 * Read a file from a container.
 */
export async function readFile(
  orgSlug: string,
  slug: string,
  filePath: string,
  containerType: ContainerType = "dev",
): Promise<string> {
  const ns = containerType === "prod" ? config.prodNamespace : config.devNamespace;
  const podName = containerType === "prod"
    ? prodContainerName(orgSlug, slug)
    : devPodName(orgSlug, slug);

  const safePath = filePath.replace(/\.\./g, "");
  return readFileFromPod(ns, podName, `/app/${safePath}`);
}

/**
 * Read directory listing from a container.
 */
export async function readDirectory(
  orgSlug: string,
  slug: string,
  dirPath: string,
  containerType: ContainerType = "dev",
): Promise<Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }>> {
  const ns = containerType === "prod" ? config.prodNamespace : config.devNamespace;
  const podName = containerType === "prod"
    ? prodContainerName(orgSlug, slug)
    : devPodName(orgSlug, slug);

  const safePath = (dirPath || "").replace(/\.\./g, "");
  const targetDir = safePath ? `/app/${safePath}` : "/app";

  // Use the same ls script as the original docker-sandbox for compatibility
  const result = await execInPod(ns, podName, [
    "sh", "-c",
    `cd "${targetDir}" && ls -1pa | grep -v '^\\./$' | while IFS= read -r name; do
      if [ -d "$name" ]; then
        stripped=$(echo "$name" | sed 's|/$||')
        size=$(du -s "$stripped" 2>/dev/null | cut -f1 || echo 0)
        echo "D|$stripped|$size"
      else
        size=$(wc -c < "$name" 2>/dev/null || echo 0)
        echo "F|$name|$size"
      fi
    done`,
  ]);

  const entries: Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }> = [];
  const now = new Date().toISOString();

  for (const line of result.stdout.trim().split("\n")) {
    if (!line) continue;
    const [typeFlag, name, sizeStr] = line.split("|");
    if (!name || name.startsWith(".") || name === "node_modules") continue;

    entries.push({
      name,
      type: typeFlag === "D" ? "directory" : "file",
      size: parseInt(sizeStr || "0", 10),
      mtime: now,
    });
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/**
 * List file tree from the dev container.
 */
export async function listFileTree(
  orgSlug: string,
  slug: string,
): Promise<Array<{ relativePath: string; isDirectory: boolean }>> {
  const ns = config.devNamespace;
  const podName = devPodName(orgSlug, slug);

  const result = await execInPod(ns, podName, [
    "find", "/app",
    "-not", "-path", "*/node_modules/*",
    "-not", "-path", "*/.git/*",
    "-not", "-path", "*/.next/*",
    "-not", "-path", "*/dist/*",
    "-not", "-path", "*/build/*",
    "-not", "-path", "*/.cache/*",
    "-not", "-name", ".DS_Store",
    "-not", "-name", "package-lock.json",
    "-not", "-name", "pnpm-lock.yaml",
    "-not", "-name", "yarn.lock",
  ]);

  const entries: Array<{ relativePath: string; isDirectory: boolean }> = [];

  for (const line of result.stdout.trim().split("\n")) {
    if (!line || line === "/app") continue;
    const relativePath = line.replace(/^\/app\//, "");
    if (!relativePath) continue;
    entries.push({ relativePath, isDirectory: false });
  }

  // Mark directories
  try {
    const dirResult = await execInPod(ns, podName, [
      "find", "/app", "-type", "d",
      "-not", "-path", "*/node_modules/*",
      "-not", "-path", "*/.git/*",
      "-not", "-path", "*/.next/*",
      "-not", "-path", "*/dist/*",
      "-not", "-path", "*/build/*",
      "-not", "-path", "*/.cache/*",
    ]);

    const dirSet = new Set(
      dirResult.stdout.trim().split("\n")
        .map((d) => d.replace(/^\/app\//, ""))
        .filter(Boolean),
    );

    for (const entry of entries) {
      if (dirSet.has(entry.relativePath)) {
        entry.isDirectory = true;
      }
    }
  } catch {
    // Fall back — all marked as files
  }

  return entries;
}

// ── npm Operations ───────────────────────────────────────────────────────────

/**
 * Install npm packages inside the dev container.
 */
export async function installPackages(
  orgSlug: string,
  slug: string,
  packages: string[],
): Promise<string> {
  if (packages.length === 0) return "";

  const invalidPkgs = packages.filter((p) => !isValidNpmPackageName(p));
  if (invalidPkgs.length > 0) {
    throw new Error(`Invalid npm package names: ${invalidPkgs.join(", ")}`);
  }

  return installPackagesInPod(config.devNamespace, devPodName(orgSlug, slug), packages);
}

// ── Export / Import ──────────────────────────────────────────────────────────

/**
 * Export app source code from the dev container to a host directory.
 */
export async function exportSource(
  orgSlug: string,
  slug: string,
  destDir: string,
): Promise<void> {
  const podName = devPodName(orgSlug, slug);
  await copyFromPod(config.devNamespace, podName, "/app", destDir);

  // Remove node_modules from the export
  const { rm: fsRm } = await import("fs/promises");
  const { join: pathJoin } = await import("path");
  await fsRm(pathJoin(destDir, "node_modules"), { recursive: true, force: true }).catch(() => {});
}

// ── Console Bridge ───────────────────────────────────────────────────────────

/**
 * Inject the console bridge script into the container.
 */
export async function injectConsoleBridge(orgSlug: string, slug: string): Promise<void> {
  await writeFiles(orgSlug, slug, [
    { path: "public/__console-bridge.js", content: CONSOLE_BRIDGE_SCRIPT },
  ]);
}

// ── Image Management ─────────────────────────────────────────────────────────

/**
 * Build an app-specific dev image with additional npm packages.
 * Uses Kaniko for in-cluster builds, or falls back to docker build.
 */
export async function buildAppDevImage(
  orgSlug: string,
  slug: string,
  template: string,
  npmPackages: string[],
): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  if (npmPackages.length === 0) {
    await tagBaseImage(orgSlug, slug, template);
    return;
  }

  const invalidPkgs = npmPackages.filter((p) => !isValidNpmPackageName(p));
  if (invalidPkgs.length > 0) {
    throw new Error(`Invalid npm package names: ${invalidPkgs.join(", ")}`);
  }

  // For now, fall back to docker build on the host
  // TODO: Use Kaniko builder when fully integrated
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { mkdtemp, writeFile, rm } = await import("fs/promises");
  const { join } = await import("path");
  const { tmpdir } = await import("os");

  const execFileAsync = promisify(execFile);
  const imageName = getImageUrl(orgSlug, slug, "dev");
  const tmpDir = await mkdtemp(join(tmpdir(), "aigo-build-"));

  try {
    const baseImage = getBaseImageUrl(template);
    const dockerfile = [
      `FROM ${baseImage}`,
      `RUN npm install ${npmPackages.join(" ")}`,
    ].join("\n");

    await writeFile(join(tmpDir, "Dockerfile"), dockerfile, "utf-8");

    await execFileAsync("docker", ["build", "-t", imageName, tmpDir], {
      timeout: 300_000,
    });

    // Push to registry
    await execFileAsync("docker", ["push", imageName], { timeout: 120_000 });
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Tag the template base image as the app-specific dev image.
 */
export async function tagBaseImage(
  orgSlug: string,
  slug: string,
  template: string,
): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  const baseImage = getBaseImageUrl(template);
  const appImage = getImageUrl(orgSlug, slug, "dev");

  await execFileAsync("docker", ["tag", baseImage, appImage], { timeout: 30_000 });
  await execFileAsync("docker", ["push", appImage], { timeout: 120_000 }).catch(() => {
    // Push may fail if registry is not available (local dev without k3d)
  });
}

/**
 * Remove the app-specific dev image.
 */
export async function removeDevImage(orgSlug: string, slug: string): Promise<void> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  const imageName = getImageUrl(orgSlug, slug, "dev");
  try {
    await execFileAsync("docker", ["rmi", imageName], { timeout: 30_000 });
  } catch {
    // Image may not exist
  }
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Wait for a dev Pod to be ready.
 */
async function waitForPodReady(
  orgSlug: string,
  slug: string,
  timeoutMs: number = 60_000,
): Promise<void> {
  const podName = devPodName(orgSlug, slug);
  const ns = config.devNamespace;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await getPodStatus(ns, podName);
    if (status === "running") return;
    if (status === "error") throw new Error(`Pod ${podName} failed to start`);
    await new Promise((r) => setTimeout(r, 2_000));
  }

  throw new Error(`Pod ${podName} did not become ready within ${timeoutMs / 1000}s`);
}

/**
 * Copy files from host directory to Pod.
 */
async function copyFromHostToPod(
  namespace: string,
  podName: string,
  hostDir: string,
  podPath: string,
): Promise<void> {
  // Use kubectl cp via exec
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  await execFileAsync(
    "kubectl",
    ["cp", hostDir, `${namespace}/${podName}:${podPath}`],
    { timeout: 120_000 },
  );
}
