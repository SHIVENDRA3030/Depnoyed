import { getSessionUser } from "@backend/auth";
import { getDockerAdapter } from "@backend/docker/adapter";
import { getOwnedDeployment } from "@backend/deployments";
import { json, errorResponse, withErrors } from "@backend/api";

export const GET = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  
  // Verify ownership and get deployment details
  const deployment = await getOwnedDeployment(id, user.id);
  
  if (deployment.status !== "running") {
    return json({ stats: null });
  }

  const adapter = getDockerAdapter();
  const stats = await adapter.getStats(deployment.containerName, user.id);
  
  return json({ stats });
});
