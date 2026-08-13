import { db, newId } from "@backend/db";
import { getDockerAdapter, type ContainerInfo } from "@backend/docker/adapter";
import { K8sDeployError } from "@backend/kubernetes/adapter";
import {
  config,
  generateContainerName,
  generateSubdomain,
  generateVolumeName,
  deploymentPublicUrl,
  realAppUrl,
} from "@backend/config";
import { loadAppManifest, mergeManifestIntoDefinition, type AppDefinition } from "@deployed/apps/manifest-loader";

/**
 * Deployment Manager — the controlled, privileged subsystem that turns a
 * validated deployment request into an isolated tenant container.
 *
 * Security boundaries enforced here:
 *  - The user identity is always derived from the authenticated session,
 *    never trusted from the client.
 *  - Only apps that exist in the marketplace catalog can be deployed; users
 *    can never supply an arbitrary image.
 *  - Resource limits come from server config or app manifest, not the request body.
 *  - Manifest values (resources, storage, health) take precedence over global config.
 */

export interface DeployInput {
  appId: string;
  userId: string;
  envVars?: Record<string, string>;
}

export interface DeployResult {
  id: string;
  status: string;
  subdomain: string;
  publicUrl: string;
  /** URL of the real running container (only set when DOCKER_ADAPTER=docker). */
  realAppUrl: string | null;
  containerName: string;
  volumeName: string;
  containerId: string | null;
  port: number | null;
}

function pickPort(): number {
  // Allocate a virtual port from a private range used by the mock runtime.
  // (A real engine would let Docker assign a host port.)
  return 31000 + Math.floor(Math.random() * 9999);
}

function mapStatus(s: string): string {
  // Normalise adapter statuses into deployment-facing statuses.
  if (s === "running") return "running";
  if (s === "exited" || s === "stopped") return "stopped";
  if (s === "created") return "created";
  if (s === "creating" || s === "removing") return "pending";
  // Pass through "failed", "dead", and any future unknown statuses unchanged
  // so callers never lose information. Existing mappings are unchanged.
  return s;
}

