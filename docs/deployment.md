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

## Real Docker Runtime (production)

Selected by `DOCKER_ADAPTER=docker`. The `DockerEngineAdapter` is **fully
implemented** via [`dockerode`](https://github.com/apocas/dockerode) and talks
to the Docker daemon over the unix socket (configurable via `DOCKER_SOCKET`).
When Docker is installed on the host, the 7 real marketplace apps run as
actual containers.

### Prerequisites

- Docker Engine installed and running (`docker info` should succeed)
- The Next.js process must have read/write access to `/var/run/docker.sock`
  (or whatever `DOCKER_SOCKET` points to)
- A free port range `[DOCKER_PORT_RANGE_START, DOCKER_PORT_RANGE_END)` for
  binding container ports

### What the `DockerEngineAdapter` implements

Each method on the `DockerAdapter` interface is implemented against
`dockerode`:

| Method                        | Real implementation                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `createVolume(name)`          | `docker.createVolume({ Name, Labels: { "ossmp.managed": "true" } })` — idempotent                |
| `removeVolume(name)`          | `docker.getVolume(name).remove({ force: false })` — also cleans up the host-side sidecar          |
| `inspectVolume(name)`         | `docker.getVolume(name).inspect()` — size approximated via the host-side sidecar                  |
| `createContainer(opts)`       | `docker.createContainer({ Image, Env, ExposedPorts, HostConfig: { PortBindings, Binds, NanoCpus, Memory, MemorySwap, RestartPolicy, CapDrop, SecurityOpt, ReadonlyRootfs, Tmpfs }, Labels })`. Auto-pulls the image if not present locally. |
| `startContainer(name)`        | `container.start()` — returns real status + host port                                            |
| `stopContainer(name)`         | `container.stop({ t: 10 })` — 10s grace period before SIGKILL                                    |
| `restartContainer(name)`      | `container.restart({ t: 10 })`                                                                   |
| `removeContainer(name)`       | `container.remove({ force: true, v: false })` — named volumes preserved                          |
| `inspectContainer(name)`      | `container.inspect()` — returns real status, host port, timestamps                               |
| `getLogs(name, tail)`         | `container.logs({ stdout, stderr, tail, timestamps })` — demuxed from dockerode's multiplexed stream into `LogLine[]` |
| `execVolumeOp(name, op)`      | Host-side JSON sidecar (`.ossmp-data/volumes/<name>.json`) — see "execVolumeOp design" below      |

### Resource limits mapping

Server-side limits from `backend/config.ts` map to Docker `HostConfig`:

| Server config              | dockerode HostConfig field                          |
| -------------------------- | --------------------------------------------------- |
| `DEPLOY_CPU_LIMIT` (float) | `NanoCpus: Math.round(cpuLimit * 1e9)`              |
| `DEPLOY_CPU_PERIOD` (us)   | (unused by dockerode — `NanoCpus` supersedes CFS quota/period) |
| `DEPLOY_MEMORY_LIMIT_MB`   | `Memory: memoryLimitMb * 1024 * 1024` + `MemorySwap` (equal, disables swap) |

These limits are read from server configuration — never from the request body
— so users cannot raise their own limits.

### Security hardening (applied to every container)

The `createContainer` call applies these security defaults:

- `CapDrop: ["ALL"]` — drops all Linux capabilities
- `SecurityOpt: ["no-new-privileges"]` — blocks privilege escalation
- `ReadonlyRootfs: true` — root filesystem is read-only
- `Tmpfs: { "/tmp": "", "/run": "" }` — writable tmpfs for paths that need it
- `RestartPolicy: { Name: "on-failure", MaximumRetryCount: 3 }` — won't infinite-loop a crashing app

### Volume mount

The deployment's dedicated Docker named volume is mounted at `/data` inside
the container. Apps that persist data should write to `/data` (e.g. Grafana's
SQLite DB, PostgreSQL's data directory).

### Port mapping

Each deployment exposes a `containerPort` (declared in the
`AppDefinition`). The real adapter binds that port to a dynamically
allocated host port from `[DOCKER_PORT_RANGE_START, DOCKER_PORT_RANGE_END)`
and records it in `Deployment.port`. The frontend constructs the "Open real
app" link as `<DEPLOY_REAL_APP_BASE_URL>:<port>` (e.g.
`http://localhost:31245`).

### `execVolumeOp` design (host-side sidecar)

The mock adapter stores the simulator's key/value data (the counter, notes,
wiki content) in a JSON file per volume. For the real adapter, we deliberately
keep that sidecar on the **Docker host filesystem**
(`.ossmp-data/volumes/<name>.json`) rather than `docker exec`-ing into the
container. This means:

- It works on **any** image, including distroless ones that have no shell
- The simulator UI (counter/notes/wiki) continues to work exactly as before
- The real app's own data lives in the real Docker named volume mounted at `/data`

The adapter resolves the container name → volume name via Docker inspect (the
`ossmp.volume` label), then delegates the key/value operation to a
`MockDockerAdapter` instance operating on the host filesystem.

### Image pulling

When `createContainer` fails because the image isn't present locally, the
adapter automatically pulls it via `docker.pull(image)` and retries. Pull
progress is not streamed to the UI (future enhancement) — the request blocks
until the pull completes. For large images (e.g. `grafana/grafana:latest` is
~300MB), the first deploy can take 30-60s. Subsequent deploys of the same
image are instant.

### Subdomain routing (production, not included)

In the mock runtime, the public URL `<slug>-<rand6>.<baseDomain>` is rendered
through Next.js at `/preview/[subdomain]`. With the real Docker adapter, the
"Open real app" link goes to `http://<DEPLOY_REAL_APP_BASE_URL>:<hostPort>`.
For true `<subdomain>.<baseDomain>` routing, a reverse proxy (Caddy/Traefik)
would dynamically route based on the deployment's host port. The
subdomain-to-deployment mapping is resolvable from the `deployments`
collection in MongoDB Atlas (`subdomain` has a unique index). This is
**future work** — not implemented today.

### Network isolation per tenant (future work)

Today the real adapter does not create per-tenant Docker networks. For
production, each tenant (or each deployment) should get an isolated Docker
network so deployments cannot reach each other directly. This is **future
work**.

### Graceful degradation

When `DOCKER_ADAPTER=docker` is set but the Docker daemon is unreachable
(e.g. Docker not started, socket permissions wrong), the adapter logs a clear
warning on first use:

```
[docker] DOCKER_ADAPTER=docker but the Docker daemon at /var/run/docker.sock
is unreachable. Container operations will fail. Start Docker, or set
DOCKER_ADAPTER=mock to silence this.
```

Subsequent container operations will throw errors with the underlying
`dockerode` message, which helps diagnose socket permission issues vs.
missing images vs. port conflicts.

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
