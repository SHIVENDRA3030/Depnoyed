import { getSessionUser } from "@backend/auth";
import { json, serializeUser } from "@backend/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ user: null }, 200);
  return json({ user: serializeUser(user) });
}
