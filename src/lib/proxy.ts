import { prisma } from "@/lib/db";

const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL || "http://localhost:2019";

interface OrgApps {
  slug: string;
  domains: string[];
  apps: { slug: string; port: number }[];
}

/**
 * Sync all routes to Caddy.
 * Each org gets an automatic {org-slug}.localhost domain (local access)
 * plus any custom OrgDomain records (production access).
 */
export async function syncRoutes(): Promise<void> {
  // Get all orgs that have running/developing apps
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
            select: { slug: true, port: true },
          },
        },
      },
    },
  });

  const orgAppsList: OrgApps[] = orgs
    .map((org) => {
      const apps = org.users.flatMap((u) =>
        u.apps.filter((a): a is { slug: string; port: number } => a.port !== null)
      );
      if (apps.length === 0) return null;

      // Always include {org-slug}.localhost for local access
      const domains = [`${org.slug}.localhost`];
      // Add custom domains for production
      for (const d of org.domains) {
        domains.push(d.domain);
      }

      return { slug: org.slug, domains, apps };
    })
    .filter((x): x is OrgApps => x !== null);

  // Build Caddy routes
  const routes: unknown[] = [];

  for (const org of orgAppsList) {
    for (const app of org.apps) {
      routes.push({
        match: [
          {
            host: org.domains,
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

  // Collect all localhost domains for internal TLS
  const localhostDomains = orgAppsList.map((o) => `${o.slug}.localhost`);

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
 * Get the local access base URL for an organization
 */
export function getLocalDomain(orgSlug: string): string {
  return `${orgSlug}.localhost`;
}

/**
 * Get all accessible URLs for an app
 */
export async function getAppUrls(
  appSlug: string,
  orgSlug: string,
  orgId: string
): Promise<{ local: string; custom: string[] }> {
  const domains = await prisma.orgDomain.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { domain: true },
  });

  return {
    local: `https://${orgSlug}.localhost/${appSlug}`,
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

/** @deprecated Use syncRoutes() instead */
export const syncCaddyRoutes = syncRoutes;
