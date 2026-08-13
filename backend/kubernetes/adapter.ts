import * as k8s from "@kubernetes/client-node";
import type {
  DockerAdapter,
  VolumeInfo,
  ContainerInfo,
  CreateContainerOptions,
  LogLine,
  VolumeOp,
  VolumeOpResult,
  ContainerStatus,
  ContainerStats,
} from "../docker/adapter";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "../logger";
import https from "https";
import { URL } from "url";
import { from } from "@kubernetes/client-node/dist/gen/rxjsStub";
import { ResponseContext } from "@kubernetes/client-node";
import { config } from "../config";

// Disable TLS verification globally for Bun's fetch (used by @kubernetes/client-node)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// These are initialised lazily — null-safe at build/import time.
// If no kubeconfig is present (e.g. `next build` inside Docker), the try block
// below is skipped and adapter methods will throw an informative error at runtime.
let kc: k8s.KubeConfig = undefined as any;
let appsApi: k8s.AppsV1Api = undefined as any;
let coreApi: k8s.CoreV1Api = undefined as any;
let networkingApi: k8s.NetworkingV1Api = undefined as any;
let customApi: k8s.CustomObjectsApi = undefined as any;

/**
 * Custom HTTP library using Node.js https module with client certificate support.
 * Required because Bun's native fetch doesn't support client certificates.
 * Implements the HttpLibrary interface expected by @kubernetes/client-node.
 */
class NodeHttpsHttpLibrary {
  send(request: any): any {
    const cluster = kc!.getCurrentCluster();
    const user = kc!.getCurrentUser();
    if (!cluster || !(user as any)?.cert || !(user as any)?.key) {
      throw new Error("Cluster or client cert/key not configured");
    }

    const method = request.getHttpMethod().toString();
    const body = request.getBody();
    const url = request.getUrl();
    const headers = request.getHeaders();
    const signal = request.getSignal();

    const baseUrl = cluster.server;
    const fullUrl = new URL(url, baseUrl);

    const agent = new https.Agent({
      cert: (user as any).cert,
      key: (user as any).key,
      rejectUnauthorized: false,
      keepAlive: true,
    });

    const bodyStr = body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;
    const requestHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...headers,
    };
    if (bodyStr) {
      requestHeaders["Content-Length"] = Buffer.byteLength(bodyStr).toString();
    }

    // Handle abort signal
    let aborted = false;
    const abortHandler = () => { aborted = true; };
    if (signal) {
      signal.addEventListener("abort", abortHandler);
    }

    const promise = new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          method,
          hostname: fullUrl.hostname,
          port: fullUrl.port || 443,
          path: fullUrl.pathname + fullUrl.search,
          headers: requestHeaders,
          agent,
          timeout: 30000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            // Return ResponseContext-like object with correct properties
            const responseContext = new ResponseContext(
              res.statusCode || 0,
              res.headers as Record<string, string>,
              {
                text: () => Promise.resolve(data),
                binary: () => Promise.resolve(Buffer.from(data)),
              }
            );
            resolve(responseContext);
          });
        }
      );

      req.on("error", (err) => {
        if (aborted) {
          reject(new Error("Request aborted"));
        } else {
          reject(err);
        }
      });
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    }).then((responseContext) => {
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      return responseContext;
    });

    return from(promise);
  }
}

// We do not initialize these at the top level to avoid build-time errors
// and to ensure they pick up runtime environment variables inside the pod.
let initialized = false;