export async function createDeployment(input: DeployInput): Promise<DeployResult> {
  // Phase 11: Server-side quotas
  const MAX_DEPLOYMENTS = 3;
  const userDeploymentsCount = await db.deployment.count({
    where: { userId: input.userId }
  });
  
  if (userDeploymentsCount >= MAX_DEPLOYMENTS) {
    throw new DeployError("QUOTA_EXCEEDED", `User quota exceeded: maximum ${MAX_DEPLOYMENTS} deployments allowed.`);
  }

  const app = await db.app.findUnique({ where: { id: input.appId } });
  if (!app) {
    throw new DeployError("UNKNOWN_APP", "Requested application does not exist");
  }

  // Load and merge app manifest (resources, storage, health overrides)
  const manifest = loadAppManifest(app.slug);
  const mergedApp = mergeManifestIntoDefinition(app, manifest);

  const adapter = getDockerAdapter();
  const subdomain = generateSubdomain(mergedApp.slug);
  const containerName = generateContainerName(input.userId, mergedApp.slug);
  const volumeName = generateVolumeName(input.userId, mergedApp.slug);
  // Pre-allocate a candidate port (used by the mock adapter). The real Docker
  // adapter ignores this and binds its own host port, which we persist below.
  const candidatePort = pickPort();

  // 1. Persist the deployment record as `pending`.
  const envVarsJson = input.envVars && Object.keys(input.envVars).length > 0 ? JSON.stringify(input.envVars) : null;
  const deployment = await db.deployment.create({
    data: {
      id: newId(),
      userId: input.userId,
      appId: app.id,
      containerName,
      volumeName,
      subdomain,
      port: candidatePort,
      status: "pending",
      envVars: envVarsJson,
    },
  });

  try {
    // 2. Create the isolated volume.
    await adapter.createVolume(volumeName, input.userId);

    // 3. Create the container with resource limits + the app's env.
    const env = parseEnv(app.defaultEnv);
    env["DEPLOYMENT_ID"] = deployment.id;
    env["APP_SLUG"] = app.slug;
    
    // Merge user-provided env vars (they override app defaults)
    if (input.envVars) {
      Object.assign(env, input.envVars);
    }

    const isK8s = process.env.DOCKER_ADAPTER === "kubernetes";
    const appUrlToInject = isK8s
      ? `https://${containerName}.${config.deploy.baseDomain}`
      : deploymentPublicUrl(subdomain);
      
    env["APP_PUBLIC_URL"] = appUrlToInject;

    // Substitute {{APP_URL}} placeholders
    for (const key of Object.keys(env)) {
      if (typeof env[key] === "string") {
        env[key] = env[key].replace(/\{\{APP_URL\}\}/g, appUrlToInject);
      }
    }

    // Extract resource limits from manifest or fall back to config
    const cpuLimit = mergedApp.resources?.limits?.cpu
      ? parseCpuLimit(mergedApp.resources.limits.cpu)
      : config.deploy.cpuLimit;
    const memoryLimitMb = mergedApp.resources?.limits?.memory
      ? parseMemoryLimit(mergedApp.resources.limits.memory)
      : config.deploy.memoryLimitMb;

    // 3. Create the container with the requested resources.
    const info = await adapter.createContainer({
      containerName,
      volumeName,
      image: mergedApp.dockerImage,
      port: mergedApp.containerPort,
      cpuLimit,
      memoryLimitMb,
      env,
      simulator: mergedApp.simulator,
      tenantId: input.userId,
      // Pass manifest-derived storage and health config
      storage: mergedApp.storage,
      health: mergedApp.health,
    });

    // 4. Start the container.
    const started = await adapter.startContainer(containerName, input.userId);

    // For KubernetesAdapter, block until the pod is Ready (or definitively
    // failed). For mock/docker adapters this returns immediately. On a
    // permanent K8s error this throws and the catch block marks it "failed".
    const readyInfo =
      "waitForReady" in adapter &&
      typeof (adapter as { waitForReady?: unknown }).waitForReady === "function"
        ? await (adapter as {
            waitForReady: (name: string, tenantId: string) => Promise<ContainerInfo>;
          }).waitForReady(containerName, input.userId)
        : started;

    // The real Docker adapter assigns a host port via PortBindings; prefer
    // that over the candidate port. The mock adapter returns the candidate.
    const actualPort = started.port ?? info.port ?? candidatePort;

    // 5. Synchronise state with the database.
    const updated = await db.deployment.update({
      where: { id: deployment.id },
      data: {
        containerId: info.id,
        status: mapStatus(readyInfo.status),
        port: actualPort,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      subdomain: updated.subdomain,
      publicUrl: deploymentPublicUrl(updated.subdomain),
      realAppUrl: realAppUrl(updated.port),
      containerName: updated.containerName,
      volumeName: updated.volumeName,
      containerId: updated.containerId,
      port: updated.port,
    };
  } catch (err) {
    // Mark failed but keep the record so the user can see what happened.
    await db.deployment.update({
      where: { id: deployment.id },
      data: { status: "failed" },
    });
    throw err;
  }
}

export async function syncDeploymentStatus(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  const info = await adapter.inspectContainer(deployment.containerName, deployment.userId);
  if (info) {
    const status = mapStatus(info.status);
    if (status !== deployment.status) {
      await db.deployment.update({ where: { id: deployment.id }, data: { status } });
      return { ...deployment, status };
    }
  }
  return deployment;
}

export async function startDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  const info = await adapter.startContainer(deployment.containerName, deployment.userId);
  try {
    const readyInfo =
      "waitForReady" in adapter &&
      typeof (adapter as { waitForReady?: unknown }).waitForReady === "function"
        ? await (adapter as {
            waitForReady: (name: string, tenantId: string) => Promise<ContainerInfo>;
          }).waitForReady(deployment.containerName, deployment.userId)
        : info;
    const status = mapStatus(readyInfo.status);
    await db.deployment.update({ where: { id: deployment.id }, data: { status } });
    return { ...deployment, status };
  } catch (err) {
    if (err instanceof K8sDeployError) {
      await db.deployment.update({ where: { id: deployment.id }, data: { status: "failed" } });
      return { ...deployment, status: "failed" };
    }
    throw err;
  }
}

export async function stopDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  const info = await adapter.stopContainer(deployment.containerName, deployment.userId);
  const status = mapStatus(info.status);
  await db.deployment.update({ where: { id: deployment.id }, data: { status } });
  return { ...deployment, status };
}

export async function restartDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  const info = await adapter.restartContainer(deployment.containerName, deployment.userId);
  try {
    const readyInfo =
      "waitForReady" in adapter &&
      typeof (adapter as { waitForReady?: unknown }).waitForReady === "function"
        ? await (adapter as {
            waitForReady: (name: string, tenantId: string) => Promise<ContainerInfo>;
          }).waitForReady(deployment.containerName, deployment.userId)
        : info;
    const status = mapStatus(readyInfo.status);
    await db.deployment.update({ where: { id: deployment.id }, data: { status } });
    return { ...deployment, status };
  } catch (err) {
    if (err instanceof K8sDeployError) {
      await db.deployment.update({ where: { id: deployment.id }, data: { status: "failed" } });
      return { ...deployment, status: "failed" };
    }
    throw err;
  }
}

