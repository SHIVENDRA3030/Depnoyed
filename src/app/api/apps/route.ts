import { db } from "@backend/db";
import { json, serializeApp, withErrors } from "@backend/api";

export const GET = withErrors(async () => {
  const apps = await db.app.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { deployments: true } } },
  });
  return json({ apps: apps.map(serializeApp) });
});
