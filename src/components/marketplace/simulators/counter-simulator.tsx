"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw, Save } from "lucide-react";
import type { AppSimulatorProps } from "../app-simulator";

/**
 * Counter simulator — the canonical persistence demo.
 * The counter value lives in the deployment's dedicated volume under the key
 * "counter", so it survives stop/start/restart of the container.
 */
export function CounterSimulator(props: AppSimulatorProps) {
  const initial = Number(props.initialData["counter"] ?? 0) || 0;
  const label = props.initialData["counter_label"] ?? "My Counter";
  const [count, setCount] = useState(initial);
  const [name, setName] = useState(label);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const volumeApi = `/api/preview/${props.subdomain}/volume`;

  async function persist(nextCount: number, nextLabel?: string) {
    setBusy(true);
    try {
      await fetch(volumeApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "set", key: "counter", value: String(nextCount) }),
      });
      if (nextLabel !== undefined) {
        await fetch(volumeApi, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "set", key: "counter_label", value: nextLabel }),
        });
      }
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setBusy(false);
    }
  }

  async function increment(delta: number) {
    const next = count + delta;
    setCount(next);
    await persist(next);
  }

  async function reset() {
    setCount(0);
    await persist(0);
  }

  async function saveLabel() {
    await persist(count, name);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          Persistence demo · writes to a dedicated Docker volume
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stop and restart your deployment — this number will still be here.
        </p>

        <div className="my-8 flex size-40 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-5xl font-bold tabular-nums text-white shadow-lg shadow-emerald-500/20">
          {count}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => increment(-1)}
            disabled={busy}
            className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
            aria-label="Decrement"
          >
            <Minus className="size-5" />
          </button>
          <button
            onClick={() => increment(1)}
            disabled={busy}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="size-4" /> Increment
          </button>
          <button
            onClick={reset}
            disabled={busy}
            className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
            aria-label="Reset"
          >
            <RotateCcw className="size-5" />
          </button>
        </div>

        <div className="mt-8 w-full max-w-sm">
          <label className="mb-1.5 block text-left text-xs font-medium text-muted-foreground">Counter name</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Counter name"
            />
            <button
              onClick={saveLabel}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Save className="size-3.5" /> Save
            </button>
          </div>
        </div>

        {savedAt && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Last persisted to volume <span className="font-mono">{props.volumeName}</span> at {savedAt}
          </p>
        )}
      </div>
    </div>
  );
}
