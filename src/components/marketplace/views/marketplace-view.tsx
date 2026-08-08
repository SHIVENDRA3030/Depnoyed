"use client";

import { useEffect, useMemo, useState } from "react";
import { Rocket, Search, Boxes, Container, Database, Globe, ArrowRight, Loader2, Sparkles, Zap, Flame, Star, TrendingUp, FlaskConical, Globe2, Wrench, FileText } from "lucide-react";
import { api, navigate, useAuth, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { DeployModal } from "@/components/marketplace/deploy-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type SortMode = "popular" | "newest" | "alpha";

export function MarketplaceView() {
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [sort, setSort] = useState<SortMode>("popular");

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
  const filtered = useMemo(() => {
    const base = (apps ?? []).filter((a) => {
      const matchesCat = activeCat === "All" || a.category === activeCat;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
    const sorted = [...base];
    if (sort === "popular") {
      sorted.sort((a, b) => b.deploymentCount - a.deploymentCount);
    } else if (sort === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "alpha") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [apps, activeCat, query, sort]);

  // Featured apps: top 3 by deployment count (only when no search active)
  const featured = useMemo(() => {
    if (query || activeCat !== "All") return [];
    return [...(apps ?? [])].sort((a, b) => b.deploymentCount - a.deploymentCount).slice(0, 3);
  }, [apps, query, activeCat]);

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
            <div className="animate-fade-in-up mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 [animation-delay:300ms]">
              <StatCard icon={<Container className="size-5" />} label="Isolated containers" desc="Per deployment" />
              <StatCard icon={<Database className="size-5" />} label="Persistent volumes" desc="Data survives restarts" />
              <StatCard icon={<Globe className="size-5" />} label="Unique public URLs" desc="Instant access" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured apps */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Trending now</h2>
            <Badge variant="secondary" className="ml-1 gap-1 font-normal">
              <TrendingUp className="size-3" /> Most deployed
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The most popular apps in the marketplace, ranked by deployments.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {featured.map((app, i) => (
              <FeaturedAppCard key={app.id} app={app} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Browse applications</h2>
            <p className="text-sm text-muted-foreground">Pick an app and deploy your own instance.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps…"
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="w-full sm:w-44" size="sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most deployed</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="alpha">A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeCat === cat
                  ? "border-brand bg-brand-soft text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <CategoryIcon category={cat} />
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

function FeaturedAppCard({ app, rank }: { app: AppItem; rank: number }) {
  const user = useAuth((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);

  function handleDeploy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setModalOpen(true);
  }

  const rankColor =
    rank === 1
      ? "from-amber-400 to-orange-500 text-white"
      : rank === 2
      ? "from-zinc-300 to-zinc-400 text-zinc-900"
      : "from-orange-700 to-amber-800 text-white";

  return (
    <div
      onClick={() => navigate({ name: "app", slug: app.slug })}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft/40 via-card to-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
            <span className={`absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gradient-to-br ${rankColor} text-[10px] font-bold shadow-sm`}>
              {rank}
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight">{app.name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{app.category}</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1 font-normal">
          <Zap className="size-3 text-orange-500" /> {app.deploymentCount}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{app.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="font-mono text-[11px] text-muted-foreground">{app.dockerImage}</span>
        <button
          onClick={handleDeploy}
          className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
        >
          <Star className="size-3" />
          Deploy
        </button>
      </div>
      <DeployModal app={app} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function AppCard({ app }: { app: AppItem }) {
  const user = useAuth((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);

  function handleDeploy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setModalOpen(true);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm card-hover-tilt">
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
            className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
          >
            Deploy <ArrowRight className="size-3" />
          </button>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-transform group-hover:translate-x-0.5">
            Details <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
      <DeployModal app={app} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function StatCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-5 text-center backdrop-blur-sm transition-colors hover:border-brand/40 hover:bg-brand-soft/30">
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
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="size-14 rounded-xl shimmer" />
      <div className="mt-4 h-4 w-1/2 rounded shimmer" />
      <div className="mt-2 h-3 w-full rounded shimmer" />
      <div className="mt-1.5 h-3 w-2/3 rounded shimmer" />
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const props = { className: "size-3" };
  switch (category) {
    case "Demo":
      return <FlaskConical {...props} />;
    case "Web":
      return <Globe2 {...props} />;
    case "DevOps":
      return <Wrench {...props} />;
    case "Productivity":
      return <FileText {...props} />;
    case "All":
      return <Boxes {...props} />;
    default:
      return null;
  }
}

export { Loader2, Rocket };
