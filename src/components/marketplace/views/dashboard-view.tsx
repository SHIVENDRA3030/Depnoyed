"use client";

import { useCallback, useEffect, useState } from "react";
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

export function DashboardView() {
  const [deployments, setDeployments] = useState<DeploymentItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    // Poll for status updates every few seconds so the dashboard stays in sync
    // with the runtime (e.g. while a deployment is starting/stopping).
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

      <div className="mt-6">
        {deployments === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
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
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between">
      <button
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
        onClick={() => navigate({ name: "deployment", id: d.id })}
      >
        <AppLogo logo={d.app?.logo ?? null} simulator={d.app?.simulator ?? "static"} name={d.app?.name ?? "App"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{d.app?.name ?? "Unknown app"}</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(d.status)}`}>
              <span className={`size-1.5 rounded-full ${statusDot(d.status)}`} />
              {d.status}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-mono">
              <ExternalLink className="size-3" /> {d.subdomain}.apps.local
            </span>
            <span className="inline-flex items-center gap-1">
              <Container className="size-3" /> {d.containerName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {timeAgo(d.createdAt)}
            </span>
          </div>
        </div>
      </button>

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
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={busy}>
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
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Container className="size-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No deployments yet</h3>
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

export { Badge };
