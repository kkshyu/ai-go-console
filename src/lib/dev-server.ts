import * as sandbox from "@/lib/k8s/sandbox";

/**
 * Start a dev server for an app inside a k8s Pod.
 * The Pod must already exist (created by generateApp).
 */
export async function startDevServer(
  orgSlug: string,
  slug: string,
  _template: string,
  port: number
): Promise<{ pid: number; port: number }> {
  const status = await sandbox.getDevContainerStatus(orgSlug, slug);

  if (status === "running") {
    // Pod is already running (created by generateApp) — just inject console bridge
    await sandbox.injectConsoleBridge(orgSlug, slug);
    return { pid: 0, port };
  }

  // Pod exists but not running — start it
  if (status !== "not_found") {
    await sandbox.startDevContainer(orgSlug, slug);
    await sandbox.injectConsoleBridge(orgSlug, slug);
    return { pid: 0, port };
  }

  // Pod not found — cannot start
  throw new Error(`Dev container for ${slug} not found. Run generateApp first.`);
}

/**
 * Stop a dev server for an app.
 */
export async function stopDevServer(orgSlug: string, slug: string): Promise<void> {
  await sandbox.stopDevContainer(orgSlug, slug);
}

/**
 * Get dev server status.
 */
export async function getDevServerStatus(orgSlug: string, slug: string): Promise<{
  running: boolean;
  port?: number;
  pid?: number;
}> {
  const status = await sandbox.getDevContainerStatus(orgSlug, slug);
  if (status === "running") {
    return { running: true, pid: 0 };
  }
  return { running: false };
}

// Log lines matching these patterns are filtered from the dev logs display.
// These are known non-critical messages that would confuse users.
const FILTERED_LOG_PATTERNS = [
  /Found lockfile missing swc dependencies/,
  /Lockfile was successfully patched/,
  /please run "npm install" to ensure @next\/swc/,
  /Attention: Next\.js now collects completely anonymous telemetry/,
  /This information is used to shape Next\.js/,
  /You can learn more, including how to opt-out/,
  /by visiting the following URL:/,
  /https:\/\/nextjs\.org\/telemetry/,
  /Waiting for app files\.\.\./,
  /App files detected\./,
  /Restoring cached node_modules\.\.\./,
  /Installing dependencies\.\.\./,
  /packages are looking for funding/,
  /run `npm fund` for details/,
  /found 0 vulnerabilities/,
  /up to date, audited \d+ packages/,
];

/**
 * Get dev server logs.
 */
export function getDevServerLogs(orgSlug: string, slug: string, lines = 50): Promise<string[]> {
  return sandbox.getDevContainerLogs(orgSlug, slug, lines).then((logs) => {
    const filtered = logs
      .split("\n")
      .filter((line) => !FILTERED_LOG_PATTERNS.some((pattern) => pattern.test(line)));
    // Trim leading empty lines
    while (filtered.length > 0 && filtered[0].trim() === "") {
      filtered.shift();
    }
    return filtered.slice(-lines);
  });
}

/**
 * List all running dev servers by querying Docker.
 */
export async function listRunningDevServers(): Promise<
  Array<{ slug: string; port: number; pid: number }>
> {
  // This would require listing all containers matching the naming pattern.
  // For now return empty — callers typically use getDevServerStatus per-app.
  return [];
}
