import { getSessionUser } from "@backend/auth";
import { json, errorResponse, withErrors, serializeDeployment } from "@backend/api";
import { startDeployment } from "@backend/deployments";

export const POST = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  const deployment = await startDeployment(id, user.id);
  return json({ deployment: serializeDeployment(deployment) });
});
