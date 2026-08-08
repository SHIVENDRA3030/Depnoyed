# Folder Structure

This document explains the repository layout of Depnoyed and the rationale
behind each top-level directory.

## Full Tree

```
Depnoyed/
├── src/                          # Next.js 16 App Router application
│   ├── app/                      # Routes: page.tsx (SPA at /), layout.tsx,
│   │   │                         # globals.css, preview/[subdomain]/, api/
│   │   ├── api/                  # Thin route handlers → @backend/* services
│   │   │   ├── auth/{login,logout,register,me,password,profile}/route.ts
│   │   │   ├── apps/route.ts, apps/[slug]/route.ts
│   │   │   ├── seed/route.ts
│   │   │   ├── deployments/route.ts
│   │   │   ├── deployments/[id]/{route,start,stop,restart,logs,volume}/route.ts
│   │   │   ├── admin/apps/route.ts, admin/apps/[id]/route.ts
│   │   │   └── preview/[subdomain]/volume/route.ts
│   │   └── preview/[subdomain]/page.tsx   # Public deployed-app data plane
│   ├── components/               # ui/ (shadcn) + marketplace/ (views, nav,
│   │                             # footer, deploy-modal, simulators, ...)
│   ├── hooks/                    # use-mobile, use-toast, use-local-storage
│   └── lib/                      # Frontend-only: utils.ts (cn), store.ts,
│                                 # compare-store.ts (Zustand), metrics.ts
├── backend/                      # Server-side control plane (@backend/* alias)
│   ├── db.ts                     # PrismaClient singleton
│   ├── auth.ts                   # scrypt hashing + HMAC-signed session cookie
│   ├── deployments.ts            # Deployment Manager (privileged subsystem)
│   ├── config.ts                 # Env config + name/subdomain generators
│   ├── api.ts                    # Route helpers (json, withErrors, serializers)
│   ├── docker/
│   │   └── adapter.ts            # DockerAdapter + MockDockerAdapter
│   │                             # + DockerEngineAdapter stub
│   └── prisma/
│       └── schema.prisma         # User, App, Deployment (SQLite)
├── deployed/                     # Marketplace app definitions (the catalog)
│   ├── apps/
│   │   ├── types.ts              # AppDefinition interface
│   │   ├── index.ts              # MARKETPLACE_APPS array + findAppDefinition()
│   │   ├── demo-counter.ts
│   │   ├── static-welcome.ts
│   │   ├── gitea-lite.ts
│   │   ├── markdown-wiki.ts
│   │   ├── redis-cache.ts
│   │   ├── postgresql.ts
│   │   ├── grafana-dashboard.ts
│   │   ├── prometheus.ts
│   │   ├── nginx-proxy.ts
│   │   └── mattermost-chat.ts
│   ├── docker/                   # Reserved: per-app Dockerfiles (future)
│   └── manifests/                # Reserved: deployment manifests (future)
├── docs/                         # architecture, development, deployment,
│                                 # folder-structure
├── frontend/                     # Frontend-layer documentation marker
│                                 # (Next.js app lives in src/)
├── public/                       # Static assets (logo.svg, robots.txt)
├── README.md
├── .env.example
├── .gitignore
├── package.json                  # Bun + Next.js 16; db:* scripts use
│                                 # --schema=backend/prisma/schema.prisma
├── tsconfig.json                 # @/*, @backend/*, @deployed/* aliases
├── next.config.ts                # output: standalone
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json               # shadcn/ui config (New York style)
└── eslint.config.mjs
```

## Why This Layout

### Next.js App Router requires co-location

Next.js 16 with the App Router requires `app/` to be a single directory
holding both page routes and API route handlers. Depnoyed honors this by
placing the entire Next.js application under `src/`:

- `src/app/` — routes (the SPA at `/`, the public preview at
  `/preview/[subdomain]`, and all API route handlers under `api/`)
- `src/components/` — UI components (shadcn/ui primitives in `ui/`,
  marketplace views and widgets in `marketplace/`)
- `src/hooks/` — client-only React hooks
- `src/lib/` — frontend-only shared utilities (`utils.ts` for the `cn`
  helper, `store.ts` and `compare-store.ts` for Zustand stores, `metrics.ts`
  for pure shared formatting functions)

`public/` is kept at the repo root because Next.js expects it there (it is
not part of `src/`).

### Server-side control plane lives in `backend/`

All privileged server logic — database access, auth, the deployment manager,
config, route helpers, and the Docker adapter — lives in `backend/`. API
route handlers in `src/app/api/**` are thin controllers that import from
`@backend/*` and never contain business logic themselves.

This separation makes it possible to reason about the security boundary:
everything importable from `@backend/*` is server-only and may touch the
database, the Docker daemon, or signed cookies. Client components must never
import from `@backend/*`.

### Deployment definitions live in `deployed/`

The catalog of apps that can be deployed lives in `deployed/apps/` — one
`.ts` file per app, plus `types.ts` (the `AppDefinition` interface) and
`index.ts` (the `MARKETPLACE_APPS` array and `findAppDefinition()` helper).
The seed route (`src/app/api/seed/route.ts`) imports from `@deployed/apps`
to populate the `App` table. Only apps listed here can be deployed — users
cannot supply arbitrary images.

Two reserved subdirectories exist for future use:

- `deployed/docker/` — per-app Dockerfiles and Docker-related build assets
  for the real Docker runtime. Currently empty.
- `deployed/manifests/` — deployment manifests (e.g. compose definitions,
  resource-limit manifests, network policies) for the real Docker runtime.
  Currently empty.

### Documentation lives in `docs/`

Four documents:

- `docs/architecture.md` — layered architecture, isolation chain, security
  boundaries, request flow, public data plane
- `docs/development.md` — local setup, scripts, path aliases, mock runtime,
  adding apps, testing notes
- `docs/deployment.md` — mock vs real Docker runtime, migration plan
- `docs/folder-structure.md` — this document

`frontend/README.md` and `backend/README.md` are documentation markers for
each layer (the `frontend/` directory itself contains only the README — the
actual Next.js app lives in `src/` per the App Router convention).

## Path Aliases

`tsconfig.json` declares three path aliases that enforce the import
boundaries above:

| Alias          | Resolves to   | May be imported by                                  |
| -------------- | ------------- | --------------------------------------------------- |
| `@/*`          | `./src/*`     | Anywhere                                            |
| `@backend/*`   | `./backend/*` | API route handlers, other `@backend/*` modules      |
| `@deployed/*`  | `./deployed/*`| API route handlers, `@backend/*` modules            |

Rules of thumb:

- API route handlers (`src/app/api/**`) import `@backend/*` and `@deployed/*`.
- Client components import only `@/*`.
- `@backend/*` may import `@deployed/*` but not `@/*`.
- `@deployed/*` imports nothing from `@/*` or `@backend/*` — it is pure data.

## What Is Gitignored

Sandbox-only artifacts are gitignored to keep the repository clean:

- `.ossmp-data/` — mock Docker runtime state (volumes, container records)
- `db/custom.db` — the SQLite database file
- `dev.log`, `server.log` — `tee` output from the `dev` and `start` scripts
- `worklog.md` — shared agent handover log (kept local)
- `download/` — scratch directory for downloaded artifacts
- `.next/` — Next.js build output
- `node_modules/` — installed dependencies
- `.env` — real environment file (only `.env.example` is committed)

## See Also

- [architecture.md](architecture.md) — layer model and isolation chain
- [development.md](development.md) — scripts and workflow
- [deployment.md](deployment.md) — mock vs real Docker runtime
