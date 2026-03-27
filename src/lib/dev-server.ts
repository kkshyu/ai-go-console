import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fsp from "node:fs/promises";
import { getTemplate } from "@/lib/templates";
import { getAppPath } from "@/lib/generator";
import { CONSOLE_BRIDGE_SCRIPT } from "@/lib/console-bridge";

interface DevServerProcess {
  process: ChildProcess;
  port: number;
  slug: string;
  logs: string[];
}

// In-memory store for running dev servers
const runningServers = new Map<string, DevServerProcess>();

/**
 * Start a dev server for an app
 */
export async function startDevServer(
  slug: string,
  template: string,
  port: number
): Promise<{ pid: number; port: number }> {
  // Stop existing server if running
  await stopDevServer(slug);

  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  const appDir = getAppPath(slug);
  const logs: string[] = [];

  // Inject console bridge script into public/
  const publicDir = path.join(appDir, "public");
  await fsp.mkdir(publicDir, { recursive: true });
  await fsp.writeFile(
    path.join(publicDir, "__console-bridge.js"),
    CONSOLE_BRIDGE_SCRIPT,
    "utf-8"
  );

  // Install dependencies first
  await new Promise<void>((resolve, reject) => {
    const install = spawn(tmpl.installCommand, tmpl.installArgs, {
      cwd: appDir,
      env: { ...process.env, PORT: String(port) },
      stdio: "pipe",
    });

    install.stdout?.on("data", (data) => {
      logs.push(data.toString());
    });
    install.stderr?.on("data", (data) => {
      logs.push(data.toString());
    });

    install.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Install failed with code ${code}`));
    });

    install.on("error", reject);
  });

  // Start dev server
  const child = spawn(tmpl.devCommand, [...tmpl.devArgs], {
    cwd: appDir,
    env: { ...process.env, PORT: String(port) },
    stdio: "pipe",
    detached: false,
  });

  child.stdout?.on("data", (data) => {
    logs.push(data.toString());
    // Keep last 500 lines
    if (logs.length > 500) logs.splice(0, logs.length - 500);
  });

  child.stderr?.on("data", (data) => {
    logs.push(data.toString());
    if (logs.length > 500) logs.splice(0, logs.length - 500);
  });

  child.on("error", (err) => {
    logs.push(`Error: ${err.message}`);
  });

  child.on("close", (code) => {
    logs.push(`Process exited with code ${code}`);
    runningServers.delete(slug);
  });

  const server: DevServerProcess = {
    process: child,
    port,
    slug,
    logs,
  };

  runningServers.set(slug, server);

  return { pid: child.pid || 0, port };
}

/**
 * Stop a dev server for an app
 */
export async function stopDevServer(slug: string): Promise<void> {
  const server = runningServers.get(slug);
  if (!server) return;

  server.process.kill("SIGTERM");

  // Wait a moment for graceful shutdown
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (!server.process.killed) {
    server.process.kill("SIGKILL");
  }

  runningServers.delete(slug);
}

/**
 * Get dev server status
 */
export function getDevServerStatus(slug: string): {
  running: boolean;
  port?: number;
  pid?: number;
} {
  const server = runningServers.get(slug);
  if (!server || server.process.killed) {
    return { running: false };
  }
  return {
    running: true,
    port: server.port,
    pid: server.process.pid,
  };
}

/**
 * Get dev server logs
 */
export function getDevServerLogs(slug: string, lines = 50): string[] {
  const server = runningServers.get(slug);
  if (!server) return [];
  return server.logs.slice(-lines);
}

/**
 * List all running dev servers
 */
export function listRunningDevServers(): Array<{
  slug: string;
  port: number;
  pid: number;
}> {
  const result: Array<{ slug: string; port: number; pid: number }> = [];
  for (const [slug, server] of runningServers) {
    if (!server.process.killed) {
      result.push({ slug, port: server.port, pid: server.process.pid || 0 });
    }
  }
  return result;
}
