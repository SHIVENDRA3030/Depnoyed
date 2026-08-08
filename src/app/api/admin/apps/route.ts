import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors, serializeApp } from "@/lib/api";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.isAdmin) return null;
  return user;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export const GET = withErrors(async () => {
  const user = await requireAdmin();
  if (!user) return errorResponse("Forbidden", 403, "FORBIDDEN");

  const apps = await db.app.findMany({
    include: { _count: { select: { deployments: true } } },
    orderBy: { createdAt: "asc" },
  });
  return json({ apps: apps.map(serializeApp) });
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireAdmin();
  if (!user) return errorResponse("Forbidden", 403, "FORBIDDEN");

  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid body", 422, "INVALID_BODY");

  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const dockerImage = String(body.dockerImage ?? "").trim();
  const category = String(body.category ?? "General").trim();
  const simulator = String(body.simulator ?? "static").trim();
  const logo = body.logo ? String(body.logo).trim() : null;
  const containerPort = Number(body.containerPort ?? 80);
  const readme = body.readme ? String(body.readme).trim() : null;
  const repository = body.repository ? String(body.repository).trim() : null;
  const website = body.website ? String(body.website).trim() : null;
  const version = body.version ? String(body.version).trim() : null;
  const defaultEnv = body.defaultEnv ? String(body.defaultEnv).trim() : null;

  if (!name) return errorResponse("Name is required", 422, "MISSING_NAME");
  if (!description) return errorResponse("Description is required", 422, "MISSING_DESCRIPTION");
  if (!dockerImage) return errorResponse("Docker image is required", 422, "MISSING_IMAGE");

  let slug = body.slug ? slugify(String(body.slug)) : slugify(name);
  if (!slug) slug = `app-${Date.now()}`;

  // Ensure slug uniqueness
  const existing = await db.app.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const app = await db.app.create({
    data: {
      name,
      slug,
      description,
      dockerImage,
      containerPort: Number.isFinite(containerPort) ? containerPort : 80,
      logo,
      category,
      simulator,
      defaultEnv,
      readme,
      repository,
      website,
      version,
    },
    include: { _count: { select: { deployments: true } } },
  });

  return json({ app: serializeApp(app) }, 201);
});
