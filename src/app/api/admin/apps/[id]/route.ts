import { db } from "@backend/db";
import { getSessionUser } from "@backend/auth";
import { json, errorResponse, withErrors, serializeApp } from "@backend/api";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.isAdmin) return null;
  return user;
}

export const PATCH = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin();
  if (!user) return errorResponse("Forbidden", 403, "FORBIDDEN");

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid body", 422, "INVALID_BODY");

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 100);
  if (typeof body.description === "string") data.description = body.description.trim().slice(0, 1000);
  if (typeof body.dockerImage === "string" && body.dockerImage.trim()) data.dockerImage = body.dockerImage.trim();
  if (typeof body.category === "string") data.category = body.category.trim().slice(0, 50);
  if (typeof body.simulator === "string") data.simulator = body.simulator.trim().slice(0, 30);
  if (typeof body.logo === "string") data.logo = body.logo.trim() || null;
  if (typeof body.containerPort === "number") data.containerPort = body.containerPort;
  if (typeof body.readme === "string") data.readme = body.readme.trim() || null;
  if (typeof body.repository === "string") data.repository = body.repository.trim() || null;
  if (typeof body.website === "string") data.website = body.website.trim() || null;
  if (typeof body.version === "string") data.version = body.version.trim() || null;
  if (typeof body.defaultEnv === "string") data.defaultEnv = body.defaultEnv.trim() || null;

  if (Object.keys(data).length === 0) {
    return errorResponse("No updatable fields provided", 422, "NO_FIELDS");
  }

  const updated = await db.app.update({
    where: { id },
    data,
    include: { _count: { select: { deployments: true } } },
  });

  return json({ app: serializeApp(updated) });
});

export const DELETE = withErrors(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin();
  if (!user) return errorResponse("Forbidden", 403, "FORBIDDEN");

  const { id } = await params;

  // Check if app has deployments
  const deployCount = await db.deployment.count({ where: { appId: id } });
  if (deployCount > 0) {
    return errorResponse(
      `Cannot delete: ${deployCount} deployment(s) still reference this app. Delete them first.`,
      409,
      "HAS_DEPLOYMENTS"
    );
  }

  await db.app.delete({ where: { id } });
  return json({ ok: true });
});
