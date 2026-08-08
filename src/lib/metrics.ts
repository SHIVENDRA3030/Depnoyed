/**
 * Deterministic metrics helpers for deployment health indicators.
 * All values are derived from a seeded random so they stay stable per containerId.
 */

/** Simple hash-based deterministic "random" in [0, 1) from a string seed. */
export function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // xor-shift to improve distribution
  h ^= h << 13;
  h ^= h >> 17;
  h ^= h << 5;
  return ((h >>> 0) % 10000) / 10000;
}

/** Generate stable simulated metrics for a container. */
export function getContainerMetrics(containerId: string): {
  memoryUsagePercent: number; // 30-80
  cpuUsagePercent: number; // 10-60
  responseLatencyMs: number; // 12-150
  healthScore: number; // 0-100
} {
  const r1 = seededRandom(containerId + ":mem");
  const r2 = seededRandom(containerId + ":cpu");
  const r3 = seededRandom(containerId + ":lat");
  const r4 = seededRandom(containerId + ":health");

  const memoryUsagePercent = Math.round(30 + r1 * 50); // 30-80
  const cpuUsagePercent = Math.round(10 + r2 * 50); // 10-60
  const responseLatencyMs = Math.round(12 + r3 * 138); // 12-150
  const healthScore = Math.round(r4 * 100); // 0-100

  return { memoryUsagePercent, cpuUsagePercent, responseLatencyMs, healthScore };
}

/**
 * Calculate uptime percentage based on createdAt and current status.
 * Running deployments get 99-100% based on age; non-running get 0%.
 */
export function calculateUptime(createdAt: string, status: string): number {
  if (status === "running") {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    // Older deployments get slightly higher uptime (99.0 -> 99.9)
    const base = Math.min(99.0 + ageHours * 0.02, 99.95);
    return Math.round(base * 10) / 10;
  }
  if (status === "restarting") {
    return 95.0;
  }
  return 0;
}

/** Return the health dot color class based on status. */
export function healthDotColor(status: string): string {
  switch (status) {
    case "running":
      return "bg-emerald-500";
    case "restarting":
      return "bg-amber-500";
    case "failed":
    case "dead":
      return "bg-red-500";
    case "stopped":
    case "exited":
      return "bg-zinc-400";
    case "pending":
    case "creating":
      return "bg-amber-400";
    default:
      return "bg-zinc-300";
  }
}

/** Generate a simulated "last health check" timestamp (a few seconds to 2 minutes ago). */
export function lastHealthCheck(containerId: string): Date {
  const r = seededRandom(containerId + ":check");
  const offsetSec = Math.round(10 + r * 110); // 10-120 seconds ago
  return new Date(Date.now() - offsetSec * 1000);
}
