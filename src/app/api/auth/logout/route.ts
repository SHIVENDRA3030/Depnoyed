import { clearSessionCookie } from "@/lib/auth";
import { json, withErrors } from "@/lib/api";

export const POST = withErrors(async () => {
  await clearSessionCookie();
  return json({ ok: true });
});