export async function deleteDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  // Remove the container first, then the volume, then the DB record.
  await adapter.removeContainer(deployment.containerName, deployment.userId);
  await adapter.removeVolume(deployment.volumeName, deployment.userId);
  await db.deployment.delete({ where: { id: deployment.id } });
}

export async function getDeploymentLogs(deploymentId: string, userId: string, tail = 100) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  return adapter.getLogs(deployment.containerName, deployment.userId, tail);
}

export async function execVolumeOp(
  deploymentId: string,
  userId: string,
  op: Parameters<ReturnType<typeof getDockerAdapter>["execVolumeOp"]>[2]
) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  return adapter.execVolumeOp(deployment.containerName, deployment.userId, op);
}

/**
 * Look up a deployment by its public subdomain. Used by the public preview
 * (the "deployed application" URL). No user auth — this is the data plane of
 * the running app itself, analogous to hitting the container directly.
 */
export async function getDeploymentBySubdomain(subdomain: string) {
  const deployment = await db.deployment.findUnique({
    where: { subdomain },
    include: { app: true },
  });
  return deployment;
}

/**
 * Synchronise a deployment's status with the runtime and return whether the
 * backing container is currently running.
 */
export async function isDeploymentRunning(subdomain: string): Promise<boolean> {
  const deployment = await getDeploymentBySubdomain(subdomain);
  if (!deployment || !deployment.containerName) return false;
  const adapter = getDockerAdapter();
  const info = await adapter.inspectContainer(deployment.containerName, deployment.userId);
  const running = !!info && info.status === "running";
  const status = info ? mapStatus(info.status) : deployment.status;
  if (status !== deployment.status) {
    await db.deployment.update({ where: { id: deployment.id }, data: { status } });
  }
  return running;
}

/**
 * Public volume operation keyed by subdomain. Only allowed when the backing
 * container is actually running — exactly like a real app that only serves
 * requests while it is up.
 */
export async function execVolumeOpBySubdomain(
  subdomain: string,
  op: Parameters<ReturnType<typeof getDockerAdapter>["execVolumeOp"]>[2]
) {
  const deployment = await getDeploymentBySubdomain(subdomain);
  if (!deployment) throw new DeployError("NOT_FOUND", "Deployment not found");
  const running = await isDeploymentRunning(subdomain);
  if (!running) throw new DeployError("APP_NOT_RUNNING", "Application is not running");
  const adapter = getDockerAdapter();
  return adapter.execVolumeOp(deployment.containerName, deployment.userId, op);
}

export async function getOwnedDeployment(deploymentId: string, userId: string) {
  const deployment = await db.deployment.findUnique({
    where: { id: deploymentId },
    include: { app: true },
  });
  if (!deployment) throw new DeployError("NOT_FOUND", "Deployment not found");
  if (deployment.userId !== userId) throw new DeployError("FORBIDDEN", "Access denied");
  return deployment;
}

function parseEnv(raw?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

export class DeployError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "DeployError";
  }
}

function parseCpuLimit(cpu: string): number {
  // Parse Kubernetes CPU format: "500m" -> 0.5, "1" -> 1, "2000m" -> 2
  if (cpu.endsWith("m")) {
    return parseInt(cpu.slice(0, -1), 10) / 1000;
  }
  return parseFloat(cpu);
}

function parseMemoryLimit(memory: string): number {
  // Parse Kubernetes memory format: "512Mi" -> 512, "1Gi" -> 1024, "512M" -> ~488
  const match = memory.match(/^(\d+)([KMGT]i?)$/i);
  if (!match) return config.deploy.memoryLimitMb;
  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case "K":
    case "KI":
      return Math.ceil(value / 1024);
    case "M":
      return value;
    case "MI":
      return value;
    case "G":
    case "GI":
      return value * 1024;
    case "T":
    case "TI":
      return value * 1024 * 1024;
    default:
      return config.deploy.memoryLimitMb;
  }
}

export function isDeployError(e: unknown): e is DeployError {
  return e instanceof DeployError;
}

export function containerInfoToStatus(info: ContainerInfo | null): string {
  if (!info) return "unknown";
  return mapStatus(info.status);
}
