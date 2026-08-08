"use client";

import { Rocket, ShieldCheck, Container, Database } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/80 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
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
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Container className="size-3.5 text-brand" /> Isolated containers
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Database className="size-3.5 text-brand" /> Persistent volumes
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="size-3.5 text-brand" /> Tenant isolation
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resources
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>API · REST</li>
              <li>Runtime · pluggable Docker adapter</li>
              <li>DB · Prisma + SQLite</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/80 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} OSS Deploy · MVP prototype</p>
          <p>Built with Next.js, Tailwind &amp; shadcn/ui</p>
        </div>
      </div>
    </footer>
  );
}
