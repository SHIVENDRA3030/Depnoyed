import { getSessionUser } from "@/lib/auth";
import { json, serializeUser } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ user: null }, 200);
  return json({ user: serializeUser(user) });
}
