# Task 4 — feature-adder

## Summary
Added 4 new features to the OSS Deploy marketplace as specified.

## Features Implemented

### Feature 1: 4th Marketplace App — "Markdown Wiki"
- Added seed data in `/src/app/api/seed/route.ts`
- Created `/src/components/marketplace/simulators/wiki-simulator.tsx` (full wiki with sidebar, Markdown rendering via react-markdown, edit/view toggle, new/delete pages, volume persistence)
- Registered in `/src/components/marketplace/app-simulator.tsx`
- Added wiki logo (BookOpen icon, violet/purple gradient) in `/src/components/marketplace/app-logo.tsx`
- Installed `@tailwindcss/typography` for prose styling

### Feature 2: Deployment Health Indicator (Uptime)
- Dashboard: Timer icon + "Running for Xm" / "Stopped · Xm ago"
- Deployment detail: Uptime/Downtime badge next to status badge

### Feature 3: Volume Data Size in Dashboard
- Modified `GET /api/deployments` to include `volumeDataSize` via `adapter.inspectVolume()`
- Added `volumeDataSize?: number` to `DeploymentItem` type
- Dashboard row shows formatted data size with Database icon

### Feature 4: Quick Deploy from Marketplace Cards
- "Deploy" button on each card now directly calls `POST /api/deployments`
- Loading spinner while deploying, auto-navigates to deployment detail on success
- Auth check with redirect to login if not signed in

## Files Changed
- `src/app/api/seed/route.ts` — added Markdown Wiki seed entry
- `src/app/api/deployments/route.ts` — enhanced GET with volumeDataSize
- `src/app/globals.css` — added @tailwindcss/typography plugin
- `src/lib/store.ts` — added volumeDataSize to DeploymentItem
- `src/components/marketplace/app-simulator.tsx` — registered wiki simulator
- `src/components/marketplace/app-logo.tsx` — added wiki logo (BookOpen, violet gradient)
- `src/components/marketplace/simulators/wiki-simulator.tsx` — NEW (full wiki interface)
- `src/components/marketplace/views/dashboard-view.tsx` — uptime + data size indicators
- `src/components/marketplace/views/deployment-view.tsx` — uptime badge in header
- `src/components/marketplace/views/marketplace-view.tsx` — quick deploy from cards

## Verification
- Lint: clean
- Seed: 4 apps confirmed via API
- Dev server: compiling, no runtime errors
