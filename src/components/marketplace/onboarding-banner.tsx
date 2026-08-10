"use client";

import { useState, useEffect } from "react";
import { X, Rocket, ArrowRight, CheckCircle2 } from "lucide-react";
import { navigate, useAuth } from "@/lib/store";

const ONBOARDING_KEY = "oss-deploy-onboarding-dismissed";

function getIsDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function OnboardingBanner() {
  const user = useAuth((s) => s.user);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(getIsDismissed());
  }, []);

  if (!user || dismissed) return null;

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-3">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-transparent p-4 shadow-sm dark:from-emerald-950/30 dark:via-emerald-950/15">
        <div className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Rocket className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Welcome to OSS Deploy! 🚀
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Get started in 3 easy steps: browse apps → deploy → access your instance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Step num={1} label="Browse" done />
            <Step num={2} label="Deploy" />
            <Step num={3} label="Access" />
          </div>
          <button
            onClick={() => navigate({ name: "marketplace" })}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
          >
            Get started <ArrowRight className="size-3" />
          </button>
          <button
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ num, label, done }: { num: number; label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {done ? (
        <CheckCircle2 className="size-4 text-emerald-500" />
      ) : (
        <span className="flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">
          {num}
        </span>
      )}
      <span className={`text-xs ${done ? "font-medium text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
