import { db } from "./db";
import * as k8s from "@kubernetes/client-node";
import { logger } from "./logger";

// Disable TLS verification globally for Bun's fetch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
kc.setCurrentContext("docker-desktop");
for (const cluster of kc.clusters) {
  (cluster as any).skipTLSVerify = true;
  (cluster as any).ca = undefined;
}

const currentUser = kc.getCurrentUser();
if (currentUser && (currentUser as any).certData && (currentUser as any).keyData) {
  (currentUser as any).cert = Buffer.from((currentUser as any).certData, "base64").toString("utf8");
  (currentUser as any).key = Buffer.from((currentUser as any).keyData, "base64").toString("utf8");
}

import https from "https";
import { URL } from "url";
import { from } from "@kubernetes/client-node/dist/gen/rxjsStub";
import { ResponseContext } from "@kubernetes/client-node";

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
      cert: (user as any).cert,
      key: (user as any).key,
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
const originalMakeApiClient = kc.makeApiClient.bind(kc);
// @ts-ignore
(kc as any).makeApiClient = function <T>(ctor: new (...args: any[]) => T): T {
  // @ts-ignore
  const client = originalMakeApiClient(ctor);
  // @ts-ignore
  if (client?.api?.configuration) {
    // @ts-ignore
    (client.api.configuration as any).httpApi = nodeHttpLib;
  }
  // @ts-ignore
  return client;
};

const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

async function reconcile() {
  logger.info({ event: "reconcile.start" }, "Starting reconciliation loop");
  try {
    // List all deployments and pods across namespaces with our label
    const [deploymentsRes, podsRes] = await Promise.all([
      appsApi.listDeploymentForAllNamespaces({ labelSelector: "ossmp.managed=true" }),
      coreApi.listPodForAllNamespaces({ labelSelector: "ossmp.managed=true" })
    ]);

    const k8sDeployments = deploymentsRes.items;
    const k8sPods = podsRes.items;

    // Group pods by deployment name (app label)
    const podsByDeploy = new Map<string, k8s.V1Pod[]>();
    for (const pod of k8sPods) {
      const appName = pod.metadata?.labels?.["app"];
      if (appName) {
        if (!podsByDeploy.has(appName)) podsByDeploy.set(appName, []);
        podsByDeploy.get(appName)!.push(pod);
      }
    }

    // Determine status for each deployment
    const statusMap = new Map<string, string>();
    for (const deploy of k8sDeployments) {
      const name = deploy.metadata?.name;
      if (!name) continue;

      const specReplicas = deploy.spec?.replicas ?? 0;
      const readyReplicas = deploy.status?.readyReplicas ?? 0;
      const pods = podsByDeploy.get(name) || [];

      let status = "stopped";

      if (specReplicas === 0) {
        status = "stopped";
      } else if (pods.length === 0) {
        status = "creating";
      } else {
        let worst: string | null = null;
        for (const pod of pods) {
          const phase = pod.status?.phase;
          const containerStatuses = pod.status?.containerStatuses || [];
          const primary = containerStatuses[0];
          const ready = primary?.ready ?? false;
          const state = primary?.state;
          const waitingReason = state?.waiting?.reason;
          const terminatedReason = state?.terminated?.reason;

          if (phase === "Failed" || terminatedReason === "Error") {
            worst = "failed";
            break;
          }
          if (
            waitingReason === "CrashLoopBackOff" ||
            waitingReason === "ImagePullBackOff" ||
            waitingReason === "ErrImagePull"
          ) {
            worst = "failed";
            break;
          }
          if (phase === "Running" && ready) {
            if (!worst) worst = "running";
          } else if (phase === "Pending" || waitingReason === "ContainerCreating") {
            if (!worst) worst = "creating";
          } else if (!worst) {
            worst = "creating";
          }
        }
        status = worst ?? "creating";
        if (status === "running" && readyReplicas < 1) {
          status = "creating";
        }
      }
      statusMap.set(name, status);
    }

    // Fetch active deployments from DB
    // Assuming active ones are not stopped/failed, or we can just fetch all that are not stopped
    const activeDbDeployments = await db.deployment.findMany({
      where: {
        containerName: { in: Array.from(statusMap.keys()) }
      }
    });

    for (const dbDeploy of activeDbDeployments) {
      const newStatus = statusMap.get(dbDeploy.containerName);
      if (newStatus && newStatus !== dbDeploy.status) {
        logger.info({
          event: "reconcile.update",
          deploymentId: dbDeploy.id,
          oldStatus: dbDeploy.status,
          newStatus
        }, `Updating deployment status from ${dbDeploy.status} to ${newStatus}`);
        
        await db.deployment.update({
          where: { id: dbDeploy.id },
          data: { status: newStatus }
        });
      }
    }
  } catch (err) {
    logger.error({ event: "reconcile.error", error: (err as any).message }, "Reconciliation error");
  }
}

async function startWorker() {
  logger.info({ event: "worker.start" }, "Starting background worker");
  while (true) {
    await reconcile();
    // sleep 60s
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}

startWorker();
