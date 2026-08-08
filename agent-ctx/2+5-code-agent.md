# Task 2+5: Deployment Health Metrics & Batch Operations

## Summary
Implemented two features for the OSS Deploy Marketplace project:

### Feature 1: Deployment Health Metrics
- **Created `src/lib/metrics.ts`** with helper functions:
  - `seededRandom(seed)` - deterministic random from string seed
  - `getContainerMetrics(containerId)` - returns memoryUsagePercent (30-80), cpuUsagePercent (10-60), responseLatencyMs (12-150), healthScore (0-100)
  - `calculateUptime(createdAt, status)` - returns uptime percentage
  - `healthDotColor(status)` - returns color class for health dot indicator
  - `lastHealthCheck(containerId)` - returns simulated last check timestamp

- **Dashboard (`dashboard-view.tsx`) enhancements**:
  - Added uptime percentage indicator per deployment row (e.g., "99.2% uptime" if running, "Stopped" if not)
  - Added memory usage bar (deterministic, based on containerId hash)
  - Added health dot (green=running, yellow=pending/creating, red=failed/dead, gray=stopped/exited)

- **Deployment detail (`deployment-view.tsx`) enhancements**:
  - Added "Health" section between status banner and header card with 5 metric cards:
    - Uptime percentage with progress bar
    - Memory usage with progress bar
    - CPU usage with progress bar
    - Response latency with custom colored bar (green/amber/red based on ms)
    - Last health check timestamp

### Feature 2: Deployment Batch Operations
- **Dashboard (`dashboard-view.tsx`) enhancements**:
  - Added checkbox to each deployment row (left side, before app logo)
  - Bulk action bar at bottom (fixed position) when selections active:
    - "X selected" count
    - "Select all" checkbox
    - "Start all" button (enabled only if any selected are stopped)
    - "Stop all" button (enabled only if any selected are running)
    - "Restart all" button
    - "Delete all" button (with AlertDialog confirmation)
    - "Cancel" button
  - Batch operations iterate over selected deployments and call individual API endpoints
  - Action bar slides in from bottom with animation

## Files Modified
- `src/lib/metrics.ts` (created)
- `src/components/marketplace/views/dashboard-view.tsx` (modified)
- `src/components/marketplace/views/deployment-view.tsx` (modified)

## Lint Status
- `bun run lint` passes with no errors
