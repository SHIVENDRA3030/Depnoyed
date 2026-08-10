import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@backend/db";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SCRYPT_KEYLEN = 64;

/* ----------------------------- Password hashing ---------------------------- */

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const test = scryptSync(plain, salt, SCRYPT_KEYLEN);
  const target = Buffer.from(hash, "hex");
  if (test.length !== target.length) return false;
  return timingSafeEqual(test, target);
}

/* ------------------------------ Session tokens ----------------------------- */

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete("next-auth.session-token");
  store.delete("__Secure-next-auth.session-token");
}

export async function getSessionUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, createdAt: true, isAdmin: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
