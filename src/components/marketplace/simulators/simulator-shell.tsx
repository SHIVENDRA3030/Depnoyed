"use client";

import { Server, Database, Cpu, MemoryStick, Box, ShieldCheck, Activity, ArrowLeft } from "lucide-react";

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
