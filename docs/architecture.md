# Architecture

This document describes the layered architecture of Depnoyed, the multi-tenancy
isolation model, security boundaries, the pluggable Docker adapter, the
request flow for a typical deploy, and the public deployed-app data plane.

## Layered Architecture

Depnoyed is composed of five layers, each depending only on the layer beneath
it. The runtime layer is swappable through the `DockerAdapter` interface, so
the same control plane runs against either a high-fidelity in-process mock or
a real Docker host.

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
│  Adapter    backend/docker/adapter.ts                               │
│             MockDockerAdapter (default) · DockerEngineAdapter stub  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  Runtime    Mock: in-process state + .ossmp-data/ JSON volumes      │
│             Real Docker (future): dockerode / docker CLI            │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer            | Location                                   | Responsibility                                                                            |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Frontend**     | `src/app`, `src/components`, `src/hooks`, `src/lib` | UI rendering, hash-based SPA routing, client state (Zustand), server state (TanStack Query) |
| **API**          | `src/app/api/**`                           | Thin HTTP controllers. Parse request, call `@backend/*`, serialize response              |
| **Control plane**| `backend/*`                                | Deployment Manager (privileged subsystem), auth, config, Prisma access, route helpers    |
| **Adapter**      | `backend/docker/adapter.ts`                | `DockerAdapter` interface + `MockDockerAdapter` + `DockerEngineAdapter` stub              |
| **Runtime**      | (mock: in-process; real: docker daemon)    | Executes container/volume operations                                                      |

Import boundaries are enforced by TypeScript path aliases
(see `tsconfig.json`):

- `@/*` → `./src/*`
- `@backend/*` → `./backend/*`
- `@deployed/*` → `./deployed/*`

API route handlers must stay thin: they parse input, call `@backend/*`
services, and return serialized output. Business logic lives in the control
plane.

## Multi-Tenancy Isolation Chain

Every deployment flows through a strict chain of derived, unique identifiers.
At no point does the client choose container names, volume names, subdomains,
or resource limits.

```
User (authenticated via signed session cookie)
   └── Deployment (unique per user + app)
          ├── Container    ossmp-<slug>-<userId6>-<rand4>
          ├── Volume       ossmp-vol-<slug>-<userId6>-<rand4>
          └── Subdomain    <slug>-<rand6>.<baseDomain>
```

| Resource           | Generator (`backend/config.ts`)                              | Example                        |
| ------------------ | ------------------------------------------------------------ | ------------------------------ |
| Container name     | `generateContainerName(userId, slug)` → `ossmp-<slug>-<userId6>-<rand4>` | `ossmp-demo-counter-a1b2c3-d4e5` |
| Volume name        | `generateVolumeName(userId, slug)` → `ossmp-vol-<slug>-<userId6>-<rand4>` | `ossmp-vol-demo-counter-a1b2c3-d4e5` |
| Subdomain          | `generateSubdomain(slug)` → `<slug>-<rand6>`                 | `demo-counter-x7y2k9`          |
| Public URL         | `deploymentPublicUrl(subdomain)` → `https://<sub>.<baseDomain>` | `https://demo-counter-x7y2k9.apps.local` |

### Persistence proof

The Demo Counter increments a counter stored in its dedicated volume. Stop
the deployment → the preview route returns `APP_NOT_RUNNING`. Start it again
→ the counter value is unchanged, because volume data is preserved across
stop/start. This is true for the mock runtime (volumes are persisted to
`.ossmp-data/volumes/<vol>.json`) and will be true for the real Docker
runtime (volumes are mounted at `/data`).

## Security Boundaries

### Server-derived identity

Identity is **always** derived server-side from the signed session cookie
(`ossmp_session`), never from the request body or a client-supplied header.
The cookie payload is `{ uid, email, iat }`, HMAC-SHA256 signed with
`AUTH_SECRET`, httpOnly, with a 7-day expiry. `getSessionUser()` and
`requireUser()` (in `backend/auth.ts`) are the only entry points used by API
routes.

### Catalog-only images

Only `AppDefinition`s listed in `deployed/apps/index.ts` (`MARKETPLACE_APPS`)
can be deployed. The seed route (`POST /api/seed`) populates the `App` table
from this catalog. `createDeployment()` resolves the requested app by slug and
refuses to deploy anything that is not in the catalog — users cannot supply
arbitrary Docker images.

### Server-side resource limits

CPU and memory limits come from server configuration
(`DEPLOY_CPU_LIMIT`, `DEPLOY_CPU_PERIOD`, `DEPLOY_MEMORY_LIMIT_MB`), not the
request body. A user cannot raise their own limits by sending a different
value.

### Ownership enforcement

`getOwnedDeployment()` loads a deployment and verifies that
`deployment.userId === userId`. If they differ, the request fails with
`403 FORBIDDEN` before any privileged operation (start, stop, restart,
delete, volume op) is allowed to proceed.

### Per-tenant isolation

Each deployment gets its own container, its own volume, and its own subdomain.
There is no shared state between deployments at the runtime layer — volumes
are namespaced by deployment, and container names are globally unique.

## Docker Adapter Abstraction

The control plane never depends on Docker at the type level. It depends only
on the `DockerAdapter` interface declared in
[`backend/docker/adapter.ts`](../backend/docker/adapter.ts):

