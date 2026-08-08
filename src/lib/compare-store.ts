"use client";

import { create } from "zustand";

interface CompareState {
  /** Slugs currently in the comparison tray */
  slugs: string[];
  /** Whether the comparison modal is open */
  open: boolean;
  /** Max items allowed in comparison */
  max: number;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  toggle: (slug: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  has: (slug: string) => boolean;
}

export const useCompare = create<CompareState>((set, get) => ({
  slugs: [],
  open: false,
  max: 3,
  add: (slug) => {
    const { slugs, max } = get();
    if (slugs.includes(slug) || slugs.length >= max) return;
    set({ slugs: [...slugs, slug] });
  },
  remove: (slug) => {
    const { slugs } = get();
    const next = slugs.filter((s) => s !== slug);
    set({ slugs: next, open: next.length > 0 ? get().open : false });
  },
  toggle: (slug) => {
    const { slugs, max } = get();
    if (slugs.includes(slug)) {
      const next = slugs.filter((s) => s !== slug);
      set({ slugs: next, open: next.length > 0 ? get().open : false });
    } else if (slugs.length < max) {
      set({ slugs: [...slugs, slug] });
    }
  },
  clear: () => set({ slugs: [], open: false }),
  setOpen: (open) => set({ open }),
  has: (slug) => get().slugs.includes(slug),
}));
