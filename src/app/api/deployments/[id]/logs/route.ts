import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors } from "@/lib/api";
import { getDeploymentLogs } from "@/lib/deployments";

export const GET = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  const url = new URL(req.url);
  const tail = Number(url.searchParams.get("tail") ?? "100");
  const logs = await getDeploymentLogs(id, user.id, tail);
  return json({ logs });
});
