"use client";

export function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
    case "stopped":
    case "exited":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300";
    case "pending":
    case "creating":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
    case "failed":
    case "dead":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function statusDot(status: string): string {
  switch (status) {
    case "running":
      return "bg-emerald-500";
    case "stopped":
    case "exited":
      return "bg-zinc-400";
    case "pending":
    case "creating":
      return "bg-amber-500 animate-pulse";
    case "failed":
    case "dead":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}
