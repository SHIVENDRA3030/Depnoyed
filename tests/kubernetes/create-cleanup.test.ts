/**
 * Integration test: create and cleanup full resource set.
 * Requires K8S_INTEGRATION=1 and Docker Desktop Kubernetes context.
 * Uses http-echo (tiny image) for speed.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { KubernetesAdapter } from "../../backend/kubernetes/adapter";
import {
  skipIfNoK8s,
  createTestContainerOptions,
  getOrCreateTestNamespace,
  resetTestNamespace,
} from "../helpers/k8s";

const adapter = new KubernetesAdapter();

describe("KubernetesAdapter: create/cleanup full resource set", { timeout: 120000 }, () => {
  let namespace: string;
  let tenantId: string;
  let cleanup: () => Promise<void>;

  // Skip entire suite if not in integration mode
  beforeAll(() => {
    if (skipIfNoK8s()) return;
  });

  beforeAll(async () => {
    if (skipIfNoK8s()) return;
    const ctx = await getOrCreateTestNamespace();
    namespace = ctx.namespace;
    tenantId = ctx.tenantId;
    cleanup = ctx.cleanup;
  });

  afterAll(async () => {
    await resetTestNamespace();
  }, { timeout: 60000 });

  it("creates Deployment, Service, Ingress, PVC", async () => {
    if (skipIfNoK8s()) return;
    const opts = createTestContainerOptions({
      containerName: `test-create-${Date.now()}`,
      tenantId,
      volumeName: `test-vol-${Date.now()}`,
    });

    // Create volume first (idempotent)
    const volInfo = await adapter.createVolume(opts.volumeName, tenantId);
    expect(volInfo.name).toBe(opts.volumeName);
    expect(volInfo.createdAt).toBeDefined();

    // Create container (creates Deployment + Service + Ingress)
    const info = await adapter.createContainer(opts);
    expect(info.id).toBe(opts.containerName);
    expect(info.status).toBe("created");

    // Verify resources exist via adapter inspect
    const inspect = await adapter.inspectContainer(opts.containerName, tenantId);
    expect(inspect).not.toBeNull();
    expect(inspect?.id).toBe(opts.containerName);
    expect(inspect?.status).toBe("stopped"); // replicas=0 initially
  });

  it("second createContainer call with same name reconciles (idempotent)", async () => {
    if (skipIfNoK8s()) return;
    const opts = createTestContainerOptions({
      containerName: `test-idempotent-${Date.now()}`,
      tenantId,
      volumeName: `test-vol-${Date.now()}`,
    });

    // First create
    await adapter.createVolume(opts.volumeName, tenantId);
    await adapter.createContainer(opts);

    // Second create - should not throw, should reconcile
    await adapter.createContainer(opts);

    // Verify still exists and correct
    const inspect = await adapter.inspectContainer(opts.containerName, tenantId);
    expect(inspect).not.toBeNull();
    expect(inspect?.status).toBe("stopped");
  });

  it("removeContainer deletes Deployment, Service, Ingress", async () => {
    if (skipIfNoK8s()) return;
    const opts = createTestContainerOptions({
      containerName: `test-remove-${Date.now()}`,
      tenantId,
      volumeName: `test-vol-${Date.now()}`,
    });

    await adapter.createVolume(opts.volumeName, tenantId);
    await adapter.createContainer(opts);

    // Remove
    await adapter.removeContainer(opts.containerName, tenantId);

    // Verify gone
    const inspect = await adapter.inspectContainer(opts.containerName, tenantId);
    expect(inspect).toBeNull();
  });

  it("removeVolume deletes PVC", async () => {
    if (skipIfNoK8s()) return;
    const volumeName = `test-vol-remove-${Date.now()}`;

    await adapter.createVolume(volumeName, tenantId);
    const inspectBefore = await adapter.inspectVolume(volumeName, tenantId);
    expect(inspectBefore).not.toBeNull();

    await adapter.removeVolume(volumeName, tenantId);

    // PVC deletion may take a moment due to finalizers
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const inspectAfter = await adapter.inspectVolume(volumeName, tenantId);
      if (!inspectAfter) return;
    }
    const inspectAfter = await adapter.inspectVolume(volumeName, tenantId);
    expect(inspectAfter).toBeNull();
  }, { timeout: 30000 });

  it("full lifecycle: create -> start -> stop -> remove -> no orphans", async () => {
    if (skipIfNoK8s()) return;
    const opts = createTestContainerOptions({
      containerName: `test-lifecycle-${Date.now()}`,
      tenantId,
      volumeName: `test-vol-${Date.now()}`,
    });

    // Create volume + container
    await adapter.createVolume(opts.volumeName, tenantId);
    await adapter.createContainer(opts);

    // Start (scale to 1)
    const started = await adapter.startContainer(opts.containerName, tenantId);
    expect(started.status).toBe("creating");

    // Wait for ready (polling with timeout)
    const readyInfo = await adapter.waitForReady(opts.containerName, tenantId);
    expect(readyInfo.status).toBe("running");

    // Stop (scale to 0)
    const stopped = await adapter.stopContainer(opts.containerName, tenantId);
    expect(stopped.status).toBe("stopped");

    // Verify stopped
    const inspectStopped = await adapter.inspectContainer(opts.containerName, tenantId);
    expect(inspectStopped?.status).toBe("stopped");

    // Remove container
    await adapter.removeContainer(opts.containerName, tenantId);
    const inspectRemoved = await adapter.inspectContainer(opts.containerName, tenantId);
    expect(inspectRemoved).toBeNull();

    // Remove volume
    await adapter.removeVolume(opts.volumeName, tenantId);
    // PVC deletion may take a moment due to finalizers
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const volInspect = await adapter.inspectVolume(opts.volumeName, tenantId);
      if (!volInspect) return;
    }
    const volInspect = await adapter.inspectVolume(opts.volumeName, tenantId);
    expect(volInspect).toBeNull();
  }, { timeout: 120000 });
});