import { db } from "@backend/db";
import { verifyPassword, setSessionCookie } from "@backend/auth";
import { json, errorResponse, withErrors, serializeUser } from "@backend/api";

export const POST = withErrors(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return errorResponse("Email and password are required", 422, "MISSING_CREDENTIALS");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  await setSessionCookie(user.id, user.email);
  return json({ user: serializeUser(user) });
});
