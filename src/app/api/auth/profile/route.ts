import { db } from "@backend/db";
import { getSessionUser } from "@backend/auth";
import { json, errorResponse, withErrors, serializeUser } from "@backend/api";

export const PATCH = withErrors(async (req: Request) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse("Invalid request body", 422, "INVALID_BODY");
  }

  const data: { name?: string | null } = {};
  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 60);
    data.name = trimmed.length > 0 ? trimmed : null;
  }

  if (Object.keys(data).length === 0) {
    return errorResponse("No updatable fields provided", 422, "NO_FIELDS");
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
  });

  return json({ user: serializeUser(updated) });
});
