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
  Timer,
  Cpu,
  MemoryStick,
  Search,
  X,
  Rocket,
  Boxes,
  Activity,
} from "lucide-react";
import { api, navigate, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { calculateUptime, getContainerMetrics } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function DeploymentsListView() {
  const [deployments, setDeployments] = useState<DeploymentItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Deployments
          </h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all your deployed applications.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-foreground text-background hover:bg-foreground/90" onClick={() => navigate({ name: "marketplace" })}>
            <Plus className="mr-2 size-4" /> Deploy Application
          </Button>
        </div>
      </div>

      {/* Search & filter bar */}
      {deployments && deployments.length > 0 && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
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

      {/* Deployment list */}
      <div>
        {deployments === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
            <Container className="size-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No deployments</h3>
            <p className="mt-2 text-sm text-muted-foreground">You haven't deployed any applications yet.</p>
            <Button className="mt-6" onClick={() => navigate({ name: "marketplace" })}>
              <Rocket className="mr-2 size-4" /> Browse marketplace
            </Button>
          </div>
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
                onStart={() => act(d.id, "start")}
                onStop={() => act(d.id, "stop")}
                onRestart={() => act(d.id, "restart")}
                onDelete={() => remove(d.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeploymentRow({
  d,
  busy,
  onStart,
  onStop,
  onRestart,
  onDelete,
}: {
  d: DeploymentItem;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDelete: () => void;
}) {
  const running = d.status === "running";
  const containerId = d.containerId ?? d.id;
  const metrics = getContainerMetrics(containerId);

  return (
    <div className={`group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-brand/50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className="flex min-w-0 flex-1 items-center gap-4 text-left cursor-pointer"
          onClick={() => navigate({ name: "deployment", id: d.id })}
        >
          <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
            <AppLogo logo={d.app?.logo ?? null} simulator={d.app?.simulator ?? "static"} name={d.app?.name ?? "App"} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-sm">{d.app?.name ?? "Unknown app"}</h3>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                running ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" :
                d.status === "pending" ? "border-amber-500/20 bg-amber-500/10 text-amber-500" :
                d.status === "failed" ? "border-red-500/20 bg-red-500/10 text-red-500" :
                "border-zinc-500/20 bg-zinc-500/10 text-zinc-500"
              }`}>
                {running && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {!running && <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  d.status === "pending" ? "bg-amber-500" : d.status === "failed" ? "bg-red-500" : "bg-zinc-500"
                }`} />}
                {d.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <a
                href={d.previewPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-foreground hover:text-brand hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" /> {d.subdomain}.apps.local
              </a>
              
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" /> {running ? `Active` : "Offline"}
              </span>
              
              <span className="inline-flex items-center gap-1">
                <Cpu className="h-3 w-3" /> {metrics.cpuUsagePercent}%
              </span>
              
              <span className="inline-flex items-center gap-1">
                <MemoryStick className="h-3 w-3" /> {metrics.memoryUsagePercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 bg-background"
          onClick={() => window.open(d.previewPath, "_blank")}
          disabled={!running}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </Button>
        {running ? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-background" onClick={onStop} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />} Stop
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-background" onClick={onStart} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Start
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-background" onClick={onRestart} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-background border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" />
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
