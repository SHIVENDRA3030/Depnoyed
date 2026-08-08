"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  ExternalLink,
  Play,
  Square,
  RotateCw,
  Trash2,
  Loader2,
  Container,
  Clock,
  ArrowRight,
  RefreshCw,
  Timer,
  Database,
  Activity,
  Boxes,
  HardDrive,
  TrendingUp,
  Tag,
  X,
  CheckSquare,
} from "lucide-react";
import { api, navigate, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { statusColor } from "@/components/marketplace/status";
import {
  calculateUptime,
  getContainerMetrics,
  healthDotColor,
} from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

function statusAccentBorder(status: string): string {
  switch (status) {
    case "running":
      return "border-l-emerald-500";
    case "pending":
    case "creating":
      return "border-l-amber-500";
    case "failed":
    case "dead":
      return "border-l-red-500";
    case "stopped":
    case "exited":
      return "border-l-zinc-400 dark:border-l-zinc-500";
    default:
      return "border-l-muted-foreground";
  }
}

function statusDotClass(status: string): string {
  switch (status) {
    case "running":
      return "bg-emerald-500";
    case "stopped":
    case "exited":
      return "bg-zinc-400";
    case "pending":
    case "creating":
      return "bg-amber-500";
    case "failed":
    case "dead":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}

export function DashboardView() {
  const [deployments, setDeployments] = useState<DeploymentItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { deployments } = await api<{ deployments: DeploymentItem[] }>("/api/deployments");
      setDeployments(deployments);
    } catch {
      toast.error("Failed to load deployments");
      setDeployments([]);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function act(id: string, action: "start" | "stop" | "restart") {
    setBusyId(id);
    try {
      const { deployment } = await api<{ deployment: DeploymentItem }>(`/api/deployments/${id}/${action}`, {
        method: "POST",
      });
      setDeployments((d) => (d ?? []).map((x) => (x.id === id ? deployment : x)));
      toast.success(`Deployment ${action}ed`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : `Failed to ${action}`);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api(`/api/deployments/${id}`, { method: "DELETE" });
      setDeployments((d) => (d ?? []).filter((x) => x.id !== id));
      toast.success("Deployment deleted");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  // Batch operations
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!deployments) return;
    if (selectedIds.size === deployments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deployments.map((d) => d.id)));
    }
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const batchInfo = useMemo(() => {
    if (!deployments) return { hasStopped: false, hasRunning: false, count: 0 };
    const selected = deployments.filter((d) => selectedIds.has(d.id));
    return {
      hasStopped: selected.some((d) => d.status === "stopped" || d.status === "exited"),
      hasRunning: selected.some((d) => d.status === "running"),
      count: selected.length,
    };
  }, [deployments, selectedIds]);

  async function batchAction(action: "start" | "stop" | "restart") {
    setBatchBusy(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await api<{ deployment: DeploymentItem }>(`/api/deployments/${id}/${action}`, { method: "POST" });
        successCount++;
      } catch {
        failCount++;
      }
    }
    await load();
    setBatchBusy(false);
    deselectAll();
    if (failCount === 0) toast.success(`${successCount} deployment(s) ${action}ed`);
    else toast.error(`${failCount} failed, ${successCount} succeeded`);
  }

  async function batchDelete() {
    setBatchBusy(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await api(`/api/deployments/${id}`, { method: "DELETE" });
        successCount++;
      } catch {
        failCount++;
      }
    }
    await load();
    setBatchBusy(false);
    deselectAll();
    if (failCount === 0) toast.success(`${successCount} deployment(s) deleted`);
    else toast.error(`${failCount} failed, ${successCount} succeeded`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My deployments</h1>
          <p className="text-sm text-muted-foreground">Manage your isolated application instances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Refresh
          </Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate({ name: "marketplace" })}>
            <Plus className="mr-2 size-4" /> Deploy new
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {deployments && deployments.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Boxes className="size-4" />}
            label="Total"
            value={String(deployments.length)}
            tone="default"
          />
          <StatCard
            icon={<Activity className="size-4" />}
            label="Running"
            value={String(deployments.filter((d) => d.status === "running").length)}
            tone="emerald"
          />
          <StatCard
            icon={<Square className="size-4" />}
            label="Stopped"
            value={String(deployments.filter((d) => d.status === "stopped" || d.status === "exited").length)}
            tone="zinc"
          />
          <StatCard
            icon={<HardDrive className="size-4" />}
            label="Data stored"
            value={formatDataSize(
              deployments.reduce((acc, d) => acc + (d.volumeDataSize ?? 0), 0)
            )}
            tone="brand"
          />
        </div>
      )}

      <div className="mt-6">
        {deployments === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl shimmer" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {deployments.map((d) => (
              <DeploymentRow
                key={d.id}
                d={d}
                busy={busyId === d.id}
                selected={selectedIds.has(d.id)}
                onSelect={() => toggleSelect(d.id)}
                onStart={() => act(d.id, "start")}
                onStop={() => act(d.id, "stop")}
                onRestart={() => act(d.id, "restart")}
                onDelete={() => remove(d.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activity timeline */}
      {deployments && deployments.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="size-4" /> Recent activity
          </h2>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <ol className="relative space-y-3">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
              {[...deployments]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
                .map((d) => {
                  const isActive = d.status === "running";
                  return (
                    <li key={d.id} className="relative flex items-start gap-3 pl-6">
                      <span
                        className={`absolute left-0 top-1.5 size-4 rounded-full border-2 border-background ${
                          isActive
                            ? "bg-emerald-500"
                            : d.status === "failed" || d.status === "dead"
                            ? "bg-red-500"
                            : "bg-zinc-400"
                        }`}
                      />
                      <button
                        className="flex flex-1 items-center justify-between gap-2 text-left text-sm hover:opacity-80"
                        onClick={() => navigate({ name: "deployment", id: d.id })}
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{d.app?.name ?? "Unknown app"}</span>{" "}
                          <span className="text-muted-foreground">
                            {isActive ? "is running" : `was ${d.status}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(d.updatedAt)}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ol>
          </div>
        </div>
      )}

      {/* Batch action bar - fixed at bottom */}
      {batchInfo.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-200">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={deployments ? selectedIds.size === deployments.length : false}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-sm font-medium">
                {batchInfo.count} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => batchAction("start")}
                disabled={batchBusy || !batchInfo.hasStopped}
              >
                {batchBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Start all
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => batchAction("stop")}
                disabled={batchBusy || !batchInfo.hasRunning}
              >
                {batchBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
                Stop all
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => batchAction("restart")}
                disabled={batchBusy}
              >
                {batchBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                Restart all
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={batchBusy}
                  >
                    <Trash2 className="size-3.5" /> Delete all
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {batchInfo.count} deployment(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {batchInfo.count} container(s) and their volumes. All persisted data will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={batchDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={deselectAll}
              >
                <X className="size-3.5" /> Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "default" | "emerald" | "zinc" | "brand";
}) {
  const toneClasses = {
    default: "bg-muted/60 text-foreground",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    brand: "bg-brand-soft text-brand",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-brand/30">
      <span className={`flex size-9 items-center justify-center rounded-lg ${toneClasses}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-lg font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function DeploymentRow({
  d,
  busy,
  selected,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onDelete,
}: {
  d: DeploymentItem;
  busy: boolean;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDelete: () => void;
}) {
  const running = d.status === "running";
  const containerId = d.containerId ?? d.id;
  const metrics = getContainerMetrics(containerId);
  const uptime = calculateUptime(d.createdAt, d.status);

  return (
    <div className={`group flex flex-col gap-4 rounded-2xl border border-border border-l-4 ${statusAccentBorder(d.status)} bg-card p-4 shadow-sm transition-colors hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          aria-label={`Select ${d.app?.name ?? "deployment"}`}
          onClick={(e) => e.stopPropagation()}
        />

        <button
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
          onClick={() => navigate({ name: "deployment", id: d.id })}
        >
          <AppLogo logo={d.app?.logo ?? null} simulator={d.app?.simulator ?? "static"} name={d.app?.name ?? "App"} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{d.app?.name ?? "Unknown app"}</h3>
              {d.label && (
                <Badge variant="outline" className="shrink-0 gap-1 border-brand/30 bg-brand-soft/50 px-1.5 py-0 text-[10px] font-medium text-brand">
                  <Tag className="size-2.5" /> {d.label}
                </Badge>
              )}
              <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor(d.status)}`}>
                <span className="relative flex size-1.5">
                  <span className={`absolute inline-flex size-full rounded-full ${statusDotClass(d.status)} opacity-75`} />
                  {d.status === "running" && (
                    <span className={`inline-flex size-full rounded-full ${statusDotClass(d.status)} animate-status-pulse`} />
                  )}
                </span>
                {d.status}
              </span>
              {/* Health dot */}
              <span className="relative flex size-2" title={`Health: ${d.status}`}>
                <span className={`size-full rounded-full ${healthDotColor(d.status)}`} />
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <a
                href={d.previewPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-[180px] items-center gap-1 font-mono text-brand hover:underline sm:max-w-[220px]"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-3 shrink-0" /> <span className="truncate">{d.subdomain}.apps.local</span>
              </a>
              <span className="inline-flex items-center gap-1 font-mono">
                <Container className="size-3" /> <span className="truncate max-w-[150px]">{d.containerName}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3" /> {running ? `Running for ${uptimeSince(d.createdAt)}` : `Stopped · ${timeAgo(d.updatedAt)}`}
              </span>
              {d.volumeDataSize != null && (
                <span className="inline-flex items-center gap-1">
                  <Database className="size-3" /> {formatDataSize(d.volumeDataSize)}
                </span>
              )}
              {/* Uptime indicator */}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Activity className="size-3" />
                {running ? `${uptime}% uptime` : "Stopped"}
              </span>
              {/* Memory usage bar */}
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] tabular-nums">{metrics.memoryUsagePercent}%</span>
                <Progress value={metrics.memoryUsagePercent} className="h-1.5 w-16" />
              </span>
            </div>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => window.open(d.previewPath, "_blank")}
          disabled={!running}
        >
          <ExternalLink className="size-3.5" /> Open
        </Button>
        {running ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onStop} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />} Stop
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onStart} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Start
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onRestart} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />} Restart
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this deployment?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the container <span className="font-mono">{d.containerName}</span> and its
                volume <span className="font-mono">{d.volumeName}</span>. All persisted data will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Container className="size-8" />
        </div>
        <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Plus className="size-3" />
        </div>
      </div>
      <h3 className="mt-5 text-lg font-semibold">No deployments yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Browse the marketplace and deploy your first open-source application in one click.
      </p>
      <Button className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate({ name: "marketplace" })}>
        Browse marketplace <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  );
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

function formatDataSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { Badge };
