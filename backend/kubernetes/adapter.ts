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
} from "../docker/adapter";
import { promises as fs } from "fs";
import path from "path";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const cluster = kc.getCurrentCluster();
if (cluster && cluster.server.startsWith('http:')) {
  (cluster as any).skipTLSVerify = true;
}

const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

// Generate namespace from tenant ID
const getNamespace = (tenantId: string) => `depnoyed-${tenantId}`;

async function ensureNamespace(namespace: string) {
  try {
    await coreApi.readNamespace({ name: namespace });
  } catch (err: any) {
    if (err.statusCode === 404) {
      try {
        await coreApi.createNamespace({ body: { metadata: { name: namespace } } });
      } catch (e: any) {
        if (e.statusCode !== 409) throw e;
      }
    } else {
      throw err;
    }
  }
}
const BASE_DOMAIN = process.env.DEPLOY_BASE_DOMAIN || "apps.local";

/**
 * Kubernetes implementation of the Runtime Adapter.
 * Maps Depnoyed Deployments to Kubernetes Deployments, Services, and PVCs.
 */
export class KubernetesAdapter implements DockerAdapter {
  readonly kind = "docker"; // keep as "docker" so frontend doesn't break if checking kind

  async createVolume(name: string, tenantId: string): Promise<VolumeInfo> {
    const namespace = getNamespace(tenantId);
    await ensureNamespace(namespace);
    const pvc = {
      metadata: { name },
      spec: {
        accessModes: ["ReadWriteOnce"],
        resources: {
          requests: {
            storage: "1Gi",
          },
        },
      },
    };
    try {
      await coreApi.createNamespacedPersistentVolumeClaim({ namespace, body: pvc });
    } catch (err: any) {
      if (err.statusCode !== 409) throw err; // Ignore already exists
    }
    return { name, createdAt: new Date().toISOString(), dataSize: 0 };
  }

  async removeVolume(name: string, tenantId: string): Promise<void> {
    const namespace = getNamespace(tenantId);
    try {
      await coreApi.deleteNamespacedPersistentVolumeClaim({ name, namespace });
    } catch (err: any) {
      if (err.statusCode !== 404) throw err;
    }
  }

