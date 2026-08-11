"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Zap,
  Calendar,
  Hash,
  Server,
  Layers,
  Star,
  MessageSquare,
  ThumbsUp,
  Send,
  GitBranch,
  Code,
  FileText,
  BookOpen,
  Circle,
  ArrowRight,
  LayoutGrid,
  Wrench,
} from "lucide-react";
import { api, navigate, useAuth, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { DeployModal } from "@/components/marketplace/deploy-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/marketplace/markdown-renderer";

export function AppDetailView({ slug }: { slug: string }) {
  const [app, setApp] = useState<AppItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showStickyDeploy, setShowStickyDeploy] = useState(false);
  const [relatedApps, setRelatedApps] = useState<AppItem[]>([]);
  const [userDeployments, setUserDeployments] = useState<DeploymentItem[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const user = useAuth((s) => s.user);
  const deployBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { app } = await api<{ app: AppItem }>(`/api/apps/${encodeURIComponent(slug)}`);
        setApp(app);
      } catch {
        setNotFound(true);
      }
    })();
  }, [slug]);

  // Fetch related apps and user deployments
  useEffect(() => {
    (async () => {
      try {
        const { apps } = await api<{ apps: AppItem[] }>("/api/apps");
        if (app) {
          setRelatedApps(
            apps
              .filter((a) => a.category === app.category && a.slug !== app.slug)
              .slice(0, 3)
          );
        }
      } catch {
        setRelatedApps([]);
      }
    })();
  }, [app]);

  useEffect(() => {
    if (!user) {
      setUserDeployments([]);
      return;
    }
    (async () => {
      try {
        const { deployments } = await api<{ deployments: DeploymentItem[] }>("/api/deployments");
        setUserDeployments(deployments);
      } catch {
        setUserDeployments([]);
      }
    })();
  }, [user]);

  // Compute how many deployments the user has for this app
  const userAppDeploymentCount = useMemo(() => {
    if (!app) return 0;
    return userDeployments.filter(
      (d) => d.app?.slug === app.slug
    ).length;
  }, [app, userDeployments]);

  // Read review count from localStorage
  useEffect(() => {
    setReviewCount(getReviewCount(slug));
  }, [slug]);

  useEffect(() => {
    function onScroll() {
      if (!deployBtnRef.current) return;
      const rect = deployBtnRef.current.getBoundingClientRect();
      setShowStickyDeploy(rect.bottom < 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [app]);

  function deploy() {
    if (!app) return;
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setModalOpen(true);
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

  // Determine which tabs are available
  const showReadmeTab = !!app.readme;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate({ name: "marketplace" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Marketplace
      </button>

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-8 pb-8 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
            <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
              {["grafana", "influxdb", "supabase"].includes(app.slug) && (
                <Badge variant="outline" className="text-xs text-brand border-brand/20 bg-brand/5">
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{app.category}</p>
            
            {userAppDeploymentCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                <Circle className="size-2 fill-emerald-500 text-emerald-500" />
                You have {userAppDeploymentCount} instance{userAppDeploymentCount !== 1 ? "s" : ""} running
              </div>
            )}
          </div>
        </div>
        
        <Button
          ref={deployBtnRef}
          size="lg"
          onClick={deploy}
          className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto"
        >
          <Rocket className="mr-2 size-4" />
          Deploy this Application
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Overview & Features */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              {app.description}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Features</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <Row icon={<Container className="size-4 text-foreground" />} title="Isolated container" desc={`${app.dockerImage}`} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Row icon={<Database className="size-4 text-foreground" />} title="Persistent volume" desc="Data survives restarts" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Row icon={<Globe className="size-4 text-foreground" />} title="Unique URL" desc="Accessible instantly" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Row icon={<ShieldCheck className="size-4 text-foreground" />} title="Secure Tenant" desc="Private instance" />
              </div>
            </div>
          </section>

          {showReadmeTab && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Documentation</h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="px-5 py-6 prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownRenderer content={app.readme!} />
                </div>
              </div>
            </section>
          )}

          <section>
            <AppRatingsSection appSlug={app.slug} appName={app.name} onReviewCountChange={setReviewCount} />
          </section>
        </div>

        {/* Right Column: Requirements & Developer Info */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Requirements</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Cpu className="size-4" /> CPU</span>
                  <span className="font-medium">0.5 Core</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-foreground w-[50%] rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1.5"><MemoryStick className="size-4" /> Memory</span>
                  <span className="font-medium">512 MB</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-foreground w-[50%] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Developer Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">{app.version || "Latest"}</dd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <dt className="text-muted-foreground">Added</dt>
                <dd className="font-medium">{new Date(app.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <dt className="text-muted-foreground">Port</dt>
                <dd className="font-mono">{app.containerPort}</dd>
              </div>
              <div className="flex flex-col py-1">
                <dt className="text-muted-foreground mb-1">Docker Image</dt>
                <dd className="font-mono text-xs break-all bg-muted p-1.5 rounded border border-border/50">{app.dockerImage}</dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2">
              {app.repository && (
                <Button variant="outline" className="w-full justify-start bg-background" onClick={() => window.open(app.repository, "_blank")}>
                  <Code className="mr-2 size-4" /> View Source
                  <ExternalLink className="ml-auto size-3 opacity-50" />
                </Button>
              )}
              {app.website && (
                <Button variant="outline" className="w-full justify-start bg-background" onClick={() => window.open(app.website, "_blank")}>
                  <Globe className="mr-2 size-4" /> Visit Website
                  <ExternalLink className="ml-auto size-3 opacity-50" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Apps */}
      {relatedApps.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-semibold">
              <LayoutGrid className="size-4 text-brand" /> Related apps
            </h2>
            <button
              onClick={() => {
                // Navigate to marketplace with category filter via hash
                window.location.hash = `#/marketplace?category=${encodeURIComponent(app.category)}`;
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand/80"
            >
              View all {app.category} <ArrowRight className="size-3" />
            </button>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedApps.map((related) => (
              <RelatedAppCard key={related.slug} app={related} user={user} />
            ))}
          </div>
        </div>
      )}

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

      {/* Sticky Deploy Button */}
      {showStickyDeploy && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <Button
            size="sm"
            onClick={deploy}
            className="bg-brand text-brand-foreground shadow-lg hover:bg-brand/90"
          >
            <Rocket className="mr-1.5 size-4" />
            Deploy
          </Button>
        </div>
      )}

      {app && <DeployModal app={app} open={modalOpen} onOpenChange={setModalOpen} />}
    </div>
  );
}

/* -------------------------- Related App Card -------------------------- */

function RelatedAppCard({ app, user }: { app: AppItem; user: ReturnType<typeof useAuth.getState>["user"] }) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleDeploy() {
    if (!user) {
      toast.info("Sign in to deploy");
      navigate({ name: "login" });
      return;
    }
    setModalOpen(true);
  }

  return (
    <>
      <div
        className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-brand/30 hover:shadow-md cursor-pointer"
        onClick={() => navigate({ name: "app", slug: app.slug })}
      >
        <div className="flex items-start gap-3">
          <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold group-hover:text-brand transition-colors">{app.name}</h3>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">{app.category}</Badge>
          </div>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{app.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Zap className="size-3" /> {app.deploymentCount} {app.deploymentCount === 1 ? "deploy" : "deploys"}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDeploy();
            }}
          >
            <Rocket className="size-3" />
            {user ? "Deploy" : "Sign in"}
          </Button>
        </div>
      </div>
      <DeployModal app={app} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

/* -------------------------- Helper Components -------------------------- */

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

function Spec({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/30">
      <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className={`mt-1 text-xs ${mono ? "font-mono" : ""} text-foreground/80`}>{value}</dd>
    </div>
  );
}

/* -------------------------- Ratings & Reviews -------------------------- */

interface Review {
  id: string;
  user: string;
  rating: number;
  text: string;
  date: string;
  helpful: number;
}

function getReviews(slug: string): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem("oss-reviews") || "{}");
    return all[slug] || [];
  } catch { return []; }
}

function getReviewCount(slug: string): number {
  return getReviews(slug).length;
}

function saveReview(slug: string, review: Review) {
  const all = JSON.parse(localStorage.getItem("oss-reviews") || "{}");
  if (!all[slug]) all[slug] = [];
  all[slug].unshift(review);
  localStorage.setItem("oss-reviews", JSON.stringify(all));
}

function toggleHelpful(slug: string, reviewId: string): boolean {
  const key = `oss-review-helpful-${reviewId}`;
  if (localStorage.getItem(key)) return false;
  localStorage.setItem(key, "1");
  const all = JSON.parse(localStorage.getItem("oss-reviews") || "{}");
  const reviews: Review[] = all[slug] || [];
  const r = reviews.find((rev) => rev.id === reviewId);
  if (r) { r.helpful = (r.helpful || 0) + 1; all[slug] = reviews; localStorage.setItem("oss-reviews", JSON.stringify(all)); }
  return true;
}

function AppRatingsSection({ appSlug, appName, onReviewCountChange }: { appSlug: string; appName: string; onReviewCountChange?: (count: number) => void }) {
  const [reviews, setReviews] = useState<Review[]>(() => getReviews(appSlug));
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    onReviewCountChange?.(reviews.length);
  }, [reviews.length]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  async function submitReview() {
    if (!user) { toast.info("Sign in to leave a review"); navigate({ name: "login" }); return; }
    if (userRating === 0) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    // Simulate brief delay
    await new Promise((r) => setTimeout(r, 300));
    const review: Review = {
      id: `rev-${Date.now()}`,
      user: user.name || user.email.split("@")[0],
      rating: userRating,
      text: reviewText.trim(),
      date: new Date().toISOString(),
      helpful: 0,
    };
    saveReview(appSlug, review);
    const updated = getReviews(appSlug);
    setReviews(updated);
    onReviewCountChange?.(updated.length);
    setUserRating(0);
    setReviewText("");
    setSubmitting(false);
    toast.success("Review submitted!");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Star className="size-4" /> Ratings & Reviews
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Rating distribution */}
      {reviews.length > 0 && (
        <div className="mt-3 space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right text-muted-foreground">{stars}</span>
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <Separator className="my-4" />

      {/* Write a review */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Write a review</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setUserRating(i + 1)}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`size-5 ${(i + 1) <= (hoverRating || userRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
              />
            </button>
          ))}
          {userRating > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">{userRating} star{userRating !== 1 ? "s" : ""}</span>
          )}
        </div>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this app… (optional)"
          className="min-h-[80px] text-sm"
          maxLength={500}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{reviewText.length}/500</span>
          <Button size="sm" onClick={submitReview} disabled={submitting || userRating === 0}>
            {submitting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Send className="mr-1.5 size-3.5" />}
            Submit review
          </Button>
        </div>
      </div>

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="mt-5 space-y-4">
          <Separator />
          {reviews.slice(0, 10).map((review) => (
            <div key={review.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {review.user.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{review.user}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(review.date)}</span>
              </div>
              {review.text && <p className="text-sm text-muted-foreground">{review.text}</p>}
              <button
                onClick={() => { if (toggleHelpful(appSlug, review.id)) { const r = getReviews(appSlug); setReviews(r); onReviewCountChange?.(r.length); } }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand"
              >
                <ThumbsUp className="size-3" /> Helpful {review.helpful > 0 && `(${review.helpful})`}
              </button>
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 && (
        <div className="mt-3 flex flex-col items-center py-6 text-center">
          <MessageSquare className="size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
