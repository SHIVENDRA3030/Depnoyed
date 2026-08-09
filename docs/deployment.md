# Deployment & Runtime

Depnoyed's control plane talks to the runtime exclusively through the
`DockerAdapter` interface declared in
[`backend/docker/adapter.ts`](../backend/docker/adapter.ts). Two adapters
implement that interface:

- **`MockDockerAdapter`** — high-fidelity in-process simulation. **This is
  the current sandbox runtime.**
- **`DockerEngineAdapter`** — production stub that today delegates to the
  mock. In real production it would talk to the Docker daemon via `dockerode`
  or by shelling out to the `docker` CLI.

The adapter is selected at process start by the `DOCKER_ADAPTER` environment
variable (read in `backend/config.ts`, instantiated by `getDockerAdapter()`).
**No API or UI changes are required to swap adapters** — the deployment
manager never instantiates adapters directly.

> **Important:** Real Docker is **not** working today. The `DockerEngineAdapter`
> is a stub. Do not assume production Docker behavior is implemented.

## Mock Docker Runtime (current sandbox)

Selected by `DOCKER_ADAPTER=mock` (the default). This is the runtime that
runs in the sandbox and in local development without Docker installed.

### What it simulates

| Capability                          | Mock behavior                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Volume create / remove / inspect    | Volumes are stored as JSON files at `.ossmp-data/volumes/<vol>.json` (JSON key-value stores)   |
| Container create                    | Registers the container in an in-memory map keyed by name, with `status: created`              |
| Container start / stop / restart    | Transitions `status` between `created` / `running` / `exited`; emits synthetic log lines       |
| Container remove                    | Deletes the container record from the in-memory map                                            |
| Container inspect                   | Returns the in-memory record (with a one-time force-reload from disk on cache-miss)            |
| Container logs                      | Returns the accumulated synthetic log lines (includes lifecycle events)                        |
| `execVolumeOp` (`get`/`set`/`incr`/`list`/`delete`) | Mutates the volume's JSON file on disk and the in-memory cache                   |

### State sharing

State is stored on `globalThis` (the same pattern used for the MongoClient
singleton in `backend/mongo.ts`). This is essential because Next.js dev can
evaluate route handlers and server components in separate module instances —
without `globalThis` sharing, a container created by an API route would be
invisible to the preview page.

### Persistence

Volumes are persisted to `.ossmp-data/volumes/<vol>.json` on disk. To
disable persistence (useful for tests):

```bash
MOCK_PERSIST=false bun run dev
```

### Persistence proof

Deploy the Demo Counter, increment the counter, stop the deployment (the
preview then returns `APP_NOT_RUNNING`), start it again — the counter value
is unchanged because the volume JSON file was preserved on disk.

## Real Docker Runtime (production target)

Selected by `DOCKER_ADAPTER=docker`. The `DockerEngineAdapter` stub is the
hook point for production wiring. Today it delegates to the mock
implementation; the work below is what's required to make it real.

### What the `DockerEngineAdapter` needs to implement

Each method on the `DockerAdapter` interface must be implemented against
either `dockerode` (recommended, talks to the docker daemon over the unix
socket) or the `docker` CLI (shell-out). Concretely:

| Method                        | Real implementation                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `createVolume(name)`          | `docker volume create <name>` (or `dockerode.createVolume({ Name: name })`)                      |
| `removeVolume(name)`          | `docker volume rm <name>`                                                                        |
| `inspectVolume(name)`         | `docker volume inspect <name>` — return `{ name, dataSize, ... }`                                |
| `createContainer(opts)`       | `dockerode.createContainer({ Image, Cmd, Env, HostConfig: { ... } })`                            |
| `startContainer(name)`        | `docker start <name>`                                                                            |
| `stopContainer(name)`         | `docker stop <name>`                                                                             |
| `restartContainer(name)`      | `docker restart <name>`                                                                          |
| `removeContainer(name)`       | `docker rm -f <name>`                                                                            |
| `inspectContainer(name)`      | `docker inspect <name>` — return `{ name, status, ... }`                                         |
| `getLogs(name)`               | `docker logs <name>` — return as `string[]`                                                      |
| `execVolumeOp(volume, op)`    | Either exec into the container (`docker exec`) or proxy to the app's own volume API over its published port |

### Resource limits mapping

Server-side limits from `backend/config.ts` map to Docker flags:

| Server config              | Docker flag                                          |
| -------------------------- | ---------------------------------------------------- |
| `DEPLOY_CPU_LIMIT` (float) | `--cpus=<cpuLimit>` (or `NanoCPUs` in dockerode)     |
| `DEPLOY_CPU_PERIOD` (us)   | `--cpu-period=<cpuPeriod>`                           |
| `DEPLOY_MEMORY_LIMIT_MB`   | `--memory=<memoryLimitMb>m`                          |

