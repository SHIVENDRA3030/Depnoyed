"use client";

import { CheckCircle2 } from "lucide-react";
import type { AppSimulatorProps } from "../app-simulator";

/**
 * Static simulator — mimics the default nginx:alpine welcome page served by a
 * freshly deployed container. No persistence, but proves the container is up
 * and reachable on its public URL.
 */
export function StaticSimulator(props: AppSimulatorProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-10 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to nginx!</h1>
          <p className="mt-2 text-emerald-50">
            Your container is running and reachable on its public URL.
          </p>
        </div>
      </div>
      <div className="px-8 py-8">
        <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            If you see this page, the nginx web server is successfully installed and working. Further
            configuration is required.
          </p>
          <p>
            For online documentation and support please refer to{" "}
            <span className="font-mono text-emerald-700 dark:text-emerald-400">nginx.org</span>. Commercial support is
            available at <span className="font-mono text-emerald-700 dark:text-emerald-400">nginx.com</span>.
          </p>
          <p className="font-mono text-xs">Thank you for using nginx.</p>

          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4" /> Deployment verified
            </p>
            <ul className="mt-2 space-y-1 text-xs text-emerald-700 dark:text-emerald-400">
              <li>· Container image: <span className="font-mono">{props.dockerImage}</span></li>
              <li>· Listening on container port <span className="font-mono">{props.port ?? 80}</span></li>
              <li>· Served from isolated tenant container <span className="font-mono">{props.containerName}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
