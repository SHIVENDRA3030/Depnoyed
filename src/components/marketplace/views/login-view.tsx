"use client";

import { useState } from "react";
import { Rocket, Mail, Lock, User, Loader2, ArrowRight, Package, Zap, Globe } from "lucide-react";
import { api, useAuth, navigate, ApiError } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginView() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const hydrate = useAuth((s) => s.hydrate);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify(mode === "register" ? { email, name, password } : { email, password }),
      });
      await hydrate();
      toast.success(mode === "login" ? "Signed in" : "Account created");
      navigate({ name: "dashboard" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
        {/* Marketing panel */}
        <div className="hidden flex-col justify-center lg:flex">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-brand" /> Multi-tenant · MVP
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight">
            Deploy open-source apps in{" "}
            <span className="relative inline-block">
              <span className="animate-shimmer-text bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500 bg-[length:200%_100%] bg-clip-text text-transparent">
                one click
              </span>
            </span>
            .
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Every deployment gets its own isolated container, a dedicated persistent volume, and a
            unique public URL. Stop, restart, and delete — all from your dashboard.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <Feature title="Isolated tenant containers" desc="One container + volume per deployment." />
            <Feature title="Persistent storage" desc="Data survives stop / restart cycles." />
            <Feature title="Unique public URL" desc="Each deployment is reachable on its own subdomain." />
          </ul>

          {/* What's included mini feature grid */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            <MiniFeatureCard
              icon={<Package className="size-4" />}
              value="10+"
              label="Apps"
              desc="Ready-to-deploy catalog"
            />
            <MiniFeatureCard
              icon={<Zap className="size-4" />}
              value="Free"
              label="Tier"
              desc="No cost to get started"
            />
            <MiniFeatureCard
              icon={<Globe className="size-4" />}
              value="Instant"
              label="Deploy"
              desc="Live in seconds"
            />
          </div>

          {/* Decorative geometric shapes — enhanced with more variety */}
          <div className="relative mt-6 h-32 overflow-hidden" aria-hidden="true">
            {/* Large circle */}
            <div className="animate-float-slow absolute -left-8 top-0 size-32 rounded-full border border-brand/20 bg-brand/5" />
            {/* Small filled circle */}
            <div className="animate-float-slower absolute left-24 top-12 size-16 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/10" />
            {/* Rotating square */}
            <div className="animate-float-slow absolute right-16 top-4 size-20 rotate-12 rounded-xl border border-brand/15 bg-brand-soft/50" />
            {/* Tiny dots */}
            <div className="animate-float-slower absolute right-8 top-20 size-3 rounded-full bg-brand/40" />
            <div className="animate-float-slow absolute left-40 top-20 size-2 rounded-full bg-emerald-400/30" />
            {/* Gradient bar */}
            <div className="animate-float-slower absolute bottom-4 left-12 h-1.5 w-28 rounded-full bg-gradient-to-r from-emerald-500/30 via-teal-500/20 to-transparent" />
            {/* Ring */}
            <div className="animate-float-slower absolute left-16 top-2 size-12 rounded-full border-2 border-teal-400/15" />
            {/* Small diamond */}
            <div className="animate-float-slow absolute right-28 top-14 size-6 rotate-45 rounded-sm border border-emerald-400/20 bg-emerald-400/5" />
            {/* Wavy gradient line */}
            <div className="animate-float-slower absolute bottom-8 right-0 h-1 w-32 rounded-full bg-gradient-to-l from-cyan-400/20 via-emerald-500/15 to-transparent" />
            {/* Hexagon-ish (rounded square) */}
            <div className="animate-float-slow absolute left-56 top-6 size-8 rounded-lg border border-brand/10 bg-brand/3 rotate-6" />
            {/* Double dot */}
            <div className="animate-float-slower absolute right-52 bottom-4 flex gap-1.5">
              <div className="size-1.5 rounded-full bg-teal-400/25" />
              <div className="size-1.5 rounded-full bg-emerald-400/25" />
            </div>
          </div>

          {/* Trust badge row */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
            <svg viewBox="0 0 24 24" fill="none" className="size-3.5 text-emerald-500">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>No credit card required</span>
            <span className="text-muted-foreground/30">·</span>
            <span>Free tier</span>
            <span className="text-muted-foreground/30">·</span>
            <span>Open source</span>
          </div>
        </div>

        {/* Auth form */}
        <div className="mx-auto w-full max-w-md">
          {/* Decorative gradient orb behind the auth card */}
          <div className="relative">
            <div
              className="animate-orb-pulse absolute -top-20 left-1/2 -z-20 size-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-cyan-400/5 blur-3xl"
              aria-hidden="true"
            />
            {/* Dots pattern background behind the auth card */}
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="rounded-2xl border border-border/60 bg-card/70 p-7 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/50">
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                  <Rocket className="size-5" />
                </span>
                <span className="text-sm font-bold">OSS Deploy</span>
              </div>

              <div className="mb-5 relative flex rounded-lg border border-border bg-muted/40 p-1">
                {/* Sliding indicator */}
                <div
                  className={`absolute top-1 bottom-1 rounded-md bg-background shadow-sm transition-all duration-200 ease-out ${
                    mode === "login" ? "left-1 right-1/2" : "left-1/2 right-1"
                  }`}
                  style={{ margin: "0 2px" }}
                />
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`relative z-10 flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name (optional)</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9"
                    />
                  </div>
                  {mode === "register" && (
                    <p className="text-[11px] text-muted-foreground">At least 6 characters.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 size-4" />
                  )}
                  {mode === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                {mode === "login" ? "No account yet?" : "Already registered?"}{" "}
                <button
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="font-medium text-brand hover:underline"
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" fill="none" className="size-3">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        <span className="font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </li>
  );
}

function MiniFeatureCard({
  icon,
  value,
  label,
  desc,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="group rounded-xl border border-border/50 bg-muted/20 px-3 py-3 transition-all duration-200 hover:border-brand/30 hover:bg-brand-soft/30">
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
      </div>
      <p className="mt-1.5 text-lg font-bold tracking-tight text-foreground">
        {value} <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{desc}</p>
    </div>
  );
}
