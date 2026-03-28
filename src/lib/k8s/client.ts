/**
 * Kubernetes API Client
 *
 * Provides configured k8s API clients for the AI Go Console.
 * Loads kubeconfig from environment (KUBECONFIG) or in-cluster config.
 */

import * as k8s from "@kubernetes/client-node";

// ── Configuration ────────────────────────────────────────────────────────────

const K8S_DEV_NAMESPACE = process.env.K8S_DEV_NAMESPACE || "aigo-dev";
const K8S_PROD_NAMESPACE = process.env.K8S_PROD_NAMESPACE || "aigo-prod";
const K8S_SYSTEM_NAMESPACE = process.env.K8S_SYSTEM_NAMESPACE || "aigo-system";
const K8S_WORKER_NAMESPACE = process.env.K8S_WORKER_NAMESPACE || "aigo-workers";
const REGISTRY_URL = process.env.REGISTRY_URL || "localhost:5111";

export const config = {
  devNamespace: K8S_DEV_NAMESPACE,
  prodNamespace: K8S_PROD_NAMESPACE,
  systemNamespace: K8S_SYSTEM_NAMESPACE,
  workerNamespace: K8S_WORKER_NAMESPACE,
  registryUrl: REGISTRY_URL,
} as const;

// ── KubeConfig Loader ────────────────────────────────────────────────────────

let _kc: k8s.KubeConfig | null = null;

function getKubeConfig(): k8s.KubeConfig {
  if (_kc) return _kc;

  _kc = new k8s.KubeConfig();

  // Try in-cluster config first (when running inside k8s)
  // Falls back to default kubeconfig file (~/.kube/config or KUBECONFIG env)
  try {
    _kc.loadFromCluster();
  } catch {
    _kc.loadFromDefault();
  }

  return _kc;
}

// ── API Client Singletons ────────────────────────────────────────────────────

let _coreApi: k8s.CoreV1Api | null = null;
let _appsApi: k8s.AppsV1Api | null = null;
let _networkingApi: k8s.NetworkingV1Api | null = null;
let _batchApi: k8s.BatchV1Api | null = null;
let _customApi: k8s.CustomObjectsApi | null = null;
let _logApi: k8s.Log | null = null;
let _execApi: k8s.Exec | null = null;
let _cpApi: k8s.Cp | null = null;

/** Core v1 API — Pods, Services, Secrets, ConfigMaps, PVCs */
export function coreApi(): k8s.CoreV1Api {
  if (!_coreApi) {
    _coreApi = getKubeConfig().makeApiClient(k8s.CoreV1Api);
  }
  return _coreApi;
}

/** Apps v1 API — Deployments, StatefulSets, DaemonSets */
export function appsApi(): k8s.AppsV1Api {
  if (!_appsApi) {
    _appsApi = getKubeConfig().makeApiClient(k8s.AppsV1Api);
  }
  return _appsApi;
}

/** Networking v1 API — Ingress, NetworkPolicy */
export function networkingApi(): k8s.NetworkingV1Api {
  if (!_networkingApi) {
    _networkingApi = getKubeConfig().makeApiClient(k8s.NetworkingV1Api);
  }
  return _networkingApi;
}

/** Batch v1 API — Jobs, CronJobs */
export function batchApi(): k8s.BatchV1Api {
  if (!_batchApi) {
    _batchApi = getKubeConfig().makeApiClient(k8s.BatchV1Api);
  }
  return _batchApi;
}

/** Custom Objects API — Traefik IngressRoute, Middleware CRDs */
export function customApi(): k8s.CustomObjectsApi {
  if (!_customApi) {
    _customApi = getKubeConfig().makeApiClient(k8s.CustomObjectsApi);
  }
  return _customApi;
}

/** Log API — Stream pod logs */
export function logApi(): k8s.Log {
  if (!_logApi) {
    _logApi = new k8s.Log(getKubeConfig());
  }
  return _logApi;
}

/** Exec API — Execute commands in pods */
export function execApi(): k8s.Exec {
  if (!_execApi) {
    _execApi = new k8s.Exec(getKubeConfig());
  }
  return _execApi;
}

/** Cp API — Copy files to/from pods */
export function cpApi(): k8s.Cp {
  if (!_cpApi) {
    _cpApi = new k8s.Cp(getKubeConfig());
  }
  return _cpApi;
}

// ── Traefik CRD Helpers ──────────────────────────────────────────────────────

const TRAEFIK_GROUP = "traefik.io";
const TRAEFIK_VERSION = "v1alpha1";

/** Create or update a Traefik IngressRoute */
export async function applyIngressRoute(
  namespace: string,
  name: string,
  spec: Record<string, unknown>,
): Promise<void> {
  const body = {
    apiVersion: `${TRAEFIK_GROUP}/${TRAEFIK_VERSION}`,
    kind: "IngressRoute",
    metadata: { name, namespace },
    spec,
  };

  try {
    await customApi().getNamespacedCustomObject(
      TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "ingressroutes", name,
    );
    // Exists — patch it
    await customApi().patchNamespacedCustomObject(
      TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "ingressroutes", name,
      body,
      undefined, undefined, undefined,
      { headers: { "Content-Type": "application/merge-patch+json" } },
    );
  } catch (err: unknown) {
    const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (status === 404) {
      await customApi().createNamespacedCustomObject(
        TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "ingressroutes", body,
      );
    } else {
      throw err;
    }
  }
}

/** Delete a Traefik IngressRoute */
export async function deleteIngressRoute(
  namespace: string,
  name: string,
): Promise<void> {
  try {
    await customApi().deleteNamespacedCustomObject(
      TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "ingressroutes", name,
    );
  } catch (err: unknown) {
    const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (status !== 404) throw err;
  }
}

/** Create or update a Traefik Middleware */
export async function applyMiddleware(
  namespace: string,
  name: string,
  spec: Record<string, unknown>,
): Promise<void> {
  const body = {
    apiVersion: `${TRAEFIK_GROUP}/${TRAEFIK_VERSION}`,
    kind: "Middleware",
    metadata: { name, namespace },
    spec,
  };

  try {
    await customApi().getNamespacedCustomObject(
      TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "middlewares", name,
    );
    await customApi().patchNamespacedCustomObject(
      TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "middlewares", name,
      body,
      undefined, undefined, undefined,
      { headers: { "Content-Type": "application/merge-patch+json" } },
    );
  } catch (err: unknown) {
    const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (status === 404) {
      await customApi().createNamespacedCustomObject(
        TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "middlewares", body,
      );
    } else {
      throw err;
    }
  }
}

/** Delete a Traefik Middleware */
export async function deleteMiddleware(
  namespace: string,
  name: string,
): Promise<void> {
  try {
    await customApi().deleteNamespacedCustomObject(
      TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "middlewares", name,
    );
  } catch (err: unknown) {
    const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (status !== 404) throw err;
  }
}

/** List all IngressRoutes in a namespace */
export async function listIngressRoutes(
  namespace: string,
): Promise<Array<{ metadata: { name: string }; spec: Record<string, unknown> }>> {
  const res = await customApi().listNamespacedCustomObject(
    TRAEFIK_GROUP, TRAEFIK_VERSION, namespace, "ingressroutes",
  );
  const body = res as { items?: Array<{ metadata: { name: string }; spec: Record<string, unknown> }> };
  return body.items || [];
}

// ── Health Check ─────────────────────────────────────────────────────────────

/** Check if the k8s cluster is reachable */
export async function isClusterAvailable(): Promise<boolean> {
  try {
    await coreApi().listNamespace();
    return true;
  } catch {
    return false;
  }
}
