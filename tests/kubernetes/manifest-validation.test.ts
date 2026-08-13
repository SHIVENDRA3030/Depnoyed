/**
 * Unit tests for app.yaml manifest validation using zod schema.
 * Pure unit tests - no cluster required.
 */

import { describe, it, expect } from "bun:test";
import { z } from "zod";

/**
 * Zod schema for app.yaml manifest.
 * Matches the schema defined in deployed/apps/manifest.schema.ts (to be created)
 * and the n8n app.yaml pilot.
 */
const AppManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  display: z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    description: z.string().min(1),
  }),
  runtime: z.object({
    image: z.string().min(1),
    port: z.number().int().positive(),
  }),
  resources: z.object({
    requests: z.object({
      cpu: z.string(),
      memory: z.string(),
    }),
    limits: z.object({
      cpu: z.string(),
      memory: z.string(),
    }),
  }),
  storage: z.array(
    z.object({
      name: z.string().min(1),
      mountPath: z.string().min(1),
      size: z.string().min(1),
    }),
  ),
  health: z.object({
    path: z.string().startsWith("/"),
    port: z.number().int().positive(),
  }),
});

type AppManifest = z.infer<typeof AppManifestSchema>;

describe("App manifest validation (zod schema)", () => {
  const validManifest: AppManifest = {
    name: "n8n",
    version: "1.0.0",
    display: {
      name: "n8n",
      category: "automation",
      description: "Workflow automation tool",
    },
    runtime: {
      image: "docker.io/n8nio/n8n:latest",
      port: 5678,
    },
    resources: {
      requests: {
        cpu: "250m",
        memory: "512Mi",
      },
      limits: {
        cpu: "1000m",
        memory: "2Gi",
      },
    },
    storage: [
      {
        name: "data",
        mountPath: "/data",
        size: "5Gi",
      },
    ],
    health: {
      path: "/healthz",
      port: 5678,
    },
  };

  it("accepts valid n8n manifest", () => {
    const result = AppManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("n8n");
      expect(result.data.storage).toHaveLength(1);
      expect(result.data.storage[0].size).toBe("5Gi");
    }
  });

  it("rejects missing required fields", () => {
    const incomplete = { ...validManifest, display: undefined };
    const result = AppManifestSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("display"))).toBe(true);
    }
  });

  it("rejects invalid port (must be positive integer)", () => {
    const badPort = { ...validManifest, runtime: { ...validManifest.runtime, port: -1 } };
    const result = AppManifestSchema.safeParse(badPort);
    expect(result.success).toBe(false);
  });

  it("rejects non-string cpu/memory values", () => {
    const badResources = {
      ...validManifest,
      resources: {
        ...validManifest.resources,
        requests: { ...validManifest.resources.requests, cpu: 123 as any },
      },
    };
    const result = AppManifestSchema.safeParse(badResources);
    expect(result.success).toBe(false);
  });

  it("rejects storage array with missing fields", () => {
    const badStorage = {
      ...validManifest,
      storage: [{ name: "data" }], // missing mountPath, size
    };
    const result = AppManifestSchema.safeParse(badStorage);
    expect(result.success).toBe(false);
  });

  it("rejects health path not starting with /", () => {
    const badHealth = {
      ...validManifest,
      health: { ...validManifest.health, path: "healthz" },
    };
    const result = AppManifestSchema.safeParse(badHealth);
    expect(result.success).toBe(false);
  });

  it("accepts multiple storage entries", () => {
    const multiStorage = {
      ...validManifest,
      storage: [
        { name: "data", mountPath: "/data", size: "5Gi" },
        { name: "config", mountPath: "/config", size: "1Gi" },
      ],
    };
    const result = AppManifestSchema.safeParse(multiStorage);
    expect(result.success).toBe(true);
  });

  it("accepts manifest without storage (empty array)", () => {
    const noStorage = { ...validManifest, storage: [] };
    const result = AppManifestSchema.safeParse(noStorage);
    expect(result.success).toBe(true);
  });
});