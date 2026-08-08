"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Square,
  RotateCw,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  Server,
  Database,
  Globe,
  Cpu,
  MemoryStick,
  Terminal,
  Copy,
  AlertCircle,
  Timer,
} from "lucide-react";
import { api, navigate, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { statusColor, statusDot } from "@/components/marketplace/status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface LogLine {
  t: string;
  stream: string;
  message: string;
}

function statusBannerStyle(status: string): { bg: string; icon: React.ReactNode; text: string } {
  switch (status) {
    case "running":
      return {
        bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",
        icon: <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />,
        text: "This deployment is running and accessible.",
      };
    case "pending":
    case "creating":
      return {
        bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",
        icon: <Loader2 className="size-5 animate-spin text-amber-600 dark:text-amber-400" />,
        text: "Deployment is being provisioned…",
      };
    case "failed":
    case "dead":
      return {
        bg: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800",
        icon: <AlertCircle className="size-5 text-red-600 dark:text-red-400" />,
        text: "Deployment failed. Try restarting or delete and re-deploy.",
      };
    case "stopped":
    case "exited":
      return {
        bg: "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-700",
        icon: <Square className="size-5 text-zinc-500 dark:text-zinc-400" />,
        text: "Deployment is stopped. Start it to make it accessible.",
      };
    default:
      return {
        bg: "bg-muted border-border",
        icon: <Circle className="size-5 text-muted-foreground" />,
        text: "Unknown status.",
      };
  }
}

