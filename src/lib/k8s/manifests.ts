/**
 * Kubernetes Manifest Generator
 *
 * Programmatically generates Pod, Deployment, Service, and Traefik
 * IngressRoute/Middleware specs for dev and prod app containers.
 * Replaces the Handlebars-based docker-compose.yml.hbs templates.
 */

import * as k8s from "@kubernetes/client-node";
import { config } from "./client";
import { getInClusterImageUrl } from "./builder";

// ── Naming Conventions ───────────────────────────────────────────────────────

/** Generate dev Pod name */
export function devPodName(orgSlug: string, slug: string): string {
  return `dev-${orgSlug}-${slug}`;
}

/** Generate dev Service name */
export function devServiceName(orgSlug: string, slug: string): string {
  return `svc-dev-${orgSlug}-${slug}`;
}

/** Generate prod Deployment name */
export function prodDeploymentName(orgSlug: string, slug: string): string {
  return `prod-${orgSlug}-${slug}`;
}

/** Generate prod Service name */
export function prodServiceName(orgSlug: string, slug: string): string {
  return `svc-prod-${orgSlug}-${slug}`;
}

/** Generate IngressRoute name */
export function ingressRouteName(type: "dev" | "prod", orgSlug: string, slug: string): string {
  return `${type}-${orgSlug}-${slug}`;
}

/** Generate Middleware name for path stripping */
export function stripMiddlewareName(orgSlug: string, slug: string): string {
  return `strip-${orgSlug}-${slug}`;
}

// ── Common Labels ────────────────────────────────────────────────────────────

function commonLabels(orgSlug: string, slug: string, type: "dev" | "prod"): Record<string, string> {
  return {
    "app.kubernetes.io/part-of": "aigo",
    "app.kubernetes.io/managed-by": "aigo-console",
    "aigo.dev/org": orgSlug,
    "aigo.dev/app": slug,
    "aigo.dev/type": type,
  };
}

// ── Dev Pod Spec ─────────────────────────────────────────────────────────────

export interface DevPodOptions {
  slug: string;
  orgSlug: string;
  template: string;
  internalPort: number;
  envVars: Record<string, string>;
  devCommand?: string[];
  memoryLimitMb?: number;
  cpuLimitMillis?: number;
}

/**
 * Generate a dev Pod spec.
 * Dev containers run the development server directly.
 */
export function generateDevPodSpec(opts: DevPodOptions): k8s.V1Pod {
  const name = devPodName(opts.orgSlug, opts.slug);
  const labels = commonLabels(opts.orgSlug, opts.slug, "dev");
  const image = getInClusterImageUrl(opts.orgSlug, opts.slug, "dev");

  const envList: k8s.V1EnvVar[] = Object.entries(opts.envVars).map(([key, value]) => ({
    name: key,
    value,
  }));

  // Add standard env vars
  envList.push(
    { name: "NODE_ENV", value: "development" },
    { name: "PORT", value: String(opts.internalPort) },
  );

  const memoryLimit = `${opts.memoryLimitMb || 512}Mi`;
  const cpuLimit = `${opts.cpuLimitMillis || 500}m`;

  // Build a startup wrapper that:
  // 1. Waits for template files to be written (package.json as sentinel)
  // 2. Restores node_modules from the base image cache
  // 3. Runs npm install to reconcile dependencies
  // 4. Exec's the original dev command
  const devCmd = opts.devCommand || ["npx", "next", "dev"];
  const execCmd = devCmd.map((c) => `"${c}"`).join(" ");
  const startupScript = [
    // Wait for package.json to appear (written by writeFiles after pod creation)
    `echo "Waiting for app files..."`,
    `while [ ! -f /app/package.json ]; do sleep 0.5; done`,
    `echo "App files detected."`,
    // Restore cached node_modules and lockfile if not present
    `if [ ! -d /app/node_modules ] && [ -d /opt/node_modules_cache ]; then`,
    `  echo "Restoring cached node_modules..."`,
    `  cp -a /opt/node_modules_cache /app/node_modules`,
    `  [ -f /opt/package-lock.json.cache ] && cp -a /opt/package-lock.json.cache /app/package-lock.json`,
    `fi`,
    // Install/reconcile dependencies
    `echo "Installing dependencies..."`,
    `npm install 2>&1`,
    // Disable Next.js telemetry
    `export NEXT_TELEMETRY_DISABLED=1`,
    // Start dev server
    `echo "Starting dev server..."`,
    `exec ${execCmd}`,
  ].join("\n");

  return {
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name,
      namespace: config.devNamespace,
      labels,
    },
    spec: {
      containers: [
        {
          name: "app",
          image,
          ports: [{ containerPort: opts.internalPort }],
          env: envList,
          workingDir: "/app",
          command: ["sh", "-c", startupScript],
          resources: {
            requests: {
              memory: "256Mi",
              cpu: "100m",
            },
            limits: {
              memory: memoryLimit,
              cpu: cpuLimit,
            },
          },
          volumeMounts: [
            {
              name: "app-source",
              mountPath: "/app",
            },
          ],
        },
      ],
      volumes: [
        {
          name: "app-source",
          emptyDir: {},
        },
      ],
      restartPolicy: "Always",
    },
  };
}