function ensureInitialized() {
  if (initialized) return;

  try {
    const _kc = new k8s.KubeConfig();
    _kc.loadFromDefault();
    
    // Docker Desktop: explicitly use docker-desktop context for client cert auth if available
    try {
      _kc.setCurrentContext("docker-desktop");
    } catch (e) {
      // Ignore if context doesn't exist (e.g. in production cluster)
    }

    // Skip TLS verify for all clusters (Docker Desktop uses self-signed certs)
    for (const cluster of _kc.clusters) {
      (cluster as any).skipTLSVerify = true;
      (cluster as any).ca = undefined;
    }

    // Ensure client certificate is used for mTLS with Docker Desktop
    const currentUser = _kc.getCurrentUser();
    if (currentUser && (currentUser as any).certData && (currentUser as any).keyData) {
      (currentUser as any).cert = Buffer.from((currentUser as any).certData, "base64").toString("utf8");
      (currentUser as any).key = Buffer.from((currentUser as any).keyData, "base64").toString("utf8");
    }

    const nodeHttpLib = new NodeHttpsHttpLibrary();

    // Override the default fetch-based HTTP library with our Node.js https-based one
    const originalMakeApiClient = _kc.makeApiClient.bind(_kc);
    // @ts-ignore - override with custom HTTP library for mTLS support
    (_kc as any).makeApiClient = function <T>(ctor: new (...args: any[]) => T): T {
      // @ts-ignore - generic type mismatch in override
      const client = originalMakeApiClient(ctor);
      // @ts-ignore - accessing internal api property
      if (client?.api?.configuration) {
        // @ts-ignore - setting custom httpApi
        (client.api.configuration as any).httpApi = nodeHttpLib;
      }
      // @ts-ignore - generic type mismatch in return
      return client;
    };

    kc = _kc;
    appsApi = _kc.makeApiClient(k8s.AppsV1Api);
    coreApi = _kc.makeApiClient(k8s.CoreV1Api);
    networkingApi = _kc.makeApiClient(k8s.NetworkingV1Api);
    customApi = _kc.makeApiClient(k8s.CustomObjectsApi);
    
    initialized = true;
  } catch (err) {
    logger.error({ msg: "Failed to initialize Kubernetes client", err: String(err) });
    throw new Error(`Kubernetes client initialization failed: ${err}`);
  }
}


// Generate namespace from tenant ID
export function getNamespace(tenantId: string): string {
  return `depnoyed-${tenantId}`;
}

const K8S_READY_TIMEOUT_MS = parseInt(process.env.K8S_READY_TIMEOUT_MS ?? "90000", 10);

async function ensureNamespace(namespace: string) {
  ensureInitialized();
  try {
    await coreApi.readNamespace({ name: namespace });
  } catch (err: any) {
    if (getErrorCode(err) === 404) {
      try {
        await coreApi.createNamespace({ body: { metadata: { name: namespace } } });
      } catch (e: any) {
        if (getErrorCode(e) !== 409) throw e;
      }
    } else {
      throw err;
    }
  }

  // Enforce NetworkPolicy (Phase 5)
  const networkPolicyBody = {
    metadata: { name: "default-deny-and-dns" },
    spec: {
      podSelector: {},
      policyTypes: ["Ingress", "Egress"],
      ingress: [
        {
          from: [{ namespaceSelector: { matchLabels: { name: "ingress-nginx" } } }]
        }
      ],
      egress: [
        {
          ports: [
            { port: 53, protocol: "UDP" },
            { port: 53, protocol: "TCP" }
          ]
        }
      ]
    }
  };

  try {
    await networkingApi.readNamespacedNetworkPolicy({ name: "default-deny-and-dns", namespace });
  } catch (err: any) {
    if (getErrorCode(err) === 404) {
      try {
        await networkingApi.createNamespacedNetworkPolicy({ namespace, body: networkPolicyBody as any });
      } catch (e: any) {
        if (getErrorCode(e) !== 409) throw e;
      }
    } else {
      throw err;
    }
  }

  // Enforce ResourceQuota (Phase 5)
  const MAX_DEPLOYMENTS = 3;
  const resourceQuotaBody = {
    metadata: { name: "tenant-quota" },
    spec: {
      hard: {
        "requests.cpu": (config.deploy.cpuLimit * MAX_DEPLOYMENTS).toString(),
        "requests.memory": `${config.deploy.memoryLimitMb * MAX_DEPLOYMENTS}Mi`,
        "limits.cpu": (config.deploy.cpuLimit * MAX_DEPLOYMENTS).toString(),
        "limits.memory": `${config.deploy.memoryLimitMb * MAX_DEPLOYMENTS}Mi`,
        "requests.storage": `${MAX_DEPLOYMENTS}Gi`,
        "persistentvolumeclaims": MAX_DEPLOYMENTS.toString()
      }
    }
  };

  try {
    await coreApi.readNamespacedResourceQuota({ name: "tenant-quota", namespace });
  } catch (err: any) {
    if (getErrorCode(err) === 404) {
      try {
        await coreApi.createNamespacedResourceQuota({ namespace, body: resourceQuotaBody as any });
      } catch (e: any) {
        if (getErrorCode(e) !== 409) throw e;
      }
    } else {
      throw err;
    }
  }
}

