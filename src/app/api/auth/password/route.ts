import { db } from "@backend/db";
import { getSessionUser } from "@backend/auth";
import { json, errorResponse, withErrors } from "@backend/api";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const HASH_KEYLEN = 64;

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = (await scryptAsync(password, salt, HASH_KEYLEN)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, HASH_KEYLEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export const PATCH = withErrors(async (req: Request) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const body = await req.json().catch(() => null);
  if (!body?.currentPassword || !body?.newPassword) {
    return errorResponse("currentPassword and newPassword are required", 422, "MISSING_FIELDS");
  }

  if (typeof body.newPassword !== "string" || body.newPassword.length < 6) {
    return errorResponse("New password must be at least 6 characters", 422, "INVALID_PASSWORD");
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return errorResponse("User not found", 404, "NOT_FOUND");

  const valid = await verifyPassword(body.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return errorResponse("Current password is incorrect", 403, "INVALID_PASSWORD");
  }

  const newHash = await hashPassword(body.newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return json({ ok: true });
});
