/**
 * K8s test context guard.
 *
 * Integration tests require a real Kubernetes cluster (Docker Desktop).
 * They self-skip unless K8S_INTEGRATION=1 is set AND the current context
 * is docker-desktop (or K8S_INTEGRATION_ALLOW_ANY=1 overrides the check).
 *
 * Uses kubectl for namespace operations to avoid client certificate
 * authentication issues with @kubernetes/client-node in Bun runtime.
 */

import { KubeConfig, CoreV1Api, AppsV1Api, NetworkingV1Api, CustomObjectsApi } from "@kubernetes/client-node";
import { spawnSync } from "node:child_process";
import https from "https";
import { from } from "@kubernetes/client-node/dist/gen/rxjsStub";
import { ResponseContext } from "@kubernetes/client-node";

let cachedContext: { namespace: string; tenantId: string; cleanup: () => Promise<void> } | null = null;
let cachedCleanup: (() => Promise<void>) | null = null;

/**
 * Verify we're running against the expected K8s context.
 * Returns the current context name or throws if unavailable.
 */
export function getCurrentK8sContext(): string {
  const result = spawnSync("kubectl", ["config", "current-context"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (result.status !== 0 || !result.stdout?.trim()) {
    throw new Error("kubectl config current-context failed or returned empty");
  }
  return result.stdout.trim();
}

/**
 * Check if the current context is allowed for integration tests.
 * Allowed: "docker-desktop" (default), or any context if K8S_INTEGRATION_ALLOW_ANY=1.
 * Returns true if allowed, false otherwise (does not throw).
 */
export function isAllowedK8sContext(context: string): boolean {
  if (process.env.K8S_INTEGRATION_ALLOW_ANY === "1") return true;
  return context === "docker-desktop";
}

/**
 * Run kubectl command and return result.
 */
function runKubectl(args: string[]): { stdout: string; stderr: string; success: boolean } {
  const result = spawnSync("kubectl", args, {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, KUBECONFIG: process.env.KUBECONFIG },
  });
  return {
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
    success: result.status === 0,
  };
}

/**
 * Create a unique test namespace for this test run.
 * Returns { namespace, tenantId, cleanup } where cleanup deletes the namespace.
 * Uses kubectl for reliable authentication with Docker Desktop.
 */
export async function createTestNamespace(tenantId?: string): Promise<{
  namespace: string;
  tenantId: string;
  cleanup: () => Promise<void>;
}> {
  if (process.env.K8S_INTEGRATION !== "1") {
    throw new Error("Integration tests require K8S_INTEGRATION=1");
  }
  const context = getCurrentK8sContext();
  if (!isAllowedK8sContext(context)) {
    throw new Error(
      `Integration tests require Docker Desktop Kubernetes context (got: ${context}). ` +
        `Set K8S_INTEGRATION_ALLOW_ANY=1 to override.`,
    );
  }

  const testTenantId = tenantId ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const namespace = `depnoyed-${testTenantId}`;

  // Create namespace using kubectl (works with Docker Desktop client cert auth)
  const createResult = runKubectl(["create", "namespace", namespace]);
  if (!createResult.success) {
    throw new Error(`Failed to create namespace: ${createResult.stderr}`);
  }

  const cleanup = async () => {
    const deleteResult = runKubectl(["delete", "namespace", namespace, "--ignore-not-found=true"]);
    if (!deleteResult.success && !deleteResult.stderr.includes("NotFound")) {
      console.warn(`Failed to delete namespace ${namespace}: ${deleteResult.stderr}`);
    }
  };

  return { namespace, tenantId: testTenantId, cleanup };
}

/**
 * Get or create a cached test namespace for the current test process.
 * Useful for multiple tests in the same file sharing a namespace.
 */
export async function getOrCreateTestNamespace(): Promise<{
  namespace: string;
  tenantId: string;
  cleanup: () => Promise<void>;
}> {
  if (cachedContext) return cachedContext;

  const result = await createTestNamespace();
  cachedContext = result;
  cachedCleanup = result.cleanup;
  return result;
}

/**
 * Reset the cached namespace (call after all tests in a file complete).
 */
export async function resetTestNamespace(): Promise<void> {
  if (cachedCleanup) {
    await cachedCleanup();
    cachedContext = null;
    cachedCleanup = null;
  }
}

/**
 * Skip test if K8S_INTEGRATION is not set or context not allowed.
 * Call at top of integration test files.
 * Returns true if test should be skipped, false if it should run.
 */
export function skipIfNoK8s(): boolean {
  if (process.env.K8S_INTEGRATION !== "1") {
    console.log("Skipping integration test: K8S_INTEGRATION=1 not set");
    return true;
  }
  try {
    const context = getCurrentK8sContext();
    if (!isAllowedK8sContext(context)) {
      console.log(
        `Skipping integration test: context is ${context}, expected docker-desktop`,
      );
      return true;
    }
  } catch (e) {
    console.log(`Skipping integration test: ${(e as Error).message}`);
    return true;
  }
  return false;
}

/**
 * Assert that we're in integration mode with valid context.
 * Throws if not - use in tests that need the cluster.
 */
export function assertK8sIntegration(): void {
  if (process.env.K8S_INTEGRATION !== "1") {
    throw new Error("Integration test requires K8S_INTEGRATION=1");
  }
  const context = getCurrentK8sContext();
  if (!isAllowedK8sContext(context)) {
    throw new Error(
      `Integration test requires docker-desktop context (got: ${context}). ` +
        `Set K8S_INTEGRATION_ALLOW_ANY=1 to override.`,
    );
  }
}

/**
 * Create a test deployment object for the KubernetesAdapter.
 * Returns minimal CreateContainerOptions for a simple http-echo pod.
 */
export function createTestContainerOptions(overrides: Partial<{
  containerName: string;
  image: string;
  port: number;
  cpuLimit: number;
  memoryLimitMb: number;
  volumeName: string;
  tenantId: string;
  env: Record<string, string>;
}> = {}) {
  return {
    containerName: overrides.containerName ?? `test-${Date.now()}`,
    image: overrides.image ?? "hashicorp/http-echo:0.2.3",
    port: overrides.port ?? 5678,
    cpuLimit: overrides.cpuLimit ?? 0.1,
    memoryLimitMb: overrides.memoryLimitMb ?? 64,
    volumeName: overrides.volumeName ?? `test-vol-${Date.now()}`,
    tenantId: overrides.tenantId ?? `test-tenant-${Date.now()}`,
    env: overrides.env ?? { TEXT: "hello from test" },
    simulator: "static",
  };
}

/**
 * Create KubeConfig with docker-desktop context and skip TLS verify.
 * Use this for tests that need direct Kubernetes API access.
 */
export function createTestKubeConfig(): { kc: KubeConfig; coreApi: CoreV1Api; appsApi: AppsV1Api; networkingApi: NetworkingV1Api; customApi: CustomObjectsApi } {
  const kc = new KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext("docker-desktop");
  for (const cluster of kc.clusters) {
    cluster.skipTLSVerify = true;
    cluster.ca = undefined;
  }
  // Ensure client certificate is used for mTLS with Docker Desktop
  const currentUser = kc.getCurrentUser();
  if (currentUser && currentUser.certData && currentUser.keyData) {
    currentUser.cert = Buffer.from(currentUser.certData, "base64").toString("utf8");
    currentUser.key = Buffer.from(currentUser.keyData, "base64").toString("utf8");
  }

  /**
   * Custom HTTP library using Node.js https module with client certificate support.
   * Required because Bun's native fetch doesn't support client certificates.
   * Implements the HttpLibrary interface expected by @kubernetes/client-node.
   */
  class NodeHttpsHttpLibrary {
    send(request: any): any {
      const cluster = kc.getCurrentCluster();
      const user = kc.getCurrentUser();
      if (!cluster || !(user as any)?.cert || !(user as any)?.key) {
        throw new Error("Cluster or client cert/key not configured");
      }

      const method = request.getHttpMethod().toString();
      const body = request.getBody();
      const url = request.getUrl();
      const headers = request.getHeaders();
      const signal = request.getSignal();

      const baseUrl = cluster.server;
      const fullUrl = new URL(url, baseUrl);

      const agent = new https.Agent({
        cert: user.cert,
        key: user.key,
        rejectUnauthorized: false,
        keepAlive: true,
      });

      const bodyStr = body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;
      const requestHeaders = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...headers,
      };
      if (bodyStr) {
        requestHeaders["Content-Length"] = Buffer.byteLength(bodyStr).toString();
      }

      // Handle abort signal
      let aborted = false;
      const abortHandler = () => { aborted = true; };
      if (signal) {
        signal.addEventListener("abort", abortHandler);
      }

      const promise = new Promise<any>((resolve, reject) => {
        const req = https.request(
          {
            method,
            hostname: fullUrl.hostname,
            port: fullUrl.port || 443,
            path: fullUrl.pathname + fullUrl.search,
            headers: requestHeaders,
            agent,
            timeout: 30000,
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              // Return ResponseContext-like object with correct properties
              const responseContext = new ResponseContext(
                res.statusCode || 0,
                res.headers as Record<string, string>,
                {
                  text: () => Promise.resolve(data),
                  binary: () => Promise.resolve(Buffer.from(data)),
                }
              );
              resolve(responseContext);
            });
          }
        );

        req.on("error", (err) => {
          if (aborted) {
            reject(new Error("Request aborted"));
          } else {
            reject(err);
          }
        });
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });

        if (bodyStr) {
          req.write(bodyStr);
        }
        req.end();
      }).then((responseContext) => {
        if (signal) {
          signal.removeEventListener("abort", abortHandler);
        }
        return responseContext;
      });

      return from(promise);
    }
  }

  const nodeHttpLib = new NodeHttpsHttpLibrary();

  // Override makeApiClient to use our custom HTTP library
  const originalMakeApiClient = kc.makeApiClient.bind(kc);
  kc.makeApiClient = <T>(ctor: new (...args: any[]) => T): T => {
    const client = originalMakeApiClient(ctor);
    if (client?.api?.configuration) {
      client.api.configuration.httpApi = nodeHttpLib;
    }
    return client;
  };

  return {
    kc,
    coreApi: kc.makeApiClient(CoreV1Api),
    appsApi: kc.makeApiClient(AppsV1Api),
    networkingApi: kc.makeApiClient(NetworkingV1Api),
    customApi: kc.makeApiClient(CustomObjectsApi),
  };
}