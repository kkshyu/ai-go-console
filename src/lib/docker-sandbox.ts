import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import { getTemplate } from "@/lib/templates";
import { CONSOLE_BRIDGE_SCRIPT } from "@/lib/console-bridge";

const execFileAsync = promisify(execFile);

const TIMEOUT = 120_000; // 2 minutes
const BUILD_TIMEOUT = 300_000; // 5 minutes

/**
 * Validate an npm package name to prevent command injection in Dockerfiles.
 * Allows scoped packages (@scope/name) and version specifiers (name@version).
 */
function isValidNpmPackageName(pkg: string): boolean {
  // Allow: letters, digits, hyphens, dots, underscores, slashes (scoped), @ (scoped/version)
  // Reject anything that could be shell metacharacters: ; | & $ ` ( ) { } < > ! ~ " ' \  newline
  return /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+(@[a-z0-9._^~>=<|-]+)?$/i.test(pkg);
}

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

export type ContainerType = "dev" | "prod";

export function devContainerName(orgSlug: string, slug: string): string {
  return `aigo-${orgSlug}-${slug}-dev`;
}

export function prodContainerName(orgSlug: string, slug: string): string {
  return `aigo-${orgSlug}-${slug}-prod`;
}

/** Legacy naming: aigo-dev-{slug} (before orgSlug was introduced) */
function legacyDevContainerName(slug: string): string {
  return `aigo-dev-${slug}`;
}

/** Legacy naming: aigo-{orgSlug}-{slug} (before -prod suffix was added) */
function legacyProdContainerName(orgSlug: string, slug: string): string {
  return `aigo-${orgSlug}-${slug}`;
}

/**
 * Resolve the actual dev container name by checking if the new-style name exists,
 * falling back to the legacy name for containers created before the naming change.
 */
async function resolveDevContainerName(orgSlug: string, slug: string): Promise<string> {
  const newName = devContainerName(orgSlug, slug);
  try {
    await execFileAsync("docker", ["inspect", "--format", "{{.Name}}", newName], { timeout: 5_000 });
    return newName;
  } catch {
    // New-style container not found — check legacy name
    const oldName = legacyDevContainerName(slug);
    try {
      await execFileAsync("docker", ["inspect", "--format", "{{.Name}}", oldName], { timeout: 5_000 });
      return oldName;
    } catch {
      // Neither found — return new name (will be used for creation)
      return newName;
    }
  }
}

/**
 * Resolve the actual prod container name by checking new-style first,
 * falling back to legacy name.
 */
async function resolveProdContainerName(orgSlug: string, slug: string): Promise<string> {
  const newName = prodContainerName(orgSlug, slug);
  try {
    await execFileAsync("docker", ["inspect", "--format", "{{.Name}}", newName], { timeout: 5_000 });
    return newName;
  } catch {
    const oldName = legacyProdContainerName(orgSlug, slug);
    try {
      await execFileAsync("docker", ["inspect", "--format", "{{.Name}}", oldName], { timeout: 5_000 });
      return oldName;
    } catch {
      return newName;
    }
  }
}

/**
 * Resolve container name based on container type (dev or prod).
 */
export async function resolveContainerName(orgSlug: string, slug: string, type: ContainerType = "dev"): Promise<string> {
  return type === "prod"
    ? resolveProdContainerName(orgSlug, slug)
    : resolveDevContainerName(orgSlug, slug);
}

// ---------------------------------------------------------------------------
// Container lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a dev container from the template base image.
 * Does NOT start it — call startDevContainer() afterwards.
 */
export async function createDevContainer(
  orgSlug: string,
  slug: string,
  template: string,
  port: number,
  envVars: Record<string, string> = {}
): Promise<string> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  const containerName = devContainerName(orgSlug, slug);
  const imageName = `aigo-${orgSlug}-${slug}-dev`;

  // Build docker create args
  const args: string[] = [
    "create",
    "--name", containerName,
    "-p", `${port}:${tmpl.internalDevPort}`,
    // Allow container to reach the host (for service proxy)
    "--add-host", "host.docker.internal:host-gateway",
  ];

  // Inject environment variables (including service env vars)
  for (const [key, value] of Object.entries(envVars)) {
    args.push("-e", `${key}=${value}`);
  }
  args.push("-e", `PORT=${tmpl.internalDevPort}`);

  args.push(imageName);

  const { stdout } = await execFileAsync("docker", args, { timeout: TIMEOUT });
  return stdout.trim(); // container ID
}

