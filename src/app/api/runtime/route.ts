import { json, withErrors } from "@backend/api";
import { config } from "@backend/config";
import { getDockerAdapter, getDockerAdapterKind } from "@backend/docker/adapter";

/**
 * Reports the active runtime adapter (mock vs docker) and whether the Docker
 * daemon is reachable when the docker adapter is selected. The frontend uses
 * this to decide whether to show the "Open real app" link on deployments.
 */
export const GET = withErrors(async () => {
  const kind = getDockerAdapterKind();
  const adapter = getDockerAdapter();
  let dockerReachable = false;
  if (kind === "docker") {
    try {
      // The adapter exposes ping() only on DockerEngineAdapter. We probe via
      // a duck-typed check so the mock adapter (which has no ping) just
      // reports false without throwing.
      const maybe = adapter as unknown as { ping?: () => Promise<boolean> };
      if (typeof maybe.ping === "function") {
        dockerReachable = await maybe.ping();
      }
    } catch {
      dockerReachable = false;
    }
  }
  return json({
    adapter: kind,
    dockerReachable,
    realAppBaseUrl: config.docker.realAppBaseUrl || null,
    socketPath: config.docker.socketPath,
    portRange: [config.docker.portRangeStart, config.docker.portRangeEnd],
  });
});
