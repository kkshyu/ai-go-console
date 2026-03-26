import { prisma } from "@/lib/db";

const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL || "http://localhost:2019";

/**
 * Sync all active org domains from DB to Caddy configuration.
 * Each org domain serves all running apps in that org under /{app-slug}/ path.
 */
export async function syncCaddyRoutes(): Promise<void> {
  // Get all active org domains with their organization's running apps
  const activeDomains = await prisma.orgDomain.findMany({
    where: { isActive: true },
    include: {
      organization: {
        include: {
          users: {
            include: {
              apps: {
                where: {
                  status: { in: ["running", "developing"] },
                  port: { not: null },
                },
                select: { slug: true, port: true },
              },
            },
          },
        },
      },
    },
  });

  // Build routes: for each domain, create path-based routes for all org apps
  const routes: unknown[] = [];

  for (const domainRecord of activeDomains) {
    // Collect all apps across all users in this organization
    const apps = domainRecord.organization.users.flatMap(
      (u: { apps: { slug: string; port: number | null }[] }) => u.apps
    );

    // Create a route per app: {domain}/{app-slug}/* → app port
    for (const app of apps) {
      if (!app.port) continue;
      routes.push({
        match: [
          {
            host: [domainRecord.domain],
            path: [`/${app.slug}`, `/${app.slug}/*`],
          },
        ],
        handle: [
          {
            handler: "rewrite",
            strip_path_prefix: `/${app.slug}`,
          },
          {
            handler: "reverse_proxy",
            upstreams: [{ dial: `host.docker.internal:${app.port}` }],
          },
        ],
      });
    }
  }

  const caddyConfig = {
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

  await pushCaddyConfig(caddyConfig);
}

/**
 * Add a single domain route to Caddy
 */
export async function addRoute(domain: string, port: number): Promise<void> {
  await syncCaddyRoutes();
}

/**
 * Remove a domain route from Caddy
 */
export async function removeRoute(domain: string): Promise<void> {
  await syncCaddyRoutes();
}

async function pushCaddyConfig(config: unknown): Promise<void> {
  try {
    const response = await fetch(`${CADDY_ADMIN_URL}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Caddy config push failed: ${response.status} ${text}`);
    }
  } catch (error) {
    console.error("Failed to connect to Caddy Admin API:", error);
  }
}

/**
 * Check if Caddy is available
 */
export async function isCaddyAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${CADDY_ADMIN_URL}/config/`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
