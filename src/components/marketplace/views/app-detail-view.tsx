"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Rocket,
  Loader2,
  Container,
  Database,
  Cpu,
  MemoryStick,
  Globe,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { api, navigate, useAuth, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function AppDetailView({ slug }: { slug: string }) {
  const [app, setApp] = useState<AppItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    (async () => {
      try {
        const { app } = await api<{ app: AppItem }>(`/api/apps/${encodeURIComponent(slug)}`);
        setApp(app);
      } catch (e) {
        setNotFound(true);
      }
    })();
  }, [slug]);

  async function deploy() {
    if (!app) return;
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setDeploying(true);
    try {
      const { deployment } = await api<{ deployment: DeploymentItem }>("/api/deployments", {
        method: "POST",
        body: JSON.stringify({ appId: app.id }),
      });
      toast.success("Deployment created");
      navigate({ name: "deployment", id: deployment.id });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Deployment failed";
      toast.error(message);
    } finally {
      setDeploying(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Application not found</h1>
        <Button className="mt-6" variant="outline" onClick={() => navigate({ name: "marketplace" })}>
          <ArrowLeft className="mr-2 size-4" /> Back to marketplace
        </Button>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-48 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate({ name: "marketplace" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Marketplace
      </button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-50 via-card to-card p-6 shadow-sm dark:from-emerald-950/30">
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                <Badge variant="secondary">{app.category}</Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{app.description}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{app.dockerImage}</p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={deploy}
            disabled={deploying}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {deploying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Rocket className="mr-2 size-4" />}
            {deploying ? "Deploying…" : "Deploy"}
          </Button>
        </div>
      </div>

      {/* What you get */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">What you get</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            <Row icon={<Container className="size-4 text-brand" />} title="Isolated container" desc={`${app.dockerImage} · port ${app.containerPort}`} />
            <Row icon={<Database className="size-4 text-brand" />} title="Persistent volume" desc="Data survives stop / restart" />
            <Row icon={<Globe className="size-4 text-brand" />} title="Unique public URL" desc="<subdomain>.apps.local" />
            <Row icon={<ShieldCheck className="size-4 text-brand" />} title="Tenant isolation" desc="Only you can access it" />
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Resource limits</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Configured server-side so one tenant can't exhaust the host.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric icon={<Cpu className="size-4" />} label="CPU" value="0.5 core" />
            <Metric icon={<MemoryStick className="size-4" />} label="Memory" value="512 MB" />
          </div>
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" /> Ready to deploy
            </p>
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
              {user ? "Click Deploy to launch your instance." : "Sign in first, then deploy in one click."}
            </p>
          </div>
        </div>
      </div>

      {!user && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-5 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Sign in to deploy this app</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Free account — no credit card required.</p>
          </div>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate({ name: "login" })}>
            Sign in <ExternalLink className="ml-2 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </li>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
