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
      version: "1.0.0",
      repository: "https://github.com/ossmp/demo-counter",
      website: "https://example.com/demo-counter",
      readme: "# Demo Counter\n\nA minimal application that demonstrates **volume persistence** in OSS Deploy.\n\n## Features\n\n- Increments a counter stored in a dedicated volume\n- Survives container stop/start cycles\n- Proves multi-tenant isolation\n\n## Usage\n\nClick **Increment** to increase the counter. The value is persisted to `/data/counter.json` inside the container's dedicated volume.",
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
      version: "1.25",
      repository: "https://github.com/nginx/nginx",
      website: "https://nginx.org",
      readme: "# Static Welcome\n\nA simple **nginx:alpine** container serving a static HTML welcome page.\n\n## Use Cases\n\n- Validate the deployment pipeline end-to-end\n- Serve static assets (HTML, CSS, JS, images)\n- Act as a reverse proxy or load balancer\n\n## Configuration\n\nThe container listens on port 80 and serves files from `/usr/share/nginx/html`.",
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
      version: "1.21.0",
      repository: "https://github.com/go-gitea/gitea",
      website: "https://gitea.io",
      readme: "# Gitea Lite\n\nA self-hosted Git service simulation. This lightweight variant persists **notes** to a dedicated volume.\n\n## Features\n\n- Create, edit, and delete notes\n- All notes survive container restarts\n- Per-tenant isolation\n\n> **Note:** This is a simulator. Real Gitea provides full Git hosting, issue tracking, and CI/CD.",
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
      version: "1.0.0",
      repository: "https://github.com/ossmp/markdown-wiki",
      website: "https://example.com/markdown-wiki",
      readme: "# Markdown Wiki\n\nA lightweight wiki engine that renders Markdown content with live preview.\n\n## Features\n\n- Create and edit wiki pages in Markdown\n- Live preview while editing\n- Pages persisted to `/data/wiki_pages.json`\n- Sidebar navigation\n- Delete pages with confirmation\n\n## Markdown Support\n\nSupports standard Markdown including **bold**, *italic*, `code`, [links](https://example.com), lists, and headings.",
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
      version: "7.2",
      repository: "https://github.com/redis/redis",
      website: "https://redis.io",
      readme: "# Redis Cache\n\nAn in-memory data structure store used as a database, cache, and message broker.\n\n## Common Use Cases\n\n- Caching layer for web applications\n- Session storage\n- Real-time analytics\n- Message queues and pub/sub\n\n## Configuration\n\nDefault port: `6379`. Data is persisted to the dedicated volume via RDB snapshots.",
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
      version: "16.1",
      repository: "https://github.com/postgres/postgres",
      website: "https://www.postgresql.org",
      readme: "# PostgreSQL\n\nA powerful, open-source object-relational database system.\n\n## Key Features\n\n- ACID compliance\n- Full-text search\n- JSON/JSONB support\n- Replication and partitioning\n- Extensive extension ecosystem\n\n## Connection\n\nDefault port: `5432`. Set the `POSTGRES_PASSWORD` environment variable on deploy.",
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
      version: "10.2",
      repository: "https://github.com/grafana/grafana",
      website: "https://grafana.com",
      readme: "# Grafana Dashboard\n\nThe open-source platform for monitoring and observability.\n\n## Features\n\n- Dynamic, reusable dashboards\n- 150+ data source plugins\n- Alerting and notification system\n- Annotations and templating\n\n## First Login\n\nDefault credentials: `admin` / `admin`. Change on first login.",
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
      version: "2.48",
      repository: "https://github.com/prometheus/prometheus",
      website: "https://prometheus.io",
      readme: "# Prometheus\n\nAn open-source systems monitoring and alerting toolkit.\n\n## Features\n\n- Multi-dimensional data model (time series identified by metric name and key/value pairs)\n- PromQL query language\n- Pull-based collection via HTTP\n- Time series database with on-disk storage\n\n## Configuration\n\nConfigure scrape targets in `/etc/prometheus/prometheus.yml`.",
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
      version: "1.25",
      repository: "https://github.com/nginx/nginx",
      website: "https://nginx.org",
      readme: "# Nginx Proxy\n\nA high-performance HTTP server and reverse proxy.\n\n## Common Use Cases\n\n- Reverse proxy for backend services\n- Load balancing\n- SSL/TLS termination\n- Static file serving\n- API gateway\n\n## Performance\n\nKnown for high concurrency, low memory usage, and event-driven architecture.",
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
      version: "9.2",
      repository: "https://github.com/mattermost/mattermost",
      website: "https://mattermost.com",
      readme: "# Mattermost Chat\n\nAn open-source, self-hosted Slack-alternative for secure team collaboration.\n\n## Features\n\n- Real-time messaging (channels, DMs, threads)\n- File sharing and search\n- Webhooks and integrations (Slack-compatible)\n- Compliance and audit logs\n\n> **Note:** This is a preview deployment. For production, configure SMTP, SSO, and a managed database.",
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
        readme: a.readme ?? null,
        repository: a.repository ?? null,
        website: a.website ?? null,
        version: a.version ?? null,
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
