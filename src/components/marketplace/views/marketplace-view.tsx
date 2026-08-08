"use client";

import { useEffect, useMemo, useState } from "react";
import { Rocket, Search, Boxes, Container, Database, Globe, ArrowRight, Loader2, Sparkles, Zap, Flame, Star, TrendingUp, FlaskConical, Globe2, Wrench, FileText, Heart, Download, Clock, GitCompare } from "lucide-react";
import { api, navigate, useAuth, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { useCompare } from "@/lib/compare-store";
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
  const user = useAuth((s) => s.user);

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

  const totalDeploys = useMemo(() => (apps ?? []).reduce((sum, a) => sum + a.deploymentCount, 0), [apps]);

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/80">
        <div className="absolute inset-0 -z-20 hero-gradient mesh-gradient" />
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
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
            {/* Quick stats row */}
            {apps && apps.length > 0 && (
              <div className="animate-fade-in-up mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground [animation-delay:400ms]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1">
                  <Boxes className="size-3.5 text-brand" /> {apps.length} apps available
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1">
                  <Download className="size-3.5 text-brand" /> {totalDeploys} total deployments
                </span>
              </div>
            )}
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
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeCat === cat
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:border-border/80"
              }`}
            >
              <CategoryIcon category={cat} />
              {cat}
              {cat !== "All" && (
                <span className="ml-0.5 text-[10px] text-muted-foreground/70">
                  {(apps ?? []).filter(a => a.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps === null ? (
            Array.from({ length: 6 }).map((_, i) => <AppCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Boxes className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No applications match your search.</p>
              {query && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              )}
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
    e.preventDefault();
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

  const rankGlow =
    rank === 1
      ? "shadow-amber-500/20"
      : rank === 2
      ? "shadow-zinc-400/20"
      : "shadow-orange-500/20";

  return (
    <div
      onClick={() => navigate({ name: "app", slug: app.slug })}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/60 via-card to-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg dark:from-emerald-950/20 ${rankGlow}`}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-emerald-500/5 blur-2xl transition-opacity group-hover:opacity-100" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
            <span className={`absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gradient-to-br ${rankColor} text-[10px] font-bold shadow-sm ring-2 ring-background`}>
              {rank}
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight">{app.name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{app.category}</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1 font-normal shadow-sm">
          <Zap className="size-3 text-orange-500" /> {app.deploymentCount}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{app.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="font-mono text-[11px] text-muted-foreground/80">{app.dockerImage}</span>
        <button
          onClick={handleDeploy}
          className="relative z-20 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
        >
          <Rocket className="size-3" />
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
  const inCompare = useCompare((s) => s.has(app.slug));
  const toggleCompare = useCompare((s) => s.toggle);
  const compareCount = useCompare((s) => s.slugs.length);
  const [fav, setFav] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return JSON.parse(localStorage.getItem("oss-favorites") || "[]").includes(app.slug);
    } catch { return false; }
  });

  function handleDeploy(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setModalOpen(true);
  }

  function toggleFav(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      const favs: string[] = JSON.parse(localStorage.getItem("oss-favorites") || "[]");
      const next = favs.includes(app.slug) ? favs.filter(f => f !== app.slug) : [...favs, app.slug];
      localStorage.setItem("oss-favorites", JSON.stringify(next));
      setFav(!fav);
    } catch {}
  }

  return (
    <div
      onClick={() => navigate({ name: "app", slug: app.slug })}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-teal-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
          <div className="flex items-center gap-1.5">
            {app.deploymentCount > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Zap className="size-3 text-emerald-500" /> {app.deploymentCount}
              </Badge>
            )}
            <Badge variant="secondary" className="font-normal">{app.category}</Badge>
          </div>
        </div>
        <h3 className="mt-4 text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{app.name}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{app.description}</p>
      </div>

      {/* Footer */}
      <div className="relative z-20 flex items-center justify-between border-t border-border/40 bg-muted/20 px-5 py-3">
        <span className="font-mono text-[11px] text-muted-foreground/70">{app.dockerImage}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFav}
            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-rose-500"
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`size-3.5 transition-colors ${fav ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleCompare(app.slug); if (!inCompare && compareCount >= 3) toast.info("Compare tray full (max 3)"); }}
            className={`inline-flex items-center justify-center rounded-md p-1 transition-colors ${inCompare ? "text-brand bg-brand-soft" : "text-muted-foreground/60 hover:bg-muted hover:text-brand"}`}
            aria-label={inCompare ? "Remove from compare" : "Add to compare"}
            title={inCompare ? "Remove from compare" : "Add to compare"}
          >
            <GitCompare className="size-3.5" />
          </button>
          <button
            onClick={handleDeploy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:bg-emerald-500/20 hover:shadow-sm dark:text-emerald-400"
          >
            <Rocket className="size-3" /> Deploy
          </button>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground">
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
    <div className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-50/30 hover:shadow-sm dark:hover:bg-emerald-950/10">
      <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500/20 dark:text-emerald-400">
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-0">
      <div className="h-1 w-full shimmer" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div className="size-14 rounded-xl shimmer" />
          <div className="h-5 w-16 rounded-full shimmer" />
        </div>
        <div className="mt-4 h-4 w-1/2 rounded shimmer" />
        <div className="mt-2 h-3 w-full rounded shimmer" />
        <div className="mt-1.5 h-3 w-3/4 rounded shimmer" />
      </div>
      <div className="h-10 shimmer" />
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
    case "Database":
      return <Database {...props} />;
    case "Monitoring":
      return <TrendingUp {...props} />;
    case "All":
      return <Boxes {...props} />;
    default:
      return null;
  }
}

export { Loader2, Rocket };