These limits are read from server configuration — never from the request body
— so users cannot raise their own limits.

### Volume mount

The deployment's dedicated volume is mounted at `/data` inside the container.
Apps that wish to persist data must write to `/data`. The mock runtime
mirrors this convention by treating the volume's JSON store as the `/data`
namespace.

### Port mapping

Each deployment exposes a `containerPort` (declared in the
`AppDefinition`). The real adapter should publish that port on a dynamically
allocated host port and record it in `Deployment.port` so the reverse proxy
can route to it.

### Subdomain routing (production)

In the mock runtime, the public URL `<slug>-<rand6>.<baseDomain>` is rendered
through Next.js at `/preview/[subdomain]`. In production, a reverse proxy
(Caddy is recommended — a `Caddyfile` is already present at the repo root)
should dynamically route `<subdomain>.<baseDomain>` to the container's
published host port. The subdomain-to-deployment mapping is resolvable from
the `deployments` collection in MongoDB Atlas (`subdomain` has a unique
index).

### Network isolation per tenant (future work)

Today the mock runtime does not model networks. For production, each tenant
should get an isolated Docker network (or a network per deployment) so
deployments cannot reach each other directly. This is **future work** — not
implemented in the stub.

## MongoDB Atlas (production database)

Depnoyed persists `User`, `App`, and `Deployment` documents in MongoDB Atlas
via the raw `mongodb@7` driver — there is no ORM and no on-disk database
file in production. The MongoClient singleton in
[`backend/mongo.ts`](../backend/mongo.ts) reads `MONGODB_URI` and
`MONGODB_DB_NAME` from the environment. For production deployment:

- **Connection string:** use the Atlas SRV format
  (`mongodb+srv://<user>:<password>@<cluster>/?appName=<app>`). Retrieve
  it from the Atlas dashboard -> Connect -> Drivers.
- **IP allowlist:** add every egress IP of your deployment host(s) to the
  Atlas Network Access list. Atlas silently terminates TLS handshakes from
  non-allowlisted IPs — this manifests as `tlsv1 alert internal error`
  (alert 80) before the Mongo protocol layer is reached, and is easily
  mistaken for a TLS/cert problem.
- **Database user:** use a dedicated least-privilege user scoped to
  readWrite on the `depnoyed` database only. Rotate the password if it was
  ever shared in plaintext.
- **Indexes:** created automatically by `ensureIndexes()` on module load
  (fire-and-forget). For first-deploy verification, run
  `bun run db:ensure-indexes` once. Unique constraints: `users.email`,
  `apps.slug`, `deployments.subdomain`.
- **Collections:** `users`, `apps`, `deployments` — auto-created on first
  write. No schema-migration step is required.

The facade in [`backend/db.ts`](../backend/db.ts) is the only module that
touches collections directly. Route handlers and business logic go through
`db.user.*`, `db.app.*`, `db.deployment.*` (Prisma-like signatures backed
by raw MongoDB operations). See [architecture.md](architecture.md) for the
full data-layer description.

## Switching Adapters

Switching is a single environment variable change. There is no code change
required because the deployment manager depends only on the `DockerAdapter`
interface.

```bash
# Sandbox / local dev (default)
DOCKER_ADAPTER=mock bun run dev

# Production target (stub today — does NOT yet talk to real Docker)
DOCKER_ADAPTER=docker bun run start
```

The adapter is a singleton resolved by `getDockerAdapter()` on `globalThis`,
read once at process start. Changing `DOCKER_ADAPTER` requires a process
restart.

## Migration Checklist

When promoting `DockerEngineAdapter` from stub to production:

- [ ] Implement every method of `DockerAdapter` against `dockerode` (or
      `docker` CLI) — do not leave any delegating to the mock.
- [ ] Map `cpuLimit` → `--cpus`, `memoryLimitMb` → `--memory`.
- [ ] Mount the volume at `/data`.
- [ ] Publish `containerPort` on a dynamic host port; persist it to
      `Deployment.port`.
- [ ] Implement `execVolumeOp` either via `docker exec` or by proxying to
      the deployed app's own volume API.
- [ ] Wire Caddy to dynamically route `<subdomain>.<baseDomain>` to each
      container's published port.
- [ ] Add per-tenant network isolation.
- [ ] Add deployment health pings and surface them in the dashboard.
- [ ] Verify the persistence proof (counter survives stop/start) against
      the real runtime.

## See Also

- [architecture.md](architecture.md) — adapter interface, request flow
- [development.md](development.md) — running the mock runtime locally
