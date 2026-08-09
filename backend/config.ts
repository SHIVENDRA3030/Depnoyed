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
    cpuLimit: float("DEPLOY_CPU_LIMIT", 1),
    cpuPeriod: int("DEPLOY_CPU_PERIOD", 100000),
    memoryLimitMb: int("DEPLOY_MEMORY_LIMIT_MB", 1024),
    baseDomain: process.env.DEPLOY_BASE_DOMAIN ?? "apps.local",
  },
  docker: {
    adapter: (process.env.DOCKER_ADAPTER ?? "mock") as "mock" | "docker",
    mockPersist: process.env.MOCK_PERSIST !== "false",
    /** Path to the Docker daemon socket. Defaults to the standard unix socket. */
    socketPath: process.env.DOCKER_SOCKET ?? "/var/run/docker.sock",
    /**
     * When DOCKER_ADAPTER=docker, containers are exposed on the Docker host's
     * network. This base URL is used to construct the "Open real app" link
     * (e.g. http://localhost:<port>). Leave empty to disable the link.
     */
    realAppBaseUrl: process.env.DEPLOY_REAL_APP_BASE_URL ?? "http://localhost",
    /**
     * Port range for host port bindings. Docker will pick a free ephemeral
     * port from this range for each container.
     */
    portRangeStart: int("DOCKER_PORT_RANGE_START", 31000),
    portRangeEnd: int("DOCKER_PORT_RANGE_END", 39999),
    /**
     * Whether to start containers with a read-only root filesystem. Defaults
     * to false because most real marketplace images (Postgres, Redis, Grafana,
     * Gitea, Mattermost) need to write to /var/lib, /var/run, /tmp, etc. and
     * fail to start under --read-only. Enable only if you know your images
     * tolerate it.
     */
    readonlyRootfs: process.env.DOCKER_READONLY_ROOTFS === "true",
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

/**
 * Construct the URL of the *real* running container (only meaningful when
 * DOCKER_ADAPTER=docker). Returns null if the real-app base URL is not
 * configured (e.g. when running the mock adapter in the sandbox).
 */
export function realAppUrl(port: number | null): string | null {
  if (port == null) return null;
  const base = config.docker.realAppBaseUrl;
  if (!base) return null;
  // Strip trailing slash, append :port
  return `${base.replace(/\/+$/, "")}:${port}`;
}