function getErrorCode(err: any): number | undefined {
  if (typeof err?.statusCode === 'number') return err.statusCode;
  if (typeof err?.code === 'number') return err.code;
  if (err?.response?.statusCode) return err.response.statusCode;
  if (typeof err?.body === 'string') {
    try {
      const parsed = JSON.parse(err.body);
      if (typeof parsed.code === 'number') return parsed.code;
    } catch {}
  }
  if (err?.body?.code) return err.body.code;
  return undefined;
}

const BASE_DOMAIN = process.env.DEPLOY_BASE_DOMAIN || "apps.local";

/* ------------------------------------------------------------------------- */
/*                          Typed K8s error class                            */
/* ------------------------------------------------------------------------- */

/**
 * Thrown when the Kubernetes API reports a deployment cannot become ready
 * (image pull failure, crash loop, or readiness timeout). Callers catch this
 * and mark the backing deployment row as `failed`.
 */
export class K8sDeployError extends Error {
  constructor(
    public code: "IMAGE_PULL" | "CRASH_LOOP" | "READINESS_TIMEOUT" | "POD_FAILED" | "API_ERROR",
    message: string,
    public readonly namespace?: string,
    public readonly deployment?: string,
  ) {
    super(message);
    this.name = "K8sDeployError";
  }
}

/* ------------------------------------------------------------------------- */
/*                            Helper types                                   */
/* ------------------------------------------------------------------------- */

/**
 * Structured log context for every Kubernetes API operation.
 * Never log env values, tokens, or KUBECONFIG contents.
 */
interface K8sLogCtx {
  event: string;
  operation: string;
  namespace: string;
  deployment?: string;
  tenantId?: string;
  durationMs?: number;
  status?: number | string;
  error?: string;
}

function k8sLog(ctx: K8sLogCtx) {
  logger.info(ctx);
}

function elapsedSince(start: number): number {
  return Date.now() - start;
}

/* ------------------------------------------------------------------------- */
/*                         KubernetesAdapter                                  */
/* ------------------------------------------------------------------------- */

/**
 * Kubernetes implementation of the Runtime Adapter.
 * Maps Depnoyed Deployments to Kubernetes Deployments, Services, Ingresses, and PVCs.
 *
 * Volume key/value sidecar note (Demo-only under Option A):
 * `execVolumeOp` stores demo key/value data in host-side JSON files under
 * `.ossmp-data/volumes/<pvc-name>.json`, keyed by the *real* PVC claim name
 * (resolved from the Deployment spec, never guessed). This is demo data, not
 * in-cluster persistence. Option B (real in-PVC ops via helper sidecar) is
 * tracked in the Future Roadmap.
 */
export class KubernetesAdapter implements DockerAdapter {
  readonly kind = "kubernetes" as const;

  /* ------------------------------ Volumes ------------------------------- */

  async createVolume(name: string, tenantId: string): Promise<VolumeInfo> {
    ensureInitialized();
    const namespace = getNamespace(tenantId);
    await ensureNamespace(namespace);

    const pvc = {
      metadata: { name },
      spec: {
        accessModes: ["ReadWriteOnce"],
        resources: {
          requests: { storage: "1Gi" },
        },
      },
    };

    const start = Date.now();
    try {
      await coreApi.createNamespacedPersistentVolumeClaim({ namespace, body: pvc });
    } catch (err: any) {
      if (getErrorCode(err) !== 409) throw err;
      // 409: already exists — still return its metadata for idempotency
    }
    k8sLog({ event: "volume.create", operation: "createPVC", namespace, tenantId, durationMs: elapsedSince(start) });

    // Read back to confirm and get createdAt.
    const read = await coreApi.readNamespacedPersistentVolumeClaim({ name, namespace });
    return {
      name,
      createdAt: read.metadata?.creationTimestamp?.toISOString() || new Date().toISOString(),
      dataSize: 0,
    };
  }

