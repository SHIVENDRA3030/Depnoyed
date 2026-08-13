import { db } from "@backend/db";
import { json, errorResponse, withErrors } from "@backend/api";
import {
  getDeploymentBySubdomain,
  isDeploymentRunning,
  execVolumeOpBySubdomain,
} from "@backend/deployments";
import { getDockerAdapter, type VolumeOp } from "@backend/docker/adapter";

/**
 * Public data-plane for a deployed application, keyed by its subdomain.
 *
 * This is what the "deployed app" running inside the container would expose.
 * - GET /api/preview/[subdomain]            -> deployment metadata (public)
 * - GET /api/preview/[subdomain]/volume     -> list keys, or ?op=get&key=K
 * - POST /api/preview/[subdomain]/volume    -> { op, key, value }
 *
 * No user auth: the deployment URL is itself the access token. Operations are
 * still fully isolated because they are scoped to this deployment's volume.
 */

export async function GET(req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const url = new URL(req.url);
  const detail = url.searchParams.get("detail") === "true";

  const deployment = await getDeploymentBySubdomain(subdomain);
  if (!deployment) return errorResponse("Deployment not found", 404, "NOT_FOUND");

  const running = await isDeploymentRunning(subdomain);

  if (detail) {
    const adapter = getDockerAdapter();
    const logs = running ? await adapter.getLogs(deployment.containerName, deployment.userId, 5) : [];
    return json({
      deployment: {
        id: deployment.id,
        status: deployment.status,
        running,
        subdomain: deployment.subdomain,
        containerName: deployment.containerName,
        volumeName: deployment.volumeName,
        port: deployment.port,
        createdAt: deployment.createdAt.toISOString(),
        app: deployment.app
          ? {
              name: deployment.app.name,
              slug: deployment.app.slug,
              simulator: deployment.app.simulator,
              dockerImage: deployment.app.dockerImage,
            }
          : null,
      },
      recentLogs: logs,
    });
  }

  return withErrors(async () => {
    const op = url.searchParams.get("op") ?? "list";
    const key = url.searchParams.get("key") ?? "";
    let volumeOp: VolumeOp;
    if (op === "get") {
      if (!key) return errorResponse("key is required for op=get", 422, "MISSING_KEY");
      volumeOp = { kind: "get", key };
    } else {
      volumeOp = { kind: "list" };
    }
    const result = await execVolumeOpBySubdomain(subdomain, volumeOp);
    return json({ result, running });
  })();
}

export const POST = withErrors(async (req: Request, { params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  const body = await req.json().catch(() => null);
  const op = String(body?.op ?? "");
  const key = String(body?.key ?? "");
  const value = body?.value !== undefined ? String(body.value) : "";

  let volumeOp: VolumeOp;
  if (op === "set") {
    if (!key) return errorResponse("key is required", 422, "MISSING_KEY");
    volumeOp = { kind: "set", key, value };
  } else if (op === "incr") {
    if (!key) return errorResponse("key is required", 422, "MISSING_KEY");
    volumeOp = { kind: "incr", key };
  } else if (op === "delete") {
    if (!key) return errorResponse("key is required", 422, "MISSING_KEY");
    volumeOp = { kind: "delete", key };
  } else {
    return errorResponse("Unsupported op. Use set | incr | delete", 422, "BAD_OP");
  }

  const result = await execVolumeOpBySubdomain(subdomain, volumeOp);
  return json({ result });
});
