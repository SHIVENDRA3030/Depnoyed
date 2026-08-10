import { notFound } from "next/navigation";
import { db } from "@backend/db";
import { getDockerAdapter } from "@backend/docker/adapter";
import { getDeploymentBySubdomain, isDeploymentRunning } from "@backend/deployments";
import { realAppUrl } from "@backend/config";
import { AppSimulator } from "@/components/marketplace/app-simulator";

export const dynamic = "force-dynamic";

/**
 * Public preview of a deployed application — this is the "public URL" of a
 * deployment. It renders the simulated runtime for the app's `simulator` type
 * and reads/writes the deployment's dedicated volume via the public volume API.
 */
export default async function PreviewPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const deployment = await getDeploymentBySubdomain(subdomain);
  if (!deployment) notFound();

  const running = await isDeploymentRunning(subdomain);
  const simulator = deployment.app?.simulator ?? "static";

  // Preload the volume contents server-side so the first paint is meaningful.
  let initialData: Record<string, string> = {};
  if (running) {
    const adapter = getDockerAdapter();
    const list = await adapter.execVolumeOp(deployment.containerName, deployment.userId, { kind: "list" });
    for (const key of list.keys ?? []) {
      const got = await adapter.execVolumeOp(deployment.containerName, deployment.userId, { kind: "get", key });
      if (got.value !== undefined) initialData[key] = got.value;
    }
  }

  return (
    <AppSimulator
      subdomain={subdomain}
      simulator={simulator}
      running={running}
      status={deployment.status}
      appName={deployment.app?.name ?? "Application"}
      appSlug={deployment.app?.slug ?? "app"}
      dockerImage={deployment.app?.dockerImage ?? ""}
      containerName={deployment.containerName}
      volumeName={deployment.volumeName}
      port={deployment.port}
      initialData={initialData}
      realAppUrl={realAppUrl(deployment.port)}
      readme={deployment.app?.readme ?? undefined}
    />
  );
}
