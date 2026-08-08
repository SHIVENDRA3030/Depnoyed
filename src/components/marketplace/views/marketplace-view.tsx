"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rocket, Search, Boxes, Container, Database, Globe, ArrowRight, Loader2, Sparkles, Zap, Flame, Star, TrendingUp, FlaskConical, Globe2, Wrench, FileText, Heart, Download, Clock, GitCompare, X, History, Users, ShieldCheck, Activity, Server, MonitorSmart, Eye, FolderOpen } from "lucide-react";
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

/* ----------------------------- AnimatedCounter ----------------------------- */

function AnimatedCounter({ target, duration = 1200, className = "" }: { target: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<{ start: number | null; raf: number }>({ start: null, raf: 0 });

  useEffect(() => {
    const startTime = performance.now();
    ref.current.start = startTime;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic for a nice deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        ref.current.raf = requestAnimationFrame(step);
      }
    }

    ref.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current.raf);
  }, [target, duration]);

  return <span className={className}>{display}</span>;
}

/* ----------------------------- Social Proof Data ----------------------------- */

const AVATAR_COLORS = [
  "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-emerald-600",
  "bg-teal-600", "bg-cyan-600", "bg-emerald-400", "bg-teal-400",
];

const DEPLOYMENT_ACTIVITIES = [
  { app: "Grafana", minutes: 3 },
  { app: "n8n", minutes: 7 },
  { app: "Supabase", minutes: 12 },
];

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
  const browseRef = useRef<HTMLElement>(null);
  const user = useAuth((s) => s.user);
  const [userDeploys, setUserDeploys] = useState<DeploymentItem[] | null>(null);

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

  // Listen for category filter events from command palette
  useEffect(() => {
    function onCatFilter(e: Event) {
      const cat = (e as CustomEvent).detail as string;
      if (cat) setActiveCat(cat);
    }
    window.addEventListener("oss-filter-category", onCatFilter);
    return () => window.removeEventListener("oss-filter-category", onCatFilter);
  }, []);

  // Fetch user deployments for recommendation filtering
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { deployments } = await api<{ deployments: DeploymentItem[] }>('/api/deployments');
        if (!cancelled) setUserDeploys(deployments);
      } catch {
        if (!cancelled) setUserDeploys([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Derive effective deployments (null out when no user)
  const effectiveUserDeploys = user ? userDeploys : null;

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

  // Recommended apps: apps the user hasn't deployed, sorted by deployment count
  const recommended = useMemo(() => {
    if (!apps || apps.length === 0) return [];
    const deployedAppIds = new Set(
      (effectiveUserDeploys ?? [])
        .map((d) => d.app?.id)
        .filter(Boolean) as string[]
    );
    const undeployed = apps.filter((a) => !deployedAppIds.has(a.id));
    return [...undeployed].sort((a, b) => b.deploymentCount - a.deploymentCount).slice(0, 3);
  }, [apps, effectiveUserDeploys]);

  // Social proof developer count
  const developerCount = useMemo(() => Math.max(totalDeploys * 2 + 3, 12), [totalDeploys]);

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
              <StatCard icon={<Container className="size-5" />} label="Isolated containers" desc="Per deployment" indicator="∞" />
              <StatCard icon={<Database className="size-5" />} label="Persistent volumes" desc="Data survives restarts" indicator="24/7" />
              <StatCard icon={<Globe className="size-5" />} label="Unique public URLs" desc="Instant access" indicator="100%" />
            </div>
            {/* Quick stats row — animated counters */}
            {apps && apps.length > 0 && (
              <div className="animate-fade-in-up mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground [animation-delay:400ms]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 shadow-sm">
                  <Boxes className="size-3.5 text-brand" /> <AnimatedCounter target={apps.length} /> apps available
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 shadow-sm">
                  <Download className="size-3.5 text-brand" /> <AnimatedCounter target={totalDeploys} /> total deployments
                </span>
                {favCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/60 bg-rose-50/60 px-3 py-1 shadow-sm dark:border-rose-800/40 dark:bg-rose-950/20">
                    <Heart className="size-3.5 fill-rose-500 text-rose-500" /> {favCount} favorites
                  </span>
                )}
              </div>
            )}

            {/* Social Proof Section */}
            {apps && apps.length > 0 && (
              <div className="animate-fade-in-up mt-8 flex flex-col items-center gap-3 [animation-delay:500ms]">
                {/* Avatar row */}
                <div className="flex items-center -space-x-2">
                  {AVATAR_COLORS.slice(0, 6).map((color, i) => (
                    <div
                      key={i}
                      className={`${color} size-8 rounded-full border-2 border-background shadow-sm flex items-center justify-center text-[10px] font-bold text-white/90`}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  <div className="flex size-8 items-center justify-center rounded-full border-2 border-border bg-muted text-[10px] font-semibold text-muted-foreground shadow-sm">
                    +{developerCount - 6}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Join <span className="font-semibold text-foreground"><AnimatedCounter target={developerCount} duration={1400} /></span> developers who have deployed <span className="font-semibold text-foreground"><AnimatedCounter target={totalDeploys} duration={1000} /></span> instances
                </p>
                {/* Deployment activity indicators */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {DEPLOYMENT_ACTIVITIES.map((act, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <Activity className="size-3" />
                      {act.app} deployed {act.minutes}m ago
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Explore by Category */}
      {apps && apps.length > 0 && (
        <CategoryExplorer
          apps={apps}
          onSelectCategory={(cat) => {
            setActiveCat(cat);
            browseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

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

      {/* Recommended / Popular Picks */}
      {recommended.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8">
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Sparkles className="size-5 text-emerald-500" />
                <h2 className="text-xl font-semibold">Recommended for you</h2>
                <Badge variant="secondary" className="ml-1 gap-1 font-normal">
                  <Star className="size-3" /> Personalized
                </Badge>
              </>
            ) : (
              <>
                <Star className="size-5 text-amber-500" />
                <h2 className="text-xl font-semibold">Popular picks</h2>
                <Badge variant="secondary" className="ml-1 gap-1 font-normal">
                  <TrendingUp className="size-3" /> Top rated
                </Badge>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? "Apps you haven't deployed yet, ranked by popularity."
              : "Sign in to get personalized recommendations based on your activity."}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {recommended.map((app, i) => (
              <div key={app.id} className="animate-card-entrance" style={{ animationDelay: `${i * 100}ms` }}>
                <FeaturedAppCard app={app} rank={i + 1} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section ref={browseRef} className="mx-auto max-w-6xl px-4 py-10">
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

function StatCard({ icon, label, desc, indicator }: { icon: React.ReactNode; label: string; desc: string; indicator?: string }) {
  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-gradient-to-br from-emerald-50/40 via-background/60 to-teal-50/30 px-4 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-50/30 hover:shadow-md dark:from-emerald-950/20 dark:via-background/60 dark:to-teal-950/10 dark:hover:bg-emerald-950/10">
      {/* Decorative glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: '0 0 20px rgba(16,185,129,0.12)' }} />
      <span className="stat-icon-glow relative flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:scale-110 dark:text-emerald-400">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
      {indicator && (
        <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-600 opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75 dark:text-emerald-400">
          {indicator}
        </span>
      )}
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

/* --------------------------- Category Explorer ---------------------------- */

const CATEGORY_THEMES: Record<string, {
  icon: React.ElementType;
  gradient: string;
  darkGradient: string;
  iconBg: string;
  iconColor: string;
  border: string;
  hoverBorder: string;
}> = {
  Demo: {
    icon: FlaskConical,
    gradient: "from-emerald-50 via-emerald-100/60 to-green-50",
    darkGradient: "dark:from-emerald-950/30 dark:via-emerald-900/10 dark:to-green-950/20",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/60 dark:border-emerald-800/30",
    hoverBorder: "hover:border-emerald-400/60 dark:hover:border-emerald-600/40",
  },
  Web: {
    icon: Globe2,
    gradient: "from-sky-50 via-sky-100/60 to-blue-50",
    darkGradient: "dark:from-sky-950/30 dark:via-sky-900/10 dark:to-blue-950/20",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200/60 dark:border-sky-800/30",
    hoverBorder: "hover:border-sky-400/60 dark:hover:border-sky-600/40",
  },
  DevOps: {
    icon: Wrench,
    gradient: "from-orange-50 via-amber-100/60 to-orange-50",
    darkGradient: "dark:from-orange-950/30 dark:via-amber-900/10 dark:to-orange-950/20",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200/60 dark:border-orange-800/30",
    hoverBorder: "hover:border-orange-400/60 dark:hover:border-orange-600/40",
  },
  Productivity: {
    icon: FileText,
    gradient: "from-violet-50 via-purple-100/60 to-violet-50",
    darkGradient: "dark:from-violet-950/30 dark:via-purple-900/10 dark:to-violet-950/20",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200/60 dark:border-violet-800/30",
    hoverBorder: "hover:border-violet-400/60 dark:hover:border-violet-600/40",
  },
  Database: {
    icon: Database,
    gradient: "from-rose-50 via-pink-100/60 to-rose-50",
    darkGradient: "dark:from-rose-950/30 dark:via-pink-900/10 dark:to-rose-950/20",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200/60 dark:border-rose-800/30",
    hoverBorder: "hover:border-rose-400/60 dark:hover:border-rose-600/40",
  },
  Monitoring: {
    icon: TrendingUp,
    gradient: "from-teal-50 via-cyan-100/60 to-teal-50",
    darkGradient: "dark:from-teal-950/30 dark:via-cyan-900/10 dark:to-teal-950/20",
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200/60 dark:border-teal-800/30",
    hoverBorder: "hover:border-teal-400/60 dark:hover:border-teal-600/40",
  },
};

function CategoryExplorer({ apps, onSelectCategory }: { apps: AppItem[]; onSelectCategory: (cat: string) => void }) {
  const categoryNames = useMemo(() => {
    const cats = Array.from(new Set(apps.map((a) => a.category)));
    // Sort to match our defined theme order
    const order = ["Demo", "Web", "DevOps", "Productivity", "Database", "Monitoring"];
    return cats.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [apps]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { appCount: number; deployCount: number }> = {};
    for (const app of apps) {
      if (!stats[app.category]) stats[app.category] = { appCount: 0, deployCount: 0 };
      stats[app.category].appCount++;
      stats[app.category].deployCount += app.deploymentCount;
    }
    return stats;
  }, [apps]);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-center gap-2">
        <FolderOpen className="size-5 text-violet-500" />
        <h2 className="text-xl font-semibold">Explore by category</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse apps organized by their use case — click to filter the catalog.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categoryNames.map((cat, i) => {
          const theme = CATEGORY_THEMES[cat];
          if (!theme) return null;
          const Icon = theme.icon;
          const stats = categoryStats[cat] ?? { appCount: 0, deployCount: 0 };
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border bg-gradient-to-br ${theme.gradient} ${theme.darkGradient} ${theme.border} ${theme.hoverBorder} p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-card-entrance`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Subtle decorative glow */}
              <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-current opacity-[0.04] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.08]" />
              <span className={`relative flex size-14 items-center justify-center rounded-2xl ${theme.iconBg} ${theme.iconColor} transition-transform duration-300 group-hover:animate-bounce`}>
                <Icon className="size-7" />
              </span>
              <div>
                <h3 className="text-base font-semibold">{cat}</h3>
                <div className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Boxes className="size-3" /> {stats.appCount} {stats.appCount === 1 ? "app" : "apps"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="size-3" /> {stats.deployCount} deploys
                  </span>
                </div>
              </div>
              {/* Hover arrow indicator */}
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground/80 group-hover:translate-x-0.5">
                Browse <ArrowRight className="size-3" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
