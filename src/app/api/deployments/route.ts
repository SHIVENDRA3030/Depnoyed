import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors, serializeDeployment } from "@/lib/api";
import { createDeployment, DeployError } from "@/lib/deployments";
import { getDockerAdapter } from "@/lib/docker/adapter";

export const POST = withErrors(async (req: Request) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const body = await req.json().catch(() => null);
  const appId = String(body?.appId ?? "");
  if (!appId) return errorResponse("appId is required", 422, "MISSING_APP");

  // Parse optional environment variables
  let envVars: Record<string, string> | undefined;
  if (body?.envVars && typeof body.envVars === "object") {
    envVars = {};
    for (const [k, v] of Object.entries(body.envVars)) {
      if (typeof k === "string" && typeof v === "string" && k.length <= 64 && v.length <= 256) {
        envVars[k] = v;
      }
    }
    if (Object.keys(envVars).length === 0) envVars = undefined;
  }

  // Ensure the app exists and belongs to the catalog (never trust arbitrary images).
  const app = await db.app.findUnique({ where: { id: appId } });
  if (!app) {
    throw new DeployError("UNKNOWN_APP", "Requested application does not exist");
  }

  const result = await createDeployment({ appId, userId: user.id, envVars });
  return json({ deployment: result }, 201);
});

export const GET = withErrors(async () => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const deployments = await db.deployment.findMany({
    where: { userId: user.id },
    include: { app: true },
    orderBy: { createdAt: "desc" },
  });

  const adapter = getDockerAdapter();
  const serialized = await Promise.all(
    deployments.map(async (d) => {
      const base = serializeDeployment(d);
      let volumeDataSize: number | undefined;
      try {
        const volInfo = await adapter.inspectVolume(d.volumeName);
        if (volInfo) volumeDataSize = volInfo.dataSize;
      } catch {
        /* ignore volume inspect failure */
      }
      return { ...base, volumeDataSize };
    })
  );

  return json({ deployments: serialized });
});
