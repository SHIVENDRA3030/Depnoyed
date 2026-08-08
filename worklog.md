# OSS Deploy — Open-Source Marketplace MVP · Worklog

This is the shared handover document for the Open-Source Software Marketplace
project. Every contributor (human or agent) appends a section below.

---
Task ID: 1
Agent: lead-engineer (Z.ai Code)
Task: Build the complete OSS Marketplace MVP (auth, catalog, deploy, isolated
tenant containers, persistent volumes, unique public URLs, management UI) and
verify the full acceptance scenario end-to-end.

Work Log:
- Inspected the existing Next.js 16 + TypeScript + Tailwind + shadcn/ui +
  Prisma(SQLite) scaffold. Confirmed Docker is NOT available in the sandbox.
- Designed a pluggable `DockerAdapter` interface with a high-fidelity
  `MockDockerAdapter` that persists volumes to disk (`.ossmp-data/`) and
  simulates container lifecycle + an in-process "deployed app" data plane.
  A `DockerEngineAdapter` stub keeps the same interface for real Docker.
- Prisma schema: `User` (with `passwordHash`), `App`, `Deployment` with FKs,
  indexes, unique `subdomain`. Pushed to SQLite via `bun run db:push`.
- Auth: dependency-free — scrypt password hashing + HMAC-signed session cookie
  (Node `crypto`). API: `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`.
  Identity is always derived server-side from the session, never the client.
- Config: env-driven resource limits (`DEPLOY_CPU_LIMIT=0.5`,
  `DEPLOY_MEMORY_LIMIT_MB=512`, `DEPLOY_BASE_DOMAIN`, `DOCKER_ADAPTER=mock`).
- Deployment manager (`src/lib/deployments.ts`): the controlled privileged
  subsystem. `createDeployment` validates the app, generates unique
  container/volume/subdomain names, creates volume → container → starts it,
  enforces resource limits, syncs status to the DB. Only catalog apps can be
  deployed (no arbitrary images).
- APIs: `GET/POST /api/deployments`, `GET/DELETE /api/deployments/[id]`,
  `POST /api/deployments/[id]/{start,stop,restart}`, `GET .../logs`,
  `GET/POST .../volume`. Public deployed-app data plane:
  `/api/preview/[subdomain]/volume` (keyed by subdomain, only works while the
  container is running). `GET/POST /api/seed` + `GET /api/apps` + `/api/apps/[slug]`.
- Deployed-app simulation: `/preview/[subdomain]` renders a per-app simulator
  (counter / static-welcome / notes) that reads/writes the deployment's
  dedicated volume via the public volume API. The shell surfaces the container
  name, volume name, and resource limits to prove isolation to the user.
- Frontend: single-route SPA on `/` (per sandbox rule "only the / route") with
  hash-based view routing: `#/login`, `#/marketplace`, `#/apps/:slug`,
  `#/dashboard`, `#/deployments/:id`. Emerald/teal brand identity, dark mode
  via next-themes, sticky footer (`min-h-screen flex flex-col` + `mt-auto`),
  responsive, shadcn/ui components throughout.
- Seeded 3 apps: Demo Counter (persistence demo), Static Welcome (nginx:alpine),
  Gitea Lite (notes). Seeded via `POST /api/seed`.

Stage Summary (backend E2E — all verified via curl):
- Auth: register/login/logout/me all work; sessions persist via signed cookie.
- Deploy: clicking deploy creates volume + container, starts it, returns
  running status + unique subdomain URL.
- Persistence: counter incremented to 3, deployment STOPPED (preview then
  returns `APP_NOT_RUNNING`), STARTED again, counter still 3. ✅
- Isolation: User B gets HTTP 403 FORBIDDEN on User A's deployment; User B's
  own deployment has an independent empty volume; deleting User B's deployment
  leaves User A's deployment + data fully intact. ✅
- Logs API returns the simulated container stdout lines.

Unresolved / Next-phase recommendations:
- Real Docker engine is unavailable in this sandbox; the `DockerEngineAdapter`
  is a stub that delegates to the mock. In a real host, implement it with
  `dockerode` / `docker` CLI and subdomain routing via Caddy on-demand.
- The public URL currently renders through the Next.js preview route
  (`/preview/<subdomain>`). For production, wire Caddy to route
  `<subdomain>.apps.yourdomain.com` to the real container's published port.
- Frontend browser verification (agent-browser) is the immediate next step.
- Consider: per-deployment resource usage metrics, deployment health pings,
  admin catalog management UI, and a 4th realistic app.

