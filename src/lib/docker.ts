import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { getAppPath } from "@/lib/generator";

const execFileAsync = promisify(execFile);

const TIMEOUT = 120_000; // 2 minutes

function composeFile(slug: string): string {
  return path.join(getAppPath(slug), "docker-compose.yml");
}

function containerName(orgSlug: string, slug: string): string {
  return `aigo-${orgSlug}-${slug}-prod`;
}

/** Legacy naming: aigo-{orgSlug}-{slug} (before -prod suffix was added) */
function legacyContainerName(orgSlug: string, slug: string): string {
  return `aigo-${orgSlug}-${slug}`;
}

/**
 * Tag a docker image with a version for rollback
 */
export async function tagImage(orgSlug: string, slug: string, version: number): Promise<void> {
  const base = containerName(orgSlug, slug);
  await execFileAsync(
    "docker",
    ["tag", base, `${base}:v${version}`],
    { timeout: TIMEOUT }
  );
}

/**
 * Start app via docker compose
 */
export async function startApp(slug: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    "docker",
    ["compose", "-f", composeFile(slug), "up", "-d", "--build"],
    { timeout: 300_000 }
  );
  return stdout + stderr;
}

/**
 * Start app from a specific tagged image version (for rollback)
 */
export async function startAppFromImage(orgSlug: string, slug: string, version: number): Promise<string> {
  const base = containerName(orgSlug, slug);
  const imageTag = `${base}:v${version}`;

  // Stop existing container first
  try {
    await stopApp(slug);
  } catch {
    // ignore if not running
  }

  // Run the tagged image directly
  const { stdout, stderr } = await execFileAsync(
    "docker",
    [
      "run", "-d",
      "--name", base,
      "--restart", "unless-stopped",
      imageTag,
    ],
    { timeout: TIMEOUT }
  );
  return stdout + stderr;
}

/**
 * Stop app via docker compose
 */
export async function stopApp(slug: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    "docker",
    ["compose", "-f", composeFile(slug), "down"],
    { timeout: TIMEOUT }
  );
  return stdout + stderr;
}

/**
 * Restart app via docker compose
 */
export async function restartApp(slug: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    "docker",
    ["compose", "-f", composeFile(slug), "restart"],
    { timeout: TIMEOUT }
  );
  return stdout + stderr;
}

/**
 * Get app status from docker compose
 */
export async function getAppDockerStatus(
  slug: string
): Promise<"running" | "stopped" | "error"> {
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["compose", "-f", composeFile(slug), "ps", "--format", "json"],
      { timeout: 10_000 }
    );

    if (!stdout.trim()) return "stopped";

    const containers = stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    const allRunning = containers.every(
      (c: { State: string }) => c.State === "running"
    );
    return allRunning ? "running" : "error";
  } catch {
    return "stopped";
  }
}

/**
 * Get app logs from docker compose
 */
export async function getAppLogs(
  slug: string,
  lines = 100
): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "docker",
      ["compose", "-f", composeFile(slug), "logs", `--tail=${lines}`],
      { timeout: 10_000 }
    );
    return stdout + stderr;
  } catch {
    return "No logs available";
  }
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["info"], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}
