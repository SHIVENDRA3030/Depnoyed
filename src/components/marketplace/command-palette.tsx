"use client";

import { useEffect, useRef, useState } from "react";
import {
  Store,
  LayoutDashboard,
  Rocket,
  Box,
  CommandIcon,
  Settings,
  Shield,
  Moon,
  Keyboard,
  RotateCw,
  FlaskConical,
  Globe2,
  Wrench,
  FileText,
  Database,
  TrendingUp,
  Clock,
} from "lucide-react";
import { api, navigate, useAuth, type AppItem, type DeploymentItem } from "@/lib/store";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { toast } from "sonner";

/* -------------------------- Recent items helpers -------------------------- */

interface RecentItem {
  type: "app" | "deployment";
  id: string;
  name: string;
  timestamp: number;
}

function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("oss-cmd-recent") || "[]");
  } catch {
    return [];
  }
}

function addRecentItem(item: Omit<RecentItem, "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentItems().filter(
      (r) => !(r.type === item.type && r.id === item.id)
    );
    const next = [{ ...item, timestamp: Date.now() }, ...existing].slice(0, 20);
    localStorage.setItem("oss-cmd-recent", JSON.stringify(next));
  } catch {}
}

/* ----------------------- Deployment status colors ------------------------ */

function statusDotColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "running") return "bg-emerald-500";
  if (s === "stopped") return "bg-zinc-400 dark:bg-zinc-500";
  if (s === "pending" || s === "creating" || s === "starting") return "bg-amber-500";
  if (s === "failed" || s === "error") return "bg-red-500";
  return "bg-zinc-400 dark:bg-zinc-500";
}

/* -------------------------- Category icon map --------------------------- */

function categoryIcon(category: string) {
  const props = { className: "size-4" };
  switch (category) {
    case "Demo":
      return <FlaskConical {...props} />;
    case "Web":
      return <Globe2 {...props} />;
    case "DevOps":
      return <Wrench {...props} />;
    case "Productivity":
      return <FileText {...props} />;
    case "Database":
      return <Database {...props} />;
    case "Monitoring":
      return <TrendingUp {...props} />;
    default:
      return <Box {...props} />;
  }
}

/* --------------------------- Command Palette ---------------------------- */