// ── Dev Service Spec ─────────────────────────────────────────────────────────

export function generateDevServiceSpec(
  orgSlug: string,
  slug: string,
  internalPort: number,
): k8s.V1Service {
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: devServiceName(orgSlug, slug),
      namespace: config.devNamespace,
      labels: commonLabels(orgSlug, slug, "dev"),
    },
    spec: {
      type: "ClusterIP",
      ports: [
        {
          port: 80,
          targetPort: internalPort as unknown as k8s.IntOrString,
          protocol: "TCP",
        },
      ],
      selector: {
        "aigo.dev/org": orgSlug,
        "aigo.dev/app": slug,
        "aigo.dev/type": "dev",
      },
    },
  };
}

// ── Prod Deployment Spec ─────────────────────────────────────────────────────

export interface ProdDeploymentOptions {
  slug: string;
  orgSlug: string;
  version: number;
  internalPort: number;
  envVars: Record<string, string>;
  replicas?: number;
  memoryLimitMb?: number;
  cpuLimitMillis?: number;
}

export function generateProdDeploymentSpec(opts: ProdDeploymentOptions): k8s.V1Deployment {
  const name = prodDeploymentName(opts.orgSlug, opts.slug);
  const labels = commonLabels(opts.orgSlug, opts.slug, "prod");
  const image = getInClusterImageUrl(opts.orgSlug, opts.slug, "prod", `v${opts.version}`);

  const envList: k8s.V1EnvVar[] = Object.entries(opts.envVars).map(([key, value]) => ({
    name: key,
    value,
  }));

  envList.push(
    { name: "NODE_ENV", value: "production" },
    { name: "PORT", value: String(opts.internalPort) },
  );

  const memoryLimit = `${opts.memoryLimitMb || 256}Mi`;
  const cpuLimit = `${opts.cpuLimitMillis || 250}m`;

  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace: config.prodNamespace,
      labels,
    },
    spec: {
      replicas: opts.replicas || 1,
      selector: {
        matchLabels: {
          "aigo.dev/org": opts.orgSlug,
          "aigo.dev/app": opts.slug,
          "aigo.dev/type": "prod",
        },
      },
      template: {
        metadata: {
          labels,
          annotations: {
            "aigo.dev/version": String(opts.version),
            "aigo.dev/deployed-at": new Date().toISOString(),
          },
        },
        spec: {
          containers: [
            {
              name: "app",
              image,
              ports: [{ containerPort: opts.internalPort }],
              env: envList,
              resources: {
                requests: {
                  memory: "128Mi",
                  cpu: "50m",
                },
                limits: {
                  memory: memoryLimit,
                  cpu: cpuLimit,
                },
              },
              livenessProbe: {
                httpGet: {
                  path: "/",
                  port: opts.internalPort as unknown as k8s.IntOrString,
                },
                initialDelaySeconds: 30,
                periodSeconds: 10,
                timeoutSeconds: 5,
                failureThreshold: 3,
              },
              readinessProbe: {
                httpGet: {
                  path: "/",
                  port: opts.internalPort as unknown as k8s.IntOrString,
                },
                initialDelaySeconds: 5,
                periodSeconds: 5,
                timeoutSeconds: 3,
                failureThreshold: 3,
              },
            },
          ],
        },
      },
      strategy: {
        type: "RollingUpdate",
        rollingUpdate: {
          maxSurge: 1 as unknown as k8s.IntOrString,
          maxUnavailable: 0 as unknown as k8s.IntOrString,
        },
      },
    },
  };
}

