import { db } from "@/lib/db";
import { getDockerAdapter, type ContainerInfo } from "@/lib/docker/adapter";
import {
  config,
  generateContainerName,
  generateSubdomain,
  generateVolumeName,
  deploymentPublicUrl,
} from "@/lib/config";

/**
 * Deployment Manager — the controlled, privileged subsystem that turns a
 * validated deployment request into an isolated tenant container.
 *
 * Security boundaries enforced here:
 *  - The user identity is always derived from the authenticated session,
 *    never trusted from the client.
 *  - Only apps that exist in the marketplace catalog can be deployed; users
 *    can never supply an arbitrary image.
 *  - Resource limits come from server config, not the request body.
 */

export interface DeployInput {
  appId: string;
  userId: string;
}

export interface DeployResult {
  id: string;
  status: string;
  subdomain: string;
  publicUrl: string;
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
  return s;
}

export async function createDeployment(input: DeployInput): Promise<DeployResult> {
  const app = await db.app.findUnique({ where: { id: input.appId } });
  if (!app) {
    throw new DeployError("UNKNOWN_APP", "Requested application does not exist");
  }

  const adapter = getDockerAdapter();
  const subdomain = generateSubdomain(app.slug);
  const containerName = generateContainerName(input.userId, app.slug);
  const volumeName = generateVolumeName(input.userId, app.slug);
  const port = pickPort();

  // 1. Persist the deployment record as `pending`.
  const deployment = await db.deployment.create({
    data: {
      userId: input.userId,
      appId: app.id,
      containerName,
      volumeName,
      subdomain,
      port,
      status: "pending",
    },
  });

  try {
    // 2. Create the isolated volume.
    await adapter.createVolume(volumeName);

    // 3. Create the container with resource limits + the app's env.
    const env = parseEnv(app.defaultEnv);
    env["DEPLOYMENT_ID"] = deployment.id;
    env["APP_SLUG"] = app.slug;

    const info = await adapter.createContainer({
      containerName,
      volumeName,
      image: app.dockerImage,
      port: app.containerPort,
      cpuLimit: config.deploy.cpuLimit,
      memoryLimitMb: config.deploy.memoryLimitMb,
      env,
      simulator: app.simulator,
    });

    // 4. Start the container.
    const started = await adapter.startContainer(containerName);

    // 5. Synchronise state with the database.
    const updated = await db.deployment.update({
      where: { id: deployment.id },
      data: {
        containerId: info.id,
        status: mapStatus(started.status),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      subdomain: updated.subdomain,
      publicUrl: deploymentPublicUrl(updated.subdomain),
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
  const info = await adapter.inspectContainer(deployment.containerName);
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
  const info = await adapter.startContainer(deployment.containerName);
  const status = mapStatus(info.status);
  await db.deployment.update({ where: { id: deployment.id }, data: { status } });
  return { ...deployment, status };
}

export async function stopDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  const info = await adapter.stopContainer(deployment.containerName);
  const status = mapStatus(info.status);
  await db.deployment.update({ where: { id: deployment.id }, data: { status } });
  return { ...deployment, status };
}

export async function restartDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  const info = await adapter.restartContainer(deployment.containerName);
  const status = mapStatus(info.status);
  await db.deployment.update({ where: { id: deployment.id }, data: { status } });
  return { ...deployment, status };
}

export async function deleteDeployment(deploymentId: string, userId: string) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  // Remove the container first, then the volume, then the DB record.
  await adapter.removeContainer(deployment.containerName);
  await adapter.removeVolume(deployment.volumeName);
  await db.deployment.delete({ where: { id: deployment.id } });
}

export async function getDeploymentLogs(deploymentId: string, userId: string, tail = 100) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  return adapter.getLogs(deployment.containerName, tail);
}

export async function execVolumeOp(
  deploymentId: string,
  userId: string,
  op: Parameters<ReturnType<typeof getDockerAdapter>["execVolumeOp"]>[1]
) {
  const deployment = await getOwnedDeployment(deploymentId, userId);
  const adapter = getDockerAdapter();
  return adapter.execVolumeOp(deployment.containerName, op);
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
  if (!deployment) return false;
  const adapter = getDockerAdapter();
  const info = await adapter.inspectContainer(deployment.containerName);
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
  op: Parameters<ReturnType<typeof getDockerAdapter>["execVolumeOp"]>[1]
) {
  const deployment = await getDeploymentBySubdomain(subdomain);
  if (!deployment) throw new DeployError("NOT_FOUND", "Deployment not found");
  const running = await isDeploymentRunning(subdomain);
  if (!running) throw new DeployError("APP_NOT_RUNNING", "Application is not running");
  const adapter = getDockerAdapter();
  return adapter.execVolumeOp(deployment.containerName, op);
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

export function isDeployError(e: unknown): e is DeployError {
  return e instanceof DeployError;
}

export function containerInfoToStatus(info: ContainerInfo | null): string {
  if (!info) return "unknown";
  return mapStatus(info.status);
}