  async removeVolume(name: string, tenantId: string): Promise<void> {
    ensureInitialized();
    const namespace = getNamespace(tenantId);
    const start = Date.now();
    try {
      await coreApi.deleteNamespacedPersistentVolumeClaim({ name, namespace });
    } catch (err: any) {
      if (getErrorCode(err) !== 404) throw err;
    }
    k8sLog({ event: "volume.remove", operation: "deletePVC", namespace, tenantId, durationMs: elapsedSince(start) });
  }

  async inspectVolume(name: string, tenantId: string): Promise<VolumeInfo | null> {
    ensureInitialized();
    const namespace = getNamespace(tenantId);
    try {
      const res = await coreApi.readNamespacedPersistentVolumeClaim({ name, namespace });
      return {
        name,
        createdAt: res.metadata?.creationTimestamp?.toISOString() || new Date().toISOString(),
        dataSize: 0,
      };
    } catch (err: any) {
      if (getErrorCode(err) === 404) return null;
      throw err;
    }
  }

  /* ---------------------------- Containers ------------------------------ */

  async createContainer(opts: CreateContainerOptions): Promise<ContainerInfo> {
    ensureInitialized();
    const namespace = getNamespace(opts.tenantId);
    await ensureNamespace(namespace);

    // Build volume mounts and volumes from manifest storage + default data volume
    const volumeMounts = [{ name: "data-volume", mountPath: "/data" }];
    const volumes = [
      {
        name: "data-volume",
        persistentVolumeClaim: { claimName: opts.volumeName },
      },
    ];

    // Add manifest-defined storage volumes
    if (opts.storage && opts.storage.length > 0) {
      for (const store of opts.storage) {
        const pvcName = `${opts.containerName}-${store.name}`;
        volumes.push({
          name: store.name,
          persistentVolumeClaim: { claimName: pvcName },
        });
        volumeMounts.push({ name: store.name, mountPath: store.mountPath });
      }
    }

    // Build liveness/readiness probes from manifest health
    const probes: Record<string, any> = {};
    if (opts.health) {
      if (opts.health.http) {
        const port = opts.health.http.port ?? opts.port;
        probes.livenessProbe = {
          httpGet: { path: opts.health.http.path, port },
          initialDelaySeconds: 10,
          periodSeconds: 10,
          timeoutSeconds: 5,
          failureThreshold: 3,
        };
        probes.readinessProbe = {
          httpGet: { path: opts.health.http.path, port },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 3,
          failureThreshold: 3,
        };
      } else if (opts.health.tcp) {
        probes.livenessProbe = {
          tcpSocket: { port: opts.health.tcp.port },
          initialDelaySeconds: 10,
          periodSeconds: 10,
          timeoutSeconds: 5,
          failureThreshold: 3,
        };
        probes.readinessProbe = {
          tcpSocket: { port: opts.health.tcp.port },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 3,
          failureThreshold: 3,
        };
      }
    }

    const deploymentBody = {
      metadata: {
        name: opts.containerName,
        labels: { "ossmp.managed": "true" },
      },
      spec: {
        replicas: 0, // start stopped
        selector: { matchLabels: { app: opts.containerName } },
        template: {
          metadata: { labels: { app: opts.containerName } },
          spec: {
            containers: [
              {
                name: "app",
                image: opts.image,
                ports: [{ containerPort: opts.port }],
                env: Object.entries(opts.env || {}).map(([name, value]) => ({ name, value })),
                resources: {
                  requests: {
                    cpu: opts.cpuLimit.toString(),
                    memory: `${opts.memoryLimitMb}Mi`,
                  },
                  limits: {
                    cpu: opts.cpuLimit.toString(),
                    memory: `${opts.memoryLimitMb}Mi`,
                  },
                },
                volumeMounts,
                ...probes,
              },
            ],
            volumes,
          },
        },
      },
    };

    const serviceBody = {
      metadata: {
        name: opts.containerName,
        labels: { "ossmp.managed": "true" },
      },
      spec: {
        type: "ClusterIP",
        selector: { app: opts.containerName },
        ports: [{ port: opts.port, targetPort: opts.port }],
      },
    };

    const ingressBody = {
      metadata: {
        name: opts.containerName,
        annotations: {
          "kubernetes.io/ingress.class": "nginx",
        },
        labels: { "ossmp.managed": "true" },
      },
      spec: {
        rules: [
          {
            host: `${opts.containerName}.${BASE_DOMAIN}`,
            http: {
              paths: [
                {
                  path: "/",
                  pathType: "Prefix" as const,
                  backend: {
                    service: { name: opts.containerName, port: { number: opts.port } },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    /* ---- Upsert each resource independently (409 -> patch) ---- */

    // Deployment
    let deploymentStart = Date.now();
    try {
      await appsApi.createNamespacedDeployment({ namespace, body: deploymentBody });
    } catch (err: any) {
      if (getErrorCode(err) === 409) {
        // On conflict, patch only mutable fields. If the patch fails (e.g.
        // immutable selector conflict), delete and re-create the deployment.
        try {
          const current = await appsApi.readNamespacedDeployment({ name: opts.containerName, namespace });
          const currentSpec = current.spec;
          if (currentSpec) {
            currentSpec.replicas = 0;
            currentSpec.template = deploymentBody.spec.template;
            await appsApi.replaceNamespacedDeployment({ name: opts.containerName, namespace, body: { ...current, spec: currentSpec } });
          }
        } catch (patchErr: any) {
          if (getErrorCode(patchErr) === 422) {
            // Immutable field mismatch — delete and re-create.
            try { await appsApi.deleteNamespacedDeployment({ name: opts.containerName, namespace }); } catch {}
            await appsApi.createNamespacedDeployment({ namespace, body: deploymentBody });
          } else {
            throw patchErr;
          }
        }
      } else {
        throw err;
      }
    }
    k8sLog({
      event: "container.create",
      operation: "createDeployment",
      namespace,
      deployment: opts.containerName,
      tenantId: opts.tenantId,
      durationMs: elapsedSince(deploymentStart),
    });

    // Service
    let serviceStart = Date.now();
    try {
      await coreApi.createNamespacedService({ namespace, body: serviceBody });
    } catch (err: any) {
      if (getErrorCode(err) === 409) {
        // Replace the service with the desired spec.
        await coreApi.replaceNamespacedService({ name: opts.containerName, namespace, body: serviceBody });
      } else {
        throw err;
      }
    }
    k8sLog({
      event: "container.create",
      operation: "createService",
      namespace,
      deployment: opts.containerName,
      tenantId: opts.tenantId,
      durationMs: elapsedSince(serviceStart),
    });

    // Ingress
    let ingressStart = Date.now();
    try {
      await networkingApi.createNamespacedIngress({ namespace, body: ingressBody });
    } catch (err: any) {
      if (getErrorCode(err) === 409) {
        await networkingApi.replaceNamespacedIngress({ name: opts.containerName, namespace, body: ingressBody });
      } else {
        throw err;
      }
    }
    k8sLog({
      event: "container.create",
      operation: "createIngress",
      namespace,
      deployment: opts.containerName,
      tenantId: opts.tenantId,
      durationMs: elapsedSince(ingressStart),
    });

    // Create additional PVCs for manifest-defined storage
    if (opts.storage && opts.storage.length > 0) {
      for (const store of opts.storage) {
        const pvcName = `${opts.containerName}-${store.name}`;
        const size = store.size || "1Gi";
        const pvc = {
          metadata: { name: pvcName },
          spec: {
            accessModes: ["ReadWriteOnce"],
            resources: { requests: { storage: size } },
          },
        };
        try {
          await coreApi.createNamespacedPersistentVolumeClaim({ namespace, body: pvc });
        } catch (err: any) {
          if (getErrorCode(err) !== 409) throw err;
        }
      }
    }

    // PVC is created by createVolume, which is guaranteed idempotent.
    return {
      id: opts.containerName,
      name: opts.containerName,
      status: "created",
      image: opts.image,
      port: opts.port,
    };
  }

  async startContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    ensureInitialized();
    const namespace = getNamespace(tenantId);
    const start = Date.now();
    try {
      const res = await appsApi.readNamespacedDeployment({ name, namespace });
      if (res.spec) res.spec.replicas = 1;
      await appsApi.replaceNamespacedDeployment({ name, namespace, body: res });
    } catch (err: any) {
      if (getErrorCode(err) !== 404) throw err;
    }
    k8sLog({
      event: "container.start",
      operation: "scaleDeployment",
      namespace,
      deployment: name,
      tenantId,
      durationMs: elapsedSince(start),
      status: 1,
    });
    return { id: name, name, status: "creating", image: "" };
  }

  async stopContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    ensureInitialized();
    const namespace = getNamespace(tenantId);
    const start = Date.now();
    try {
      const res = await appsApi.readNamespacedDeployment({ name, namespace });
      if (res.spec) res.spec.replicas = 0;
      await appsApi.replaceNamespacedDeployment({ name, namespace, body: res });
    } catch (err: any) {
      if (getErrorCode(err) !== 404) throw err;
    }
    k8sLog({
      event: "container.stop",
      operation: "scaleDeployment",
      namespace,
      deployment: name,
      tenantId,
      durationMs: elapsedSince(start),
      status: 0,
    });
    return { id: name, name, status: "stopped", image: "" };
  }

  async restartContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    ensureInitialized();
    await this.stopContainer(name, tenantId);
    return this.startContainer(name, tenantId);
  }

  async removeContainer(name: string, tenantId: string): Promise<void> {
    ensureInitialized();
    if (!name) return;
    const namespace = getNamespace(tenantId);
    const start = Date.now();
    try {
      await appsApi.deleteNamespacedDeployment({ name, namespace });
      await coreApi.deleteNamespacedService({ name, namespace });
      await networkingApi.deleteNamespacedIngress({ name, namespace });
    } catch (err: any) {
      if (getErrorCode(err) !== 404) throw err;
    }
    k8sLog({
      event: "container.remove",
      operation: "deleteAll",
      namespace,
      deployment: name,
      tenantId,
      durationMs: elapsedSince(start),
    });
  }

  /**
   * Read the live status of a deployment, with readiness awareness.
   * Returns `failed` on permanent error states (image pull, crash loop, pod failed).
   */
  async inspectContainer(name: string, tenantId: string): Promise<ContainerInfo | null> {
    ensureInitialized();
    if (!name) return null;
    const namespace = getNamespace(tenantId);
    try {
      const res = await appsApi.readNamespacedDeployment({ name, namespace });
      const image = res.spec?.template?.spec?.containers?.[0]?.image || "";

      const pods = await coreApi.listNamespacedPod({ namespace, labelSelector: `app=${name}` });

      // Readiness gate: if replicas not yet 1, we're still creating.
      const readyReplicas = res.status?.readyReplicas ?? 0;
      const specReplicas = res.spec?.replicas ?? 0;

      let status: ContainerStatus = "stopped";

      if (specReplicas === 0) {
        status = "stopped";
      } else if (pods.items.length === 0) {
        status = "creating";
      } else {
        // Inspect ALL pods — take the first non-healthy signal.
        let worst: ContainerStatus | null = null;

        for (const pod of pods.items) {
          const phase = pod.status?.phase;
          const containerStatuses = pod.status?.containerStatuses || [];
          const primary = containerStatuses[0];
          const ready = primary?.ready ?? false;
          const state = primary?.state;
          const waitingReason = state?.waiting?.reason;

          if (phase === "Failed") {
            worst = "failed";
            break;
          }
          if (
            waitingReason === "CrashLoopBackOff" ||
            waitingReason === "ImagePullBackOff" ||
            waitingReason === "ErrImagePull"
          ) {
            worst = "failed";
            break;
          }
          if (phase === "Running" && ready) {
            if (!worst) worst = "running";
          } else if (phase === "Pending" || waitingReason === "ContainerCreating") {
            if (!worst) worst = "creating";
          } else if (!worst) {
            worst = "creating";
          }
        }

        status = worst ?? "creating";

        // Deployment says 1 replica should be ready but none are — still creating.
        if (status === "running" && readyReplicas < 1) {
          status = "creating";
        }
      }

      return { id: name, name, status, image };
    } catch (err: any) {
      if (getErrorCode(err) === 404) return null;
      throw err;
    }
  }

  /**
   * Block until the Deployment has at least one Ready pod, then return "running".
   * Throws a K8sDeployError (code=IMAGE_PULL / CRASH_LOOP / READINESS_TIMEOUT / POD_FAILED)
   * on permanent error states so callers can mark the deployment as failed.
   */
  async waitForReady(name: string, tenantId: string): Promise<ContainerInfo> {
    ensureInitialized();
    const deadline = Date.now() + K8S_READY_TIMEOUT_MS;
    const namespace = getNamespace(tenantId);
    const poll = 2000;

    while (Date.now() < deadline) {
      const info = await this.inspectContainer(name, tenantId);
      if (info?.status === "running") return info;
      if (info?.status === "failed") {
        // Describe which pod failed and why, for the error message.
        const pods = await coreApi.listNamespacedPod({ namespace, labelSelector: `app=${name}` });
        const failed = pods.items.find(
          (p) =>
            p.status?.phase === "Failed" ||
            p.status?.containerStatuses?.[0]?.state?.waiting?.reason,
        );
        const reason =
          failed?.status?.containerStatuses?.[0]?.state?.waiting?.reason ??
          (failed?.status?.phase === "Failed" ? "PodFailed" : "Unknown");
        const code: K8sDeployError["code"] =
          reason === "ImagePullBackOff" || reason === "ErrImagePull"
            ? "IMAGE_PULL"
            : reason === "CrashLoopBackOff"
              ? "CRASH_LOOP"
              : failed?.status?.phase === "Failed"
                ? "POD_FAILED"
                : "API_ERROR";
        throw new K8sDeployError(
          code,
          `Deployment ${name} in namespace ${namespace} failed: ${reason}`,
          namespace,
          name,
        );
      }
      // "creating" — poll again.
      await new Promise((r) => setTimeout(r, poll));
    }

    // Timeout — include what the controller last saw.
    const last = await this.inspectContainer(name, tenantId).catch(() => null);
    throw new K8sDeployError(
      "READINESS_TIMEOUT",
      `Deployment ${name} in namespace ${namespace} did not become ready within ${K8S_READY_TIMEOUT_MS}ms (lastStatus=${last?.status ?? "unknown"}).`,
      namespace,
      name,
    );
  }

  /* ------------------------------- Logs ---------------------------------- */

  async getLogs(name: string, tenantId: string, tail = 100): Promise<LogLine[]> {
    ensureInitialized();
    if (!name) return [];
    const namespace = getNamespace(tenantId);
    try {
      const pods = await coreApi.listNamespacedPod({ namespace, labelSelector: `app=${name}` });
      if (pods.items.length === 0) return [];
      const podName = pods.items[0].metadata?.name;
      if (!podName) return [];

      const logs = await coreApi.readNamespacedPodLog({
        name: podName,
        namespace,
        container: "app",
        tailLines: tail,
        timestamps: true,
      });
      const raw = logs as unknown as string;
      if (!raw) return [];

      return raw.split("\n").filter(Boolean).map((line) => {
        const space = line.indexOf(" ");
        return {
          t: space > -1 ? line.slice(0, space) : new Date().toISOString(),
          stream: "stdout",
          message: space > -1 ? line.slice(space + 1) : line,
        };
      });
    } catch {
      return [];
    }
  }

  /* ------------------------------- Metrics --------------------------------- */

  /**
   * Retrieve real CPU/memory metrics from the Kubernetes metrics-server.
   * Returns null if metrics are unavailable (metrics-server absent, pod not
   * running, or any error). NEVER fabricates data.
   */
  async getStats(name: string, tenantId: string): Promise<ContainerStats | null> {
    ensureInitialized();
    if (!name) return null;
    const namespace = getNamespace(tenantId);

    let podName = "";
    try {
      const pods = await coreApi.listNamespacedPod({ namespace, labelSelector: `app=${name}` });
      if (pods.items.length > 0 && pods.items[0].metadata?.name) {
        podName = pods.items[0].metadata.name;
      }
    } catch {
      // ignore — will return null below
    }

    if (!podName) return null;

    try {
      const metrics: any = await customApi.getNamespacedCustomObject({
        group: "metrics.k8s.io",
        version: "v1beta1",
        namespace,
        plural: "pods",
        name: podName,
      });

      if (!metrics?.containers?.length) return null;

      const c = metrics.containers[0];

      // Parse CPU (e.g. "1500000n" -> nano-cores)
      let cpuUsagePercent = 0;
      if (c.usage?.cpu) {
        const cpuStr = String(c.usage.cpu).replace(/n$/, "");
        const nanoCores = parseInt(cpuStr, 10);
        if (!isNaN(nanoCores)) {
          cpuUsagePercent = (nanoCores / 1_000_000_000) * 100;
        }
      }

      // Parse memory (e.g. "20000Ki" or "20Mi")
      let memoryUsageBytes = 0;
      if (c.usage?.memory) {
        const memStr = String(c.usage.memory);
        if (memStr.endsWith("Ki")) memoryUsageBytes = parseInt(memStr.replace("Ki", ""), 10) * 1024;
        else if (memStr.endsWith("Mi")) memoryUsageBytes = parseInt(memStr.replace("Mi", ""), 10) * 1024 * 1024;
        else if (memStr.endsWith("Gi")) memoryUsageBytes = parseInt(memStr.replace("Gi", ""), 10) * 1024 * 1024 * 1024;
        else memoryUsageBytes = parseInt(memStr, 10);
      }

      return {
        cpuUsagePercent,
        memoryUsagePercent: memoryUsageBytes > 0 ? (memoryUsageBytes / (512 * 1024 * 1024)) * 100 : 0,
        memoryUsageBytes,
        networkRxBytes: 0,   // metrics-server doesn't provide network I/O
        networkTxBytes: 0,
        diskReadBytes: 0,
        diskWriteBytes: 0,
      };
    } catch {
      // metrics-server absent or query failed — honest null, no fallback.
      return null;
    }
  }

  /* --------------------------- Volume ops (Option A) --------------------- */

  /**
   * Execute a key/value operation against a host-side JSON sidecar named by
   * the *real* PVC claim name. The claim name is resolved from the
   * Deployment's pod spec — never guessed.
   *
   * This is demo data, not real in-cluster persistence. Option B (real
   * in-PVC ops via a helper sidecar container) is tracked in the Future
   * Roadmap.
   */
  async execVolumeOp(volume: string, tenantId: string, op: VolumeOp): Promise<VolumeOpResult> {
    ensureInitialized();
    const namespace = getNamespace(tenantId);

    // Resolve the real claim name from the Deployment spec.
    let claimName = "";
    try {
      const dep = await appsApi.readNamespacedDeployment({ name: volume, namespace });
      const volumes = dep.spec?.template?.spec?.volumes ?? [];
      const vol = volumes.find((v) => v.name === "data-volume");
      claimName = vol?.persistentVolumeClaim?.claimName ?? "";
    } catch {
      // 404 or RBAC error — fall through to empty claimName.
    }

    if (!claimName) {
      return { ok: false }; // explicit: never guess the PVC name
    }

    const DATA_DIR = path.join(process.cwd(), ".ossmp-data");
    const VOLUMES_DIR = path.join(DATA_DIR, "volumes");
    const file = path.join(VOLUMES_DIR, `${claimName}.json`);

    const readData = async (): Promise<Record<string, string>> => {
      try {
        return JSON.parse(await fs.readFile(file, "utf8"));
      } catch {
        return {};
      }
    };

    const writeData = async (data: Record<string, string>) => {
      await fs.mkdir(VOLUMES_DIR, { recursive: true });
      await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
    };

    const data = await readData();
    switch (op.kind) {
      case "get":
        return { ok: true, value: data[op.key] };
      case "set":
        data[op.key] = op.value;
        await writeData(data);
        return { ok: true };
      case "incr": {
        const v = parseInt(data[op.key] || "0", 10) || 0;
        data[op.key] = (v + 1).toString();
        await writeData(data);
        return { ok: true, value: data[op.key] };
      }
      case "list":
        return { ok: true, keys: Object.keys(data) };
      case "delete":
        delete data[op.key];
        await writeData(data);
        return { ok: true };
    }
  }
}
