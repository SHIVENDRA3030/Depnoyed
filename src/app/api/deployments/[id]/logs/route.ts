import { getSessionUser } from "@backend/auth";
import { json, errorResponse, withErrors } from "@backend/api";
import { getDeploymentLogs } from "@backend/deployments";

export const GET = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  const url = new URL(req.url);
  const tail = Number(url.searchParams.get("tail") ?? "100");
  const logs = await getDeploymentLogs(id, user.id, tail);
  return json({ logs });
});
