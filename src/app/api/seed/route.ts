import { db } from "@backend/db";
import { json, withErrors } from "@backend/api";
import { MARKETPLACE_APPS } from "@deployed/apps";

/**
 * Idempotent seed endpoint that populates the marketplace catalog from the
 * canonical application definitions in `deployed/apps/`.
 *
 * Safe to call multiple times — existing apps are upserted.
 */
export const POST = withErrors(async () => {
  let upserted = 0;
  for (const a of MARKETPLACE_APPS) {
    await db.app.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        description: a.description,
        dockerImage: a.dockerImage,
        containerPort: a.containerPort,
        logo: a.logo,
        category: a.category,
        simulator: a.simulator,
        defaultEnv: a.defaultEnv ?? null,
        readme: a.readme ?? null,
        repository: a.repository ?? null,
        website: a.website ?? null,
        version: a.version ?? null,
      },
      create: {
        name: a.name,
        slug: a.slug,
        description: a.description,
        dockerImage: a.dockerImage,
        containerPort: a.containerPort,
        logo: a.logo,
        category: a.category,
        simulator: a.simulator,
        defaultEnv: a.defaultEnv ?? null,
        readme: a.readme ?? null,
        repository: a.repository ?? null,
        website: a.website ?? null,
        version: a.version ?? null,
      },
    });
    upserted++;
  }

  const total = await db.app.count();
  return json({ ok: true, upserted, total });
});

export const GET = withErrors(async () => {
  const total = await db.app.count();
  return json({ total, seeded: total > 0 });
});
