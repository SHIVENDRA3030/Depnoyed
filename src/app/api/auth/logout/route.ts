import { clearSessionCookie } from "@backend/auth";
import { json, withErrors } from "@backend/api";

export const POST = withErrors(async () => {
  await clearSessionCookie();
  return json({ ok: true });
});