/**
 * Start an existing dev container.
 */
export async function startDevContainer(orgSlug: string, slug: string): Promise<void> {
  const name = await resolveDevContainerName(orgSlug, slug);
  await execFileAsync("docker", ["start", name], {
    timeout: TIMEOUT,
  });
}

/**
 * Stop a running dev container.
 */
export async function stopDevContainer(orgSlug: string, slug: string): Promise<void> {
  const name = await resolveDevContainerName(orgSlug, slug);
  try {
    await execFileAsync("docker", ["stop", name], {
      timeout: TIMEOUT,
    });
  } catch {
    // Container may not be running — ignore
  }
}

/**
 * Remove a dev container (force).
 */
export async function removeDevContainer(orgSlug: string, slug: string): Promise<void> {
  // Remove both new-style and legacy containers to ensure cleanup
  for (const name of [devContainerName(orgSlug, slug), legacyDevContainerName(slug)]) {
    try {
      await execFileAsync("docker", ["rm", "-f", name], {
        timeout: TIMEOUT,
      });
    } catch {
      // Container may not exist — ignore
    }
  }
}

/**
 * Get the status of a dev container.
 */
export async function getDevContainerStatus(
  orgSlug: string,
  slug: string
): Promise<"running" | "stopped" | "not_found"> {
  // Check new-style name first, then legacy
  for (const name of [devContainerName(orgSlug, slug), legacyDevContainerName(slug)]) {
    try {
      const { stdout } = await execFileAsync(
        "docker",
        ["inspect", "--format", "{{.State.Status}}", name],
        { timeout: 10_000 }
      );
      const status = stdout.trim();
      return status === "running" ? "running" : "stopped";
    } catch {
      // Try next name
    }
  }
  return "not_found";
}

/**
 * Get the status of a container by type (dev or prod).
 */
export async function getContainerStatus(
  orgSlug: string,
  slug: string,
  type: ContainerType = "dev"
): Promise<"running" | "stopped" | "not_found"> {
  if (type === "dev") return getDevContainerStatus(orgSlug, slug);

  // Check prod container: new-style first, then legacy
  for (const name of [prodContainerName(orgSlug, slug), legacyProdContainerName(orgSlug, slug)]) {
    try {
      const { stdout } = await execFileAsync(
        "docker",
        ["inspect", "--format", "{{.State.Status}}", name],
        { timeout: 10_000 }
      );
      const status = stdout.trim();
      return status === "running" ? "running" : "stopped";
    } catch {
      // Try next name
    }
  }
  return "not_found";
}

/**
 * Get logs from a dev container.
 */
export async function getDevContainerLogs(
  orgSlug: string,
  slug: string,
  lines = 100
): Promise<string> {
  const name = await resolveDevContainerName(orgSlug, slug);
  try {
    const { stdout, stderr } = await execFileAsync(
      "docker",
      ["logs", "--tail", String(lines), name],
      { timeout: 10_000 }
    );
    return stdout + stderr;
  } catch {
    return "No logs available";
  }
}

/**
 * Recreate a dev container with new environment variables.
 * Preserves files by exporting and re-importing them.
 */
