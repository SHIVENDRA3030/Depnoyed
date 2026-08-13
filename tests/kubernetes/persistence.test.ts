/**
 * Integration test: PVC persistence across pod recreation.
 * Requires K8S_INTEGRATION=1 and Docker Desktop Kubernetes context.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { KubernetesAdapter } from "../../backend/kubernetes/adapter";
import { CoreV1Api } from "@kubernetes/client-node";
import {
  skipIfNoK8s,
  createTestContainerOptions,
  createTestNamespace,
  createTestKubeConfig,
} from "../helpers/k8s";

const adapter = new KubernetesAdapter();

describe("KubernetesAdapter: PVC persistence", { timeout: 120000 }, () => {
  let namespace: string;
  let tenantId: string;
  let cleanup: () => Promise<void>;
  let coreApi: CoreV1Api;

  beforeAll(() => {
    if (skipIfNoK8s()) return;
  });

  beforeAll(async () => {
    if (skipIfNoK8s()) return;
    // Create KubeConfig with docker-desktop context and TLS skip
    const k8sClients = createTestKubeConfig();
    coreApi = k8sClients.coreApi;

    const ctx = await createTestNamespace("tenant-persist");
    namespace = ctx.namespace;
    tenantId = ctx.tenantId;
    cleanup = ctx.cleanup;
  });

  afterAll(async () => {
    if (cleanup) await cleanup();
  }, { timeout: 60000 });

  it("pod deletion triggers replacement with same PVC", async () => {
    if (skipIfNoK8s()) return;
    const opts = createTestContainerOptions({
      containerName: `test-persist-${Date.now()}`,
      tenantId,
      volumeName: `test-vol-${Date.now()}`,
    });

    // Create full stack
    await adapter.createVolume(opts.volumeName, tenantId);
    await adapter.createContainer(opts);
    await adapter.startContainer(opts.containerName, tenantId);
    const ready = await adapter.waitForReady(opts.containerName, tenantId);
    expect(ready.status).toBe("running");

    // Get the pod name
    const pods = await coreApi.listNamespacedPod({
      namespace,
      labelSelector: `app=${opts.containerName}`,
    });
    expect(pods.items.length).toBe(1);
    const podName = pods.items[0].metadata!.name;

    // Get PVC name from pod spec
    const pod = pods.items[0];
    const pvcName = pod.spec?.volumes?.find((v: any) => v.name === "data-volume")
      ?.persistentVolumeClaim?.claimName;
    expect(pvcName).toBe(opts.volumeName);

    // Delete the pod
    await coreApi.deleteNamespacedPod({ name: podName, namespace });

    // Wait for replacement pod
    let newPodName = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const newPods = await coreApi.listNamespacedPod({
        namespace,
        labelSelector: `app=${opts.containerName}`,
      });
      if (newPods.items.length === 1 && newPods.items[0].metadata?.name !== podName) {
        newPodName = newPods.items[0].metadata!.name;
        break;
      }
    }
    expect(newPodName).not.toBe("");
    expect(newPodName).not.toBe(podName);

    // Verify new pod has same PVC
    const newPod = await coreApi.readNamespacedPod({ name: newPodName, namespace });
    const newPvcName = newPod.spec?.volumes?.find((v: any) => v.name === "data-volume")
      ?.persistentVolumeClaim?.claimName;
    expect(newPvcName).toBe(opts.volumeName);

    // Verify deployment still shows running
    const inspect = await adapter.inspectContainer(opts.containerName, tenantId);
    expect(inspect?.status).toBe("running");
  }, { timeout: 120000 });
});