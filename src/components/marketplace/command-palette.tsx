"use client";

import { useEffect, useRef, useState } from "react";
import {
  Store,
  LayoutDashboard,
  Rocket,
  Box,
  CommandIcon,
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
import { toast } from "sonner";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const loadedRef = useRef(false);

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
          if (next) void loadData();
          return next;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !loadedRef.current) {
      void loadData();
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

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Search apps, deployments, or type a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

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
        </CommandGroup>

        {/* Applications */}
        {apps.length > 0 && (
          <CommandGroup heading="Applications">
            {apps.map((app) => (
              <CommandItem
                key={app.id}
                onSelect={() => {
                  setOpen(false);
                  navigate({ name: "app", slug: app.slug });
                }}
              >
                <Box className="size-4 text-brand" />
                <span className="flex-1">{app.name}</span>
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
                  navigate({ name: "deployment", id: d.id });
                }}
              >
                <CommandIcon className="size-4" />
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