const KNOWN_CATEGORIES = ["Demo", "Web", "DevOps", "Productivity", "Database", "Monitoring"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const loadedRef = useRef(false);
  const { setTheme, resolvedTheme } = useTheme();

  // Load data
  async function loadData() {
    try {
      const [{ apps: a }, d] = await Promise.all([
        api<{ apps: AppItem[] }>("/api/apps"),
        user
          ? api<{ deployments: DeploymentItem[] }>("/api/deployments")
          : Promise.resolve({ deployments: [] as DeploymentItem[] }),
      ]);
      setApps(a);
      setDeployments(d.deployments);
      loadedRef.current = true;
    } catch {
      /* ignore */
    }
  }

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          if (next) {
            void loadData();
            setRecentItems(getRecentItems());
          }
          return next;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      if (!loadedRef.current) void loadData();
      setRecentItems(getRecentItems());
    }
  }

  async function quickDeploy(appId: string, appName: string) {
    try {
      const { deployment } = await api<{ deployment: { id: string } }>("/api/deployments", {
        method: "POST",
        body: JSON.stringify({ appId }),
      });
      toast.success(`${appName} deployed!`);
      setOpen(false);
      navigate({ name: "deployment", id: deployment.id });
    } catch {
      toast.error("Deploy failed");
    }
  }

  // Derive categories from loaded apps
  const categories = [...new Set(apps.map((a) => a.category))].sort(
    (a, b) => KNOWN_CATEGORIES.indexOf(a) - KNOWN_CATEGORIES.indexOf(b)
  );

  // Recent apps & deployments (last 3 each)
  const recentApps = recentItems.filter((r) => r.type === "app").slice(0, 3);
  const recentDeploys = recentItems.filter((r) => r.type === "deployment").slice(0, 3);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Search apps, deployments, or type a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Items */}
        {(recentApps.length > 0 || recentDeploys.length > 0) && (
          <CommandGroup heading="Recent">
            {recentApps.map((r) => (
              <CommandItem
                key={`recent-app-${r.id}`}
                onSelect={() => {
                  setOpen(false);
                  addRecentItem({ type: "app", id: r.id, name: r.name });
                  navigate({ name: "app", slug: r.id });
                }}
              >
                <Clock className="size-4 text-muted-foreground/60" />
                <span className="flex-1">{r.name}</span>
                <span className="text-xs text-muted-foreground/60">app</span>
              </CommandItem>
            ))}
            {recentDeploys.map((r) => (
              <CommandItem
                key={`recent-dep-${r.id}`}
                onSelect={() => {
                  setOpen(false);
                  addRecentItem({ type: "deployment", id: r.id, name: r.name });
                  navigate({ name: "deployment", id: r.id });
                }}
              >
                <Clock className="size-4 text-muted-foreground/60" />
                <span className="flex-1">{r.name}</span>
                <span className="text-xs text-muted-foreground/60">deployment</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ name: "marketplace" });
            }}
          >
            <Store className="size-4" />
            Marketplace
            <CommandShortcut>M</CommandShortcut>
          </CommandItem>
          {user && (
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ name: "dashboard" });
              }}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
              <CommandShortcut>D</CommandShortcut>
            </CommandItem>
          )}
          {user && (
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ name: "settings" });
              }}
            >
              <Settings className="size-4" />
              Settings
              <CommandShortcut>S</CommandShortcut>
            </CommandItem>
          )}
          {user?.isAdmin && (
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ name: "admin" });
              }}
            >
              <Shield className="size-4" />
              Admin
              <CommandShortcut>A</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>

        {/* Categories */}
        {categories.length > 0 && (
          <CommandGroup heading="Categories">
            {categories.map((cat) => (
              <CommandItem
                key={`cat-${cat}`}
                onSelect={() => {
                  setOpen(false);
                  // Navigate to marketplace and set hash for category filter
                  window.location.hash = "#/marketplace";
                  // Dispatch a custom event so the marketplace view can pick up the category
                  window.dispatchEvent(
                    new CustomEvent("oss-filter-category", { detail: cat })
                  );
                }}
              >
                {categoryIcon(cat)}
                <span className="flex-1">{cat}</span>
                <span className="text-xs text-muted-foreground">
                  {apps.filter((a) => a.category === cat).length} apps
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }}
          >
            <Moon className="size-4" />
            Toggle dark mode
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              // Dispatch keyboard shortcut for the shortcuts dialog
              document.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "?",
                  bubbles: true,
                })
              );
            }}
          >
            <Keyboard className="size-4" />
            View keyboard shortcuts
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ name: "dashboard" });
            }}
          >
            <RotateCw className="size-4" />
            Refresh dashboard
          </CommandItem>
        </CommandGroup>

        {/* Applications */}
        {apps.length > 0 && (
          <CommandGroup heading="Applications">
            {apps.map((app) => (
              <CommandItem
                key={app.id}
                onSelect={() => {
                  setOpen(false);
                  addRecentItem({ type: "app", id: app.slug, name: app.name });
                  navigate({ name: "app", slug: app.slug });
                }}
              >
                <Box className="size-4 text-brand" />
                <span className="flex-1">{app.name}</span>
                {app.deploymentCount > 0 && (
                  <Badge variant="secondary" className="mr-1 gap-0.5 px-1.5 py-0 text-[10px] font-normal">
                    {app.deploymentCount}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{app.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Deploy */}
        {user && apps.length > 0 && (
          <CommandGroup heading="Quick Deploy">
            {apps.map((app) => (
              <CommandItem
                key={`deploy-${app.id}`}
                onSelect={() => quickDeploy(app.id, app.name)}
              >
                <Rocket className="size-4 text-emerald-500" />
                Deploy {app.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* My Deployments */}
        {deployments.length > 0 && (
          <CommandGroup heading="My Deployments">
            {deployments.slice(0, 8).map((d) => (
              <CommandItem
                key={d.id}
                onSelect={() => {
                  setOpen(false);
                  addRecentItem({
                    type: "deployment",
                    id: d.id,
                    name: d.app?.name ?? "Unknown",
                  });
                  navigate({ name: "deployment", id: d.id });
                }}
              >
                <CommandIcon className="size-4" />
                <span
                  className={`mr-1.5 inline-block size-2 rounded-full ${statusDotColor(d.status)}`}
                />
                <span className="flex-1 truncate">
                  {d.app?.name ?? "Unknown"}
                  {d.label ? ` (${d.label})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{d.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