export async function recreateDevContainer(
  orgSlug: string,
  slug: string,
  template: string,
  port: number,
  envVars: Record<string, string> = {}
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), `aigo-recreate-${crypto.randomUUID()}`);
  try {
    // Export current source files
    await fsp.mkdir(tmpDir, { recursive: true });
    await exportSource(orgSlug, slug, tmpDir);

    // Remove old container
    await removeDevContainer(orgSlug, slug);

    // Create new container with updated env vars
    await createDevContainer(orgSlug, slug, template, port, envVars);

    // Re-inject files (read from temp and write back into container)
    await execFileAsync(
      "docker",
      ["cp", `${tmpDir}/.`, `${devContainerName(orgSlug, slug)}:/app/`],
      { timeout: TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

/**
 * Write files into a running or created container via docker cp.
 * Files are written to a temp directory first, then copied in bulk.
 */
export async function writeFiles(
  orgSlug: string,
  slug: string,
  files: Array<{ path: string; content: string }>,
  containerType: ContainerType = "dev"
): Promise<void> {
  if (files.length === 0) return;

  const name = await resolveContainerName(orgSlug, slug, containerType);
  const tmpDir = path.join(os.tmpdir(), `aigo-cp-${crypto.randomUUID()}`);
  try {
    // Write files to temp directory
    for (const file of files) {
      const filePath = path.join(tmpDir, file.path);
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, file.content, "utf-8");
    }

    // docker cp into container
    await execFileAsync(
      "docker",
      ["cp", `${tmpDir}/.`, `${name}:/app/`],
      { timeout: TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Write binary files (e.g., from upload) into a container.
 */
export async function writeFileBuffer(
  orgSlug: string,
  slug: string,
  targetPath: string,
  buffer: Buffer,
  containerType: ContainerType = "dev"
): Promise<void> {
  const name = await resolveContainerName(orgSlug, slug, containerType);
  const tmpDir = path.join(os.tmpdir(), `aigo-cp-${crypto.randomUUID()}`);
  try {
    const filePath = path.join(tmpDir, targetPath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, buffer);

    await execFileAsync(
      "docker",
      ["cp", `${tmpDir}/.`, `${name}:/app/`],
      { timeout: TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Read a single file from a container.
 */
export async function readFile(orgSlug: string, slug: string, filePath: string, containerType: ContainerType = "dev"): Promise<string> {
  const name = await resolveContainerName(orgSlug, slug, containerType);
  const safePath = filePath.replace(/\.\./g, "");
  const { stdout } = await execFileAsync(
    "docker",
    ["exec", name, "cat", `/app/${safePath}`],
    { timeout: 10_000 }
  );
  return stdout;
}

/**
 * Read directory listing from a container.
 * Returns structured entries compatible with the files API response.
 */
export async function readDirectory(
  orgSlug: string,
  slug: string,
  dirPath: string,
  containerType: ContainerType = "dev"
): Promise<Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }>> {
  const safePath = (dirPath || "").replace(/\.\./g, "");
  const targetDir = safePath ? `/app/${safePath}` : "/app";

  const name = await resolveContainerName(orgSlug, slug, containerType);

  // Use a script that outputs JSON-like data
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec", name,
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
    ],
    { timeout: 10_000 }
  );

  const entries: Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }> = [];
  const now = new Date().toISOString();

  for (const line of stdout.trim().split("\n")) {
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

  // Sort: directories first, then by name
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/**
 * List file tree from the dev container (for agent file context).
 * Returns relative paths and whether each entry is a directory.
 */
export async function listFileTree(
  orgSlug: string,
  slug: string
): Promise<Array<{ relativePath: string; isDirectory: boolean }>> {
  const name = await resolveDevContainerName(orgSlug, slug);
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec", name,
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
    ],
    { timeout: 10_000 }
  );

  const entries: Array<{ relativePath: string; isDirectory: boolean }> = [];

  for (const line of stdout.trim().split("\n")) {
    if (!line || line === "/app") continue;
    const relativePath = line.replace(/^\/app\//, "");
    if (!relativePath) continue;

    entries.push({ relativePath, isDirectory: false });
  }

  // Re-run with -type d to mark directories
  try {
    const { stdout: dirOutput } = await execFileAsync(
      "docker",
      [
        "exec", name,
        "find", "/app", "-type", "d",
        "-not", "-path", "*/node_modules/*",
        "-not", "-path", "*/.git/*",
        "-not", "-path", "*/.next/*",
        "-not", "-path", "*/dist/*",
        "-not", "-path", "*/build/*",
        "-not", "-path", "*/.cache/*",
      ],
      { timeout: 10_000 }
    );

    const dirSet = new Set(
      dirOutput.trim().split("\n")
        .map((d) => d.replace(/^\/app\//, ""))
        .filter(Boolean)
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

// ---------------------------------------------------------------------------
// npm operations
// ---------------------------------------------------------------------------

/**
 * Install npm packages inside the dev container.
 */
export async function installPackages(
  orgSlug: string,
  slug: string,
  packages: string[]
): Promise<string> {
  if (packages.length === 0) return "";

  // Validate package names to prevent injection via docker exec args
  const invalidPkgs = packages.filter((p) => !isValidNpmPackageName(p));
  if (invalidPkgs.length > 0) {
    throw new Error(`Invalid npm package names: ${invalidPkgs.join(", ")}`);
  }

  const name = await resolveDevContainerName(orgSlug, slug);
  const { stdout, stderr } = await execFileAsync(
    "docker",
    ["exec", name, "npm", "install", ...packages],
    { timeout: BUILD_TIMEOUT }
  );
  return stdout + stderr;
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

/**
 * Export app source code from the dev container to a host directory.
 * Excludes node_modules.
 */
export async function exportSource(orgSlug: string, slug: string, destDir: string): Promise<void> {
  const name = await resolveDevContainerName(orgSlug, slug);
  await fsp.mkdir(destDir, { recursive: true });

  // Copy from container to host
  await execFileAsync(
    "docker",
    ["cp", `${name}:/app/.`, destDir],
    { timeout: TIMEOUT }
  );

  // Remove node_modules from the export (it will be reinstalled during production build)
  const nmDir = path.join(destDir, "node_modules");
  await fsp.rm(nmDir, { recursive: true, force: true }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Console bridge
// ---------------------------------------------------------------------------

/**
 * Inject the console bridge script into the container's /app/public/ directory.
 */
export async function injectConsoleBridge(orgSlug: string, slug: string): Promise<void> {
  await writeFiles(orgSlug, slug, [
    { path: "public/__console-bridge.js", content: CONSOLE_BRIDGE_SCRIPT },
  ]);
}

// ---------------------------------------------------------------------------
// Image management
// ---------------------------------------------------------------------------

/**
 * Build an app-specific dev image with additional npm packages on top of the base image.
 * Tags it as aigo-{orgSlug}-{slug}-dev.
 */
export async function buildAppDevImage(
  orgSlug: string,
  slug: string,
  template: string,
  npmPackages: string[]
): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  if (npmPackages.length === 0) {
    // Just tag the base image
    await tagBaseImage(orgSlug, slug, template);
    return;
  }

  // Validate package names to prevent command injection in Dockerfile RUN
  const invalidPkgs = npmPackages.filter((p) => !isValidNpmPackageName(p));
  if (invalidPkgs.length > 0) {
    throw new Error(`Invalid npm package names: ${invalidPkgs.join(", ")}`);
  }

  const imageName = `aigo-${orgSlug}-${slug}-dev`;
  const tmpDir = path.join(os.tmpdir(), `aigo-build-${crypto.randomUUID()}`);
  try {
    await fsp.mkdir(tmpDir, { recursive: true });

    // Write a Dockerfile that extends the base image and installs extra packages
    const dockerfile = [
      `FROM ${tmpl.devBaseImage}:latest`,
      `RUN npm install ${npmPackages.join(" ")}`,
    ].join("\n");

    await fsp.writeFile(path.join(tmpDir, "Dockerfile"), dockerfile, "utf-8");

    await execFileAsync(
      "docker",
      ["build", "-t", imageName, tmpDir],
      { timeout: BUILD_TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Tag the template base image as the app-specific dev image.
 */
export async function tagBaseImage(orgSlug: string, slug: string, template: string): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  await execFileAsync(
    "docker",
    ["tag", `${tmpl.devBaseImage}:latest`, `aigo-${orgSlug}-${slug}-dev`],
    { timeout: TIMEOUT }
  );
}

/**
 * Remove the app-specific dev image.
 */
export async function removeDevImage(orgSlug: string, slug: string): Promise<void> {
  // Remove both new-style and legacy images to ensure cleanup
  for (const img of [`aigo-${orgSlug}-${slug}-dev`, `aigo-dev-${slug}`]) {
    try {
      await execFileAsync("docker", ["rmi", img], {
        timeout: TIMEOUT,
      });
    } catch {
      // Image may not exist
    }
  }
}
