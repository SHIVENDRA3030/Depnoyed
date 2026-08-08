import { db } from "@backend/db";
import { json, serializeApp, errorResponse, withErrors } from "@backend/api";

export const GET = withErrors(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const app = await db.app.findUnique({
    where: { slug },
    include: { _count: { select: { deployments: true } } },
  });
  if (!app) return errorResponse("Application not found", 404, "APP_NOT_FOUND");
  return json({ app: serializeApp(app) });
});
