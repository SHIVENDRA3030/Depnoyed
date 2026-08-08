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
} from "lucide-react";
import { api, navigate, useAuth, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { DeployModal } from "@/components/marketplace/deploy-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/marketplace/markdown-renderer";

export function AppDetailView({ slug }: { slug: string }) {
  const [app, setApp] = useState<AppItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const user = useAuth((s) => s.user);

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
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                <Badge variant="secondary">{app.category}</Badge>
                {app.version && (
                  <Badge variant="outline" className="gap-1 font-mono">
                    <GitBranch className="size-3" /> v{app.version}
                  </Badge>
                )}
                {app.deploymentCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-brand/30 bg-brand-soft/50 text-brand">
                    <Zap className="size-3" /> {app.deploymentCount} {app.deploymentCount === 1 ? "deployment" : "deployments"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{app.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" /> Added {new Date(app.createdAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Layers className="size-3" /> {app.dockerImage}
                </span>
                {app.repository && (
                  <a
                    href={app.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand hover:underline"
                  >
                    <Code className="size-3" /> Repository <ExternalLink className="size-2.5" />
                  </a>
                )}
                {app.website && (
                  <a
                    href={app.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand hover:underline"
                  >
                    <Globe className="size-3" /> Website <ExternalLink className="size-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <Button
            size="lg"
            onClick={deploy}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Rocket className="mr-2 size-4" />
            Deploy
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

      {/* Tech specs */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Server className="size-4" /> Technical specifications
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Spec icon={<Layers className="size-3.5" />} label="Docker image" value={app.dockerImage} mono />
          <Spec icon={<Hash className="size-3.5" />} label="Container port" value={String(app.containerPort)} mono />
          <Spec icon={<Container className="size-3.5" />} label="Runtime" value={app.simulator === "static" ? "Static server" : `${app.simulator} simulator`} />
          <Spec icon={<Cpu className="size-3.5" />} label="CPU limit" value="0.5 core" />
          <Spec icon={<MemoryStick className="size-3.5" />} label="Memory limit" value="512 MB" />
          <Spec icon={<ShieldCheck className="size-3.5" />} label="Isolation" value="Per-tenant volume + container" />
        </dl>
      </div>

      {/* README */}
      {app.readme && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-5 py-3">
            <BookOpen className="size-4 text-brand" />
            <h2 className="text-sm font-semibold">README</h2>
            <span className="text-[11px] text-muted-foreground">· Markdown</span>
          </div>
          <div className="px-5 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-a:text-brand prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-950 prose-pre:text-zinc-100">
              <MarkdownRenderer content={app.readme} />
            </div>
          </div>
        </div>
      )}

      {/* Ratings & Reviews */}
      <AppRatingsSection appSlug={app.slug} appName={app.name} />

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

      {app && <DeployModal app={app} open={modalOpen} onOpenChange={setModalOpen} />}
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

function Spec({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
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

function AppRatingsSection({ appSlug, appName }: { appSlug: string; appName: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    setReviews(getReviews(appSlug));
  }, [appSlug]);

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
    setReviews(getReviews(appSlug));
    setUserRating(0);
    setReviewText("");
    setSubmitting(false);
    toast.success("Review submitted!");
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
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
                onClick={() => { if (toggleHelpful(appSlug, review.id)) { setReviews(getReviews(appSlug)); } }}
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
