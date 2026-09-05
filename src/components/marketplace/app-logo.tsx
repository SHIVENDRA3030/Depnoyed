"use client";

import {
  Boxes,
  Hash,
  StickyNote,
  Server,
  Rocket,
  Container,
  BookOpen,
  Workflow,
  Gauge,
  Database,
  Bot,
  Activity,
  GitBranch,
  ShieldCheck,
  Clapperboard,
  Search,
  type LucideIcon,
} from "lucide-react";

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
  deepseek: "from-indigo-500 to-blue-600",
  "uptime-kuma": "from-teal-500 to-emerald-600",
  vaultwarden: "from-blue-600 to-indigo-700",
  jellyfin: "from-purple-500 to-violet-600",
  meilisearch: "from-rose-500 to-pink-600",
};

const ICONS: Record<string, LucideIcon> = {
  counter: Hash,
  notes: StickyNote,
  gitea: GitBranch,
  wiki: BookOpen,
  n8n: Workflow,
  grafana: Gauge,
  supabase: Database,
  deepseek: Bot,
  "uptime-kuma": Activity,
  vaultwarden: ShieldCheck,
  jellyfin: Clapperboard,
  meilisearch: Search,
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
  const Icon = ICONS[key] ?? (key === "static" || key === "nginx" ? Server : Boxes);

  return (
    <div
      className={`flex ${dims} items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
      aria-hidden
    >
      <Icon className={size === "lg" ? "size-7" : "size-5"} />
    </div>
  );
}

export { Rocket, Container };
