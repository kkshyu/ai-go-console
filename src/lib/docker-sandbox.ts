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

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

export function devContainerName(slug: string): string {
  return `aigo-dev-${slug}`;
}

// ---------------------------------------------------------------------------
// Container lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a dev container from the template base image.
 * Does NOT start it — call startDevContainer() afterwards.
 */
export async function createDevContainer(
  slug: string,
  template: string,
  port: number,
  envVars: Record<string, string> = {}
): Promise<string> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  const containerName = devContainerName(slug);
  const imageName = `aigo-dev-${slug}`;

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
export async function startDevContainer(slug: string): Promise<void> {
  await execFileAsync("docker", ["start", devContainerName(slug)], {
    timeout: TIMEOUT,
  });
}

/**
 * Stop a running dev container.
 */
export async function stopDevContainer(slug: string): Promise<void> {
  try {
    await execFileAsync("docker", ["stop", devContainerName(slug)], {
      timeout: TIMEOUT,
    });
  } catch {
    // Container may not be running — ignore
  }
}

/**
 * Remove a dev container (force).
 */
export async function removeDevContainer(slug: string): Promise<void> {
  try {
    await execFileAsync("docker", ["rm", "-f", devContainerName(slug)], {
      timeout: TIMEOUT,
    });
  } catch {
    // Container may not exist — ignore
  }
}

/**
 * Get the status of a dev container.
 */
export async function getDevContainerStatus(
  slug: string
): Promise<"running" | "stopped" | "not_found"> {
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["inspect", "--format", "{{.State.Status}}", devContainerName(slug)],
      { timeout: 10_000 }
    );
    const status = stdout.trim();
    return status === "running" ? "running" : "stopped";
  } catch {
    return "not_found";
  }
}

/**
 * Get logs from a dev container.
 */
export async function getDevContainerLogs(
  slug: string,
  lines = 100
): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "docker",
      ["logs", "--tail", String(lines), devContainerName(slug)],
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
  slug: string,
  template: string,
  port: number,
  envVars: Record<string, string> = {}
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), `aigo-recreate-${crypto.randomUUID()}`);
  try {
    // Export current source files
    await fsp.mkdir(tmpDir, { recursive: true });
    await exportSource(slug, tmpDir);

    // Remove old container
    await removeDevContainer(slug);

    // Create new container with updated env vars
    await createDevContainer(slug, template, port, envVars);

    // Re-inject files (read from temp and write back into container)
    await execFileAsync(
      "docker",
      ["cp", `${tmpDir}/.`, `${devContainerName(slug)}:/app/`],
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
 * Write files into a running or created dev container via docker cp.
 * Files are written to a temp directory first, then copied in bulk.
 */
export async function writeFiles(
  slug: string,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  if (files.length === 0) return;

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
      ["cp", `${tmpDir}/.`, `${devContainerName(slug)}:/app/`],
      { timeout: TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Write binary files (e.g., from upload) into a dev container.
 */
export async function writeFileBuffer(
  slug: string,
  targetPath: string,
  buffer: Buffer
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), `aigo-cp-${crypto.randomUUID()}`);
  try {
    const filePath = path.join(tmpDir, targetPath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, buffer);

    await execFileAsync(
      "docker",
      ["cp", `${tmpDir}/.`, `${devContainerName(slug)}:/app/`],
      { timeout: TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Read a single file from the dev container.
 */
export async function readFile(slug: string, filePath: string): Promise<string> {
  const safePath = filePath.replace(/\.\./g, "");
  const { stdout } = await execFileAsync(
    "docker",
    ["exec", devContainerName(slug), "cat", `/app/${safePath}`],
    { timeout: 10_000 }
  );
  return stdout;
}

/**
 * Read directory listing from the dev container.
 * Returns structured entries compatible with the files API response.
 */
export async function readDirectory(
  slug: string,
  dirPath: string
): Promise<Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }>> {
  const safePath = (dirPath || "").replace(/\.\./g, "");
  const targetDir = safePath ? `/app/${safePath}` : "/app";

  // Use a script that outputs JSON-like data
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec", devContainerName(slug),
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
  slug: string
): Promise<Array<{ relativePath: string; isDirectory: boolean }>> {
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec", devContainerName(slug),
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

    // Check if directory by trailing slash or by looking at find output
    // find outputs directories without trailing slash, so we detect via -type d
    entries.push({ relativePath, isDirectory: false });
  }

  // Re-run with -type d to mark directories
  try {
    const { stdout: dirOutput } = await execFileAsync(
      "docker",
      [
        "exec", devContainerName(slug),
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
  slug: string,
  packages: string[]
): Promise<string> {
  if (packages.length === 0) return "";

  const { stdout, stderr } = await execFileAsync(
    "docker",
    ["exec", devContainerName(slug), "npm", "install", ...packages],
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
export async function exportSource(slug: string, destDir: string): Promise<void> {
  await fsp.mkdir(destDir, { recursive: true });

  // Copy from container to host
  await execFileAsync(
    "docker",
    ["cp", `${devContainerName(slug)}:/app/.`, destDir],
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
export async function injectConsoleBridge(slug: string): Promise<void> {
  await writeFiles(slug, [
    { path: "public/__console-bridge.js", content: CONSOLE_BRIDGE_SCRIPT },
  ]);
}

// ---------------------------------------------------------------------------
// Image management
// ---------------------------------------------------------------------------

/**
 * Build an app-specific dev image with additional npm packages on top of the base image.
 * Tags it as aigo-dev-<slug>.
 */
export async function buildAppDevImage(
  slug: string,
  template: string,
  npmPackages: string[]
): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  if (npmPackages.length === 0) {
    // Just tag the base image
    await tagBaseImage(slug, template);
    return;
  }

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
      ["build", "-t", `aigo-dev-${slug}`, tmpDir],
      { timeout: BUILD_TIMEOUT }
    );
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Tag the template base image as the app-specific dev image.
 */
export async function tagBaseImage(slug: string, template: string): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  await execFileAsync(
    "docker",
    ["tag", `${tmpl.devBaseImage}:latest`, `aigo-dev-${slug}`],
    { timeout: TIMEOUT }
  );
}

/**
 * Remove the app-specific dev image.
 */
export async function removeDevImage(slug: string): Promise<void> {
  try {
    await execFileAsync("docker", ["rmi", `aigo-dev-${slug}`], {
      timeout: TIMEOUT,
    });
  } catch {
    // Image may not exist
  }
}
