import { db } from "@/lib/db";
import { json, withErrors } from "@/lib/api";

/**
 * Idempotent seed endpoint that populates the marketplace catalog.
 * Safe to call multiple times — existing apps are upserted.
 */
export const POST = withErrors(async () => {
  const apps = [
    {
      name: "Demo Counter",
      slug: "demo-counter",
      description:
        "A tiny demo app that persists a counter in its dedicated volume. Perfect for proving that data survives container restarts.",
      dockerImage: "ossmp/demo-counter:1.0",
      containerPort: 80,
      logo: "counter",
      category: "Demo",
      simulator: "counter",
    },
    {
      name: "Static Welcome",
      slug: "static-welcome",
      description:
        "An nginx:alpine based static welcome page. The simplest possible deployment to validate the control plane.",
      dockerImage: "nginx:alpine",
      containerPort: 80,
      logo: "nginx",
      category: "Web",
      simulator: "static",
    },
    {
      name: "Gitea Lite",
      slug: "gitea-lite",
      description:
        "A lightweight note-taking app that simulates a self-hosted Gitea instance. Notes are persisted to a per-tenant volume.",
      dockerImage: "gitea/gitea:1.21",
      containerPort: 3000,
      logo: "gitea",
      category: "DevOps",
      simulator: "notes",
    },
  ];

  let upserted = 0;
  for (const a of apps) {
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
      },
      create: a,
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
