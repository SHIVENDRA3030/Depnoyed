# Frontend

This directory is a **documentation marker** for the frontend layer. The
Next.js 16 frontend application does **not** live here — it lives in
[`src/`](../src/). The `frontend/` directory itself contains only this
README.

## Where the frontend lives

Next.js 16 with the App Router requires `app/` to be a single directory
holding both page routes and API route handlers, so the entire Next.js
application is placed under `src/`:

| Concern                  | Location                                              |
| ------------------------ | ----------------------------------------------------- |
| Routes (pages)           | [`src/app/`](../src/app) — `page.tsx` (SPA at `/`), `layout.tsx`, `globals.css`, `preview/[subdomain]/page.tsx` |
| API route handlers       | [`src/app/api/`](../src/app/api) — thin controllers that delegate to `@backend/*` services |
| UI components            | [`src/components/ui/`](../src/components/ui) — shadcn/ui primitives (New York style) |
| Marketplace views & widgets | [`src/components/marketplace/`](../src/components/marketplace) — `views/`, `nav.tsx`, `footer.tsx`, `deploy-modal.tsx`, `app-logo.tsx`, `simulators/`, etc. |
| Client hooks             | [`src/hooks/`](../src/hooks) — `use-mobile.ts`, `use-toast.ts`, `use-local-storage.ts` |
| Frontend-only libs       | [`src/lib/`](../src/lib) — `utils.ts` (`cn`), `store.ts`, `compare-store.ts` (Zustand), `metrics.ts` (pure shared fns) |
| Static assets            | [`public/`](../public) — `logo.svg`, `robots.txt` (kept at repo root per Next.js convention) |

## Routing model

The frontend is a **single-route SPA at `/`** (per the sandbox constraint
that only the `/` route is exposed). View switching is done via hash-based
routing:

```
#/login              · #/marketplace        ·  #/apps/:slug
#/dashboard          ·  #/deployments/:id   ·  #/settings
#/admin
```

The single `src/app/page.tsx` renders `src/components/marketplace/marketplace-app.tsx`,
which interprets the hash and renders the appropriate view from
`src/components/marketplace/views/`.

A separate public route, `src/app/preview/[subdomain]/page.tsx`, renders the
"deployed app" data plane (the per-app simulator) for a given deployment's
subdomain. This is the public URL each deployment gets.

## UI stack

- **Tailwind CSS 4** — utility-first styling; configuration in
  `tailwind.config.ts`, PostCSS in `postcss.config.mjs`.
- **shadcn/ui (New York style)** — component primitives in
  `src/components/ui/`; config in `components.json`.
- **next-themes** — dark mode via a `ThemeProvider` in
  `src/components/theme-provider.tsx` and a toggle in
  `src/components/theme-toggle.tsx`.
- **framer-motion** — entrance and status animations used across views.
- **lucide-react** — icon set used throughout the marketplace UI.
- **Zustand** — client state stores in `src/lib/store.ts` and
  `src/lib/compare-store.ts`.
- **TanStack Query** — server state for deployments, apps, logs, and volume
  data.

## Note on API route handlers

API route handlers also live under `src/app/api/` because the Next.js App
Router co-locates pages and route handlers in the same `app/` tree. They are
intentionally **thin controllers**: each handler parses the request, calls
into `@backend/*` services (auth, deployments, db, etc.), and returns a
serialized JSON response. Business logic lives in [`backend/`](../backend),
not here.

See [`backend/README.md`](../backend/README.md) for the control-plane
modules, and [`docs/folder-structure.md`](../docs/folder-structure.md) for
the full layout rationale.

## See also

- [Root README](../README.md)
- [backend/README.md](../backend/README.md)
- [deployed/README.md](../deployed/README.md)
- [docs/folder-structure.md](../docs/folder-structure.md)
