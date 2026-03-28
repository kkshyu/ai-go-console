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

/**
 * Get dev server logs.
 */
export function getDevServerLogs(orgSlug: string, slug: string, lines = 50): Promise<string[]> {
  return sandbox.getDevContainerLogs(orgSlug, slug, lines).then((logs) =>
    logs.split("\n").slice(-lines)
  );
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
