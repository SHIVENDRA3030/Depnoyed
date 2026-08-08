"use client";

import { Rocket, ShieldCheck, Container, Database, Globe, Lock, Zap, Cpu, Heart, Code2, Github } from "lucide-react";
import { navigate } from "@/lib/store";

export function Footer() {
  return (
    <footer className="mt-auto bg-muted/30">
      {/* Top gradient border */}
      <div className="footer-gradient-border" />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4 md:items-start">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Rocket className="size-4" />
              </span>
              <span className="text-sm font-bold">OSS Deploy</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              An open-source software marketplace that spins up an isolated, persistent container
              for every deployment. Multi-tenant by design.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500" /> MVP prototype
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                v1.0 · mock runtime
              </span>
            </div>
            {/* Social / links row */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => navigate({ name: "marketplace" })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Code2 className="size-3.5" /> Marketplace
              </button>
              <span className="text-border">·</span>
              <button
                onClick={() => navigate({ name: "settings" })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ShieldCheck className="size-3.5" /> Settings
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <Container className="size-3.5 text-brand transition-transform group-hover:scale-110" /> Isolated containers
              </li>
              <li className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <Database className="size-3.5 text-brand transition-transform group-hover:scale-110" /> Persistent volumes
              </li>
              <li className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <ShieldCheck className="size-3.5 text-brand transition-transform group-hover:scale-110" /> Tenant isolation
              </li>
              <li className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <Globe className="size-3.5 text-brand transition-transform group-hover:scale-110" /> Unique public URLs
              </li>
              <li className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <Zap className="size-3.5 text-brand transition-transform group-hover:scale-110" /> One-click deploy
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resources
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="group flex items-center gap-2 transition-colors hover:text-foreground">
                <span className="size-1.5 rounded-full bg-brand/60 transition-transform group-hover:scale-125" /> API · REST
              </li>
              <li className="group flex items-center gap-2 transition-colors hover:text-foreground">
                <span className="size-1.5 rounded-full bg-brand/60 transition-transform group-hover:scale-125" /> Runtime · pluggable Docker adapter
              </li>
              <li className="group flex items-center gap-2 transition-colors hover:text-foreground">
                <span className="size-1.5 rounded-full bg-brand/60 transition-transform group-hover:scale-125" /> DB · Prisma + SQLite
              </li>
              <li className="group flex items-center gap-2 transition-colors hover:text-foreground">
                <span className="size-1.5 rounded-full bg-brand/60 transition-transform group-hover:scale-125" /> Auth · scrypt + signed cookie
              </li>
              <li className="group flex items-center gap-2 transition-colors hover:text-foreground">
                <span className="size-1.5 rounded-full bg-brand/60 transition-transform group-hover:scale-125" /> UI · shadcn/ui + Tailwind
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/80 pt-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <p>© {new Date().getFullYear()} OSS Deploy</p>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              Made with <Heart className="size-3 fill-rose-500 text-rose-500" /> open-source
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> scrypt auth
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Cpu className="size-3" /> 0.5 core / 512 MB
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Container className="size-3" /> multi-tenant
            </span>
            <span className="text-border hidden sm:inline">·</span>
            <span className="hidden sm:inline">Next.js + Tailwind + shadcn/ui</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