// ── Prod Service Spec ────────────────────────────────────────────────────────

export function generateProdServiceSpec(
  orgSlug: string,
  slug: string,
  internalPort: number,
): k8s.V1Service {
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: prodServiceName(orgSlug, slug),
      namespace: config.prodNamespace,
      labels: commonLabels(orgSlug, slug, "prod"),
    },
    spec: {
      type: "ClusterIP",
      ports: [
        {
          port: 80,
          targetPort: internalPort as unknown as k8s.IntOrString,
          protocol: "TCP",
        },
      ],
      selector: {
        "aigo.dev/org": orgSlug,
        "aigo.dev/app": slug,
        "aigo.dev/type": "prod",
      },
    },
  };
}

// ── Traefik IngressRoute Specs ───────────────────────────────────────────────

export interface IngressRouteSpec {
  entryPoints: string[];
  routes: Array<{
    match: string;
    kind: string;
    middlewares?: Array<{ name: string; namespace?: string }>;
    services: Array<{ name: string; port: number; namespace?: string }>;
  }>;
  tls?: { certResolver?: string };
}

/**
 * Generate a Traefik IngressRoute spec for a dev app.
 */
export function generateDevIngressRouteSpec(
  orgSlug: string,
  slug: string,
): IngressRouteSpec {
  const svcName = devServiceName(orgSlug, slug);
  const mwName = stripMiddlewareName(orgSlug, slug);
  const host = `dev-${orgSlug}.localhost`;

  return {
    entryPoints: ["web", "websecure"],
    routes: [
      {
        match: `Host(\`${host}\`) && PathPrefix(\`/${slug}\`)`,
        kind: "Rule",
        middlewares: [
          { name: mwName, namespace: config.devNamespace },
        ],
        services: [
          { name: svcName, port: 80, namespace: config.devNamespace },
        ],
      },
    ],
  };
}

/**
 * Generate a Traefik IngressRoute spec for a prod app.
 * Supports multiple hosts (org localhost + custom domains).
 */
export function generateProdIngressRouteSpec(
  orgSlug: string,
  slug: string,
  customDomains: string[] = [],
): IngressRouteSpec {
  const svcName = prodServiceName(orgSlug, slug);
  const mwName = stripMiddlewareName(orgSlug, slug);
  const hosts = [`prod-${orgSlug}.localhost`, ...customDomains];

  // Build match expression: Host(`a`) || Host(`b`) && PathPrefix(`/slug`)
  const hostMatch = hosts.map((h) => `Host(\`${h}\`)`).join(" || ");
  const match = `(${hostMatch}) && PathPrefix(\`/${slug}\`)`;

  const spec: IngressRouteSpec = {
    entryPoints: ["web", "websecure"],
    routes: [
      {
        match,
        kind: "Rule",
        middlewares: [
          { name: mwName, namespace: config.prodNamespace },
        ],
        services: [
          { name: svcName, port: 80, namespace: config.prodNamespace },
        ],
      },
    ],
  };

  // Add TLS with Let's Encrypt for custom domains
  if (customDomains.length > 0) {
    spec.tls = { certResolver: "letsencrypt" };
  }

  return spec;
}

/**
 * Generate a Traefik Middleware spec for path prefix stripping.
 */
export function generateStripPrefixMiddlewareSpec(slug: string): Record<string, unknown> {
  return {
    stripPrefix: {
      prefixes: [`/${slug}`],
    },
  };
}

// ── HPA Spec ─────────────────────────────────────────────────────────────────

export function generateHPASpec(
  orgSlug: string,
  slug: string,
  minReplicas: number = 1,
  maxReplicas: number = 5,
): k8s.V2HorizontalPodAutoscaler {
  return {
    apiVersion: "autoscaling/v2",
    kind: "HorizontalPodAutoscaler",
    metadata: {
      name: `hpa-${orgSlug}-${slug}`,
      namespace: config.prodNamespace,
      labels: commonLabels(orgSlug, slug, "prod"),
    },
    spec: {
      scaleTargetRef: {
        apiVersion: "apps/v1",
        kind: "Deployment",
        name: prodDeploymentName(orgSlug, slug),
      },
      minReplicas,
      maxReplicas,
      metrics: [
        {
          type: "Resource",
          resource: {
            name: "cpu",
            target: {
              type: "Utilization",
              averageUtilization: 70,
            },
          },
        },
      ],
    },
  };
}
