"use client";

import { useEffect, useState } from "react";
import { Rocket, Search, Boxes, Container, Database, Globe, ArrowRight, Loader2, Sparkles, Zap } from "lucide-react";
import { api, navigate, useAuth, type AppItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function MarketplaceView() {
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");

  useEffect(() => {
    (async () => {
      try {
        const { apps } = await api<{ apps: AppItem[] }>("/api/apps");
        setApps(apps);
      } catch {
        toast.error("Failed to load catalog");
        setApps([]);
      }
    })();
  }, []);

  const categories = ["All", ...Array.from(new Set((apps ?? []).map((a) => a.category)))];
  const filtered = (apps ?? []).filter((a) => {
    const matchesCat = activeCat === "All" || a.category === activeCat;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/80">
        <div className="absolute inset-0 -z-20 hero-gradient" />
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-3" /> Deploy in one click
            </span>
            <h1 className="animate-fade-in-up mt-5 text-4xl font-bold tracking-tight sm:text-5xl [animation-delay:100ms]">
              The open-source app marketplace
            </h1>
            <p className="animate-fade-in-up mt-4 text-lg text-muted-foreground [animation-delay:200ms]">
              Spin up your own isolated instance of open-source applications. Each deployment gets a
              dedicated container, persistent storage, and a unique public URL.
            </p>
            <div className="animate-fade-in-up mt-8 grid grid-cols-3 gap-3 [animation-delay:300ms]">
              <StatCard icon={<Container className="size-5" />} label="Isolated containers" desc="Per deployment" />
              <StatCard icon={<Database className="size-5" />} label="Persistent volumes" desc="Data survives restarts" />
              <StatCard icon={<Globe className="size-5" />} label="Unique public URLs" desc="Instant access" />
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Browse applications</h2>
            <p className="text-sm text-muted-foreground">Pick an app and deploy your own instance.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeCat === cat
                  ? "border-brand bg-brand-soft text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps === null ? (
            Array.from({ length: 3 }).map((_, i) => <AppCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Boxes className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No applications match your search.</p>
            </div>
          ) : (
            filtered.map((app) => <AppCard key={app.id} app={app} />)
          )}
        </div>
      </section>
    </div>
  );
}

function AppCard({ app }: { app: AppItem }) {
  const user = useAuth((s) => s.user);
  const [deploying, setDeploying] = useState(false);

  async function handleDeploy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setDeploying(true);
    try {
      const { deployment } = await api<{ deployment: { id: string } }>("/api/deployments", {
        method: "POST",
        body: JSON.stringify({ appId: app.id }),
      });
      toast.success("Deployed! Redirecting…");
      navigate({ name: "deployment", id: deployment.id });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Deploy failed");
      setDeploying(false);
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      {/* Gradient border overlay on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, oklch(0.696 0.17 162.48 / 0.15), oklch(0.696 0.17 162.48 / 0.05))", padding: "1px", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" } as React.CSSProperties} />
      <button
        onClick={() => navigate({ name: "app", slug: app.slug })}
        className="relative z-10 flex flex-1 flex-col"
      >
        <div className="flex items-start justify-between">
          <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
          <div className="flex items-center gap-1.5">
            {app.deploymentCount > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Zap className="size-3 text-brand" /> {app.deploymentCount}
              </Badge>
            )}
            <Badge variant="secondary" className="font-normal">{app.category}</Badge>
          </div>
        </div>
        <h3 className="mt-4 text-base font-semibold">{app.name}</h3>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{app.description}</p>
      </button>
      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="font-mono text-[11px] text-muted-foreground">{app.dockerImage}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-50"
          >
            {deploying ? <Loader2 className="size-3 animate-spin" /> : null}
            Deploy <ArrowRight className="size-3" />
          </button>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-transform group-hover:translate-x-0.5">
            Details <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-4 backdrop-blur-sm">
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1">
      {icon} {label}
    </span>
  );
}

function AppCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col rounded-2xl border border-border bg-card p-5">
      <div className="size-14 rounded-xl bg-muted" />
      <div className="mt-4 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-2 h-3 w-full rounded bg-muted" />
      <div className="mt-1.5 h-3 w-2/3 rounded bg-muted" />
    </div>
  );
}

export { Loader2, Rocket };
