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

---
Task ID: 3
Agent: styling-improver (Z.ai Code)
Task: Improve the visual polish and styling of the OSS Deploy marketplace
frontend across all views (hero, cards, dashboard, login, deployment detail,
nav, footer).

Work Log:
- **globals.css**: Added 6 new CSS utilities and 4 keyframe animations:
  - `hero-gradient` / `.dark .hero-gradient` — animated emerald/teal gradient
    background for the marketplace hero (shifts over 8s).
  - `animate-fade-in-up` — entrance animation (opacity 0→1, translateY 12→0)
    for hero heading/subheading/stats.
  - `animate-status-pulse` — pulse animation for running status dots (scale
    1→1.8 + opacity fade, 2s loop).
  - `animate-float-slow` / `animate-float-slower` — gentle floating animation
    for login panel decorative shapes.
  - `footer-gradient-border` — emerald→transparent gradient line for the
    footer top.
  - `nav-scrolled` / `.dark .nav-scrolled` — subtle bottom shadow that appears
    when the nav is scrolled.

- **marketplace-view.tsx**:
  - Hero section now uses `hero-gradient` class for an animated emerald/teal
    gradient background (replacing the static `bg-gradient-to-b`).
  - Hero heading, subheading, and badge each use `animate-fade-in-up` with
    staggered `animation-delay` (0ms, 100ms, 200ms, 300ms) for a cascading
    entrance.
  - Stats section changed from inline pill `Stat` components to a 3-column
    `StatCard` grid: each card has an icon in a `bg-brand-soft` circle,
    a label, and a short description — much more visual weight.
  - App cards: changed from a single `<button>` to a `<div>` wrapper with a
    CSS gradient border overlay that fades in on hover (using `mask-composite:
    exclude` trick). Inner content is a `<button>` for accessibility.
  - Added a "Deploy →" call-to-action button on each card (styled with
    `bg-brand/10` pill) alongside the existing "Details" text. Deploy button
    checks auth and redirects to login if not signed in.
  - Added deployment count badge (Zap icon + count) when `app.deploymentCount > 0`.

- **dashboard-view.tsx**:
  - Status dots now use a double-dot pattern: a static base dot + an
    `animate-status-pulse` overlay that pulses for "running" status only.
  - Subdomain URL is now a clickable `<a>` link (with `text-brand` and
    `hover:underline`) that opens the preview in a new tab, with an
    `ExternalLink` icon. Uses `stopPropagation` to avoid triggering the row
    click.
  - Each deployment row now has a colored left-border accent (`border-l-4`)
    based on status: emerald for running, amber for pending/creating, red for
    failed/dead, gray for stopped/exited.

- **login-view.tsx**:
  - Added a decorative geometric illustration area below the feature list:
    floating circles, a rotating square, tiny dots, a gradient bar, and a
    triangle shape — all CSS-only, using `animate-float-slow` /
    `animate-float-slower`. Marked `aria-hidden="true"`.
  - Form card now has a glass-morphism effect: `bg-card/70 backdrop-blur-xl`
    with `supports-[backdrop-filter]:bg-card/50` fallback, plus `shadow-lg`
    and slightly reduced `border-border/60` for subtlety.

- **deployment-view.tsx**:
  - Added a color-coded status banner at the top of the page (below the back
    button, above the header card). Uses distinct background/border/icon per
    status: emerald for running, amber for pending/creating, red for failed,
    zinc for stopped. Shows the status name + a helpful description.
  - Progress steps now use a connected vertical line/dots visual: a
    `bg-border` vertical line runs down the left side, and each step has a
    colored circle (filled emerald for done, `bg-brand-soft` spinner for
    active, bordered empty circle for pending). The flat `ChevronRight`
    arrows between steps are removed.
  - Log terminal: added line numbers (1-indexed, right-aligned, `text-zinc-700`,
    `select-none`, `w-6`), changed timestamp color from `text-zinc-600` to
    `text-emerald-700` for syntax-highlighted visibility.

- **nav.tsx**:
  - Added scroll-aware shadow: a `useEffect` listens for `window.scrollY > 4`
    and toggles the `nav-scrolled` CSS class on the header, producing a
    subtle bottom shadow on scroll.
  - Added mobile hamburger menu using shadcn/ui `Sheet` (slides from right):
    - Shows a `Menu` hamburger icon (visible only on `sm:hidden`).
    - Sheet contains: brand logo, Marketplace + Dashboard nav buttons,
      user info with avatar, and Sign out / Sign in.
    - Theme toggle remains accessible in the mobile bar alongside the
      hamburger.
    - Desktop nav remains unchanged but now properly hidden on mobile
      (`hidden sm:flex`).

