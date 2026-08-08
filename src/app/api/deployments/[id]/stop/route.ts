import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors, serializeDeployment } from "@/lib/api";
import { stopDeployment } from "@/lib/deployments";

export const POST = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  const deployment = await stopDeployment(id, user.id);
  return json({ deployment: serializeDeployment(deployment) });
});
