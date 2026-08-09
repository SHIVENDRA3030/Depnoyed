# Depnoyed / OSS Deploy

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)](https://www.mongodb.com/atlas)
[![Bun](https://img.shields.io/badge/Bun-runtime-fbf0df)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

**An open-source marketplace where users deploy open-source apps into isolated
tenant containers with persistent volumes and unique public URLs.**

Depnoyed is a self-hostable PaaS for one-click deployment of curated open-source
applications. Each deployment is fully isolated: a dedicated container, a
dedicated persistent volume, and a unique subdomain URL. The control plane
talks to the runtime through a pluggable `DockerAdapter`, so the same codebase
runs in development against a high-fidelity in-process simulation, and in
production against a real Docker host.

> **Sandbox note:** The current sandbox runs the **Mock Docker Adapter**
> (in-process simulation) because Docker is not available here. The
> **`DockerEngineAdapter`** is fully implemented via `dockerode` and will drive
> real containers the moment you set `DOCKER_ADAPTER=docker` on a machine that
> has Docker installed. See
> [docs/deployment.md](docs/deployment.md).

---

## Table of Contents

- [What is Depnoyed?](#what-is-depnoyed)
- [Problem it solves](#problem-it-solves)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Local Setup](#local-setup)
- [How to Run (full guide)](RUN.md)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Mock Deployment Runtime](#mock-deployment-runtime)
- [Real Docker Runtime](#real-docker-runtime)
- [Adding a New Marketplace App](#adding-a-new-marketplace-app)
- [Contributing](#contributing)
- [License](#license)

---

## What is Depnoyed?

Depnoyed lets a user browse a catalog of open-source applications, click
**Deploy**, and receive a running instance of that app with:

- An **isolated container** with a unique name (`ossmp-<slug>-<userId6>-<rand4>`)
- A **persistent volume** with a unique name (`ossmp-vol-<slug>-<userId6>-<rand4>`)
- A **unique public URL** (`<slug>-<rand6>.<baseDomain>`)
- Server-enforced **resource limits** (CPU + memory)
- A **management dashboard** for start/stop/restart/delete, view logs, browse
  volume data, and inspect runtime details

Each deployment belongs to exactly one authenticated user; cross-user access is
refused with `403 FORBIDDEN`. Only applications listed in the catalog
(`deployed/apps/`) can be deployed — users cannot supply arbitrary images.

## Problem it solves

Self-hosting open-source software is still painful: container images have to be
composed with volumes, ports, networks, and reverse-proxy TLS, and most users
abandon the attempt before they ever reach a working instance. Depnoyed
collapses that workflow to one click while preserving the guarantees that
matter for multi-tenant hosting:

| Concern                      | How Depnoyed addresses it                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Tenant isolation             | One container + one volume + one subdomain per deployment, owned by one user              |
| Persistent data              | Dedicated volume per deployment; survives stop/start cycles                               |
| Public URL                   | Unique subdomain generated per deployment                                                 |
| Resource limits              | CPU/memory limits come from server config, never the request body                         |
| Catalog safety               | Only `deployed/apps/*` definitions can be deployed; arbitrary images are refused          |
| Identity                     | Derived server-side from an HMAC-signed session cookie — never the client                 |
| Runtime portability          | Control plane is adapter-driven; mock and real Docker share one interface                 |

## Architecture

Depnoyed is a layered system. Each layer depends only on the layer beneath it,
and the runtime layer is swappable through the `DockerAdapter` interface.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend   src/app  (routes)  ·  src/components  ·  src/hooks      │
│             src/lib (frontend-only: utils, stores, metrics)         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  fetch / Next.js Server Components
┌───────────────────────────────▼─────────────────────────────────────┐
│  API        src/app/api/**  (thin route handlers / controllers)     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  import @backend/*
┌───────────────────────────────▼─────────────────────────────────────┐
│  Control    backend/deployments.ts   (Deployment Manager)           │
│  Plane      backend/auth.ts  ·  backend/config.ts  ·  backend/db.ts │
│             backend/api.ts  (route helpers + serializers)           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  DockerAdapter interface
┌───────────────────────────────▼─────────────────────────────────────┐
│  Adapter    backend/docker/adapter.ts (MockDockerAdapter +           │
│             DockerEngineAdapter via dockerode)                      │
│             MockDockerAdapter  (default)  ·  DockerEngineAdapter    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  Runtime    Mock: in-process state + .ossmp-data/ JSON volumes      │
│             Real Docker: dockerode → unix socket → dockerd          │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-tenancy isolation chain

Every deployment flows through this chain of derived, unique identifiers:

```
User (signed session cookie)
   └── Deployment (unique per user + app)
          ├── Container   ossmp-<slug>-<userId6>-<rand4>
          ├── Volume      ossmp-vol-<slug>-<userId6>-<rand4>
          └── Subdomain   <slug>-<rand6>.<baseDomain>
```

- Identity is **always** derived server-side from the signed session cookie.
- Only catalog apps (from `deployed/apps/`) can be deployed.
- Resource limits come from server config, never the request body.
- `getOwnedDeployment()` enforces `deployment.userId !== userId → 403`.
- Each tenant gets an isolated container, volume, and subdomain.

See [docs/architecture.md](docs/architecture.md) for the full breakdown,
request-flow traces, and security boundaries.

## Project Structure

```
Depnoyed/
├── src/                          # Next.js 16 App Router application
│   ├── app/                      # Routes: page.tsx (SPA at /), layout.tsx,
│   │   │                         # globals.css, preview/[subdomain]/, api/
│   │   ├── api/                  # Thin route handlers → @backend/* services
│   │   │   ├── auth/{login,logout,register,me,password,profile}/route.ts
│   │   │   ├── apps/route.ts, apps/[slug]/route.ts
│   │   │   ├── seed/route.ts
│   │   │   ├── deployments/route.ts, deployments/[id]/{route,start,stop,
│   │   │   │                                        restart,logs,volume}/route.ts
│   │   │   ├── admin/apps/route.ts, admin/apps/[id]/route.ts
│   │   │   └── preview/[subdomain]/volume/route.ts
│   │   └── preview/[subdomain]/page.tsx   # Public deployed-app data plane
│   ├── components/               # ui/ (shadcn) + marketplace/ (views, nav,
│   │                             # footer, deploy-modal, simulators, ...)
│   ├── hooks/                    # use-mobile, use-toast, use-local-storage
│   └── lib/                      # Frontend-only: utils.ts (cn), store.ts,
│                                 # compare-store.ts (Zustand), metrics.ts
├── backend/                      # Server-side control plane (@backend/* alias)
│   ├── db.ts                     # MongoDB-backed facade (was PrismaClient)
│   ├── mongo.ts                  # MongoClient singleton (globalThis pattern)
│   ├── auth.ts                   # scrypt hashing + HMAC-signed session cookie
│   ├── deployments.ts            # Deployment Manager
│   ├── config.ts                 # Env config + name/subdomain generators
│   ├── api.ts                    # Route helpers (json, withErrors, serializers)
│   └── docker/
│       └── adapter.ts            # DockerAdapter + MockDockerAdapter
│                                 # + DockerEngineAdapter stub
├── deployed/                     # Marketplace app definitions
│   └── apps/
│       ├── types.ts              # AppDefinition interface
│       ├── index.ts              # MARKETPLACE_APPS array + findAppDefinition()
│       └── <slug>.ts             # 10 app definitions (one per file)
├── docs/                         # architecture, development, deployment,
│                                 # folder-structure
├── frontend/                     # Frontend-layer documentation marker
│                                 # (Next.js app lives in src/)
├── public/                       # Static assets (logo.svg, robots.txt)
├── README.md                     # this file
├── .env.example                  # environment template
├── .gitignore
├── package.json                  # Bun + Next.js 16; db:ensure-indexes +
│                                 # db:ping scripts (MongoDB)
├── tsconfig.json                 # @/*, @backend/*, @deployed/* aliases
├── next.config.ts                # output: standalone
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json               # shadcn/ui config (New York style)
└── eslint.config.mjs
```

Sandbox-only (gitignored): `.ossmp-data/`, `db/custom.db` (orphaned SQLite
file from the pre-MongoDB era), `dev.log`, `worklog.md`, `download/`, etc.

## Technology Stack

| Layer        | Choice                                                                |
| ------------ | --------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, `output: standalone`)                         |
| Language     | TypeScript 5 (strict)                                                 |
| Styling      | Tailwind CSS 4                                                        |
| UI kit       | shadcn/ui (New York style)                                            |
| Database     | MongoDB Atlas (raw `mongodb` driver v7)                               |
| Runtime/PM   | Bun (package manager + dev runtime)                                   |
| Client state | Zustand                                                               |
| Server state | TanStack Query                                                        |
| Animation    | framer-motion                                                         |
| Icons        | lucide-react                                                          |
| Auth         | Dependency-free: Node `crypto` scrypt + HMAC-SHA256 signed cookies    |

## Local Setup

> **Full step-by-step guide:** See [**RUN.md**](RUN.md) for complete setup
> instructions covering both Mock mode (default, no Docker) and Real Docker
> mode (runs actual containers), including MongoDB Atlas setup,
> troubleshooting, and connecting to deployed databases.

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3
- Node.js 20+ (for tooling compatibility)

### Install and run

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env: set MONGODB_URI (Atlas SRV string) and AUTH_SECRET (see below)

# 3. Ensure MongoDB unique indexes are created (collections auto-create
#    on first write, so there is no separate schema-push step)
bun run db:ensure-indexes

# 4. Start the dev server
bun run dev
```

The app boots at <http://localhost:3000>.

### Seed the catalog

The marketplace is empty until the catalog is seeded. After the dev server is
running, trigger the seed endpoint to load all 10 marketplace apps:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Environment Variables

All values below are documented in [`.env.example`](.env.example). **Never
commit real secrets** — only the `.example` template belongs in version
control.

| Variable                  | Default      | Description                                                                          |
| ------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `MONGODB_URI`             | —            | **Required.** MongoDB Atlas SRV connection string. Retrieve from Atlas -> Connect -> Drivers |
| `MONGODB_DB_NAME`         | `depnoyed`   | Database name used by the MongoClient singleton (collections: users, apps, deployments) |
| `AUTH_SECRET`             | —            | HMAC signing secret for session cookies. Generate with `openssl rand -hex 32`       |
| `DEPLOY_CPU_LIMIT`        | `0.5`        | CPU limit per container (float)                                                     |
| `DEPLOY_CPU_PERIOD`       | `100000`     | CFS CPU period in microseconds                                                       |
| `DEPLOY_MEMORY_LIMIT_MB`  | `512`        | Memory limit per container in MB                                                    |
| `DEPLOY_BASE_DOMAIN`      | `apps.local` | Base domain for deployment URLs                                                    |
| `DOCKER_ADAPTER`          | `mock`       | Runtime adapter: `mock` (default) or `docker` (requires Docker installed)          |
| `MOCK_PERSIST`            | `true`       | `false` disables mock volume persistence to disk                                    |
| `DOCKER_SOCKET`           | `/var/run/docker.sock` | Path to the Docker daemon socket (only used when `DOCKER_ADAPTER=docker`)  |
| `DEPLOY_REAL_APP_BASE_URL`| `http://localhost` | Base URL for "Open real app" links (only when `DOCKER_ADAPTER=docker`). Set to empty to hide the link |
| `DOCKER_PORT_RANGE_START` | `31000`      | Start of host port range for container port bindings                                |
| `DOCKER_PORT_RANGE_END`   | `39999`      | End of host port range for container port bindings                                  |
| `GITHUB_TOKEN`            | —            | **Optional.** Only needed if pushing the repo to GitHub via API; never commit this  |

## Database Setup

Depnoyed uses **MongoDB Atlas** as its primary database, accessed through the
raw `mongodb@7` driver (no ORM). The schema is defined by the TypeScript
interfaces in [`backend/db.ts`](backend/db.ts) — `User`, `App`, and
`Deployment` — not by a separate schema file. MongoDB collections are
auto-created on the first write, so there is no schema-migration step.

### Collections

| Collection     | Document shape (key fields)                                                                                                         | Unique indexes                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `users`        | `id`, `email`, `name`, `passwordHash`, `isAdmin`, `createdAt`, `updatedAt`                                                          | `id`, `email`                                   |
| `apps`         | `id`, `name`, `slug`, `dockerImage`, `containerPort`, `logo`, `category`, `simulator`, `defaultEnv`, `readme`, `repository`, `website`, `version`, `createdAt`, `updatedAt` | `id`, `slug`                                    |
| `deployments`  | `id`, `userId`, `appId`, `containerId`, `containerName`, `volumeName`, `status`, `subdomain`, `port`, `label`, `envVars` (object), `createdAt`, `updatedAt` | `id`, `subdomain` (plus secondary indexes on `userId`, `appId`, `status`) |

- IDs are 24-character lowercase hex strings generated by `newId()` in
  `backend/db.ts` (`randomBytes(12).toString('hex')`).
- Timestamps are native JS `Date` objects (stored as BSON Date); `updatedAt`
  is auto-set by the facade on every update.
- Relations (e.g. `deployment → app`) are resolved by a secondary `findOne`
  on the related collection, not by `$lookup` aggregation. This is documented
  as a future optimization for high-cardinality workloads.

### Index creation

Unique indexes are created automatically on module load — the facade calls
`ensureIndexes()` fire-and-forget when `backend/db.ts` is first imported.
You can also create them explicitly before the first request:

```bash
bun run db:ensure-indexes
```

A quick connectivity + auth check is available via:

```bash
bun run db:ping
```

### Connection

The MongoClient singleton lives in [`backend/mongo.ts`](backend/mongo.ts).
It reads `MONGODB_URI` (required — Atlas SRV connection string) and
`MONGODB_DB_NAME` (default `"depnoyed"`) from the environment, and reuses
the same client across hot-reloads via `globalThis`. The facade in
`backend/db.ts` is the only module that should touch the collections
directly — every other code path goes through `db.user.*`, `db.app.*`,
`db.deployment.*`.

> **Cleanup note:** The legacy SQLite file at `db/custom.db` is now an orphan
> from the Prisma era. It is gitignored and harmless; it can be deleted
> manually (`rm -rf db/custom.db`).

## Mock Deployment Runtime

Because Docker is unavailable in the sandbox, Depnoyed ships with a
high-fidelity **`MockDockerAdapter`** that simulates the full deployment
lifecycle entirely in-process:

- **Volumes** are persisted to `.ossmp-data/volumes/<vol>.json` as JSON
  key-value stores, so data survives server restarts.
- **Container lifecycle** (`create` / `start` / `stop` / `restart` / `remove`)
  is simulated with status transitions and synthetic log lines.
- A **deployed-app data plane** is exposed via `execVolumeOp`
  (`get` / `set` / `incr` / `list` / `delete`) — this is how the per-app
  simulators (counter, notes, wiki, static) read and write their dedicated
  volumes.
- State is shared via `globalThis` so all module instances see one store
  (same pattern as the MongoClient singleton in `backend/mongo.ts`).

**Persistence proof:** Deploy the Demo Counter, increment the counter, stop
the deployment (the preview then returns `APP_NOT_RUNNING`), start it again —
the counter value is unchanged because volume data is preserved across
stop/start.

This is the **current sandbox runtime**. The control plane never depends on
Docker at the type level, so swapping in the real adapter is the only change
required for production.

## Real Docker Runtime

The `DockerEngineAdapter` (selected via `DOCKER_ADAPTER=docker`) is **fully
implemented** via the [`dockerode`](https://github.com/apocas/dockerode)
library. When Docker is installed on the host, the 7 real marketplace apps
(Grafana, PostgreSQL, Redis, Nginx, Gitea, Mattermost, Prometheus) run as
actual containers — not simulations.

### Quick start with real Docker

```bash
# 1. Ensure Docker is installed and running
docker info  # should succeed

# 2. Set the adapter in .env
echo 'DOCKER_ADAPTER=docker' >> .env
echo 'DEPLOY_REAL_APP_BASE_URL=http://localhost' >> .env

# 3. Start the dev server (indexes + seed as usual)
bun run dev

# 4. Deploy an app via the UI. The first deploy pulls the image (e.g.
#    grafana/grafana:latest ~300MB), which can take 30-60s on first run.
#    Subsequent deploys of the same image are instant.

# 5. The deployment view shows an "Open real app" link (green badge) pointing
#    to http://localhost:<hostPort> — that's the REAL running container.
```

### What the real adapter does

| Operation | Implementation |
|-----------|---------------|
| `createVolume` | `docker.createVolume({ Name })` — real named Docker volume |
| `createContainer` | `docker.createContainer({ Image, Env, HostConfig: { PortBindings, Binds, NanoCpus, Memory, MemorySwap, RestartPolicy, CapDrop, SecurityOpt, ReadonlyRootfs, Tmpfs } })` |
| `start/stop/restart/remove` | Real container lifecycle via `container.start()` / `.stop({ t: 10 })` / `.restart()` / `.remove({ force: true })` |
| `inspectContainer` | `container.inspect()` — real status, ports, timestamps |
| `getLogs` | `container.logs({ stdout, stderr, tail, timestamps })` — demuxed from dockerode's multiplexed stream |
| `execVolumeOp` | Host-side JSON sidecar (`.ossmp-data/volumes/<name>.json`) — decoupled from the container's filesystem so it works on ANY image, including distroless ones. See note below. |

### Security hardening (applied to every container)

- `--cap-drop=ALL` — drops all Linux capabilities
- `--security-opt=no-new-privileges` — blocks privilege escalation
- `--read-only` — root filesystem is read-only
- `--tmpfs /tmp /run` — writable tmpfs for paths that need it
- `NanoCpus` + `Memory`/`MemorySwap` — CPU and memory limits enforced by the kernel
- `RestartPolicy: on-failure (max 3)` — won't infinite-loop a crashing app

### The `execVolumeOp` design decision

The mock adapter stores the simulator's key/value data (the counter, notes,
wiki content) in a JSON file per volume. For the real adapter, we deliberately
keep that sidecar on the **Docker host filesystem** rather than `docker exec`-ing
into the container. This means:

- It works on **any** image, including distroless ones that have no shell
- The simulator UI (counter/notes/wiki) continues to work exactly as before
- The real app's own data (e.g. Grafana's SQLite DB, PostgreSQL's data dir)
  lives in the real Docker named volume mounted at `/data`

### What's NOT included (future work)

- **Subdomain-based routing**: today, the "Open real app" link goes to
  `http://localhost:<port>`. For `<subdomain>.yourdomain.com` routing, you'd
  add a Caddy/Traefik reverse proxy that dynamically routes based on the
  deployment's host port. The port is stored in the `deployments` collection.
- **Image pulling progress UI**: the first deploy of a large image blocks for
  30-60s while pulling. A future enhancement would stream pull progress to the
  deployment view.
- **Custom image deployment**: users can only deploy apps from the catalog.
  Letting them paste an arbitrary `image:tag` is a future feature.

See [docs/deployment.md](docs/deployment.md) for the full adapter contract.

## Adding a New Marketplace App

Only apps declared in `deployed/apps/` can be deployed. To add a new one:

1. Create `deployed/apps/<slug>.ts` exporting a default `AppDefinition`:

   ```ts
   import type { AppDefinition } from "./types";

   const definition: AppDefinition = {
     name: "My App",
     slug: "my-app",
     description: "Short description.",
     dockerImage: "ossmp/my-app:1.0",
     containerPort: 80,
     logo: "counter",        // see src/components/marketplace/app-logo.tsx
     category: "Demo",        // Demo | Web | DevOps | Productivity | Database | Monitoring
     simulator: "counter",    // static | counter | notes | wiki
     version: "1.0.0",
     repository: "https://github.com/...",
     website: "https://...",
     readme: "# My App\n\n...",
   };

   export default definition;
   ```

2. Add it to the `MARKETPLACE_APPS` array in
   [`deployed/apps/index.ts`](deployed/apps/index.ts).

3. Re-seed the catalog:

   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```

The seed route is idempotent — existing apps are updated in place by slug.

## Contributing

Depnoyed follows a layered architecture with strict import boundaries enforced
by TypeScript path aliases (see `tsconfig.json`):

- `@/*` → `./src/*` (frontend + API route handlers)
- `@backend/*` → `./backend/*` (server-side control plane)
- `@deployed/*` → `./deployed/*` (marketplace app catalog)

When contributing:

- Keep API route handlers in `src/app/api/**` thin — they should call
  `@backend/*` services and never contain business logic.
- Do not import `@backend/*` from client components.
- Database access goes through the facade in `backend/db.ts`
  (`db.user.*`, `db.app.*`, `db.deployment.*`). Do not import
  `backend/mongo.ts` (the MongoClient singleton) directly from route handlers
  or business logic — only the facade should touch collections.
- Do not add new runtime dependencies for features that can be implemented
  with Node `crypto`, the standard library, or existing deps.
- Never commit real secrets. The `.env` file is gitignored; only
  `.env.example` belongs in version control.
- Run `bun run lint` before pushing.

See [docs/development.md](docs/development.md) for the full dev workflow and
[docs/folder-structure.md](docs/folder-structure.md) for the layout rationale.

## License

MIT. See the LICENSE file (or each upstream open-source app's own license for
the apps themselves).
