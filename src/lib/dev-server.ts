import * as sandbox from "@/lib/docker-sandbox";

/**
 * Start a dev server for an app inside a Docker container.
 * The container must already exist (created by generateApp).
 */
export async function startDevServer(
  slug: string,
  _template: string,
  port: number
): Promise<{ pid: number; port: number }> {
  // Stop existing server if running
  await stopDevServer(slug);

  // Inject console bridge script into the container
  await sandbox.injectConsoleBridge(slug);

  // Start the container (dev server CMD runs automatically)
  await sandbox.startDevContainer(slug);

  return { pid: 0, port };
}

/**
 * Stop a dev server for an app.
 */
export async function stopDevServer(slug: string): Promise<void> {
  await sandbox.stopDevContainer(slug);
}

/**
 * Get dev server status.
 */
export async function getDevServerStatus(slug: string): Promise<{
  running: boolean;
  port?: number;
  pid?: number;
}> {
  const status = await sandbox.getDevContainerStatus(slug);
  if (status === "running") {
    return { running: true, pid: 0 };
  }
  return { running: false };
}

/**
 * Get dev server logs.
 */
export function getDevServerLogs(slug: string, lines = 50): Promise<string[]> {
  return sandbox.getDevContainerLogs(slug, lines).then((logs) =>
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
