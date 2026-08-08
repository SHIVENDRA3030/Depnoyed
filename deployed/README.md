# Deployed

This directory holds the **deployment and runtime application definitions** —
the catalog of apps that can be deployed by Depnoyed. Only apps listed here
can be deployed; users cannot supply arbitrary Docker images.

## Structure

```
deployed/
├── apps/
│   ├── types.ts              # AppDefinition interface
│   ├── index.ts              # MARKETPLACE_APPS array + findAppDefinition()
│   ├── demo-counter.ts
│   ├── static-welcome.ts
│   ├── gitea-lite.ts
│   ├── markdown-wiki.ts
│   ├── redis-cache.ts
│   ├── postgresql.ts
│   ├── grafana-dashboard.ts
│   ├── prometheus.ts
│   ├── nginx-proxy.ts
│   └── mattermost-chat.ts
├── docker/                   # Reserved: per-app Dockerfiles (future)
└── manifests/                # Reserved: deployment manifests (future)
```

- `apps/types.ts` declares the `AppDefinition` interface — the shape every
  catalog entry must satisfy.
- `apps/index.ts` is the single source of truth. It exports the
  `MARKETPLACE_APPS` array (aggregating all 10 app definitions) and the
  `findAppDefinition(slug)` helper. The backend seed route
  (`src/app/api/seed/route.ts`) imports `@deployed/apps` and upserts each
  entry into the `App` table by slug.
- Each `apps/<slug>.ts` file default-exports one `AppDefinition`.

## `AppDefinition` interface

Every catalog entry is a plain object implementing `AppDefinition`. The
fields map directly to columns on the Prisma `App` model:

| Field           | Type     | Description                                                                  |
| --------------- | -------- | ---------------------------------------------------------------------------- |
| `name`          | string   | Human-readable display name (e.g. `"Demo Counter"`)                          |
| `slug`          | string   | URL-safe unique identifier (e.g. `"demo-counter"`)                           |
| `description`   | string   | Short description shown on the marketplace card                              |
| `dockerImage`   | string   | Docker image reference (e.g. `"ossmp/demo-counter:1.0"`)                     |
| `containerPort` | number   | Port the container listens on (default `80`)                                 |
| `logo`          | string   | Logo key resolved by `src/components/marketplace/app-logo.tsx`               |
| `category`      | string   | `Demo` / `Web` / `DevOps` / `Productivity` / `Database` / `Monitoring`       |
| `simulator`     | string   | `static` / `counter` / `notes` / `wiki` — picks the preview simulator         |
| `defaultEnv`    | object   | Default environment variables for the deployment (JSON-encoded in the DB)    |
| `readme`        | string   | Markdown shown on the app detail page                                        |
| `repository`    | string   | Source repository URL                                                        |
| `website`       | string   | Project website URL                                                          |
| `version`       | string   | Semver string (e.g. `"1.0.0"`)                                              |

## The 10 current apps

| App                  | Slug                  | Category      | Simulator |
| -------------------- | --------------------- | ------------- | --------- |
| Demo Counter         | `demo-counter`        | Demo          | counter   |
| Static Welcome       | `static-welcome`      | Web           | static    |
| Gitea Lite           | `gitea-lite`          | Web           | notes     |
| Markdown Wiki        | `markdown-wiki`       | Productivity  | wiki      |
| Redis Cache          | `redis-cache`         | Database      | static    |
| PostgreSQL           | `postgresql`          | Database      | static    |
| Grafana Dashboard    | `grafana-dashboard`   | Monitoring    | static    |
| Prometheus           | `prometheus`          | Monitoring    | static    |
| Nginx Proxy          | `nginx-proxy`         | DevOps        | static    |
| Mattermost Chat      | `mattermost-chat`     | Productivity  | notes     |

## How to add a new app

1. Create `deployed/apps/<slug>.ts` exporting a default `AppDefinition`:

   ```ts
   import type { AppDefinition } from "./types";

   const definition: AppDefinition = {
     name: "My App",
     slug: "my-app",
     description: "Short description shown on the marketplace card.",
     dockerImage: "ossmp/my-app:1.0",
     containerPort: 80,
     logo: "counter",
     category: "Demo",
     simulator: "counter",
     defaultEnv: {},
     version: "1.0.0",
     repository: "https://github.com/...",
     website: "https://...",
     readme: "# My App\n\n...",
   };

   export default definition;
   ```

2. Import and register it in [`apps/index.ts`](./apps/index.ts) by adding it
   to the `MARKETPLACE_APPS` array.

3. Re-seed the catalog:

   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```

   The seed route is idempotent — existing apps are updated in place by slug,
   and new apps are inserted.

If your app needs a new simulator type, also add a case to
`src/components/marketplace/app-simulator.tsx` and create the simulator
component in `src/components/marketplace/simulators/`.

## Reserved subdirectories

- [`docker/`](./docker/README.md) — reserved for per-app Dockerfiles and
  Docker-related build assets when migrating to the real Docker runtime.
  Currently empty.
- [`manifests/`](./manifests/README.md) — reserved for deployment manifests
  (compose definitions, resource-limit manifests, network policies) for the
  real Docker runtime. Currently empty.

## See also

- [backend/README.md](../backend/README.md) — the control plane that consumes this catalog
- [docs/development.md](../docs/development.md) — full "add an app" walkthrough
- [docs/architecture.md](../docs/architecture.md) — catalog-only image enforcement
