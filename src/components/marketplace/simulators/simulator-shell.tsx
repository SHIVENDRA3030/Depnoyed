"use client";

import { Server, Database, Cpu, MemoryStick, Box, ShieldCheck, Activity, ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";

export interface SimulatorShellProps {
  subdomain: string;
  running: boolean;
  status: string;
  appName: string;
  appSlug: string;
  dockerImage: string;
  containerName: string;
  volumeName: string;
  port: number | null;
  children: React.ReactNode;
  realAppUrl?: string | null;
  readme?: string;
}

export function SimulatorShell(props: SimulatorShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-background dark:to-background">
      {/* App chrome — mimics a real running application with its own header */}
      <header className="border-b border-emerald-200/60 bg-white/80 backdrop-blur dark:border-emerald-900/50 dark:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Box className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{props.appName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{props.subdomain}.apps.local</p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Marketplace
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!props.running ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Activity className="size-8" />
            </div>
            <h1 className="text-xl font-semibold">This application is not running</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              The deployment is currently <span className="font-mono font-medium">{props.status}</span>. Start it from
              your dashboard to bring it back online. Its persisted volume data is preserved across restarts.
            </p>
            <a
              href="/dashboard"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Go to dashboard
            </a>
          </div>
        ) : props.realAppUrl ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-8 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50 dark:bg-emerald-900/50 dark:text-emerald-400 dark:ring-emerald-800/50">
              <Box className="size-10" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Your app is running live!</h1>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              This deployment is running as a real Docker container. You can access it securely via its dedicated port on your local machine.
            </p>
            <a
              href={props.realAppUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-emerald-900/10 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98]"
            >
              Open {props.appName} <ExternalLink className="size-4" />
            </a>
            
            {props.readme && (
              <div className="mt-10 w-full max-w-3xl text-left">
                <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-zinc-950 dark:ring-white/10">
                  <div className="prose prose-emerald prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {props.readme}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          props.children
        )}

        {/* Runtime metadata — proves isolation to the user */}
        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaCard icon={<Server className="size-4" />} label="Container" value={props.containerName} mono />
          <MetaCard icon={<Database className="size-4" />} label="Volume" value={props.volumeName} mono />
          <MetaCard icon={<Cpu className="size-4" />} label="CPU limit" value="0.5 core" />
          <MetaCard icon={<MemoryStick className="size-4" />} label="Memory limit" value="512 MB" />
        </section>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          Fully isolated tenant container with a dedicated persistent volume.
        </p>
      </main>
    </div>
  );
}

function MetaCard({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-1 truncate text-xs ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
