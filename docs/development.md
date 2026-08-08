# Development

This document covers local setup, scripts, path aliases, the mock runtime,
how to add a new marketplace app, and testing notes.

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3 (package manager + dev runtime)
- Node.js 20+ (for tooling compatibility)
- A POSIX shell (the `dev` script pipes `next dev` through `tee`)

Docker is **not** required for local development — the mock runtime simulates
the full container/volume lifecycle in-process.

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env and set AUTH_SECRET:
#   openssl rand -hex 32
# (DATABASE_URL defaults to file:./db/custom.db — fine for dev)

# 3. Generate the Prisma client and push the schema
bun run db:generate
bun run db:push

# 4. Start the dev server (http://localhost:3000)
bun run dev

# 5. In another terminal, seed the catalog (10 apps)
curl -X POST http://localhost:3000/api/seed
```

After seeding, open <http://localhost:3000> — the marketplace should render
with all 10 apps. Register a user, deploy the Demo Counter, and increment it
to verify persistence.

## Scripts

All scripts are defined in `package.json`. Database scripts reference the
schema path explicitly so they work from the repo root:

| Script              | Command                                                                | Purpose                              |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `bun run dev`        | `next dev -p 3000 2>&1 \| tee dev.log`                                  | Start the dev server on port 3000    |
| `bun run build`      | `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/` | Production build (standalone output) |
| `bun run start`      | `NODE_ENV=production bun .next/standalone/server.js 2>&1 \| tee server.log` | Run the standalone production server |
| `bun run lint`       | `eslint .`                                                              | Lint the whole repo                  |
| `bun run db:generate`| `prisma generate --schema=backend/prisma/schema.prisma`                 | Regenerate the Prisma client         |
| `bun run db:push`    | `prisma db push --schema=backend/prisma/schema.prisma --accept-data-loss` | Push schema to SQLite                |
| `bun run db:migrate` | `prisma migrate dev --schema=backend/prisma/schema.prisma`              | Create + apply a migration           |
| `bun run db:reset`   | `prisma migrate reset --schema=backend/prisma/schema.prisma`            | Drop + recreate the database         |

## Environment Setup

Copy `.env.example` to `.env` and edit it:

```bash
cp .env.example .env
```

Required for dev:

- `DATABASE_URL` — defaults to `file:./db/custom.db` (fine for dev)
- `AUTH_SECRET` — **must** be set to a random 32-byte hex string:

  ```bash
  openssl rand -hex 32
  ```

Optional (sensible defaults apply):

- `DEPLOY_CPU_LIMIT`, `DEPLOY_CPU_PERIOD`, `DEPLOY_MEMORY_LIMIT_MB` —
  resource limits enforced per container.
- `DEPLOY_BASE_DOMAIN` — base domain for generated deployment subdomains.
- `DOCKER_ADAPTER` — `mock` (default) or `docker`.
- `MOCK_PERSIST` — `false` to disable mock volume persistence.

See [`.env.example`](../.env.example) for the canonical list and comments.

Never commit your real `.env` — only `.env.example` belongs in version
control.

## Database

The Prisma schema lives at
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). The
SQLite file is written to `db/custom.db` (gitignored).

Models:

- **User** — `id`, `email` (unique), `name`, `passwordHash`, `isAdmin`
- **App** — `id`, `name`, `slug` (unique), `dockerImage`, `containerPort`,
  `logo`, `category`, `simulator`, `defaultEnv`, `readme`, `repository`,
  `website`, `version`
- **Deployment** — `id`, `userId`, `appId`, `containerId`, `containerName`,
  `volumeName`, `status`, `subdomain` (unique), `port`, `label`, `envVars`
  (JSON), `createdAt`, `updatedAt`

After schema changes:

```bash
bun run db:generate    # regenerate the TS client (picks up new fields/types)
bun run db:push        # apply the schema to SQLite
```

If the dev server is already running, restart it after `db:generate` — the
Prisma client is cached on `globalThis` and will not pick up the new client
until the process restarts.

## Path Aliases

`tsconfig.json` declares three path aliases that enforce import boundaries:

| Alias          | Resolves to  | Used by                                       |
| -------------- | ------------ | --------------------------------------------- |
| `@/*`          | `./src/*`    | Frontend (pages, components, hooks, lib) and API route handlers |
| `@backend/*`   | `./backend/*`| Server-side control plane (db, auth, deployments, config, api, docker) |
| `@deployed/*`  | `./deployed/*` | Marketplace app catalog (consumed by the seed route) |

Rules of thumb:

- API route handlers (`src/app/api/**`) import `@backend/*` and `@deployed/*`.
- Client components import only `@/*`.
- `@backend/*` may import `@deployed/*` but not `@/*`.
- `@deployed/*` imports nothing from `@/*` or `@backend/*` — it is pure data.

## Mock Runtime

Because Docker is unavailable in the sandbox, Depnoyed ships with a
high-fidelity **`MockDockerAdapter`** (selected by `DOCKER_ADAPTER=mock`,
which is the default). It:

- Persists volumes to `.ossmp-data/volumes/<vol>.json` as JSON key-value
  stores (so data survives server restarts).
- Simulates container lifecycle (`create` / `start` / `stop` / `restart` /
  `remove`) with status transitions and synthetic log lines.
- Exposes an in-process "deployed app" data plane via `execVolumeOp`
  (`get` / `set` / `incr` / `list` / `delete`).
- Shares state via `globalThis` so all module instances see one store —
  critical because Next.js dev can evaluate route handlers and server
  components in separate module instances.

To disable volume persistence (useful for tests):

```bash
MOCK_PERSIST=false bun run dev
```

See [deployment.md](deployment.md) for the migration path to the real Docker
runtime.

## Adding a New Marketplace App

Only apps listed in `deployed/apps/index.ts` can be deployed. To add one:

1. Create `deployed/apps/<slug>.ts` exporting a default `AppDefinition`:

   ```ts
   import type { AppDefinition } from "./types";

   const definition: AppDefinition = {
     name: "My App",
     slug: "my-app",
     description: "Short description shown on the marketplace card.",
     dockerImage: "ossmp/my-app:1.0",
     containerPort: 80,
     logo: "counter",          // see src/components/marketplace/app-logo.tsx
     category: "Demo",          // Demo | Web | DevOps | Productivity | Database | Monitoring
     simulator: "counter",      // static | counter | notes | wiki
     defaultEnv: {},
     version: "1.0.0",
     repository: "https://github.com/...",
     website: "https://...",
     readme: "# My App\n\n...",
   };

   export default definition;
   ```

2. Import and register it in
   [`deployed/apps/index.ts`](../deployed/apps/index.ts) by adding it to the
   `MARKETPLACE_APPS` array.

3. Re-seed the catalog:

   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```

   The seed route is idempotent — existing apps are updated in place by slug,
   and new apps are inserted.

If your app needs a new simulator type, also add a case to
`src/components/marketplace/app-simulator.tsx` and create the simulator
component in `src/components/marketplace/simulators/`.

## Testing Notes

There is no formal automated test suite today. Verify changes via the UI
flows below, or via `curl` against the API.

### Core acceptance flows

1. **Auth** — register a user at `#/login`, sign in, refresh the page
   (session persists via the signed cookie), sign out.
2. **Marketplace** — `#/marketplace` renders all 10 apps with category
   filters and search.
3. **Deploy** — from a card or app detail, click Deploy. The deployment
   appears in `#/dashboard` with `running` status, a unique subdomain URL,
   and a container name.
4. **Persistence** — open the Demo Counter preview, increment the counter,
   stop the deployment (preview returns `APP_NOT_RUNNING`), start it again
   — the counter value is unchanged.
5. **Isolation** — register a second user, attempt to access the first
   user's deployment by ID (`GET /api/deployments/<id>` returns `403`),
   then deploy the same app from the second account — the volume starts
   empty.
6. **Management** — open/stop/start/restart/delete from the dashboard and
   the deployment detail view; verify logs render in the terminal panel.

### Useful curl snippets

```bash
# Register
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.c","password":"password","name":"User A"}'

# Seed
curl -s -X POST http://localhost:3000/api/seed

# List apps
curl -s http://localhost:3000/api/apps | jq .

# Deploy (needs an appId from /api/apps)
curl -s -b cookies.txt -X POST http://localhost:3000/api/deployments \
  -H "Content-Type: application/json" \
  -d '{"appId":"<appId>"}'

# List deployments
curl -s -b cookies.txt http://localhost:3000/api/deployments | jq .
```

## See Also

- [architecture.md](architecture.md) — layer model, isolation chain, request flow
- [deployment.md](deployment.md) — mock vs real Docker runtime
- [folder-structure.md](folder-structure.md) — repository layout rationale
