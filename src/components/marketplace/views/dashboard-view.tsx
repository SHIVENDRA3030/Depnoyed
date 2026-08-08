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
  Cpu,
  MemoryStick,
  ArrowUpRight,
  ArrowDownRight,
  Wifi,
  HardDriveUpload,
  DollarSign,
  Search,
  Rocket,
  HeartPulse,
  Zap,
  LayoutGrid,
  ChevronDown,
  CircleDot,
} from "lucide-react";
import { api, navigate, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { statusColor } from "@/components/marketplace/status";
import {
  calculateUptime,
  getContainerMetrics,
  healthDotColor,
  lastHealthCheck,
  seededRandom,
} from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const filteredDeployments = useMemo(() => {
    if (!deployments) return [];
    const q = searchQuery.trim().toLowerCase();
    return deployments.filter((d) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "running" && d.status === "running") ||
        (statusFilter === "stopped" && (d.status === "stopped" || d.status === "exited"));
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        (d.app?.name?.toLowerCase().includes(q) ?? false) ||
        (d.label?.toLowerCase().includes(q) ?? false) ||
        d.subdomain.toLowerCase().includes(q) ||
        d.containerName.toLowerCase().includes(q)
      );
    });
  }, [deployments, searchQuery, statusFilter]);

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
      toast.success(`Deployment ${action === 'stop' ? 'stopped' : action + 'ed'}`);
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
    if (failCount === 0) toast.success(`${successCount} deployment(s) ${action === 'stop' ? 'stopped' : action + 'ed'}`);
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

  // Derived data for health monitoring
  const healthData = useMemo(() => {
    if (!deployments || deployments.length === 0) return null;
    const runningDeps = deployments.filter((d) => d.status === "running");
    const perDeployment = deployments.map((d) => {
      const containerId = d.containerId ?? d.id;
      const metrics = getContainerMetrics(containerId);
      const uptime = calculateUptime(d.createdAt, d.status);
      const lastCheck = lastHealthCheck(containerId);
      return {
        id: d.id,
        name: d.app?.name ?? "Unknown",
        status: d.status,
        uptime,
        healthScore: d.status === "running" ? Math.max(80, metrics.healthScore) : d.status === "stopped" || d.status === "exited" ? 0 : metrics.healthScore,
        lastCheck,
        responseTime: d.status === "running" ? metrics.responseLatencyMs : null,
      };
    });
    // Overall health: average of running deployments' health scores
    const overallHealth = runningDeps.length > 0
      ? Math.round(runningDeps.reduce((acc, d) => {
          const m = getContainerMetrics(d.containerId ?? d.id);
          return acc + Math.max(80, m.healthScore);
        }, 0) / runningDeps.length)
      : 0;
    // Simulated 24h uptime bars (hourly data)
    const uptime24h = Array.from({ length: 24 }, (_, i) => {
      const seed = `uptime24h-${i}-${runningDeps.length}`;
      const r = seededRandom(seed);
      if (runningDeps.length === 0) return 0;
      return 80 + r * 20; // 80-100% per hour when running
    });
    return { overallHealth, perDeployment, uptime24h, runningCount: runningDeps.length };
  }, [deployments]);

  const [timelineExpanded, setTimelineExpanded] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header with gradient bg */}
      <div className="dashboard-header-gradient -mx-4 -mt-8 px-4 pt-8 pb-6">
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
      </div>

      {/* Summary stat cards with glass morphism & trend indicators */}
      {deployments && deployments.length > 0 && (() => {
        const runningCount = deployments.filter((d) => d.status === "running").length;
        const totalUptimeMin = deployments
          .filter((d) => d.status === "running")
          .reduce((acc, d) => acc + Math.max(0, Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 60000)), 0);
        const uptimeH = Math.floor(totalUptimeMin / 60);
        const uptimeM = totalUptimeMin % 60;
        const uptimeStr = uptimeH > 0 ? `${uptimeH}h ${uptimeM}m` : `${uptimeM}m`;
        const containerQuota = 10;
        const runningPct = Math.round((runningCount / Math.max(1, deployments.length)) * 100);
        return (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Boxes className="size-4" />}
              label="Total Deployments"
              value={String(deployments.length)}
              tone="default"
              glass
              trend={{ direction: "up", value: `${runningPct}%` }}
            />
            <StatCard
              icon={<Activity className="size-4" />}
              label="Running"
              value={String(runningCount)}
              tone="emerald"
              glass
              trend={{ direction: runningCount > 0 ? "up" : "down", value: runningCount > 0 ? "active" : "idle" }}
            />
            <StatCard
              icon={<Clock className="size-4" />}
              label="Total Uptime"
              value={uptimeStr}
              tone="teal"
              glass
              trend={{ direction: "up", value: "live" }}
            />
            <StatCard
              icon={<Cpu className="size-4" />}
              label="Resource Usage"
              value={`${deployments.length}/${containerQuota}`}
              tone="brand"
              glass
              trend={{ direction: deployments.length > containerQuota * 0.7 ? "up" : "down", value: `${Math.round((deployments.length / containerQuota) * 100)}%` }}
            />
          </div>
        );
      })()}

      {/* Health Overview — Feature 1 */}
      {healthData && healthData.runningCount > 0 && (
        <HealthOverview
          overallHealth={healthData.overallHealth}
          uptime24h={healthData.uptime24h}
          perDeployment={healthData.perDeployment}
        />
      )}

      {/* Resource Usage Donut Charts */}
      {deployments && deployments.length > 0 && (
        <ResourceUsageDonuts deployments={deployments} />
      )}

      {/* Quick Actions — Feature 2 */}
      <QuickActions
        hasDeployments={!!deployments && deployments.length > 0}
        runningCount={deployments?.filter((d) => d.status === "running").length ?? 0}
        onRefreshAll={async () => {
          if (!deployments) return;
          const running = deployments.filter((d) => d.status === "running");
          for (const d of running) {
            try { await api(`/api/deployments/${d.id}/restart`, { method: "POST" }); } catch { /* continue */ }
          }
          await load();
          toast.success(`${running.length} deployment(s) refreshed`);
        }}
        onStopAll={async () => {
          if (!deployments) return;
          const running = deployments.filter((d) => d.status === "running");
          for (const d of running) {
            try { await api(`/api/deployments/${d.id}/stop`, { method: "POST" }); } catch { /* continue */ }
          }
          await load();
          toast.success(`${running.length} deployment(s) stopped`);
        }}
      />

      {/* Cost estimation */}
      {deployments && deployments.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-emerald-50/30 p-5 shadow-sm dark:to-emerald-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <DollarSign className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Estimated usage cost</h3>
                <p className="text-[11px] text-muted-foreground">Based on running deployments × resource usage</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">
                ${estimateCost(deployments).monthly.toFixed(2)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                ${estimateCost(deployments).daily.toFixed(3)}/day
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs">
              <Cpu className="size-3 text-brand" />
              <span className="text-muted-foreground">CPU:</span>
              <span className="font-medium">${(0.5 * deployments.filter((d) => d.status === "running").length * 5).toFixed(2)}/mo</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs">
              <MemoryStick className="size-3 text-brand" />
              <span className="text-muted-foreground">Memory:</span>
              <span className="font-medium">${(0.5 * deployments.filter((d) => d.status === "running").length * 3).toFixed(2)}/mo</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs">
              <HardDrive className="size-3 text-brand" />
              <span className="text-muted-foreground">Storage:</span>
              <span className="font-medium">${(Math.max(1, deployments.reduce((a, d) => a + (d.volumeDataSize ?? 0), 0) / 1024 / 1024) * 0.10).toFixed(2)}/mo</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground/70">
            Estimation only — actual costs may vary based on provider pricing and usage patterns.
          </p>
        </div>
      )}

      {/* Search & filter bar */}
      {deployments && deployments.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by app name, label, or subdomain…"
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {["all", "running", "stopped"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === f
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "all" && <Boxes className="size-3" />}
                {f === "running" && <Activity className="size-3" />}
                {f === "stopped" && <Square className="size-3" />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-0.5 text-[10px] text-muted-foreground/70">
                  {f === "all"
                    ? deployments.length
                    : f === "running"
                    ? deployments.filter((d) => d.status === "running").length
                    : deployments.filter((d) => d.status === "stopped" || d.status === "exited").length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content: Deployment list + Activity timeline side-by-side on desktop */}
      <div className="mt-6 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        {/* Left column: Deployments */}
        <div>
          {deployments === null ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl shimmer" />
              ))}
            </div>
          ) : deployments.length === 0 ? (
            <EmptyState />
          ) : filteredDeployments.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
              <Search className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No deployments match your search.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeployments.map((d) => (
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

          {/* Resource Usage sparkline section */}
          {deployments && deployments.length > 0 && (
            <ResourceUsageSparklines deployments={deployments} />
          )}
        </div>

        {/* Right column: Activity Timeline (visible on lg+) */}
        {deployments && deployments.length > 0 && (
          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-8">
              <DashboardActivityPanel
                deployments={deployments}
                expanded={timelineExpanded}
                onToggleExpand={() => setTimelineExpanded((v) => !v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity timeline below deployments on mobile/tablet */}
      {deployments && deployments.length > 0 && (
        <div className="lg:hidden">
          <EnhancedActivityTimeline
            deployments={deployments}
            expanded={timelineExpanded}
            onToggleExpand={() => setTimelineExpanded((v) => !v)}
          />
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
  glass: glassProp,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "default" | "emerald" | "zinc" | "brand" | "teal";
  glass?: boolean;
  trend?: { direction: "up" | "down"; value: string };
}) {
  const toneClasses = {
    default: "bg-muted/60 text-foreground",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    brand: "bg-brand-soft text-brand",
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  }[tone];
  return (
    <div className={`group flex items-center gap-3 rounded-xl border border-border p-3 shadow-sm transition-all duration-200 hover:border-brand/30 hover:shadow-md ${glassProp ? "glass-stat-card border-white/20 dark:border-white/5" : "bg-card"}`}>
      <span className={`flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${toneClasses}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-lg font-bold tabular-nums">{value}</p>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums ${trend.direction === "up" ? "stat-trend-up" : "stat-trend-down"}`}>
              {trend.direction === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function statusGradientBorder(status: string): string {
  switch (status) {
    case "running":
      return "border-l-4 border-l-emerald-500 [border-left-style:solid]";
    case "pending":
    case "creating":
      return "border-l-4 border-l-amber-500 [border-left-style:solid]";
    case "failed":
    case "dead":
      return "border-l-4 border-l-red-500 [border-left-style:solid]";
    case "stopped":
    case "exited":
      return "border-l-4 border-l-zinc-400 dark:border-l-zinc-500 [border-left-style:solid]";
    default:
      return "border-l-4 border-l-muted-foreground [border-left-style:solid]";
  }
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
    <div className={`group flex flex-col gap-4 rounded-2xl border border-border ${statusGradientBorder(d.status)} bg-card p-4 shadow-sm transition-all duration-200 hover:border-brand/40 hover:shadow-[inset_0_1px_4px_rgba(16,185,129,0.06),0_4px_12px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between`}>
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
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border py-20 text-center">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-12 top-1/4 size-32 rounded-full bg-emerald-500/5 blur-2xl" />
        <div className="absolute -right-8 bottom-1/4 size-24 rounded-full bg-teal-500/5 blur-2xl" />
        {/* Animated floating orbs */}
        <div className="empty-float-1 absolute left-[15%] top-[20%] size-4 rounded-full bg-emerald-400/10 blur-sm" />
        <div className="empty-float-2 absolute right-[18%] top-[30%] size-3 rounded-full bg-teal-400/10 blur-sm" />
        <div className="empty-float-3 absolute left-[60%] bottom-[25%] size-5 rounded-full bg-emerald-300/8 blur-md" />
        <div className="empty-float-4 absolute right-[30%] bottom-[35%] size-3.5 rounded-full bg-teal-300/8 blur-sm" />
      </div>

      {/* Main icon with pulse ring */}
      <div className="relative">
        <div className="empty-pulse-ring absolute inset-0 rounded-2xl border-2 border-emerald-500/30" />
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-brand shadow-sm dark:from-emerald-950/30 dark:to-teal-950/30">
          <Container className="size-9" />
        </div>
        <div className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
          <Plus className="size-3" />
        </div>
        {/* Animated decorative dots */}
        <div className="empty-float-1 absolute -left-6 bottom-2 size-2 rounded-full bg-emerald-500/30" />
        <div className="empty-float-3 absolute -right-8 top-0 size-1.5 rounded-full bg-teal-500/30" />
        <div className="empty-float-2 absolute left-0 -bottom-4 size-1 rounded-full bg-emerald-400/20" />
      </div>

      <h3 className="mt-6 text-lg font-semibold">No deployments yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Browse the marketplace and deploy your first open-source application in one click.
      </p>

      {/* Step-by-step guide */}
      <div className="mt-6 flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">1</span>
          <span className="text-muted-foreground">Browse</span>
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground/40" />
        <div className="flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">2</span>
          <span className="text-muted-foreground">Deploy</span>
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground/40" />
        <div className="flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">3</span>
          <span className="text-muted-foreground">Access</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row">
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md hover:brightness-110" onClick={() => navigate({ name: "marketplace" })}>
          <Rocket className="mr-2 size-4" /> Browse marketplace
        </Button>
      </div>

      {/* Quick action buttons for popular apps */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground/60">Try:</span>
        {[
          { name: "Demo Counter", icon: <Zap className="size-2.5" /> },
          { name: "Static Welcome", icon: <Container className="size-2.5" /> },
          { name: "Markdown Wiki", icon: <Boxes className="size-2.5" /> },
        ].map((app) => (
          <button
            key={app.name}
            onClick={() => navigate({ name: "marketplace" })}
            className="quick-action-card inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {app.icon} {app.name}
          </button>
        ))}
      </div>
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

function estimateCost(deployments: DeploymentItem[]) {
  const running = deployments.filter((d) => d.status === "running").length;
  const cpuCost = 0.5 * running * 5;  // $5/core/month
  const memCost = 0.5 * running * 3;   // $3/512MB/month
  const totalStorage = deployments.reduce((a, d) => a + (d.volumeDataSize ?? 0), 0);
  const storageGB = Math.max(1, totalStorage / 1024 / 1024);
  const storageCost = storageGB * 0.10; // $0.10/GB/month
  const monthly = cpuCost + memCost + storageCost;
  const daily = monthly / 30;
  return { monthly, daily };
}

export { Badge };

/* ---------- Health Overview Widget (Feature 1) ---------- */

function HealthOverview({
  overallHealth,
  uptime24h,
  perDeployment,
}: {
  overallHealth: number;
  uptime24h: number[];
  perDeployment: {
    id: string;
    name: string;
    status: string;
    uptime: number;
    healthScore: number;
    lastCheck: Date;
    responseTime: number | null;
  }[];
}) {
  const healthColor = overallHealth > 95 ? "emerald" : overallHealth >= 80 ? "amber" : "red";
  const healthColorClass = healthColor === "emerald"
    ? "text-emerald-500"
    : healthColor === "amber"
    ? "text-amber-500"
    : "text-red-500";
  const healthBgClass = healthColor === "emerald"
    ? "bg-emerald-500"
    : healthColor === "amber"
    ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className="mt-6 animate-fade-in-up">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <HeartPulse className="size-4" /> Health Overview
      </h2>

      <div className="mt-3 grid gap-4 md:grid-cols-[200px_1fr]">
        {/* Circular health score */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="circular-progress relative flex size-28 items-center justify-center">
            <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/40" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
                strokeDasharray={`${overallHealth * 2.64} ${264 - overallHealth * 2.64}`}
                strokeLinecap="round"
                className={healthColor === "emerald" ? "text-emerald-500" : healthColor === "amber" ? "text-amber-500" : "text-red-500"}
              />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className={`text-3xl font-bold tabular-nums ${healthColorClass}`}>{overallHealth}%</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Health</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${healthBgClass}`} />
            <span className="text-xs text-muted-foreground">
              {overallHealth > 95 ? "Healthy" : overallHealth >= 80 ? "Degraded" : "Unhealthy"}
            </span>
          </div>
        </div>

        {/* Uptime bars + per-deployment health cards */}
        <div className="space-y-4">
          {/* 24h uptime bar chart */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Uptime (last 24h)</h3>
              <span className="text-[10px] text-muted-foreground/60">Hourly</span>
            </div>
            <div className="mt-2 flex items-end gap-0.5" style={{ height: 40 }}>
              {uptime24h.map((val, i) => {
                const barColor = val > 95 ? "bg-emerald-500" : val >= 80 ? "bg-amber-500" : val > 0 ? "bg-red-500" : "bg-muted-foreground/20";
                return (
                  <div
                    key={i}
                    className={`animate-health-bar-entrance flex-1 rounded-sm ${barColor} opacity-80`}
                    style={{
                      height: `${Math.max(val > 0 ? 10 : 2, val)}%`,
                      animationDelay: `${i * 30}ms`,
                    }}
                    title={`${i}:00 — ${val.toFixed(1)}% uptime`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/50">
              <span>24h ago</span>
              <span>now</span>
            </div>
          </div>

          {/* Per-deployment health cards */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {perDeployment.slice(0, 6).map((dep, i) => {
              const depHealthColor = dep.healthScore > 95 ? "emerald" : dep.healthScore >= 80 ? "amber" : "red";
              const depStatusColor = dep.status === "running" ? "bg-emerald-500" : dep.status === "failed" || dep.status === "dead" ? "bg-red-500" : "bg-zinc-400";
              return (
                <div
                  key={dep.id}
                  className="animate-timeline-entrance flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-brand/30"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className={`flex size-2.5 shrink-0 rounded-full ${depStatusColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium">{dep.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={depHealthColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : depHealthColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                        {dep.uptime > 0 ? `${dep.uptime}%` : "Down"}
                      </span>
                      {dep.responseTime != null && (
                        <span>{dep.responseTime}ms</span>
                      )}
                      <span>{timeAgoDate(dep.lastCheck)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgoDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

/* ---------- Quick Actions Widget (Feature 2) ---------- */

function QuickActions({
  hasDeployments,
  runningCount,
  onRefreshAll,
  onStopAll,
}: {
  hasDeployments: boolean;
  runningCount: number;
  onRefreshAll: () => Promise<void>;
  onStopAll: () => Promise<void>;
}) {
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function handleAction(key: string, fn: () => Promise<void>) {
    setBusyAction(key);
    try { await fn(); } finally { setBusyAction(null); }
  }

  const actions = [
    {
      key: "deploy-popular",
      icon: <Rocket className="size-4" />,
      label: "Deploy Popular App",
      desc: "Jump to the marketplace to deploy top apps",
      gradient: "from-emerald-500/10 to-teal-500/5",
      onClick: () => navigate({ name: "marketplace" }),
      busy: false,
    },
    {
      key: "view-apps",
      icon: <LayoutGrid className="size-4" />,
      label: "View All Apps",
      desc: "Browse the full application catalog",
      gradient: "from-teal-500/10 to-cyan-500/5",
      onClick: () => navigate({ name: "marketplace" }),
      busy: false,
    },
    {
      key: "refresh-all",
      icon: <RefreshCw className="size-4" />,
      label: "Refresh All",
      desc: runningCount > 0 ? `Restart ${runningCount} running deployment(s)` : "No running deployments",
      gradient: "from-emerald-500/10 to-green-500/5",
      onClick: () => handleAction("refresh-all", onRefreshAll),
      busy: busyAction === "refresh-all",
      disabled: runningCount === 0,
    },
    {
      key: "stop-all",
      icon: <Square className="size-4" />,
      label: "Stop All",
      desc: runningCount > 0 ? `Stop ${runningCount} running deployment(s)` : "No running deployments",
      gradient: "from-amber-500/10 to-orange-500/5",
      onClick: () => handleAction("stop-all", onStopAll),
      busy: busyAction === "stop-all",
      disabled: runningCount === 0,
    },
  ];

  // Show "Get Started" prominently if no deployments
  if (!hasDeployments) {
    return (
      <div className="mt-6">
        <div className="quick-action-card flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-card to-card p-5 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Rocket className="size-5" />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Get Started</h3>
            <p className="text-xs text-muted-foreground">Browse the marketplace and deploy your first app in one click.</p>
          </div>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate({ name: "marketplace" })}>
            <ArrowRight className="mr-1.5 size-3.5" /> Browse marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Zap className="size-4" /> Quick Actions
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            disabled={action.busy || action.disabled}
            className={`quick-action-card flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br ${action.gradient} p-4 text-left shadow-sm transition-all hover:border-brand/30 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand ${action.busy ? "animate-spin" : ""}`}>
              {action.busy ? <Loader2 className="size-4" /> : action.icon}
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-medium">{action.label}</span>
              <span className="block text-[11px] text-muted-foreground">{action.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Dashboard Activity Panel (sidebar for desktop) ---------- */

function DashboardActivityPanel({
  deployments,
  expanded,
  onToggleExpand,
}: {
  deployments: DeploymentItem[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  // Generate events from deployments, limit to 5 most recent
  const events = useMemo(() => {
    const allEvents: {
      id: string;
      appName: string;
      action: "deployed" | "started" | "stopped" | "restarted";
      dotColor: string;
      icon: React.ReactNode;
      description: string;
      time: string;
      iso: string;
    }[] = [];

    for (const d of deployments) {
      const appName = d.app?.name ?? "Unknown";
      const createdTime = new Date(d.createdAt).getTime();
      const updatedTime = new Date(d.updatedAt).getTime();

      // Deploy event (from createdAt)
      allEvents.push({
        id: `${d.id}-deploy`,
        appName,
        action: "deployed",
        dotColor: "bg-emerald-500",
        icon: <Rocket className="size-3" />,
        description: `Deployed ${appName}`,
        time: timeAgo(d.createdAt),
        iso: d.createdAt,
      });

      // If updatedAt differs from createdAt, add a status event
      if (Math.abs(updatedTime - createdTime) > 60000) {
        if (d.status === "running") {
          allEvents.push({
            id: `${d.id}-start`,
            appName,
            action: "started",
            dotColor: "bg-emerald-500",
            icon: <Play className="size-3" />,
            description: `Started ${appName}`,
            time: timeAgo(d.updatedAt),
            iso: d.updatedAt,
          });
        } else if (d.status === "stopped" || d.status === "exited") {
          allEvents.push({
            id: `${d.id}-stop`,
            appName,
            action: "stopped",
            dotColor: "bg-amber-500",
            icon: <Square className="size-3" />,
            description: `Stopped ${appName}`,
            time: timeAgo(d.updatedAt),
            iso: d.updatedAt,
          });
        }
      }
    }

    // Sort by time descending, take 5
    return allEvents
      .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
      .slice(0, expanded ? 10 : 5);
  }, [deployments, expanded]);

  const hasMore = events.length >= (expanded ? 10 : 5);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="size-4 text-brand" /> Activity
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground/50">Live</span>
      </div>
      <ol className="relative px-4 py-2">
        {events.map((event, i) => {
          const isLast = i === events.length - 1;
          return (
            <li
              key={event.id}
              className="animate-timeline-entrance relative"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border/40" />
              )}
              <div className="flex items-start gap-3 py-2">
                {/* Timeline dot */}
                <span className="relative mt-1 flex shrink-0">
                  <span className={`size-3.5 rounded-full border-2 border-background ${event.dotColor}`} />
                </span>
                {/* Event content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{event.description}</p>
                  <p className="text-[10px] text-muted-foreground/70">{event.time}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {hasMore && (
        <div className="border-t border-border/40 px-4 py-2 text-center">
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? "Show less" : "View all"}
            <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Enhanced Activity Timeline (Feature 3) ---------- */

function EnhancedActivityTimeline({
  deployments,
  expanded,
  onToggleExpand,
}: {
  deployments: DeploymentItem[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const sorted = useMemo(
    () =>
      [...deployments]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, expanded ? 12 : 6),
    [deployments, expanded],
  );

  // Generate more descriptive action types based on deployment data
  const timelineEntries = useMemo(() => {
    return sorted.map((d) => {
      const isActive = d.status === "running";
      const isFailed = d.status === "failed" || d.status === "dead";
      const isStopped = d.status === "stopped" || d.status === "exited";
      const isPending = d.status === "pending" || d.status === "creating";

      // Determine action type and color
      let actionType: "start" | "stop" | "restart" | "delete" | "info";
      let actionText: string;
      let dotColor: string;

      if (isActive) {
        // Check if recently created vs restarted
        const ageMs = Date.now() - new Date(d.createdAt).getTime();
        const updatedMs = Date.now() - new Date(d.updatedAt).getTime();
        if (updatedMs < 60000) {
          actionType = "start";
          actionText = "Deployment started";
        } else if (ageMs === updatedMs && updatedMs < 300000) {
          actionType = "start";
          actionText = "Container created and started";
        } else {
          actionType = "restart";
          actionText = "Container running";
        }
        dotColor = "bg-emerald-500";
      } else if (isStopped) {
        actionType = "stop";
        actionText = "Container stopped";
        dotColor = "bg-amber-500";
      } else if (isFailed) {
        actionType = "delete";
        actionText = "Container failed";
        dotColor = "bg-red-500";
      } else if (isPending) {
        actionType = "info";
        actionText = "Deployment pending";
        dotColor = "bg-blue-500";
      } else {
        actionType = "info";
        actionText = `Status: ${d.status}`;
        dotColor = "bg-zinc-400";
      }

      return { deployment: d, actionType, actionText, dotColor, isActive, isFailed, isStopped };
    });
  }, [sorted]);

  const hasMore = deployments.length > (expanded ? 12 : 6);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="size-4" /> Recent activity
        </h2>
        <span className="text-[11px] text-muted-foreground/60">Live · auto-refresh</span>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <ol className="relative">
          {timelineEntries.map((entry, i) => {
            const d = entry.deployment;
            const isLast = i === timelineEntries.length - 1;
            return (
              <li
                key={d.id}
                className="animate-timeline-entrance relative"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Connector line */}
                {!isLast && (
                  <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border/40" />
                )}
                <button
                  className="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  onClick={() => navigate({ name: "deployment", id: d.id })}
                >
                  {/* Color-coded timeline dot with connector */}
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center">
                    {entry.isActive && (
                      <span className="absolute inset-1 rounded-full bg-emerald-500/20 animate-health-ring" />
                    )}
                    <span className={`relative flex size-3 rounded-full ${entry.dotColor}`}>
                      {entry.isActive && (
                        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-status-pulse" />
                      )}
                    </span>
                  </span>
                  {/* App info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {d.app?.name ?? "Unknown app"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 gap-1 text-[10px] font-normal ${
                          entry.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : entry.isFailed
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {entry.actionText}
                      </Badge>
                      {d.label && (
                        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                          <Tag className="mr-0.5 size-2.5" /> {d.label}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                      <span className="font-mono">{d.subdomain}</span>
                      {d.volumeDataSize != null && d.volumeDataSize > 0 && (
                        <span>· {formatDataSize(d.volumeDataSize)} stored</span>
                      )}
                    </div>
                  </div>
                  {/* Timestamp with tooltip */}
                  <div className="shrink-0 text-right">
                    <span className="block text-xs text-muted-foreground" title={new Date(d.updatedAt).toLocaleString()}>
                      {timeAgo(d.updatedAt)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground/50">
                      {new Date(d.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
        {hasMore && (
          <div className="border-t border-border/40 px-4 py-2.5 text-center">
            <button
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? "Show less" : `View all activity (${deployments.length})`}
              <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Resource Usage Sparklines ---------- */

const SPARKLINE_POINTS = 20;

function ResourceUsageSparklines({ deployments }: { deployments: DeploymentItem[] }) {
  const runningDeployments = deployments.filter((d) => d.status === "running");
  const hasRunning = runningDeployments.length > 0;

  // Compute aggregate base metrics across all running deployments
  const aggMetrics = useMemo(() => {
    if (runningDeployments.length === 0) {
      return { cpu: 0, memory: 0, network: 0, disk: 0 };
    }
    let cpu = 0;
    let memory = 0;
    let network = 0;
    let disk = 0;
    for (const d of runningDeployments) {
      const containerId = d.containerId ?? d.id;
      const m = getContainerMetrics(containerId);
      cpu += m.cpuUsagePercent;
      memory += m.memoryUsagePercent;
      // Derive network/disk from other metrics for realism
      network += m.responseLatencyMs / 150 * 40 + 10; // ~10-50 range
      disk += m.healthScore * 0.3 + 5; // ~5-35 range
    }
    const n = runningDeployments.length;
    return {
      cpu: cpu / n,
      memory: memory / n,
      network: network / n,
      disk: disk / n,
    };
  }, [runningDeployments]);

  // Stable seed for initial series generation
  const seed = useMemo(
    () => `dash-${runningDeployments.map((d) => d.id).join(",")}`,
    [runningDeployments],
  );

  // Tick counter drives series evolution
  const [tick, setTick] = useState(0);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  // Compute full series from seed + tick (fully derived, no intermediate state)
  const series = useMemo(() => {
    const cpu = generateTimeSeries(aggMetrics.cpu, SPARKLINE_POINTS, 5, `${seed}:cpu`);
    const memory = generateTimeSeries(aggMetrics.memory, SPARKLINE_POINTS, 4, `${seed}:mem`);
    const network = generateTimeSeries(aggMetrics.network, SPARKLINE_POINTS, 6, `${seed}:net`);
    const disk = generateTimeSeries(aggMetrics.disk, SPARKLINE_POINTS, 4, `${seed}:disk`);
    // Apply tick-based evolution
    let c = cpu, m = memory, n = network, d = disk;
    for (let i = 0; i < tick; i++) {
      c = tickTimeSeries(c, aggMetrics.cpu, 5, i + 1);
      m = tickTimeSeries(m, aggMetrics.memory, 4, i + 1);
      n = tickTimeSeries(n, aggMetrics.network, 6, i + 1);
      d = tickTimeSeries(d, aggMetrics.disk, 4, i + 1);
    }
    return { cpu: c, memory: m, network: n, disk: d };
  }, [aggMetrics, seed, tick]);

  const color = hasRunning ? "#10b981" : "#a1a1aa";

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
      icon: <Cpu className="size-3.5" />,
      data: series.cpu,
      unit: "%",
    },
    {
      key: "memory",
      label: "Memory Usage",
      icon: <MemoryStick className="size-3.5" />,
      data: series.memory,
      unit: "%",
    },
    {
      key: "network",
      label: "Network I/O",
      icon: <Wifi className="size-3.5" />,
      data: series.network,
      unit: " MB/s",
      decimals: 1,
    },
    {
      key: "disk",
      label: "Disk I/O",
      icon: <HardDriveUpload className="size-3.5" />,
      data: series.disk,
      unit: " MB/s",
      decimals: 1,
    },
  ];

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Activity className="size-4" /> Resource usage
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {charts.map((c) => {
          const current = c.data[c.data.length - 1] ?? 0;
          const prev = c.data[c.data.length - 2] ?? current;
          const trendUp = current >= prev;
          const displayVal = c.decimals ? current.toFixed(c.decimals) : Math.round(current);
          return (
            <div
              key={c.key}
              className="flex flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-brand/30"
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
              <p className="mt-1 text-lg font-bold tabular-nums">
                {displayVal}{c.unit}
              </p>
              <Sparkline
                data={c.data}
                color={color}
                width={100}
                height={24}
                strokeWidth={1.5}
                showArea
                id={`dash-${c.key}`}
                className="mt-1 w-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Resource Usage Donut Charts ---------- */

function ResourceUsageDonuts({ deployments }: { deployments: DeploymentItem[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const runningCount = deployments.filter((d) => d.status === "running").length;
  const totalCount = deployments.length;

  // Simulated usage based on number of running deployments
  const cpuPercent = Math.min(95, Math.round(runningCount * 22 + (totalCount - runningCount) * 5 + seededRandom("donut-cpu") * 10));
  const memPercent = Math.min(95, Math.round(runningCount * 18 + (totalCount - runningCount) * 3 + seededRandom("donut-mem") * 12));
  const storagePercent = Math.min(90, Math.round(
    (deployments.reduce((acc, d) => acc + (d.volumeDataSize ?? 0), 0) / (1024 * 1024 * 10)) * 100 + seededRandom("donut-stor") * 5
  ));

  const donuts = [
    { label: "CPU", value: cpuPercent, icon: <Cpu className="size-4" /> },
    { label: "Memory", value: memPercent, icon: <MemoryStick className="size-4" /> },
    { label: "Storage", value: storagePercent, icon: <HardDrive className="size-4" /> },
  ];

  return (
    <div className="mt-6 animate-fade-in-up">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Activity className="size-4" /> Resource Usage
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-4">
        {donuts.map((d) => {
          const color = d.value > 85 ? "text-red-500" : d.value >= 60 ? "text-amber-500" : "text-emerald-500";
          const bgColor = d.value > 85 ? "bg-red-500" : d.value >= 60 ? "bg-amber-500" : "bg-emerald-500";
          const strokeColor = d.value > 85 ? "#ef4444" : d.value >= 60 ? "#f59e0b" : "#10b981";
          const r = 38;
          const circumference = 2 * Math.PI * r;
          const dashOffset = mounted ? circumference - (d.value / 100) * circumference : circumference;

          return (
            <div
              key={d.label}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand/30"
            >
              <div className="relative flex size-28 items-center justify-center">
                <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/30" />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                  />
                </svg>
                <div className="relative flex flex-col items-center">
                  <span className={`text-2xl font-bold tabular-nums ${color}`}>{d.value}%</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${bgColor}`} />
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  {d.icon} {d.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
