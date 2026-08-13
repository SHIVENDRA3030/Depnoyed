"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
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
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Share2,
  Link,
  Globe2,
  Plus,
  Trash2 as Trash2Icon,
  Save,
  Code2,
  Search,
  Download,
  ArrowDown,
} from "lucide-react";
import { api, navigate, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { statusColor, statusDot } from "@/components/marketplace/status";
import {
  calculateUptime,
  lastHealthCheck,
} from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export interface ContainerStats {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  memoryUsageBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  diskReadBytes: number;
  diskWriteBytes: number;
}

function statusBannerStyle(status: string): { bg: string; icon: React.ReactNode; text: string } {
  switch (status) {
    case "running":
      return {
        bg: "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)]",
        icon: <CheckCircle2 className="size-5 text-emerald-400" />,
        text: "This deployment is running and accessible.",
      };
    case "pending":
    case "creating":
      return {
        bg: "border-[rgba(255,106,0,0.25)] bg-[rgba(255,106,0,0.06)]",
        icon: <Loader2 className="size-5 animate-spin text-[#FF6A00]" />,
        text: "Deployment is being provisioned…",
      };
    case "failed":
    case "dead":
      return {
        bg: "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]",
        icon: <AlertCircle className="size-5 text-red-400" />,
        text: "Deployment failed. Try restarting or delete and re-deploy.",
      };
    case "stopped":
    case "exited":
      return {
        bg: "border-border bg-background/30",
        icon: <Square className="size-5 text-muted-foreground/60" />,
        text: "Deployment is stopped. Start it to make it accessible.",
      };
    default:
      return {
        bg: "border-border/80 bg-transparent",
        icon: <Circle className="size-5 text-muted-foreground/50" />,
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
  const [followLogs, setFollowLogs] = useState(true);
  const [logSearch, setLogSearch] = useState("");
  const [stats, setStats] = useState<ContainerStats | null>(null);

  const loadStats = useCallback(async () => {
    if (!dep || dep.status !== "running") return;
    try {
      const res = await api<{ stats: ContainerStats }>(`/api/deployments/${id}/stats`);
      if (res.stats) setStats(res.stats);
    } catch {
      // ignore
    }
  }, [id, dep]);

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
    loadStats();
    const t = setInterval(loadStats, 3000);
    return () => clearInterval(t);
  }, [loadStats]);

  useEffect(() => {
    if (followLogs && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, followLogs]);

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
        <div className="h-6 w-40 skeleton-shimmer rounded bg-muted" />
        <div className="mt-6 h-64 skeleton-shimmer rounded-2xl bg-muted" />
      </div>
    );
  }

  const running = dep.status === "running";
  const steps = computeSteps(dep.status);
  const banner = statusBannerStyle(dep.status);
  const containerId = dep.containerId ?? dep.id;
  const uptime = calculateUptime(dep.createdAt, dep.status);
  const healthCheckTime = lastHealthCheck(containerId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate({ name: "dashboard" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-xl flex items-center justify-center overflow-hidden border border-border bg-background">
            <AppLogo logo={dep.app?.logo ?? null} simulator={dep.app?.simulator ?? "static"} name={dep.app?.name ?? "App"} size="lg" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{dep.app?.name ?? "Deployment"}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border ${running ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-500" : "border-border bg-muted/50 text-muted-foreground"}`}>
                <span className={`size-1.5 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                {dep.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-mono text-xs">
                <Timer className="size-3.5" />
                {running ? `Uptime: ${uptimeSince(dep.createdAt)}` : `Down: ${timeAgo(dep.updatedAt)}`}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <a href={dep.previewPath} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 font-mono text-xs hover:underline"
                style={{color:"#FF6A00"}}>
                <Globe className="size-3.5" />{dep.subdomain}.apps.local
              </a>
            </div>
          </div>
        </div>
        
        {dep.realAppUrl && (
          <Button variant="outline"
            onClick={() => window.open(dep.realAppUrl as string, "_blank")}>
            <ExternalLink className="mr-2 size-4" /> Open App
          </Button>
        )}
      </div>

      {/* Main Area: Log Viewer */}
      <div className="mb-8">
        <TerminalLogViewer
          logs={logs}
          logRef={logRef}
          containerName={dep.containerName}
          followLogs={followLogs}
          setFollowLogs={setFollowLogs}
          logSearch={logSearch}
          setLogSearch={setLogSearch}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Runtime details */}
          <div className="rounded-xl p-5 bg-card border border-border">
              <h2 className="text-xs font-mono font-semibold tracking-[0.12em] uppercase mb-4 text-muted-foreground">Runtime Details</h2>
              <dl className="space-y-3 text-sm">
                <Detail icon={<Server className="size-3.5" />} label="Container" value={dep.containerName} mono copyable />
                <Detail icon={<Database className="size-3.5" />} label="Volume" value={dep.volumeName} mono copyable />
                <Detail icon={<Server className="size-3.5" />} label="Container ID" value={dep.containerId ?? "—"} mono />
                <Detail icon={<Cpu className="size-3.5" />} label="CPU limit" value="0.5 core" />
                <Detail icon={<MemoryStick className="size-3.5" />} label="Memory limit" value="512 MB" />
              </dl>
              <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border">
                <Badge variant="secondary" className="gap-1">
                  <Server className="size-3" /> {dep.app?.dockerImage ?? "unknown"}
                </Badge>
                <Badge variant="outline">port {dep.port ?? "—"}</Badge>
              </div>
            </div>
            
            {/* Health & Progress */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold mb-4">
                  <HeartPulse className="size-4 text-rose-500" /> Health Metrics
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={<Activity className="size-3.5" />} label="Uptime" value={running ? `${uptime}%` : "0%"} />
                  <MetricCard icon={<MemoryStick className="size-3.5" />} label="Memory" value={stats ? `${stats.memoryUsagePercent.toFixed(1)}%` : "N/A"} />
                  <MetricCard icon={<Cpu className="size-3.5" />} label="CPU" value={stats ? `${stats.cpuUsagePercent.toFixed(1)}%` : "N/A"} />
                  <MetricCard icon={<Zap className="size-3.5" />} label="Network" value={stats ? `${(stats.networkRxBytes / 1024 / 1024).toFixed(1)} MB` : "N/A"} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-4">Deployment Progress</h2>
                <div className="relative">
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
            </div>
          </div>

          <DeploymentPerformanceSparklines
            containerId={containerId}
            status={dep.status}
            stats={stats}
          />
          
          <StatusBadgeSection
            appName={dep.app?.name ?? "app"}
            status={dep.status}
            subdomain={dep.subdomain}
          />
          
          <SharingAccessSection dep={dep} />
        </TabsContent>

        {/* Environment Tab */}
        <TabsContent value="environment" className="space-y-6">
          <EnvVarsPanel dep={dep} />
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4 text-foreground">Actions</h2>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-4">
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => window.open(dep.previewPath, "_blank")}
                disabled={!running}
              >
                <ExternalLink className="mr-2 size-4" /> Open App
              </Button>
              {running ? (
                <Button variant="outline" onClick={() => act("stop")} disabled={busy} className="bg-background">
                  {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Square className="mr-2 size-4" />} Stop
                </Button>
              ) : (
                <Button variant="outline" onClick={() => act("start")} disabled={busy} className="bg-background">
                  {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />} Start
                </Button>
              )}
              <Button variant="outline" onClick={() => act("restart")} disabled={busy} className="bg-background">
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCw className="mr-2 size-4" />} Restart
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h2 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h2>
            <p className="text-sm text-destructive/80 mb-4">
              Deleting this deployment will permanently remove the container and all associated data in the persistent volume.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy}>
                  <Trash2 className="mr-2 size-4" /> Delete Deployment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the deployment, container, and all data within its persistent volume.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Terminal-Style Log Viewer ---------- */

function logLevelColor(message: string): string {
  const upper = message.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("ERR") || upper.includes("FATAL")) return "text-red-400";
  if (upper.includes("WARN") || upper.includes("WARNING")) return "text-amber-400";
  if (upper.includes("INFO")) return "text-cyan-400";
  if (upper.includes("DEBUG") || upper.includes("TRACE")) return "text-zinc-500";
  return "text-zinc-300";
}

function highlightLogLevel(message: string): React.ReactNode {
  // Split the message to highlight log level keywords with distinct colors
  const levelPattern = /\b(ERROR|ERR|FATAL|WARN|WARNING|INFO|DEBUG|TRACE)\b/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = levelPattern.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{message.slice(lastIndex, match.index)}</span>);
    }
    const word = match[1].toUpperCase();
    let color = "text-zinc-300";
    if (word === "ERROR" || word === "ERR" || word === "FATAL") color = "text-red-400 font-semibold";
    else if (word === "WARN" || word === "WARNING") color = "text-amber-400 font-semibold";
    else if (word === "INFO") color = "text-cyan-400";
    else if (word === "DEBUG" || word === "TRACE") color = "text-zinc-500";
    parts.push(<span key={key++} className={color}>{match[1]}</span>);
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < message.length) {
    parts.push(<span key={key++}>{message.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? <>{parts}</> : message;
}

function TerminalLogViewer({
  logs,
  logRef,
  containerName,
  followLogs,
  setFollowLogs,
  logSearch,
  setLogSearch,
}: {
  logs: LogLine[];
  logRef: React.RefObject<HTMLDivElement | null>;
  containerName: string;
  followLogs: boolean;
  setFollowLogs: (v: boolean) => void;
  logSearch: string;
  setLogSearch: (v: string) => void;
}) {
  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return logs;
    const q = logSearch.toLowerCase();
    return logs.filter((l) => l.message.toLowerCase().includes(q));
  }, [logs, logSearch]);

  function downloadLogs() {
    const text = logs.map((l) => `[${new Date(l.t).toISOString()}] ${l.stream === "stderr" ? "ERR" : "OUT"} ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${containerName}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dark flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Terminal header bar */}
      <div className="terminal-header flex items-center gap-3 rounded-t-2xl px-4 py-2.5">
        {/* 3 colored dots */}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-500/80" />
          <span className="size-3 rounded-full bg-amber-400/80" />
          <span className="size-3 rounded-full bg-emerald-500/80" />
        </span>
        <span className="flex-1 text-center font-mono text-[11px] text-zinc-400">
          {containerName}
        </span>
        <span className="text-[10px] tabular-nums text-zinc-500">
          {filteredLogs.length}{logSearch ? ` / ${logs.length}` : ""} lines
        </span>
      </div>

      {/* Toolbar: search, follow toggle, download */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Filter logs…"
            className="log-search-input w-full rounded-md py-1 pl-6 pr-2 font-mono text-[11px]"
          />
        </div>
        <button
          onClick={() => setFollowLogs(!followLogs)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
            followLogs
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
          }`}
          title={followLogs ? "Following logs (auto-scroll)" : "Auto-scroll paused"}
        >
          <ArrowDown className={`size-3 ${followLogs ? "animate-pulse" : ""}`} />
          Follow
        </button>
        <button
          onClick={downloadLogs}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
          title="Download logs"
        >
          <Download className="size-3" />
        </button>
      </div>

      {/* Log area — true black terminal */}
      <div
        ref={logRef}
        className="scroll-thin h-72 overflow-y-auto bg-black p-3 font-mono text-[11px] leading-relaxed shadow-inner-terminal"
      >
        {filteredLogs.length === 0 ? (
          <p className="text-zinc-600">{logSearch ? "No matching logs." : "No logs yet."}</p>
        ) : (
          filteredLogs.map((l, i) => (
            <div key={i} className="log-line flex gap-3 rounded-sm px-0.5 transition-colors duration-100">
              <span className="shrink-0 w-7 text-right text-zinc-700 select-none">{i + 1}</span>
              <span className="shrink-0 text-zinc-600">{new Date(l.t).toLocaleTimeString()}</span>
              <span className={l.stream === "stderr" ? "text-red-400" : logLevelColor(l.message)}>
                {highlightLogLevel(l.message)}
              </span>
            </div>
          ))
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
  stats,
}: {
  containerId: string;
  status: string;
  stats: ContainerStats | null;
}) {
  const running = status === "running";
  const color = sparklineColor(status);

  // Maintain rolling windows of stats for the sparklines
  const [series, setSeries] = useState({
    cpu: Array(DEPLOY_SPARKLINE_POINTS).fill(0),
    memory: Array(DEPLOY_SPARKLINE_POINTS).fill(0),
    network: Array(DEPLOY_SPARKLINE_POINTS).fill(0),
    disk: Array(DEPLOY_SPARKLINE_POINTS).fill(0),
  });

  // Track previous network/disk bytes to calculate MB/s (delta)
  const [prevStats, setPrevStats] = useState<{ rx: number; tx: number; dr: number; dw: number; t: number } | null>(null);

  useEffect(() => {
    if (!stats || !running) return;

    const now = Date.now();
    let netDelta = 0;
    let diskDelta = 0;

    if (prevStats) {
      const timeSec = (now - prevStats.t) / 1000;
      if (timeSec > 0) {
        // Bytes per second converted to MB/s
        netDelta = ((stats.networkRxBytes + stats.networkTxBytes) - (prevStats.rx + prevStats.tx)) / (1024 * 1024) / timeSec;
        diskDelta = ((stats.diskReadBytes + stats.diskWriteBytes) - (prevStats.dr + prevStats.dw)) / (1024 * 1024) / timeSec;
      }
    }

    setPrevStats({
      rx: stats.networkRxBytes,
      tx: stats.networkTxBytes,
      dr: stats.diskReadBytes,
      dw: stats.diskWriteBytes,
      t: now
    });

    // Handle initial state spikes (negative or absurd values)
    const safeNet = Math.max(0, netDelta);
    const safeDisk = Math.max(0, diskDelta);

    setSeries(prev => ({
      cpu: [...prev.cpu.slice(1), stats.cpuUsagePercent || 0],
      memory: [...prev.memory.slice(1), stats.memoryUsagePercent || 0],
      network: [...prev.network.slice(1), safeNet],
      disk: [...prev.disk.slice(1), safeDisk],
    }));
  }, [stats, running]);

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
      {running && !stats && (
        <div className="mt-4 text-center text-muted-foreground py-8">
          <p className="font-medium">Metrics unavailable</p>
          <p className="text-sm mt-1">Metrics server not installed or pod not yet reporting.</p>
        </div>
      )}
      {stats && (
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
      )}
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

/* ---------- Environment Variables Management Panel ---------- */

function maskValue(value: string): string {
  if (value.length <= 2) return "****";
  return value.slice(0, 2) + "****";
}

function EnvVarsPanel({ dep }: { dep: DeploymentItem }) {
  // Parse envVars from the deployment
  const vars = useMemo(() => {
    if (!dep.envVars || typeof dep.envVars !== "object") return {} as Record<string, string>;
    return dep.envVars;
  }, [dep.envVars]);

  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const varEntries = Object.entries(vars);
  const varCount = varEntries.length;

  function toggleReveal(key: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Variable className="size-4 text-brand" /> Environment Variables
          {varCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 gap-1 text-[10px]">
              {varCount} variable{varCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </h2>
      </div>

      {varCount === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
          <Variable className="mx-auto size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            No environment variables configured
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This deployment was created without any custom environment variables.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Key</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {varEntries.map(([key, value]) => (
                <tr key={key} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Lock className="size-3 text-muted-foreground" />
                      <span className="font-mono text-xs font-semibold">{key}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {revealedKeys.has(key) ? value : maskValue(value)}
                      </span>
                      <button
                        onClick={() => toggleReveal(key)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={revealedKeys.has(key) ? "Hide value" : "Reveal value"}
                      >
                        {revealedKeys.has(key) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Sharing & Access Section ---------- */

const MOCK_ACCESS_LOG = [
  { ip: "192.168.1.42", time: "3:42 PM", method: "GET", path: "/" },
  { ip: "10.0.0.15", time: "3:38 PM", method: "GET", path: "/api/health" },
  { ip: "172.16.0.8", time: "3:21 PM", method: "POST", path: "/api/data" },
  { ip: "192.168.1.42", time: "2:54 PM", method: "GET", path: "/" },
  { ip: "10.0.0.3", time: "2:12 PM", method: "GET", path: "/assets/style.css" },
];

function SharingAccessSection({ dep }: { dep: DeploymentItem }) {
  const publicUrl = `https://${dep.subdomain}.apps.local`;
  const visibilityKey = `oss-deploy-visibility-${dep.id}`;
  const [isPublic, setIsPublic] = useLocalStorage<"public" | "private">(visibilityKey, "private");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  function copyUrl() {
    navigator.clipboard?.writeText(publicUrl);
    setCopiedUrl(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopiedUrl(false), 1500);
  }

  function shareLink() {
    navigator.clipboard?.writeText(publicUrl);
    toast.success("Share link copied to clipboard");
  }

  function copyEmbedCode() {
    const embed = `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" title="${dep.app?.name ?? "Deployment"}"></iframe>`;
    navigator.clipboard?.writeText(embed);
    setCopiedEmbed(true);
    toast.success("Embed code copied to clipboard");
    setTimeout(() => setCopiedEmbed(false), 1500);
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Share2 className="size-4" /> Sharing &amp; Access
      </h2>

      {/* Public URL */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
        <Globe2 className="size-4 shrink-0 text-brand" />
        <code className="flex-1 truncate font-mono text-xs text-foreground/80">{publicUrl}</code>
        <button
          onClick={copyUrl}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Copy URL"
        >
          {copiedUrl ? <CheckCheck className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
        </button>
      </div>

      {/* Visibility toggle */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 p-3">
        <div className="flex items-center gap-3">
          {isPublic === "public" ? (
            <Globe2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Lock className="size-4 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isPublic === "public" ? "Public" : "Private"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPublic === "public"
                ? "Anyone with the link can access this deployment"
                : "This deployment is only accessible to you"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {isPublic === "public" ? "Public" : "Private"}
          </span>
          <Switch
            checked={isPublic === "public"}
            onCheckedChange={(checked) => setIsPublic(checked ? "public" : "private")}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={shareLink} className="gap-1.5">
          <Link className="size-3.5" /> Share link
        </Button>
        <Button size="sm" variant="outline" onClick={copyEmbedCode} className="gap-1.5">
          <Code2 className="size-3.5" /> Copy embed code
        </Button>
      </div>

      {/* Embed code preview */}
      {copiedEmbed && (
        <div className="mt-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <code className="block truncate font-mono text-[11px] text-muted-foreground">
            {`<iframe src="${publicUrl}" width="100%" height="600" ...></iframe>`}
          </code>
        </div>
      )}

      {/* Access log */}
      <div className="mt-5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="size-3.5" /> Recent access log
        </h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-xs">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="px-3 py-1.5 text-left font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                <th className="px-3 py-1.5 text-left font-medium uppercase tracking-wider text-muted-foreground">Path</th>
                <th className="px-3 py-1.5 text-right font-medium uppercase tracking-wider text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ACCESS_LOG.map((entry, i) => (
                <tr key={i} className="border-b border-border/30 last:border-b-0">
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{entry.ip}</td>
                  <td className="px-3 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${
                        entry.method === "GET"
                          ? "border-emerald-600/30 text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-400"
                          : "border-amber-600/30 text-amber-600 dark:border-amber-400/30 dark:text-amber-400"
                      }`}
                    >
                      {entry.method}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-foreground/70">{entry.path}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{entry.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
