import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Lightweight, dependency-free authentication.
 *
 * - Passwords are hashed with scrypt (Node built-in crypto) + per-user salt.
 * - Sessions are signed cookies (HMAC-SHA256) carrying { userId, email }.
 *
 * This keeps the MVP free of external auth providers while remaining secure
 * enough for a single-host control plane. Swapping in NextAuth later is
 * straightforward because everything goes through `getSessionUser()`.
 */

const SESSION_COOKIE = "ossmp_session";
const SCRYPT_KEYLEN = 64;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

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

function sign(payload: string): string {
  const sig = createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return payload;
}

export function createSessionToken(userId: string, email: string): string {
  const payload = JSON.stringify({ uid: userId, email, iat: Date.now() });
  return sign(Buffer.from(payload, "utf8").toString("base64url"));
}

function decodeSessionToken(token: string): { uid: string; email: string } | null {
  const payload = verify(token);
  if (!payload) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded?.uid || !decoded?.email) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

/* ------------------------------- Cookie helpers ---------------------------- */

export async function setSessionCookie(userId: string, email: string): Promise<void> {
  const token = createSessionToken(userId, email);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = decodeSessionToken(token);
    if (!session) return null;
    const user = await db.user.findUnique({
      where: { id: session.uid },
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