---
Task ID: 2
Agent: lead-engineer (Z.ai Code)
Task: Browser-verify the full acceptance scenario end-to-end and fix the
runtime-state sharing bug discovered during verification.

Work Log:
- Started the dev server via the platform's `.zscripts/dev.sh` runner (the
  only way to keep the server alive across tool calls in this sandbox).
- Seeded the catalog (`POST /api/seed` -> 3 apps) and verified all APIs with
  curl: auth (register/login/logout/me), apps, deployments CRUD, start/stop/
  restart, logs, public volume ops.
- Ran the FULL acceptance scenario via curl:
  * User A registers, deploys Demo Counter -> container + volume created,
    status running, unique subdomain URL.
  * Incremented counter to 3 via the public volume API; STOP; preview refused
    with APP_NOT_RUNNING; START; counter still 3 -> PERSISTENCE proven.
  * User B registers; gets HTTP 403 FORBIDDEN on User A's deployment ->
    ISOLATION proven. User B deploys own counter (separate container+volume,
    starts empty). User B deletes own deployment. User A's deployment + data
    fully intact -> MULTI-TENANT ISOLATION proven.
- Verified the frontend with agent-browser:
  * Marketplace hero + 3 app cards + categories + search render.
  * App detail (Demo Counter) renders Deploy + "What you get" + resource limits.
  * Clicking Deploy while signed-out redirects to the login view (toast).
  * Login form signs in User A; nav switches to Dashboard + avatar.
  * Dashboard lists running deployments with Open/Stop/Restart/Delete + polling.
  * Deployment detail renders the 5-step progress, runtime details, and LIVE
    container logs (incl. the stop/start lifecycle lines).
  * Deployed-app preview renders the counter simulator with the persisted
    value (3) preloaded server-side; Increment button persists to the volume
    (counter 3->4, confirmed via API).
  * Deployed a 2nd app (Gitea Lite) straight from the UI Deploy button ->
    navigated to its deployment page (running).
- BUG FOUND + FIXED: the deployed-app preview for a freshly-deployed app
  showed "not running" even though the API confirmed it was running. Root
  cause: the mock Docker adapter kept its in-memory `_state` at module scope,
  but Next.js dev can evaluate route handlers and server components in
  separate module instances, so a container created by an API route was
  invisible to the preview page (which had cached state.json earlier).
  Fix: moved the adapter singleton AND its runtime store onto `globalThis`
  (same pattern as the Prisma client), and added a one-time force-reload from
  disk on cache-miss in inspectContainer/getLogs/execVolumeOp. Re-tested: the
  Gitea preview now renders the running notes simulator.
- Re-verified notes persistence end-to-end: wrote a note, STOP (preview API
  refuses with APP_NOT_RUNNING while stopped), START, note survives and
  renders on the preview page.
- Captured screenshots of marketplace, dashboard, deployment detail, and the
  deployed counter app.
- Final lint: clean. No runtime errors in dev.log. Sticky footer verified
  (pinned to viewport bottom on short pages, pushed down on long pages).

Stage Summary:
- The MVP acceptance criteria are ALL met and browser-verified:
  Auth (register/login/session/403 on unauth) ✅
  Marketplace (catalog in DB, cards, app detail) ✅
  Deployment (1-click deploy -> container+volume -> running -> dashboard) ✅
  Isolation (per-deployment container+volume; cross-user 403) ✅
  Persistence (counter & notes survive stop/start) ✅
  Management (open/stop/start/restart/delete; DB<->runtime in sync) ✅
  Networking (unique subdomain URL per deployment; routes to correct app) ✅
  Quality (TS clean for src/, lint clean, builds via dev server) ✅
- The Docker runtime is a high-fidelity simulation because Docker is not
  available in this sandbox. The control plane talks to it only through the
  `DockerAdapter` interface, so real Docker (or any runtime) can be dropped
  in by implementing that interface — no API/UI changes required.

Unresolved / Next-phase recommendations:
- Implement the real `DockerEngineAdapter` (dockerode / `docker` CLI) and
  wire Caddy to dynamically route `<subdomain>.apps.yourdomain.com` to each
  container's published port for the production-style HTTPS path.
- Add a 4th realistic open-source app (e.g. a real static site generator or
  a markdown wiki) to broaden the catalog.
- Add deployment health pings + per-deployment resource usage metrics in the
  dashboard, and an admin page to manage the app catalog.
- Persist the mock adapter's volume data already survives server restarts;
  consider surfacing a "data size" + "last write" indicator per deployment.