- **footer.tsx**:
  - Replaced the solid `border-t border-border/80` with a `<div
    className="footer-gradient-border" />` — a 1px line that fades from
    emerald brand color to transparent, adding a polished brand touch.

- Lint: clean (0 errors, 0 warnings).
- Dev server: no runtime errors in dev.log; all pages compile successfully.

Stage Summary:
- All 7 requested styling improvements have been implemented across 7 files
  (globals.css + 6 component files). No backend/API code was modified.
- The UI now has significantly more visual polish: animated hero gradient,
  staggered entrance animations, stat cards with icons, gradient border hover
  on app cards, Deploy CTAs, deployment count badges, pulsing status dots,
  colored left-border accents, clickable subdomain links, glass-morphism login
  card, floating decorative shapes, connected progress step line, status
  banners, line-numbered logs with colored timestamps, scroll-aware nav shadow,
  mobile hamburger menu, and gradient footer border.
- All changes use only CSS animations and existing shadcn/ui components — no
  new dependencies or runtime overhead.

---
Task ID: 4
Agent: feature-adder (Z.ai Code)
Task: Add 4 new features to the OSS Deploy marketplace: (1) 4th app "Markdown Wiki"
with wiki simulator, (2) deployment uptime health indicator, (3) volume data size
in dashboard, (4) quick deploy from marketplace cards.

Work Log:
- **Feature 1 — Markdown Wiki app**:
  - Added 4th app entry to `src/app/api/seed/route.ts`: "Markdown Wiki"
    (slug: markdown-wiki, category: Productivity, simulator: wiki, logo: wiki,
    dockerImage: ossmp/markdown-wiki:1.0, containerPort: 8080).
  - Created `src/components/marketplace/simulators/wiki-simulator.tsx`:
    a full wiki interface with:
    - Left sidebar listing wiki pages (loaded from volume key "wiki_pages")
    - Main area rendering selected page content via `react-markdown`
    - Edit/View toggle with textarea for editing Markdown content
    - "New Page" button to create wiki pages
    - "Delete Page" per page (with confirmation UX)
    - All data persisted via volume API (POST /api/preview/[subdomain]/volume)
    - Pre-seeded "Home" page with welcome Markdown content
    - Data structure: `{"pages": [{"id", "title", "content", "updatedAt"}]}`
  - Registered wiki simulator in `app-simulator.tsx` (added case "wiki")
  - Updated `AppLogo` component: added BookOpen icon from lucide-react for
    "wiki" logo type, with violet/purple gradient (`from-violet-500 to-purple-600`)
  - Installed `@tailwindcss/typography` plugin for proper Markdown prose styling
    (added `@plugin "@tailwindcss/typography"` to globals.css)

- **Feature 2 — Deployment Health Indicator (Uptime)**:
  - `dashboard-view.tsx`: Replaced the "Xm ago" Clock display with a Timer icon
    showing "Running for Xm" / "Running for Xh Ym" for running deployments,
    and "Stopped · Xm ago" for stopped deployments. Added `uptimeSince()` helper
    that formats duration with hours+minutes precision.
  - `deployment-view.tsx`: Added uptime badge next to the status badge in the
    deployment header. Shows "Uptime: Xm" for running, "Downtime: Xm ago" for
    stopped, styled as a muted rounded badge with Timer icon.
  - Added `Timer` icon import to both views.
  - Added `uptimeSince()` and `timeAgo()` helper functions to deployment-view.tsx.

- **Feature 3 — Volume Data Size in Dashboard**:
  - Modified `src/app/api/deployments/route.ts` GET handler: now calls
    `adapter.inspectVolume(deployment.volumeName)` for each deployment and
    includes `dataSize` from the `VolumeInfo` response as `volumeDataSize`.
    Uses `Promise.all` for parallel volume inspection. Errors are silently
    caught so a failed volume inspect doesn't break the deployments list.
  - Updated `DeploymentItem` type in `src/lib/store.ts`: added optional
    `volumeDataSize?: number` field.
  - `dashboard-view.tsx`: Added data size indicator next to volume/container
    info per deployment row. Shows formatted size (e.g. "2.1 KB", "1.2 MB")
    with Database icon. Added `formatDataSize()` helper and `Database` icon import.