  async inspectVolume(name: string, tenantId: string): Promise<VolumeInfo | null> {
    const namespace = getNamespace(tenantId);
    try {
      const res = await coreApi.readNamespacedPersistentVolumeClaim({ name, namespace });
      return {
        name,
        createdAt: res.metadata?.creationTimestamp?.toISOString() || new Date().toISOString(),
        dataSize: 0,
      };
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async createContainer(opts: CreateContainerOptions): Promise<ContainerInfo> {
    const namespace = getNamespace(opts.tenantId);
    await ensureNamespace(namespace);

    const deployment = {
      metadata: { name: opts.containerName },
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
                volumeMounts: [{ name: "data-volume", mountPath: "/data" }],
              },
            ],
            volumes: [
              {
                name: "data-volume",
                persistentVolumeClaim: { claimName: opts.volumeName },
              },
            ],
          },
        },
      },
    };

    const service = {
      metadata: { name: opts.containerName },
      spec: {
        type: "ClusterIP", // Ingress routes to ClusterIP
        selector: { app: opts.containerName },
        ports: [{ port: opts.port, targetPort: opts.port }],
      },
    };

    const ingress = {
      metadata: {
        name: opts.containerName,
        annotations: {
          "kubernetes.io/ingress.class": "nginx"
        }
      },
      spec: {
        rules: [
          {
            host: `${opts.containerName}.${BASE_DOMAIN}`,
            http: {
              paths: [
                {
                  path: "/",
                  pathType: "Prefix",
                  backend: {
                    service: {
                      name: opts.containerName,
                      port: { number: opts.port },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    try {
      await appsApi.createNamespacedDeployment({ namespace, body: deployment });
      await coreApi.createNamespacedService({ namespace, body: service });
      await networkingApi.createNamespacedIngress({ namespace, body: ingress });
    } catch (err: any) {
      if (err.statusCode !== 409) throw err;
    }

    return {
      id: opts.containerName,
      name: opts.containerName,
      status: "created",
      image: opts.image,
      port: opts.port,
    };
  }

  async startContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const namespace = getNamespace(tenantId);
    await appsApi.patchNamespacedDeploymentScale({ name, namespace, body: { spec: { replicas: 1 } } });
    return { id: name, name, status: "creating", image: "" };
  }

  async stopContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const namespace = getNamespace(tenantId);
    await appsApi.patchNamespacedDeploymentScale({ name, namespace, body: { spec: { replicas: 0 } } });
    return { id: name, name, status: "stopped", image: "" };
  }

  async restartContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    await this.stopContainer(name, tenantId);
    return this.startContainer(name, tenantId);
  }

  async removeContainer(name: string, tenantId: string): Promise<void> {
    if (!name) return;
    const namespace = getNamespace(tenantId);
    try {
      await appsApi.deleteNamespacedDeployment({ name, namespace });
      await coreApi.deleteNamespacedService({ name, namespace });
      await networkingApi.deleteNamespacedIngress({ name, namespace });
    } catch (err: any) {
      if (err.statusCode !== 404) throw err;
    }
  }

  async inspectContainer(name: string, tenantId: string): Promise<ContainerInfo | null> {
    if (!name) return null;
    const namespace = getNamespace(tenantId);
    try {
      const res = await appsApi.readNamespacedDeployment({ name, namespace });
      const image = res.spec?.template?.spec?.containers?.[0]?.image || "";
      
      const pods = await coreApi.listNamespacedPod({ namespace, labelSelector: `app=${name}` });
      let status: ContainerStatus = "stopped";
      
      if (res.spec?.replicas === 0) {
        status = "stopped";
      } else if (pods.items.length > 0) {
        const pod = pods.items[0];
        const phase = pod.status?.phase;
        const containerStatuses = pod.status?.containerStatuses || [];
        const isReady = containerStatuses.some(c => c.ready);
        const state = containerStatuses[0]?.state;

        if (phase === "Running" && isReady) {
          status = "running";
        } else if (state?.waiting?.reason === "CrashLoopBackOff" || state?.waiting?.reason === "Error") {
          status = "dead";
        } else if (phase === "Pending" || state?.waiting?.reason === "ContainerCreating") {
          status = "creating";
        } else if (phase === "Failed") {
          status = "exited";
        } else {
          status = "creating";
        }
      } else {
        status = "creating";
      }

      return {
        id: name,
        name,
        status,
        image,
      };
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async getLogs(name: string, tenantId: string, tail = 100): Promise<LogLine[]> {
    if (!name) return [];
    const namespace = getNamespace(tenantId);
    try {
      const pods = await coreApi.listNamespacedPod({
        namespace,
        labelSelector: `app=${name}`,
      });
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

  async execVolumeOp(volume: string, tenantId: string, op: VolumeOp): Promise<VolumeOpResult> {
    const DATA_DIR = path.join(process.cwd(), ".ossmp-data");
    const VOLUMES_DIR = path.join(DATA_DIR, "volumes");
    const file = path.join(VOLUMES_DIR, `${volume}.json`);

    async function readVolumeData(): Promise<Record<string, string>> {
      try {
        const data = await fs.readFile(file, "utf8");
        return JSON.parse(data);
      } catch {
        return {};
      }
    }

    async function writeVolumeData(data: Record<string, string>) {
      await fs.mkdir(VOLUMES_DIR, { recursive: true });
      await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
    }

    const data = await readVolumeData();
    switch (op.kind) {
      case "get":
        return { ok: true, value: data[op.key] };
      case "set":
        data[op.key] = op.value;
        await writeVolumeData(data);
        return { ok: true };
      case "incr": {
        const v = parseInt(data[op.key] || "0", 10) || 0;
        data[op.key] = (v + 1).toString();
        await writeVolumeData(data);
        return { ok: true, value: data[op.key] };
      }
      case "list":
        return { ok: true, keys: Object.keys(data) };
      case "delete":
        delete data[op.key];
        await writeVolumeData(data);
        return { ok: true };
    }
  }
}
