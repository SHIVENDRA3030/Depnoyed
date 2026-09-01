"use client";

import { Boxes, Hash, StickyNote, Server, Rocket, Container, BookOpen, Workflow, Gauge, Database } from "lucide-react";

const PALETTE: Record<string, string> = {
  counter: "from-emerald-500 to-teal-600",
  static: "from-sky-500 to-cyan-600",
  notes: "from-fuchsia-500 to-purple-600",
  nginx: "from-emerald-500 to-green-600",
  gitea: "from-orange-500 to-amber-600",
  wiki: "from-violet-500 to-purple-600",
  n8n: "from-pink-500 to-rose-600",
  grafana: "from-orange-500 to-red-600",
  supabase: "from-emerald-400 to-green-600",
};

export function AppLogo({
  logo,
  simulator,
  name,
  size = "md",
}: {
  logo: string | null;
  simulator: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const key = logo ?? simulator;
  const gradient = PALETTE[key] ?? "from-emerald-500 to-teal-600";
  const dims =
    size === "lg" ? "size-14" : size === "sm" ? "size-8" : "size-10";
  const icon =
    key === "counter" ? (
      <Hash className={size === "lg" ? "size-7" : "size-5"} />
    ) : key === "notes" || key === "gitea" ? (
      <StickyNote className={size === "lg" ? "size-7" : "size-5"} />
    ) : key === "wiki" ? (
      <BookOpen className={size === "lg" ? "size-7" : "size-5"} />
    ) : key === "n8n" ? (
      <Workflow className={size === "lg" ? "size-7" : "size-5"} />
    ) : key === "grafana" ? (
      <Gauge className={size === "lg" ? "size-7" : "size-5"} />
    ) : key === "supabase" ? (
      <Database className={size === "lg" ? "size-7" : "size-5"} />
    ) : key === "static" || key === "nginx" ? (
      <Server className={size === "lg" ? "size-7" : "size-5"} />
    ) : (
      <Boxes className={size === "lg" ? "size-7" : "size-5"} />
    );

  return (
    <div
      className={`flex ${dims} items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
      aria-hidden
    >
      {icon}
    </div>
  );
}

export { Rocket, Container };
