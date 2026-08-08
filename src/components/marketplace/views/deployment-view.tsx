"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Tag,
  Pencil,
  Check,
  X,
  Activity,
  Zap,
  Clock,
  HeartPulse,
  Wifi,
  HardDriveUpload,
  ArrowUpRight,
  ArrowDownRight,
  Variable,
  Shield,
  CheckCheck,
} from "lucide-react";
import { api, navigate, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { statusColor, statusDot } from "@/components/marketplace/status";
import {
  calculateUptime,
  getContainerMetrics,
  lastHealthCheck,
} from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  Sparkline,
  sparklineColor,
  generateTimeSeries,
  tickTimeSeries,
} from "@/components/marketplace/sparkline";

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
  const [volumeKeys, setVolumeKeys] = useState<string[] | null>(null);
  const [volumeValues, setVolumeValues] = useState<Record<string, string>>({});
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [labelEditing, setLabelEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);
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

  const loadVolume = useCallback(async () => {
    if (!dep) return;
    setVolumeLoading(true);
    try {
      const res = await api<{ result: { ok: boolean; keys?: string[] } }>(`/api/deployments/${id}/volume`);
      const keys = res.result.keys ?? [];
      setVolumeKeys(keys);
      // Fetch values for each key (limit to first 20 keys to avoid overload).
      const limited = keys.slice(0, 20);
      const entries = await Promise.all(
        limited.map(async (k) => {
          try {
            const r = await api<{ result: { ok: boolean; value?: string | null } }>(
              `/api/deployments/${id}/volume?op=get&key=${encodeURIComponent(k)}`
            );
            return [k, r.result.value ?? ""] as const;
          } catch {
            return [k, ""] as const;
          }
        })
      );
      setVolumeValues(Object.fromEntries(entries));
    } catch {
      setVolumeKeys([]);
    } finally {
      setVolumeLoading(false);
    }
  }, [id, dep]);

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
      toast.success(`Deployment ${action === 'stop' ? 'stopped' : action + 'ed'}`);
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

  function startEditLabel() {
    setLabelDraft(dep?.label ?? "");
    setLabelEditing(true);
  }

  async function saveLabel() {
    setLabelSaving(true);
    try {
      const { deployment } = await api<{ deployment: DeploymentItem }>(`/api/deployments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: labelDraft }),
      });
      setDep(deployment);
      setLabelEditing(false);
      toast.success("Label updated");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update label");
    } finally {
      setLabelSaving(false);
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
  const containerId = dep.containerId ?? dep.id;
  const metrics = getContainerMetrics(containerId);
  const uptime = calculateUptime(dep.createdAt, dep.status);
  const healthCheckTime = lastHealthCheck(containerId);

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

      {/* Health metrics section */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <HeartPulse className="size-4 text-rose-500" /> Health
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {/* Uptime */}
          <MetricCard
            icon={<Activity className="size-3.5" />}
            label="Uptime"
            value={running ? `${uptime}%` : "0%"}
          >
            {running && (
              <Progress
                value={uptime}
                className="mt-2 h-1.5"
              />
            )}
          </MetricCard>

          {/* Memory usage */}
          <MetricCard
            icon={<MemoryStick className="size-3.5" />}
            label="Memory"
            value={`${metrics.memoryUsagePercent}%`}
          >
            <Progress
              value={metrics.memoryUsagePercent}
              className="mt-2 h-1.5"
            />
          </MetricCard>

          {/* CPU usage */}
          <MetricCard
            icon={<Cpu className="size-3.5" />}
            label="CPU"
            value={`${metrics.cpuUsagePercent}%`}
          >
            <Progress
              value={metrics.cpuUsagePercent}
              className="mt-2 h-1.5"
            />
          </MetricCard>

          {/* Response latency */}
          <MetricCard
            icon={<Zap className="size-3.5" />}
            label="Latency"
            value={`${metrics.responseLatencyMs}ms`}
          >
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  metrics.responseLatencyMs < 50
                    ? "bg-emerald-500"
                    : metrics.responseLatencyMs < 100
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min((metrics.responseLatencyMs / 150) * 100, 100)}%` }}
              />
              <div className="h-1.5 flex-1 rounded-full bg-muted" />
            </div>
          </MetricCard>

          {/* Last health check */}
          <MetricCard
            icon={<Clock className="size-3.5" />}
            label="Last check"
            value={formatHealthCheckTime(healthCheckTime)}
          >
            <p className="mt-1 text-[10px] text-muted-foreground">
              {healthCheckTime.toLocaleTimeString()}
            </p>
          </MetricCard>
        </div>
      </div>

      {/* Performance sparkline section */}
      <DeploymentPerformanceSparklines
        containerId={containerId}
        status={dep.status}
        metrics={metrics}
      />

      {/* Header */}
      <div className="gradient-border-animated flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AppLogo logo={dep.app?.logo ?? null} simulator={dep.app?.simulator ?? "static"} name={dep.app?.name ?? "App"} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{dep.app?.name ?? "Deployment"}</h1>
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor(dep.status)}`}>
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
                className="mt-1 inline-flex max-w-full items-center gap-1 font-mono text-xs text-brand hover:underline"
              >
                <Globe className="size-3 shrink-0" /> <span className="truncate">{dep.subdomain}.apps.local</span>
              </a>
              {/* Label row */}
              <div className="mt-2 flex items-center gap-2">
                {labelEditing ? (
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3.5 text-muted-foreground" />
                    <Input
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLabel();
                        if (e.key === "Escape") setLabelEditing(false);
                      }}
                      placeholder="Add a label (e.g. 'prod', 'staging', 'client-A')"
                      className="h-7 w-64 text-xs"
                      autoFocus
                      disabled={labelSaving}
                    />
                    <button
                      onClick={saveLabel}
                      disabled={labelSaving}
                      className="inline-flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                      aria-label="Save label"
                    >
                      {labelSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => setLabelEditing(false)}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                      aria-label="Cancel"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditLabel}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
                  >
                    <Tag className="size-3" />
                    {dep.label ? (
                      <span className="text-foreground">{dep.label}</span>
                    ) : (
                      <span>Add label</span>
                    )}
                    <Pencil className="size-2.5 opacity-60" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
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
              <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy}>
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

      {/* Status Badge section */}
      <StatusBadgeSection
        appName={dep.app?.name ?? "app"}
        status={dep.status}
        subdomain={dep.subdomain}
      />

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
            className="scroll-thin mt-3 h-72 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300 shadow-inner-terminal"
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

      {/* Environment Variables */}
      {dep.envVars && Object.keys(dep.envVars).length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Variable className="size-4" /> Environment variables
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Custom environment variables configured for this deployment.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Key</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dep.envVars).map(([key, value]) => (
                  <tr key={key} className="border-b border-border/30 last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs font-medium">{key}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {value.length > 60 ? value.slice(0, 57) + "…" : value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Volume data browser */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Database className="size-4" /> Persistent volume data
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              The keys stored in <span className="font-mono">{dep.volumeName}</span>. Survives stop / restart.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadVolume}
            disabled={volumeLoading}
            className="gap-1.5"
          >
            {volumeLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCw className="size-3.5" />
            )}
            Refresh
          </Button>
        </div>

        {volumeKeys === null ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
            <Database className="mx-auto size-6 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">
              Click "Refresh" to inspect the volume contents.
            </p>
          </div>
        ) : volumeKeys.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
            <Database className="mx-auto size-6 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">
              Volume is empty. Use the deployed app to write some data, then refresh.
            </p>
          </div>
        ) : (
          <div className="mt-4 max-h-72 overflow-y-auto scroll-thin rounded-lg border border-border/60">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">
                    Key
                  </th>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">
                    Value
                  </th>
                  <th className="px-3 py-2 text-right font-medium uppercase tracking-wider text-muted-foreground">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {volumeKeys.map((k) => {
                  const v = volumeValues[k] ?? "";
                  const display = v.length > 80 ? v.slice(0, 80) + "…" : v;
                  return (
                    <tr key={k} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-brand">{k}</td>
                      <td className="px-3 py-2 font-mono text-foreground/80 break-all">{display || <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {new Blob([v]).size} B
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {volumeKeys && volumeKeys.length > 20 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing first 20 of {volumeKeys.length} keys.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Health metric card ---------- */

function MetricCard({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
      {children}
    </div>
  );
}

function formatHealthCheckTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  return `${mins}m ago`;
}

/* ---------- Detail row ---------- */

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

/* ---------- Performance Sparkline Section ---------- */

const DEPLOY_SPARKLINE_POINTS = 30;

function DeploymentPerformanceSparklines({
  containerId,
  status,
  metrics,
}: {
  containerId: string;
  status: string;
  metrics: { cpuUsagePercent: number; memoryUsagePercent: number; responseLatencyMs: number; healthScore: number };
}) {
  const running = status === "running";
  const color = sparklineColor(status);

  // Base metrics from getContainerMetrics
  const baseCpu = metrics.cpuUsagePercent;
  const baseMemory = metrics.memoryUsagePercent;
  const baseNetwork = metrics.responseLatencyMs / 150 * 40 + 10; // ~10-50
  const baseDisk = metrics.healthScore * 0.3 + 5; // ~5-35

  // Tick counter drives series evolution (only ticks for running deployments)
  const [tick, setTick] = useState(0);

  // Auto-refresh every 5 seconds for running deployments
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [running]);

  // Compute full series from containerId + tick (fully derived)
  const series = useMemo(() => {
    const cpu = generateTimeSeries(baseCpu, DEPLOY_SPARKLINE_POINTS, 4, `dep-${containerId}:cpu`);
    const memory = generateTimeSeries(baseMemory, DEPLOY_SPARKLINE_POINTS, 3, `dep-${containerId}:mem`);
    const network = generateTimeSeries(baseNetwork, DEPLOY_SPARKLINE_POINTS, 5, `dep-${containerId}:net`);
    const disk = generateTimeSeries(baseDisk, DEPLOY_SPARKLINE_POINTS, 3, `dep-${containerId}:disk`);
    // Apply tick-based evolution
    let c = cpu, m = memory, n = network, d = disk;
    for (let i = 0; i < tick; i++) {
      c = tickTimeSeries(c, baseCpu, 4, i + 1);
      m = tickTimeSeries(m, baseMemory, 3, i + 1);
      n = tickTimeSeries(n, baseNetwork, 5, i + 1);
      d = tickTimeSeries(d, baseDisk, 3, i + 1);
    }
    return { cpu: c, memory: m, network: n, disk: d };
  }, [containerId, baseCpu, baseMemory, baseNetwork, baseDisk, tick]);

  const charts: {
    key: string;
    label: string;
    icon: React.ReactNode;
    data: number[];
    unit: string;
    decimals?: number;
  }[] = [
    {
      key: "cpu",
      label: "CPU Usage",
      icon: <Cpu className="size-4" />,
      data: series.cpu,
      unit: "%",
    },
    {
      key: "memory",
      label: "Memory Usage",
      icon: <MemoryStick className="size-4" />,
      data: series.memory,
      unit: "%",
    },
    {
      key: "network",
      label: "Network I/O",
      icon: <Wifi className="size-4" />,
      data: series.network,
      unit: " MB/s",
      decimals: 1,
    },
    {
      key: "disk",
      label: "Disk I/O",
      icon: <HardDriveUpload className="size-4" />,
      data: series.disk,
      unit: " MB/s",
      decimals: 1,
    },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Activity className="size-4 text-brand" /> Performance
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {charts.map((c) => {
          const current = c.data[c.data.length - 1] ?? 0;
          const prev = c.data[c.data.length - 2] ?? current;
          const trendUp = current >= prev;
          const min = Math.min(...c.data);
          const max = Math.max(...c.data);
          const displayVal = c.decimals ? current.toFixed(c.decimals) : Math.round(current);
          const displayMin = c.decimals ? min.toFixed(c.decimals) : Math.round(min);
          const displayMax = c.decimals ? max.toFixed(c.decimals) : Math.round(max);
          return (
            <div
              key={c.key}
              className="flex flex-col rounded-xl border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {c.icon} {c.label}
                </span>
                <span className={`flex items-center gap-0.5 text-[10px] tabular-nums ${trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {trendUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {Math.abs(Math.round(current - prev))}
                </span>
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {displayVal}<span className="text-sm font-normal text-muted-foreground">{c.unit}</span>
              </p>
              <Sparkline
                data={c.data}
                color={color}
                width={140}
                height={32}
                strokeWidth={1.8}
                showArea
                id={`dep-${c.key}`}
                className="mt-2 w-full"
              />
              <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
                Min {displayMin}{c.unit} · Max {displayMax}{c.unit}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Status Badge Section ---------- */

function badgeColorForStatus(status: string): string {
  switch (status) {
    case "running":
      return "brightgreen";
    case "pending":
    case "creating":
      return "yellow";
    case "failed":
    case "dead":
      return "red";
    case "stopped":
    case "exited":
      return "gray";
    default:
      return "lightgray";
  }
}

function badgeLabelForStatus(status: string): string {
  switch (status) {
    case "running":
      return "running";
    case "pending":
      return "pending";
    case "creating":
      return "creating";
    case "failed":
      return "failed";
    case "dead":
      return "dead";
    case "stopped":
      return "stopped";
    case "exited":
      return "exited";
    default:
      return status;
  }
}

function StatusBadgeSection({
  appName,
  status,
  subdomain,
}: {
  appName: string;
  status: string;
  subdomain: string;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const color = badgeColorForStatus(status);
  const label = badgeLabelForStatus(status);
  const slug = appName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const badgeUrl = `https://img.shields.io/badge/${slug}-${label}-${color}`;

  const snippets = [
    { format: "Markdown", code: `![${appName} status](${badgeUrl})` },
    { format: "HTML", code: `<img src="${badgeUrl}" alt="${appName} status" />` },
    { format: "URL", code: badgeUrl },
  ];

  function copySnippet(idx: number) {
    navigator.clipboard?.writeText(snippets[idx].code);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Shield className="size-4 text-brand" /> Status Badge
      </h2>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Embed a live status badge in your README, docs, or dashboard.
      </p>

      {/* Badge preview */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <img
          src={badgeUrl}
          alt={`${appName} ${status}`}
          className="h-5"
          loading="lazy"
        />
        <span className="text-xs text-muted-foreground">
          Preview — auto-updates with deployment status
        </span>
      </div>

      {/* Copyable snippets */}
      <div className="mt-3 space-y-2">
        {snippets.map((s, i) => (
          <div key={s.format} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.format}
            </span>
            <code className="flex-1 truncate rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 font-mono text-xs text-foreground/80">
              {s.code}
            </code>
            <button
              type="button"
              onClick={() => copySnippet(i)}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Copy ${s.format}`}
            >
              {copiedIdx === i ? (
                <CheckCheck className="size-3.5 text-brand" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Badge URL: <span className="font-mono text-foreground/70">{badgeUrl}</span>
      </p>
    </div>
  );
}
