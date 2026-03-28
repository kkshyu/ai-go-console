import { prisma } from "@/lib/db";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const CADDY_CONTAINER = process.env.CADDY_CONTAINER || "aigo-caddy";

interface AppWithStatus {
  slug: string;
  port: number;
  status: string;
}

/**
 * Sync all routes to Caddy.
 *
 * Local access domains:
 *   - dev-{org-slug}.localhost/{app-slug}  → developing apps (dev environment)
 *   - {org-slug}.localhost/{app-slug}      → running apps (production environment)
 *
 * Custom domains (OrgDomain) only apply to running (production) apps.
 */
export async function syncRoutes(): Promise<void> {
  const orgs = await prisma.organization.findMany({
    include: {
      domains: { where: { isActive: true } },
      users: {
        include: {
          apps: {
            where: {
              status: { in: ["running", "developing"] },
              port: { not: null },
            },
            select: { slug: true, port: true, status: true },
          },
        },
      },
    },
  });

  const routes: unknown[] = [];
  const localhostDomains: string[] = [];

  for (const org of orgs) {
    const allApps = org.users.flatMap((u) =>
      u.apps.filter((a): a is typeof a & { port: number } => a.port !== null)
    ) as AppWithStatus[];
    if (allApps.length === 0) continue;

    const devApps = allApps.filter((a) => a.status === "developing");
    const prodApps = allApps.filter((a) => a.status === "running");

    // Dev environment: dev-{org-slug}.localhost
    if (devApps.length > 0) {
      const devDomain = `dev-${org.slug}.localhost`;
      localhostDomains.push(devDomain);

      for (const app of devApps) {
        routes.push({
          match: [{ host: [devDomain], path: [`/${app.slug}`, `/${app.slug}/*`] }],
          handle: [
            { handler: "rewrite", strip_path_prefix: `/${app.slug}` },
            { handler: "reverse_proxy", upstreams: [{ dial: `host.docker.internal:${app.port}` }] },
          ],
        });
      }
    }

    // Production environment: {org-slug}.localhost + custom domains
    if (prodApps.length > 0) {
      const prodDomain = `prod-${org.slug}.localhost`;
      localhostDomains.push(prodDomain);

      const prodDomains = [prodDomain];
      for (const d of org.domains) {
        prodDomains.push(d.domain);
      }

      for (const app of prodApps) {
        routes.push({
          match: [{ host: prodDomains, path: [`/${app.slug}`, `/${app.slug}/*`] }],
          handle: [
            { handler: "rewrite", strip_path_prefix: `/${app.slug}` },
            { handler: "reverse_proxy", upstreams: [{ dial: `host.docker.internal:${app.port}` }] },
          ],
        });
      }
    }
  }

  const caddyConfig = buildCaddyConfig(routes, localhostDomains);
  await pushCaddyConfig(caddyConfig);
}

function buildCaddyConfig(routes: unknown[], localhostDomains: string[]): unknown {
  const config: Record<string, unknown> = {
    apps: {
      http: {
        servers: {
          srv0: {
            listen: [":80", ":443"],
            routes,
          },
        },
      },
    },
  };

  // Add TLS automation policy for *.localhost domains (use internal CA)
  if (localhostDomains.length > 0) {
    (config.apps as Record<string, unknown>).tls = {
      automation: {
        policies: [
          {
            subjects: localhostDomains,
            issuers: [{ module: "internal" }],
          },
        ],
      },
    };
  }

  return config;
}

/**
 * Add a route for a single app (triggers full sync)
 */
export async function addRoute(_slug: string, _port: number): Promise<void> {
  await syncRoutes();
}

/**
 * Remove a route for a single app (triggers full sync)
 */
export async function removeRoute(_slug: string): Promise<void> {
  await syncRoutes();
}

/**
 * Get the local access domain for an organization.
 * Production: {org-slug}.localhost
 * Development: dev-{org-slug}.localhost
 */
export function getLocalDomain(orgSlug: string, env: "production" | "development" = "production"): string {
  return env === "development" ? `dev-${orgSlug}.localhost` : `prod-${orgSlug}.localhost`;
}

/**
 * Get all accessible URLs for an app
 */
export async function getAppUrls(
  appSlug: string,
  orgSlug: string,
  orgId: string,
  appStatus?: string
): Promise<{ local: string; custom: string[] }> {
  const isDev = appStatus === "developing";
  const localDomain = getLocalDomain(orgSlug, isDev ? "development" : "production");

  const domains = isDev
    ? []
    : await prisma.orgDomain.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { domain: true },
      });

  return {
    local: `https://${localDomain}/${appSlug}`,
    custom: domains.map((d) => `https://${d.domain}/${appSlug}`),
  };
}

/**
 * Get proxy status info
 */
export async function getProxyStatus(): Promise<{
  available: boolean;
  mode: string;
}> {
  const available = await isCaddyAvailable();
  return { available, mode: "caddy" };
}

async function pushCaddyConfig(config: unknown): Promise<void> {
  // Caddy Admin API rejects requests from Docker host (remote_ip is Docker gateway,
  // not localhost). Use `docker exec` to push config from inside the container.
  // Pipe JSON via stdin to a shell script to avoid escaping issues with large payloads.
  try {
    const configJson = JSON.stringify(config);
    const child = spawn(
      "docker",
      [
        "exec", "-i", CADDY_CONTAINER, "sh", "-c",
        "wget -q -O- --post-file=- --header='Content-Type: application/json' http://127.0.0.1:2019/load",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    let stderr = "";
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`Caddy config push exited ${code}: ${stderr}`));
      });
      child.on("error", reject);
      child.stdin.write(configJson);
      child.stdin.end();
    });
  } catch (error) {
    console.error("Failed to push config to Caddy:", error);
  }
}

/**
 * Check if Caddy is available
 */
export async function isCaddyAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", [
      "exec",
      CADDY_CONTAINER,
      "wget",
      "-q",
      "-O-",
      "--timeout=3",
      "http://127.0.0.1:2019/config/",
    ]);
    return true;
  } catch {
    // Container not running or Caddy not responding
    return false;
  }
}

/** @deprecated Use syncRoutes() instead */
export const syncCaddyRoutes = syncRoutes;
