"use client";

import { useEffect, useState } from "react";
import { Keyboard, Command, ArrowUp, ArrowDown, Enter, CornerDownLeft, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  keys: string[];
  description: string;
  group: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], description: "Open command palette", group: "Global" },
  { keys: ["⌘", "/"], description: "Show keyboard shortcuts", group: "Global" },
  { keys: ["G", "M"], description: "Go to marketplace", group: "Navigation" },
  { keys: ["G", "D"], description: "Go to dashboard", group: "Navigation" },
  { keys: ["G", "S"], description: "Go to settings", group: "Navigation" },
  { keys: ["G", "A"], description: "Go to admin (admins only)", group: "Navigation" },
  { keys: ["?"], description: "Show this help", group: "Global" },
  { keys: ["Esc"], description: "Close dialog / palette", group: "Global" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ⌘/ or Ctrl+/
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // ? (shift+/)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable) {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {groups.map((group) => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h3>
              <div className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.group === group).map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-sm text-foreground/80">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">Esc</kbd> to close</span>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-brand hover:underline"
          >
            <X className="size-3" /> Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
