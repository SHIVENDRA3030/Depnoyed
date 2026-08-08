import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors, serializeDeployment } from "@/lib/api";
import { syncDeploymentStatus, deleteDeployment, getOwnedDeployment } from "@/lib/deployments";

export const GET = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  // Refresh the stored status from the runtime before returning.
  const deployment = await syncDeploymentStatus(id, user.id);
  return json({ deployment: serializeDeployment(deployment) });
});

export const PATCH = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  // Verify ownership.
  await getOwnedDeployment(id, user.id);

  const body = await req.json().catch(() => null);
  const data: { label?: string | null } = {};
  if (body && typeof body.label === "string") {
    const trimmed = body.label.trim().slice(0, 60);
    data.label = trimmed.length > 0 ? trimmed : null;
  } else if (body && body.label === null) {
    data.label = null;
  }

  if (Object.keys(data).length === 0) {
    return errorResponse("No updatable fields provided", 422, "NO_FIELDS");
  }

  const updated = await db.deployment.update({
    where: { id },
    data,
    include: { app: true },
  });
  return json({ deployment: serializeDeployment(updated) });
});

export const DELETE = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  await deleteDeployment(id, user.id);
  return json({ ok: true });
});
