# Backend

This directory holds the **server-side control plane** for Depnoyed. It is
imported via the `@backend/*` TypeScript path alias (see
[`tsconfig.json`](../tsconfig.json)) and is **server-only** — client
components must never import from here.

API route handlers in [`src/app/api/`](../src/app/api) are thin controllers
that import from this directory and never contain business logic themselves.

## Modules

| File                              | Responsibility                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`db.ts`](./db.ts)                | Prisma client singleton. Reuses the same instance across hot-reloads via `globalThis`.         |
| [`auth.ts`](./auth.ts)            | Dependency-free auth: scrypt password hashing (per-user salt, format `scrypt$<salt>$<hash>`) and HMAC-SHA256 signed session cookies (`ossmp_session`) carrying `{ uid, email, iat }`, httpOnly, 7-day expiry. Entry points: `getSessionUser()`, `requireUser()`. |
| [`deployments.ts`](./deployments.ts) | The **Deployment Manager** — the privileged subsystem. Owns `createDeployment`, `start` / `stop` / `restart` / `delete`, volume ops, name/subdomain generation orchestration, and DB<->runtime status sync. Enforces ownership via `getOwnedDeployment()`. |
| [`config.ts`](./config.ts)        | Env-driven config (`DEPLOY_CPU_LIMIT`, `DEPLOY_CPU_PERIOD`, `DEPLOY_MEMORY_LIMIT_MB`, `DEPLOY_BASE_DOMAIN`, `DOCKER_ADAPTER`, `MOCK_PERSIST`) plus `generateSubdomain()` / `generateContainerName()` / `generateVolumeName()` / `deploymentPublicUrl()`. |
| [`api.ts`](./api.ts)              | Route helpers: `json()` response builder, `withErrors()` wrapper, and response serializers for `App` / `Deployment` / `User`. |
| [`docker/adapter.ts`](./docker/adapter.ts) | The `DockerAdapter` interface, the `MockDockerAdapter` (default, high-fidelity simulation), and the `DockerEngineAdapter` stub. Selected at runtime via `getDockerAdapter()` on `globalThis`. |
| [`prisma/schema.prisma`](./prisma/schema.prisma) | Prisma schema for SQLite. Models: `User`, `App`, `Deployment`. |

## The `@backend/*` alias

`tsconfig.json` declares:

```json
"paths": {
  "@/*":         ["./src/*"],
  "@backend/*":  ["./backend/*"],
  "@deployed/*": ["./deployed/*"]
}
```

API route handlers import like this:

```ts
import { requireUser } from "@backend/auth";
import { createDeployment } from "@backend/deployments";
import { json, withErrors } from "@backend/api";
```

## Security boundaries

The control plane enforces four security invariants. Every API route that
touches a deployment must go through these checks; bypassing them is a bug.

1. **Server-derived identity.** Identity is always derived server-side from
   the signed `ossmp_session` cookie via `getSessionUser()` /
   `requireUser()`. The request body never carries identity.
2. **Catalog-only images.** Only `AppDefinition`s listed in
   [`deployed/apps/index.ts`](../deployed/apps/index.ts) can be deployed.
   `createDeployment()` resolves the requested app by slug and refuses to
   run anything that is not in the catalog — users cannot supply arbitrary
   Docker images.
3. **Server-side resource limits.** CPU and memory limits come from server
   configuration (`DEPLOY_CPU_LIMIT`, `DEPLOY_MEMORY_LIMIT_MB`), not the
   request body. A user cannot raise their own limits.
4. **Ownership enforcement.** `getOwnedDeployment()` loads a deployment and
   verifies `deployment.userId === userId`. If they differ, the request
   fails with `403 FORBIDDEN` before any privileged operation is allowed to
   proceed.

## Database scripts

The Prisma schema lives at `backend/prisma/schema.prisma`. All `db:*`
scripts in [`package.json`](../package.json) reference this path explicitly
so they work from the repo root:

```bash
bun run db:generate    # prisma generate --schema=backend/prisma/schema.prisma
bun run db:push        # prisma db push  --schema=backend/prisma/schema.prisma --accept-data-loss
bun run db:migrate     # prisma migrate dev  --schema=backend/prisma/schema.prisma
bun run db:reset       # prisma migrate reset --schema=backend/prisma/schema.prisma
```

After running `db:generate`, restart the dev server — the Prisma client is
cached on `globalThis` and will not pick up the new client until the process
restarts.

## Prisma models

- **User** — `id`, `email` (unique), `name`, `passwordHash`, `isAdmin`,
  `createdAt`, `updatedAt`
- **App** — `id`, `name`, `slug` (unique), `description`, `dockerImage`,
  `containerPort`, `logo`, `category`, `simulator`, `defaultEnv`, `readme`,
  `repository`, `website`, `version`, `createdAt`, `updatedAt`
- **Deployment** — `id`, `userId`, `appId`, `containerId`, `containerName`,
  `volumeName`, `status`, `subdomain` (unique), `port`, `label`, `envVars`
  (JSON), `createdAt`, `updatedAt`. Indexed on `userId`, `appId`, `status`.

## See also

- [frontend/README.md](../frontend/README.md) — frontend layer
- [deployed/README.md](../deployed/README.md) — marketplace app catalog
- [docs/architecture.md](../docs/architecture.md) — full architecture
- [docs/deployment.md](../docs/deployment.md) — mock vs real Docker runtime
