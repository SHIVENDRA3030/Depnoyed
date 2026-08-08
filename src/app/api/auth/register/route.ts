import { db } from "@backend/db";
import { hashPassword, setSessionCookie } from "@backend/auth";
import { json, errorResponse, withErrors } from "@backend/api";

export const POST = withErrors(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = body?.name ? String(body.name).trim() : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("A valid email is required", 422, "INVALID_EMAIL");
  }
  if (password.length < 6) {
    return errorResponse("Password must be at least 6 characters", 422, "WEAK_PASSWORD");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return errorResponse("An account with this email already exists", 409, "EMAIL_TAKEN");
  }

  // First registered user becomes admin automatically
  const userCount = await db.user.count();
  const isAdmin = userCount === 0;

  const user = await db.user.create({
    data: { email, name, passwordHash: hashPassword(password), isAdmin },
    select: { id: true, email: true, name: true, createdAt: true, isAdmin: true },
  });

  await setSessionCookie(user.id, user.email);
  return json({ user }, 201);
});
