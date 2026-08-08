# Task: Add Two Features + Final Styling Polish

## Summary
Added 3 features to the OSS Deploy Marketplace MVP:

### Feature 1: Deployment Templates (Settings View)
- Added `DeploymentTemplatesSection` component to `src/components/marketplace/views/settings-view.tsx`
- Templates stored in localStorage under key `oss-deploy-templates`
- Template structure: `{ id, name, appSlug, labelPrefix, envVars }`
- UI includes:
  - List of saved templates showing name, app name, env var count
  - "Create Template" button opening a form with template name, app select, optional label prefix, optional env vars
  - "Use" button navigating to app detail page
  - "Delete" button with AlertDialog confirmation
  - Inline edit for template name
- Pre-populated with 2 default templates: "Production Counter" (demo-counter, label: "prod") and "Dev Wiki" (markdown-wiki, label: "dev")
- Positioned between "Deployment defaults" and "Notifications" sections

### Feature 2: Resource Usage Donut Charts (Dashboard)
- Added `ResourceUsageDonuts` component to `src/components/marketplace/views/dashboard-view.tsx`
- 3 SVG donut charts: CPU, Memory, Storage
- Animated with CSS `transition-[stroke-dashoffset]` on mount (1s ease-out)
- Simulated data based on number of running deployments and volume data
- Color coding: green (<60%), amber (60-85%), red (>85%)
- Placed between Health Overview and Quick Actions sections
- Only shows when there are deployments

### Feature 3: Final Styling Polish
1Globally in `globals.css`:
- `.deploy-glow-btn` - animated box-shadow glow on Deploy buttons (hover only)
- `.gradient-border-animated` - animated gradient border for deployment status card
- `.shadow-inner-terminal` - inner shadow for terminal log viewer
- Added `@keyframes deploy-glow-rotate` and `@keyframes gradient-border-rotate`

Dashboard:
- Deployment row cards: added `transition-all duration-200` and subtle inner shadow on hover

Marketplace View:
- Deploy buttons in both FeaturedAppCard and AppCard: added `deploy-glow-btn` class for animated glow
- FeaturedAppCard trending cards: changed hover from `hover:-translate-y-1` to `hover:-translate-y-0.5 hover:scale-[1.01]` for parallax-like effect

Login View:
- Added dots grid pattern background behind auth form card (`bg-grid` with mask)
- Tab switcher: added sliding indicator animation using absolute positioned div with `transition-all duration-200`

App Detail View:
- Added sticky Deploy button that appears when scrolling past the main Deploy button (scroll-based visibility using IntersectionObserver pattern)
- Improved Tech Specs grid items with `hover:bg-muted/30` transition

Deployment Detail View:
- Added `gradient-border-animated` class to the main header/status card
- Improved log viewer with `border border-zinc-800` and `shadow-inner-terminal` class for terminal-like appearance

## Files Modified
- `src/components/marketplace/views/settings-view.tsx` - Added Deployment Templates section
- `src/components/marketplace/views/dashboard-view.tsx` - Added Resource Usage Donuts, polished deployment row hover
- `src/components/marketplace/views/marketplace-view.tsx` - Added deploy-glow-btn, trending parallax hover
- `src/components/marketplace/views/login-view.tsx` - Added background pattern, sliding tab indicator
- `src/components/marketplace/views/app-detail-view.tsx` - Added sticky deploy button, spec hover
- `src/components/marketplace/views/deployment-view.tsx` - Added gradient border, terminal shadow
- `src/app/globals.css` - Added new CSS utility classes and keyframes

## Lint Status
✅ All lint errors fixed (renamed `useTemplate` to `applyTemplate` to avoid hooks rule, fixed login view JSX nesting)