export function DeploymentView({ id }: { id: string }) {
  const [dep, setDep] = useState<DeploymentItem | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { deployment } = await api<{ deployment: DeploymentItem }>(`/api/deployments/${id}`);
      setDep(deployment);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.code === "NOT_FOUND")) setNotFound(true);
    }
  }, [id]);

  const loadLogs = useCallback(async () => {
    try {
      const { logs } = await api<{ logs: LogLine[] }>(`/api/deployments/${id}/logs?tail=200`);
      setLogs(logs);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    load();
    loadLogs();
    const t = setInterval(() => {
      load();
      loadLogs();
    }, 3000);
    return () => clearInterval(t);
  }, [load, loadLogs]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  async function act(action: "start" | "stop" | "restart") {
    setBusy(true);
    try {
      const { deployment } = await api<{ deployment: DeploymentItem }>(`/api/deployments/${id}/${action}`, {
        method: "POST",
      });
      setDep(deployment);
      toast.success(`Deployment ${action}ed`);
      setTimeout(loadLogs, 400);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : `Failed to ${action}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/deployments/${id}`, { method: "DELETE" });
      toast.success("Deployment deleted");
      navigate({ name: "dashboard" });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete");
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Deployment not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or belongs to another account.</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate({ name: "dashboard" })}>
          <ArrowLeft className="mr-2 size-4" /> Back to dashboard
        </Button>
      </div>
    );
  }

  if (!dep) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const running = dep.status === "running";
  const steps = computeSteps(dep.status);
  const banner = statusBannerStyle(dep.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate({ name: "dashboard" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </button>

      {/* Status banner */}
      <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${banner.bg}`}>
        {banner.icon}
        <div>
          <p className="text-sm font-medium">{dep.status.charAt(0).toUpperCase() + dep.status.slice(1)}</p>
          <p className="text-xs text-muted-foreground">{banner.text}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AppLogo logo={dep.app?.logo ?? null} simulator={dep.app?.simulator ?? "static"} name={dep.app?.name ?? "App"} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{dep.app?.name ?? "Deployment"}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(dep.status)}`}>
                <span className={`size-1.5 rounded-full ${statusDot(dep.status)}`} />
                {dep.status}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Timer className="size-3" />
                {running ? `Uptime: ${uptimeSince(dep.createdAt)}` : `Downtime: ${timeAgo(dep.updatedAt)}`}
              </span>
            </div>
            <a
              href={dep.previewPath}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
            >
              <Globe className="size-3" /> {dep.subdomain}.apps.local <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => window.open(dep.previewPath, "_blank")}
            disabled={!running}
          >
            <ExternalLink className="mr-1.5 size-3.5" /> Open app
          </Button>
          {running ? (
            <Button size="sm" variant="outline" onClick={() => act("stop")} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Square className="mr-1.5 size-3.5" />} Stop
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => act("start")} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Play className="mr-1.5 size-3.5" />} Start
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => act("restart")} disabled={busy}>
            {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RotateCw className="mr-1.5 size-3.5" />} Restart
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={busy}>
                <Trash2 className="mr-1.5 size-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this deployment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes container <span className="font-mono">{dep.containerName}</span> and volume{" "}
                  <span className="font-mono">{dep.volumeName}</span>. All data will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={remove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Deploy progress — connected line/dots visual */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Deployment progress</h2>
        <div className="relative mt-4">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
          <ol className="relative space-y-4">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-start gap-4">
                <div className="relative z-10 flex size-6 shrink-0 items-center justify-center">
                  {s.state === "done" ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </span>
                  ) : s.state === "active" ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft">
                      <Loader2 className="size-4 animate-spin text-brand" />
                    </span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full border border-border bg-background">
                      <Circle className="size-3 text-muted-foreground/40" />
                    </span>
                  )}
                </div>
                <span
                  className={`pt-1 text-sm ${
                    s.state === "done" ? "text-foreground" : s.state === "active" ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                  {s.state === "done" && i === steps.length - 1 && (
                    <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">✓</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Details + logs */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Runtime details</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Detail icon={<Server className="size-3.5" />} label="Container" value={dep.containerName} mono copyable />
            <Detail icon={<Database className="size-3.5" />} label="Volume" value={dep.volumeName} mono copyable />
            <Detail icon={<Server className="size-3.5" />} label="Container ID" value={dep.containerId ?? "—"} mono />
            <Detail icon={<Globe className="size-3.5" />} label="Subdomain" value={`${dep.subdomain}.apps.local`} mono copyable />
            <Detail icon={<Cpu className="size-3.5" />} label="CPU limit" value="0.5 core" />
            <Detail icon={<MemoryStick className="size-3.5" />} label="Memory limit" value="512 MB" />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Badge variant="secondary" className="gap-1">
              <Server className="size-3" /> {dep.app?.dockerImage ?? "unknown"}
            </Badge>
            <Badge variant="outline">port {dep.port ?? "—"}</Badge>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Terminal className="size-4" /> Container logs
            </h2>
            <span className="text-[11px] text-muted-foreground">{logs.length} lines</span>
          </div>
          <div
            ref={logRef}
            className="scroll-thin mt-3 h-72 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
          >
            {logs.length === 0 ? (
              <p className="text-zinc-500">No logs yet.</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 text-zinc-700 select-none w-6 text-right">{i + 1}</span>
                  <span className="shrink-0 text-emerald-700">{new Date(l.t).toLocaleTimeString()}</span>
                  <span className={l.stream === "stderr" ? "text-red-400" : "text-zinc-300"}>{l.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  mono,
  copyable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="flex items-center gap-1.5">
        <span className={`truncate text-xs ${mono ? "font-mono" : ""}`}>{value}</span>
        {copyable && value !== "—" && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(value);
              toast.success("Copied");
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Copy"
          >
            <Copy className="size-3" />
          </button>
        )}
      </dd>
    </div>
  );
}

function computeSteps(status: string): { label: string; state: "done" | "active" | "pending" }[] {
  const labels = [
    "Creating deployment",
    "Creating volume",
    "Creating container",
    "Starting application",
    "Deployment ready",
  ];
  const order: Record<string, number> = {
    pending: 0,
    creating: 1,
    created: 2,
    running: 5,
    stopped: 5,
    exited: 5,
    failed: 5,
    dead: 5,
  };
  const progress = order[status] ?? 0;
  return labels.map((label, i) => {
    if (progress >= 5) return { label, state: "done" as const };
    if (i < progress) return { label, state: "done" as const };
    if (i === progress) return { label, state: "active" as const };
    return { label, state: "pending" as const };
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function uptimeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
