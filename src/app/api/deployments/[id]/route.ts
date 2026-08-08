import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors, serializeDeployment } from "@/lib/api";
import { syncDeploymentStatus, deleteDeployment } from "@/lib/deployments";

export const GET = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  // Refresh the stored status from the runtime before returning.
  const deployment = await syncDeploymentStatus(id, user.id);
  return json({ deployment: serializeDeployment(deployment) });
});

export const DELETE = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  await deleteDeployment(id, user.id);
  return json({ ok: true });
});
