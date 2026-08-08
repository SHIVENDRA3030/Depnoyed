/**
 * Centralised, environment-driven configuration for the deployment engine.
 *
 * Resource limits are configurable here rather than hardcoded throughout the
 * codebase, so the host can be protected without code changes.
 */

import { randomBytes } from "crypto";

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function float(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  deploy: {
    cpuLimit: float("DEPLOY_CPU_LIMIT", 0.5),
    cpuPeriod: int("DEPLOY_CPU_PERIOD", 100000),
    memoryLimitMb: int("DEPLOY_MEMORY_LIMIT_MB", 512),
    baseDomain: process.env.DEPLOY_BASE_DOMAIN ?? "apps.local",
  },
  docker: {
    adapter: (process.env.DOCKER_ADAPTER ?? "mock") as "mock" | "docker",
    mockPersist: process.env.MOCK_PERSIST !== "false",
  },
} as const;

/* --------------------------- Naming generators ----------------------------- */

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  }
  return out;
}

/**
 * Generate a short, unique, URL-safe subdomain for a deployment.
 * Prefixed with the app slug for human readability.
 */
export function generateSubdomain(appSlug: string): string {
  const slugPart = appSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "app";
  return `${slugPart}-${randomString(6)}`;
}

/** Generate a unique Docker-style container name. */
export function generateContainerName(userId: string, appSlug: string): string {
  const userPart = userId.slice(-6);
  return `ossmp-${appSlug}-${userPart}-${randomString(4)}`.toLowerCase();
}

/** Generate a unique Docker volume name. */
export function generateVolumeName(userId: string, appSlug: string): string {
  const userPart = userId.slice(-6);
  return `ossmp-vol-${appSlug}-${userPart}-${randomString(4)}`.toLowerCase();
}

/** Construct the public URL for a deployment. */
export function deploymentPublicUrl(subdomain: string): string {
  const base = config.deploy.baseDomain;
  // In this sandbox we route the "deployed app" through our own preview path.
  // The subdomain form is still generated so production routing is trivial.
  return `https://${subdomain}.${base}`;
}
