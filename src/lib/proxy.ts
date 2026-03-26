import { prisma } from "@/lib/db";

const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL || "http://localhost:2019";

interface RouteConfig {
  domain: string;
  upstream: string; // e.g., "host.docker.internal:3100"
}

/**
 * Sync all active domains from DB to Caddy configuration.
 * This is the single source of truth: reads from PostgreSQL, pushes to Caddy.
 */
export async function syncCaddyRoutes(): Promise<void> {
  // Get all active domains with their app ports
  const activeDomains = await prisma.appDomain.findMany({
    where: { isActive: true },
    include: {
      app: {
        select: { port: true, slug: true, status: true },
      },
    },
  });

  // Build Caddy JSON config
  const routes = activeDomains
    .filter((d) => d.app.port !== null)
    .map((d) => buildRoute(d.domain, `host.docker.internal:${d.app.port}`));

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

  // Push to Caddy Admin API
  await pushCaddyConfig(caddyConfig);
}

/**
 * Add a single domain route to Caddy
 */
export async function addRoute(domain: string, port: number): Promise<void> {
  await syncCaddyRoutes(); // Re-sync entire config (simple and reliable)
}

/**
 * Remove a domain route from Caddy
 */
export async function removeRoute(domain: string): Promise<void> {
  await syncCaddyRoutes(); // Re-sync entire config
}

function buildRoute(domain: string, upstream: string) {
  return {
    match: [{ host: [domain] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: upstream }],
      },
    ],
  };
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