- **Feature 4 — Quick Deploy from Marketplace Cards**:
  - `marketplace-view.tsx`: Changed `handleDeploy` from a navigation to
    app detail, to a direct deploy action. Clicking "Deploy" on a card now:
    1. Checks auth — redirects to login if not signed in
    2. Calls POST /api/deployments with { appId } directly
    3. On success: shows toast "Deployed! Redirecting…" and navigates
       to the deployment detail view
    4. On error: shows error toast
    5. Shows loading spinner on the Deploy button while deploying
  - Added `deploying` state to AppCard component
  - Added `ApiError` import to marketplace-view.tsx
  - Deploy button now has `disabled` state and spinner during deployment

- Re-seeded apps via `POST /api/seed` — confirmed 4 apps (Demo Counter,
  Static Welcome, Gitea Lite, Markdown Wiki).
- Lint: clean (0 errors, 0 warnings).
- Dev server: compiling successfully, no runtime errors.

Stage Summary:
- 4th marketplace app "Markdown Wiki" added with full wiki simulator ✅
- Wiki simulator persists all pages to volume with Markdown rendering ✅
- Deployment uptime indicator in dashboard + deployment detail views ✅
- Volume data size shown per deployment in dashboard ✅
- Quick one-click deploy from marketplace cards (no need to visit detail) ✅
- All changes are backward-compatible; no breaking API changes.

---
Task ID: 3
Agent: web-dev-reviewer (cron round 1)
Task: Assess project status, perform QA, fix bugs, improve styling, add features.

Work Log:
- Read worklog.md — previous round completed all MVP acceptance criteria.
- Server alive, lint clean, all APIs responding 200.
- Comprehensive agent-browser QA across all views: marketplace (3 apps + categories + search), dark mode toggle, login form, dashboard (2 deployments with Open/Stop/Restart/Delete), app detail (Deploy button), deployment detail (progress + logs), deployed app previews (counter showing persisted value 4, notes with persisted note, static welcome nginx page).
- Deployed Static Welcome app via API, verified its preview renders the nginx welcome page with "Deployment verified" badge.
- **All existing features verified working. No bugs found in the base MVP.**

Styling Improvements (delegated to subagent):
1. Marketplace hero: animated gradient background, staggered fade-in-up entrance, stat cards grid with icons.
2. App cards: gradient border hover, "Deploy →" CTA button on each card, deployment count badge.
3. Dashboard: pulsing status dot for "running", clickable subdomain URL, colored left-border accent per status.
4. Login: floating CSS geometric shapes on marketing panel, glass-morphism form card.
5. Deployment detail: color-coded status banner, connected vertical line + colored dots for progress, line numbers + colored timestamps in logs terminal.
6. Nav: scroll-aware shadow, mobile hamburger menu via shadcn Sheet.
7. Footer: top gradient border (emerald→transparent).
8. globals.css: 6 new CSS utility classes + 4 keyframe animations.

New Features (delegated to subagent):
1. **4th App — Markdown Wiki**: Added "Markdown Wiki" (Productivity category, wiki simulator) to seed data. Created wiki-simulator.tsx with sidebar page list, Markdown rendering via react-markdown, edit/view toggle, new/delete pages, all persisted to volume. Pre-seeded with "Home" page. Installed @tailwindcss/typography for prose styling.
2. **Deployment Uptime Indicator**: Dashboard shows "Running for Xm" / "Stopped · Xm ago". Deployment detail shows Uptime/Downtime badge.
3. **Volume Data Size**: Enhanced GET /api/deployments to include volumeDataSize per deployment. Dashboard shows formatted size (e.g. "801 B") with Database icon.
4. **Quick Deploy from Cards**: Marketplace cards now have a "Deploy" button that directly deploys (with loading spinner) and navigates to the deployment detail, with auth check redirect to login.

Bug Fix:
- **Wiki simulator initial page selection**: `selectedPageId` was initialized from a separate `parseWikiData()` call generating different random IDs than `wikiData`, so Home page appeared unselected. Fixed by computing initial data once via a shared `useState(() => parseWikiData(...))` used by both states.

Stage Summary:
- All QA passing. Lint clean. 4 apps in catalog.
- Marketplace now has rich hero animation, deploy-from-card, 4 app categories.
- Dashboard shows uptime + data size per deployment with colored status accents.
- Deployment detail has status banner, connected progress dots, enhanced log terminal.
- Markdown Wiki simulator fully functional with persistence.
- Login has glass-morphism card + floating shapes.
- Mobile-responsive nav with hamburger menu.

Unresolved / Next-phase recommendations:
- Test the mobile hamburger nav via agent-browser at small viewport.
- Add deployment health pings (periodic check if container is still running, auto-update status).
- Add an admin page for catalog management (add/remove apps without code changes).
- Consider a "duplicate deployment" feature (clone an existing deployment's config).
- Add more detailed error messages when deployments fail (show container stderr).
