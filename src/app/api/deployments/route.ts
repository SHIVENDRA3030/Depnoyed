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

  // Ensure the app exists and belongs to the catalog (never trust arbitrary images).
  const app = await db.app.findUnique({ where: { id: appId } });
  if (!app) {
    throw new DeployError("UNKNOWN_APP", "Requested application does not exist");
  }

  const result = await createDeployment({ appId, userId: user.id });
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
