/**
 * Kubernetes Ingress / Route Manager (Traefik)
 *
 * Manages Traefik IngressRoute + Middleware CRDs for routing
 * dev and prod apps via host/path-based rules.
 */

import { prisma } from "@/lib/db";
import {
  config,
  applyIngressRoute,
  deleteIngressRoute,
  applyMiddleware,
  deleteMiddleware,
  listIngressRoutes,
  isClusterAvailable,
} from "./client";
import {
  ingressRouteName,
  stripMiddlewareName,
  generateDevIngressRouteSpec,
  generateProdIngressRouteSpec,
  generateStripPrefixMiddlewareSpec,
} from "./manifests";

// ── Types ────────────────────────────────────────────────────────────────────

interface AppWithStatus {
  slug: string;
  port: number;
  status: string;
}

// ── Sync Routes ──────────────────────────────────────────────────────────────

/**
 * Sync all routes to Traefik IngressRoute CRDs.
 *
 * Creates/updates/deletes IngressRoute + Middleware resources
 * based on the current database state.
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

  // Collect desired ingress resources
  const desiredDev = new Map<string, { orgSlug: string; slug: string }>();
  const desiredProd = new Map<string, { orgSlug: string; slug: string; customDomains: string[] }>();

  for (const org of orgs) {
    const allApps = org.users.flatMap((u) =>
      u.apps.filter((a): a is typeof a & { port: number } => a.port !== null),
    ) as AppWithStatus[];

    if (allApps.length === 0) continue;

    const devApps = allApps.filter((a) => a.status === "developing");
    const prodApps = allApps.filter((a) => a.status === "running");
    const customDomains = org.domains.map((d) => d.domain);

    for (const app of devApps) {
      const name = ingressRouteName("dev", org.slug, app.slug);
      desiredDev.set(name, { orgSlug: org.slug, slug: app.slug });
    }

    for (const app of prodApps) {
      const name = ingressRouteName("prod", org.slug, app.slug);
      desiredProd.set(name, { orgSlug: org.slug, slug: app.slug, customDomains });
    }
  }

  // Reconcile dev namespace
  await reconcileNamespace(
    config.devNamespace,
    desiredDev,
    (name, info) => createDevIngress(name, info.orgSlug, info.slug),
  );

  // Reconcile prod namespace
  await reconcileNamespace(
    config.prodNamespace,
    desiredProd,
    (name, info) => createProdIngress(name, info.orgSlug, info.slug, info.customDomains),
  );
}

// ── Route Aliases ────────────────────────────────────────────────────────────

/**
 * Add a route (triggers full sync).
 */
export async function addRoute(_slug: string, _port: number): Promise<void> {
  await syncRoutes();
}

/**
 * Remove a route (triggers full sync).
 */
export async function removeRoute(_slug: string): Promise<void> {
  await syncRoutes();
}

// ── Domain Helpers ───────────────────────────────────────────────────────────

/**
 * Get the local access domain for an organization.
 */
export function getLocalDomain(
  orgSlug: string,
  env: "production" | "development" = "production",
): string {
  return env === "development"
    ? `dev-${orgSlug}.localhost`
    : `prod-${orgSlug}.localhost`;
}

/**
 * Get all accessible URLs for an app.
 */
export async function getAppUrls(
  appSlug: string,
  orgSlug: string,
  orgId: string,
  appStatus?: string,
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

// ── Proxy Status ─────────────────────────────────────────────────────────────

/**
 * Get proxy status info.
 */
export async function getProxyStatus(): Promise<{
  available: boolean;
  mode: string;
}> {
  const available = await isTraefikAvailable();
  return { available, mode: "traefik" };
}

/**
 * Check if Traefik Ingress Controller is available.
 */
export async function isTraefikAvailable(): Promise<boolean> {
  return isClusterAvailable();
}

// ── Internal: Create IngressRoute + Middleware ───────────────────────────────

async function createDevIngress(
  name: string,
  orgSlug: string,
  slug: string,
): Promise<void> {
  // Create StripPrefix Middleware
  const mwName = stripMiddlewareName(orgSlug, slug);
  const mwSpec = generateStripPrefixMiddlewareSpec(slug);
  await applyMiddleware(config.devNamespace, mwName, mwSpec);

  // Create IngressRoute
  const irSpec = generateDevIngressRouteSpec(orgSlug, slug);
  await applyIngressRoute(config.devNamespace, name, irSpec as unknown as Record<string, unknown>);
}

async function createProdIngress(
  name: string,
  orgSlug: string,
  slug: string,
  customDomains: string[],
): Promise<void> {
  // Create StripPrefix Middleware
  const mwName = stripMiddlewareName(orgSlug, slug);
  const mwSpec = generateStripPrefixMiddlewareSpec(slug);
  await applyMiddleware(config.prodNamespace, mwName, mwSpec);

  // Create IngressRoute
  const irSpec = generateProdIngressRouteSpec(orgSlug, slug, customDomains);
  await applyIngressRoute(config.prodNamespace, name, irSpec as unknown as Record<string, unknown>);
}

// ── Internal: Reconcile ──────────────────────────────────────────────────────

async function reconcileNamespace<T>(
  namespace: string,
  desired: Map<string, T>,
  createFn: (name: string, info: T) => Promise<void>,
): Promise<void> {
  // Get existing IngressRoutes managed by aigo
  const existing = await listIngressRoutes(namespace);
  const existingNames = new Set(
    existing
      .filter((ir) => ir.metadata?.name)
      .map((ir) => ir.metadata.name),
  );

  // Create or update desired ingresses
  for (const [name, info] of desired) {
    try {
      await createFn(name, info);
    } catch (err) {
      console.error(`Failed to create IngressRoute ${name}:`, err);
    }
  }

  // Delete ingresses that are no longer desired
  // Only delete ingresses that follow our naming pattern (dev-* or prod-*)
  for (const existingName of existingNames) {
    if (
      (existingName.startsWith("dev-") || existingName.startsWith("prod-")) &&
      !desired.has(existingName)
    ) {
      try {
        await deleteIngressRoute(namespace, existingName);
        // Also delete the corresponding Middleware
        // Extract slug from name: dev-{org}-{slug} or prod-{org}-{slug}
        const parts = existingName.split("-");
        if (parts.length >= 3) {
          const orgSlug = parts[1];
          const slug = parts.slice(2).join("-");
          await deleteMiddleware(namespace, stripMiddlewareName(orgSlug, slug));
        }
      } catch (err) {
        console.error(`Failed to delete IngressRoute ${existingName}:`, err);
      }
    }
  }
}
