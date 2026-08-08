import { NextResponse } from "next/server";
import { isDeployError, DeployError } from "@/lib/deployments";

/**
 * Shared API helpers: consistent JSON responses + centralised error handling
 * so route handlers stay small and focused on business logic.
 */

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Wrap an async route handler with centralised error handling.
 */
export function withErrors<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof DeployError) {
        const status =
          err.code === "NOT_FOUND"
            ? 404
            : err.code === "FORBIDDEN"
              ? 403
              : err.code === "UNKNOWN_APP"
                ? 404
                : 400;
        return errorResponse(err.message, status, err.code);
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[api] error:", err);
      return errorResponse(message, 500);
    }
  };
}

/* ------------------------------- Serializers ------------------------------ */

import type { Deployment, App, User } from "@prisma/client";

export type AppWithCounts = App & { _count?: { deployments: number } };

export function serializeApp(app: AppWithCounts) {
  return {
    id: app.id,
    name: app.name,
    slug: app.slug,
    description: app.description,
    dockerImage: app.dockerImage,
    containerPort: app.containerPort,
    logo: app.logo,
    category: app.category,
    simulator: app.simulator,
    createdAt: app.createdAt.toISOString(),
    deploymentCount: app._count?.deployments ?? 0,
  };
}

export function serializeDeployment(
  dep: Deployment & { app?: App | null },
  opts?: { baseDomain?: string }
) {
  const baseDomain = opts?.baseDomain ?? process.env.DEPLOY_BASE_DOMAIN ?? "apps.local";
  return {
    id: dep.id,
    status: dep.status,
    subdomain: dep.subdomain,
    publicUrl: `https://${dep.subdomain}.${baseDomain}`,
    previewPath: `/preview/${dep.subdomain}`,
    containerId: dep.containerId,
    containerName: dep.containerName,
    volumeName: dep.volumeName,
    port: dep.port,
    label: dep.label ?? null,
    envVars: dep.envVars ? JSON.parse(dep.envVars) as Record<string, string> : null,
    createdAt: dep.createdAt.toISOString(),
    updatedAt: dep.updatedAt.toISOString(),
    app: dep.app
      ? {
          id: dep.app.id,
          name: dep.app.name,
          slug: dep.app.slug,
          dockerImage: dep.app.dockerImage,
          containerPort: dep.app.containerPort,
          logo: dep.app.logo,
          simulator: dep.app.simulator,
        }
      : null,
  };
}

export function serializeUser(user: Pick<User, "id" | "email" | "name" | "createdAt">) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
