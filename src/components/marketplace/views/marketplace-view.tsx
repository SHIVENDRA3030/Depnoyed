"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rocket, Search, Boxes, Container, Database, Globe, ArrowRight, Loader2, Sparkles, Zap, Flame, Star, TrendingUp, FlaskConical, Globe2, Wrench, FileText, Heart, Download, Clock, GitCompare, X, History } from "lucide-react";
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

type SortMode = "popular" | "newest" | "alpha" | "favorites";

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("oss-favorites") || "[]"); } catch { return []; }
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("oss-recent-searches") || "[]"); } catch { return []; }
}

function addRecentSearch(q: string) {
  if (!q.trim()) return;
  try {
    const existing = getRecentSearches().filter(s => s !== q);
    const next = [q, ...existing].slice(0, 5);
    localStorage.setItem("oss-recent-searches", JSON.stringify(next));
  } catch {}
}

function clearRecentSearches() {
  try { localStorage.removeItem("oss-recent-searches"); } catch {}
}

export function MarketplaceView() {
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [sort, setSort] = useState<SortMode>("popular");
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favVersion, setFavVersion] = useState(0); // bump to re-derive favorites
  const searchRef = useRef<HTMLInputElement>(null);
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

  // Recent searches (refreshed on query change via handleSearch)
  const refreshRecent = useCallback(() => setRecentSearches(getRecentSearches()), []);

  const categories = useMemo(() => {
    const cats = ["All", ...Array.from(new Set((apps ?? []).map((a) => a.category)))];
    const favs = getFavorites();
    if (favs.length > 0) cats.push("Favorites");
    return cats;
  }, [apps, favVersion]);

  const filtered = useMemo(() => {
    const favs = getFavorites();
    const base = (apps ?? []).filter((a) => {
      const matchesCat = activeCat === "All" || (activeCat === "Favorites" && favs.includes(a.slug)) || a.category === activeCat;
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
    } else if (sort === "favorites") {
      sorted.sort((a, b) => (favs.includes(b.slug) ? 1 : 0) - (favs.includes(a.slug) ? 1 : 0));
    }
    return sorted;
  }, [apps, activeCat, query, sort, favVersion]);

  // Featured apps: top 3 by deployment count (only when no search active)
  const featured = useMemo(() => {
    if (query || activeCat !== "All") return [];
    return [...(apps ?? [])].sort((a, b) => b.deploymentCount - a.deploymentCount).slice(0, 3);
  }, [apps, query, activeCat]);

  const totalDeploys = useMemo(() => (apps ?? []).reduce((sum, a) => sum + a.deploymentCount, 0), [apps]);
  const favCount = useMemo(() => getFavorites().length, [favVersion]); // re-derive when favorites change

  function handleSearch(q: string) {
    setQuery(q);
    if (q.trim()) {
      addRecentSearch(q.trim());
      refreshRecent();
      setShowRecent(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/80">
        <div className="absolute inset-0 -z-20 hero-gradient mesh-gradient" />
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />

        {/* Floating orbs — enhanced with more orbs and varied positions */}
        <div className="pointer-events-none absolute inset-0 -z-5 overflow-hidden">
          <div className="hero-orb-1 absolute -left-20 top-10 size-64 rounded-full bg-emerald-400/8 blur-3xl dark:bg-emerald-500/5" />
          <div className="hero-orb-2 absolute right-10 top-20 size-48 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/6" />
          <div className="hero-orb-3 absolute left-1/3 -bottom-10 size-56 rounded-full bg-emerald-300/8 blur-3xl dark:bg-emerald-600/4" />
          {/* Additional orbs for richer atmosphere */}
          <div className="hero-orb-2 absolute right-1/4 top-[60%] size-40 rounded-full bg-cyan-400/6 blur-3xl dark:bg-cyan-500/4" />
          <div className="hero-orb-1 absolute left-[60%] -top-4 size-36 rounded-full bg-teal-300/7 blur-3xl dark:bg-teal-500/4" />
          <div className="hero-orb-3 absolute -right-8 bottom-1/4 size-44 rounded-full bg-emerald-400/7 blur-3xl dark:bg-emerald-600/3" />
          {/* Small decorative particles */}
          <div className="animate-particle-drift absolute left-[15%] top-[60%] size-1 rounded-full bg-emerald-500/30 [animation-delay:0s]" />
          <div className="animate-particle-drift absolute left-[45%] top-[70%] size-1.5 rounded-full bg-teal-500/20 [animation-delay:1.5s]" />
          <div className="animate-particle-drift absolute left-[75%] top-[55%] size-1 rounded-full bg-emerald-400/25 [animation-delay:3s]" />
          <div className="animate-particle-drift absolute left-[30%] top-[80%] size-0.5 rounded-full bg-teal-400/30 [animation-delay:2s]" />
          <div className="animate-particle-drift absolute left-[85%] top-[40%] size-1 rounded-full bg-cyan-400/20 [animation-delay:0.8s]" />
          <div className="animate-particle-drift absolute left-[55%] top-[25%] size-0.5 rounded-full bg-emerald-300/30 [animation-delay:2.5s]" />
        </div>

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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 shadow-sm">
                  <Boxes className="size-3.5 text-brand" /> {apps.length} apps available
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 shadow-sm">
                  <Download className="size-3.5 text-brand" /> {totalDeploys} total deployments
                </span>
                {favCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/60 bg-rose-50/60 px-3 py-1 shadow-sm dark:border-rose-800/40 dark:bg-rose-950/20">
                    <Heart className="size-3.5 fill-rose-500 text-rose-500" /> {favCount} favorites
                  </span>
                )}
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
            <Badge variant="secondary" className="ml-1 gap-1 font-normal animate-badge-pop">
              <TrendingUp className="size-3" /> Most deployed
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The most popular apps in the marketplace, ranked by deployments.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {featured.map((app, i) => (
              <div key={app.id} className="animate-card-entrance" style={{ animationDelay: `${i * 100}ms` }}>
                <FeaturedAppCard app={app} rank={i + 1} />
              </div>
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
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowRecent(true)}
                onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    handleSearch(query);
                  }
                }}
                placeholder="Search apps…"
                className="pl-9 pr-8"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {/* Recent searches dropdown */}
              {showRecent && !query && recentSearches.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <History className="size-3" /> Recent searches
                    </span>
                    <button
                      onClick={() => { clearRecentSearches(); setRecentSearches([]); }}
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onMouseDown={() => handleSearch(s)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted"
                    >
                      <History className="size-3 text-muted-foreground/50" /> {s}
                    </button>
                  ))}
                </div>
              )}
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
              className={`category-pill-lift inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeCat === cat
                  ? cat === "Favorites"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-700 shadow-sm dark:text-rose-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:border-border/80"
              }`}
            >
              {cat === "Favorites" ? (
                <Heart className={`size-3 ${activeCat === "Favorites" ? "fill-rose-500" : ""}`} />
              ) : (
                <CategoryIcon category={cat} />
              )}
              {cat}
              {cat === "Favorites" && (
                <span className="ml-0.5 text-[10px] text-muted-foreground/70">{favCount}</span>
              )}
              {cat !== "All" && cat !== "Favorites" && (
                <span className="ml-0.5 text-[10px] text-muted-foreground/70">
                  {(apps ?? []).filter(a => a.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps === null ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-card-entrance" style={{ animationDelay: `${i * 80}ms` }}>
                <AppCardSkeleton />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              {activeCat === "Favorites" ? (
                <>
                  <Heart className="size-8 text-rose-300/50" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">No favorites yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Click the heart icon on any app to add it to your favorites.</p>
                </>
              ) : (
                <>
                  <Boxes className="size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No applications match your search.</p>
                </>
              )}
              {query && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            filtered.map((app, i) => (
              <div key={app.id} className="animate-card-entrance" style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}>
                <AppCard app={app} onFavToggle={() => setFavVersion(v => v + 1)} />
              </div>
            ))
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
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/60 via-card to-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-emerald-500/40 hover:shadow-xl dark:from-emerald-950/20 ${rankGlow} card-glow-hover`}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-emerald-500/5 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      {/* Shimmer edge on hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
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
          className="deploy-glow-btn relative z-20 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
        >
          <Rocket className="size-3" />
          Deploy
        </button>
      </div>
      <DeployModal app={app} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function AppCard({ app, onFavToggle }: { app: AppItem; onFavToggle?: () => void }) {
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
      onFavToggle?.();
    } catch {}
  }

  return (
    <div
      onClick={() => navigate({ name: "app", slug: app.slug })}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg card-glow-hover"
    >
      {/* Top accent bar with gradient animation */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-teal-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
            {fav && (
              <span className="absolute -right-1 -top-1 flex size-3 items-center justify-center">
                <Heart className="size-2.5 fill-rose-500 text-rose-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {app.deploymentCount > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Zap className="size-3 text-emerald-500" /> {app.deploymentCount}
              </Badge>
            )}
            <Badge variant="secondary" className="font-normal">{app.category}</Badge>
          </div>
        </div>
        <h3 className="mt-4 text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">{app.name}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{app.description}</p>
        {/* Version & repo info */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground/60">
          {app.version && (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500/40" /> v{app.version}
            </span>
          )}
          {app.repository && (
            <span className="inline-flex items-center gap-1">
              <Globe2 className="size-3" /> Repository
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-20 flex items-center justify-between border-t border-border/40 bg-muted/20 px-5 py-3">
        <span className="font-mono text-[11px] text-muted-foreground/70">{app.dockerImage}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFav}
            className={`inline-flex items-center justify-center rounded-md p-1 transition-all duration-200 ${fav ? "text-rose-500 hover:text-rose-600" : "text-muted-foreground/60 hover:bg-muted hover:text-rose-500"}`}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`size-3.5 transition-all duration-200 ${fav ? "fill-rose-500" : ""}`} />
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
            className="deploy-glow-btn inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all duration-200 hover:bg-emerald-500/20 hover:shadow-sm dark:text-emerald-400"
          >
            <Rocket className="size-3" /> Deploy
          </button>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground">
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
    <div className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-50/30 hover:shadow-md dark:hover:bg-emerald-950/10">
      <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:scale-110 dark:text-emerald-400">
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