```ts
interface DockerAdapter {
  createVolume(name: string): Promise<VolumeInfo>;
  removeVolume(name: string): Promise<void>;
  inspectVolume(name: string): Promise<VolumeInfo | null>;

  createContainer(opts: ContainerCreateOpts): Promise<ContainerInfo>;
  startContainer(name: string): Promise<void>;
  stopContainer(name: string): Promise<void>;
  restartContainer(name: string): Promise<void>;
  removeContainer(name: string): Promise<void>;
  inspectContainer(name: string): Promise<ContainerInfo | null>;
  getLogs(name: string): Promise<string[]>;

  execVolumeOp(volume: string, op: VolumeOp): Promise<unknown>;
}
```

(Interface shape paraphrased — see `backend/docker/adapter.ts` for the
canonical signatures.)

### MockDockerAdapter (default, `DOCKER_ADAPTER=mock`)

High-fidelity simulation. This is the **current sandbox runtime**:

- Persists volumes to `.ossmp-data/volumes/<vol>.json` as JSON key-value
  stores, so data survives server restarts.
- Simulates container lifecycle (`create` / `start` / `stop` / `restart` /
  `remove`) with status transitions and synthetic log lines.
- Exposes an in-process "deployed app" data plane via `execVolumeOp`
  (`get` / `set` / `incr` / `list` / `delete`).
- State is shared via `globalThis` so all module instances (API routes,
  server components, dev hot-reloads) see one store — the same pattern used
  for the Prisma client singleton.

### DockerEngineAdapter (`DOCKER_ADAPTER=docker`)

Production stub. Today it delegates to the mock implementation. In real
production it would shell out to `docker` or use `dockerode` over the unix
socket. **Swapping this adapter in is the only change required to move from
sandbox to production** — no API or UI changes are needed.

### Adapter selection

`getDockerAdapter()` (singleton on `globalThis`) reads `DOCKER_ADAPTER` and
returns the appropriate instance. The Deployment Manager never instantiates
adapters directly.

## Request Flow: Deploy an App

The end-to-end flow for `POST /api/deployments` with `{ appId }`:

```
1.  Browser → POST /api/deployments  (cookie: ossmp_session=...)
2.  src/app/api/deployments/route.ts
       └─ requireUser()            → reads signed cookie, returns userId
       └─ validates body { appId }
3.  backend/deployments.ts  createDeployment(userId, appId)
       ├─ findAppDefinition(slug)  → refuses if not in catalog
       ├─ generateContainerName()  → ossmp-<slug>-<userId6>-<rand4>
       ├─ generateVolumeName()     → ossmp-vol-<slug>-<userId6>-<rand4>
       ├─ generateSubdomain()      → <slug>-<rand6>
       ├─ getDockerAdapter()
       │     ├─ createVolume(volumeName)         → .ossmp-data/volumes/<vol>.json
       │     ├─ createContainer({...})           → registers container in mock store
       │     └─ startContainer(containerName)    → status: running, log lines emitted
       ├─ prisma.deployment.create({...})        → row inserted, status: running
       └─ returns Deployment (serialized)
4.  API route serializes via @backend/api.ts  → 201 Created + JSON body
5.  Browser navigates to #/deployments/<id>
6.  Dashboard polls GET /api/deployments and GET /api/deployments/[id]/logs
```

The same flow handles `start` / `stop` / `restart` / `delete` — each maps to
one adapter call plus a status sync to the database, gated by
`getOwnedDeployment()`.

## Public Deployed-App Data Plane

Each deployment exposes a **public data plane** at
`/preview/[subdomain]` (and its volume API at
`/api/preview/[subdomain]/volume`). This is how deployed apps are reachable
without a separate reverse proxy.

```
GET  /preview/<subdomain>                   → renders the per-app simulator
GET  /api/preview/<subdomain>/volume        → lists volume keys
POST /api/preview/<subdomain>/volume        → { op: get|set|incr|list|delete, key, value }
```

### Authorization model for the data plane

The public data plane is **keyed by subdomain**, not by user session. It is
intentionally public (anyone with the URL can read/write the deployed app's
volume) — this mirrors the production model where the subdomain URL itself is
the secret. The data plane only operates while the deployment's container is
`running`; when stopped, every op returns `APP_NOT_RUNNING`.

### Per-app simulators

The simulator type comes from the deployed `App.simulator` field. Supported
types today:

| Simulator | Component                                          | Volume keys used              |
| --------- | -------------------------------------------------- | ------------------------------ |
| `static`  | `src/components/marketplace/simulators/static-simulator.tsx`  | (read-only render)            |
| `counter` | `src/components/marketplace/simulators/counter-simulator.tsx` | `counter.json` (count value)  |
| `notes`   | `src/components/marketplace/simulators/notes-simulator.tsx`   | `notes` (array of notes)      |
| `wiki`    | `src/components/marketplace/simulators/wiki-simulator.tsx`    | `wiki_pages` (page list JSON) |

Each simulator calls the public volume API to read its initial state
server-side and to persist writes. The shell surfaces the container name,
volume name, and resource limits to make isolation visible to the user.

## See Also

- [development.md](development.md) — local setup, scripts, adding apps
- [deployment.md](deployment.md) — mock vs real Docker runtime, migration plan
- [folder-structure.md](folder-structure.md) — repository layout rationale
