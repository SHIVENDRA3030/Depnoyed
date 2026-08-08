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
    {
      name: "Markdown Wiki",
      slug: "markdown-wiki",
      description:
        "A lightweight wiki engine that renders Markdown content with live preview. All pages are persisted to your dedicated volume, surviving restarts.",
      dockerImage: "ossmp/markdown-wiki:1.0",
      containerPort: 8080,
      logo: "wiki",
      category: "Productivity",
      simulator: "wiki",
    },
    {
      name: "Redis Cache",
      slug: "redis-cache",
      description:
        "An in-memory data structure store used as a database, cache, and message broker. This simulator tracks key-value operations and expiry in a dedicated volume.",
      dockerImage: "redis:7-alpine",
      containerPort: 6379,
      logo: null,
      category: "Database",
      simulator: "counter",
      defaultEnv: null,
    },
    {
      name: "PostgreSQL",
      slug: "postgresql",
      description:
        "A powerful, open-source object-relational database system with over 35 years of active development. This static simulator confirms the service is running and healthy.",
      dockerImage: "postgres:16-alpine",
      containerPort: 5432,
      logo: null,
      category: "Database",
      simulator: "static",
      defaultEnv: null,
    },
    {
      name: "Grafana Dashboard",
      slug: "grafana-dashboard",
      description:
        "The open-source platform for monitoring and observability. Visualize metrics, logs, and traces from any data source with beautiful, dynamic dashboards.",
      dockerImage: "grafana/grafana:latest",
      containerPort: 3000,
      logo: null,
      category: "Monitoring",
      simulator: "static",
      defaultEnv: null,
    },
    {
      name: "Prometheus",
      slug: "prometheus",
      description:
        "An open-source systems monitoring and alerting toolkit. Collects metrics from configured targets, evaluates rule expressions, and triggers alerts.",
      dockerImage: "prom/prometheus:latest",
      containerPort: 9090,
      logo: null,
      category: "Monitoring",
      simulator: "static",
      defaultEnv: null,
    },
    {
      name: "Nginx Proxy",
      slug: "nginx-proxy",
      description:
        "A high-performance HTTP server and reverse proxy. Serve static content, load-balance applications, and act as an API gateway — all with minimal resource usage.",
      dockerImage: "nginx:alpine",
      containerPort: 80,
      logo: null,
      category: "Web",
      simulator: "static",
      defaultEnv: null,
    },
    {
      name: "Mattermost Chat",
      slug: "mattermost-chat",
      description:
        "An open-source, self-hosted Slack-alternative for secure team collaboration. Chat, file sharing, and integrations — all persisted to your dedicated volume.",
      dockerImage: "mattermost/mattermost-preview:latest",
      containerPort: 8065,
      logo: null,
      category: "Productivity",
      simulator: "notes",
      defaultEnv: null,
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
        defaultEnv: a.defaultEnv ?? null,
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
