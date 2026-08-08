"use client";

import { useState } from "react";
import { X, Rocket, ArrowRight, CheckCircle2 } from "lucide-react";
import { navigate, useAuth } from "@/lib/store";

const ONBOARDING_KEY = "oss-deploy-onboarding-dismissed";

export function OnboardingBanner() {
  const user = useAuth((s) => s.user);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });

  if (!user || dismissed) return null;

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-3">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-brand/30 bg-gradient-to-r from-brand-soft/60 via-brand-soft/30 to-transparent p-4">
        <div className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
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
            className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Get started <ArrowRight className="size-3" />
          </button>
          <button
            onClick={dismiss}
            className="text-muted-foreground transition-colors hover:text-foreground"
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
        <CheckCircle2 className="size-4 text-brand" />
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
