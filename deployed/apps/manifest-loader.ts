import { readFileSync } from "fs";
import { join } from "path";
import { load } from "js-yaml";
import type { AppDefinition } from "./types";

/**
 * Load a Kubernetes manifest for an app from deployed/apps/<slug>/app.yaml
 * Returns the manifest data or null if not found.
 */
export function loadAppManifest(slug: string): AppManifest | null {
  const manifestPath = join(process.cwd(), "deployed", "apps", slug, "app.yaml");
  try {
    const content = readFileSync(manifestPath, "utf8");
    const manifest = load(content) as AppManifest;
    return manifest;
  } catch {
    return null;
  }
}

/**
 * Merge manifest overrides into an AppDefinition.
 * Manifest values take precedence over TypeScript definition values.
 */
export function mergeManifestIntoDefinition(
  def: AppDefinition,
  manifest: AppManifest | null
): AppDefinition {
  if (!manifest) return def;

  const merged = { ...def };

  // Override runtime config
  if (manifest.runtime) {
    if (manifest.runtime.image) merged.dockerImage = manifest.runtime.image;
    if (manifest.runtime.port) merged.containerPort = manifest.runtime.port;
    if (typeof manifest.runtime.user === "string" && manifest.runtime.user.trim()) {
      merged.dockerUser = manifest.runtime.user.trim();
    }
  }

  // Override resources
  if (manifest.resources) {
    merged.resources = manifest.resources;
  }

  // Override storage
  if (manifest.storage) {
    merged.storage = manifest.storage;
  }

  // Override health
  if (manifest.health) {
    merged.health = manifest.health;
  }

  return merged;
}

export interface AppManifest {
  apiVersion?: string;
  name: string;
  version?: string;
  display?: {
    name?: string;
    category?: string;
    description?: string;
  };
  runtime?: {
    type?: string;
    image?: string;
    port?: number;
    user?: string;
  };
  resources?: {
    requests?: { cpu?: string; memory?: string };
    limits?: { cpu?: string; memory?: string };
  };
  storage?: Array<{
    name: string;
    mountPath: string;
    size: string;
  }>;
  health?: {
    http?: { path: string; port?: number };
    tcp?: { port: number };
  };
}

// Re-export AppDefinition for convenience
export type { AppDefinition } from "./types";