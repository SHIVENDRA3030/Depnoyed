"use client";

import { useEffect, useState } from "react";
import {
  GitCompare,
  X,
  Loader2,
  Check,
  Minus,
  Rocket,
  Tag,
  Container,
  Cpu,
  MemoryStick,
  ShieldCheck,
} from "lucide-react";
import { api, navigate, type AppItem } from "@/lib/store";
import { useCompare } from "@/lib/compare-store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export function CompareTray() {
  const slugs = useCompare((s) => s.slugs);
  const open = useCompare((s) => s.open);
  const setOpen = useCompare((s) => s.setOpen);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slugs.length === 0) {
      setApps([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { apps: allApps } = await api<{ apps: AppItem[] }>("/api/apps");
        if (cancelled) return;
        const filtered = allApps.filter((a) => slugs.includes(a.slug));
        // Maintain slug order
        const sorted = slugs.map((s) => filtered.find((a) => a.slug === s)).filter(Boolean) as AppItem[];
        setApps(sorted);
      } catch {
        if (!cancelled) toast.error("Failed to load comparison");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slugs]);

  if (slugs.length === 0) return null;

  return (
    <>
      {/* Floating tray */}
      <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-slide-in-right rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:left-auto sm:right-4 sm:translate-x-0">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <GitCompare className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Compare ({slugs.length}/3)</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {slugs.map((slug) => (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium"
                >
                  {slug.length > 14 ? slug.slice(0, 12) + "…" : slug}
                  <button
                    onClick={() => remove(slug)}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={clear}
            >
              Clear
            </Button>
            <Button
              size="sm"
              className="h-7 bg-brand px-3 text-xs text-brand-foreground hover:bg-brand/90"
              disabled={slugs.length < 2}
              onClick={() => setOpen(true)}
            >
              Compare
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GitCompare className="size-5 text-brand" /> Compare apps
            </SheetTitle>
            <SheetDescription>
              Side-by-side comparison of {apps.length} application(s).
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-brand" />
            </div>
          ) : apps.length < 2 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground">Add at least 2 apps to compare.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-32 border-b border-border bg-card p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Feature
                    </th>
                    {apps.map((app) => (
                      <th key={app.id} className="border-b border-border p-3 text-center" style={{ minWidth: 180 }}>
                        <div className="flex flex-col items-center gap-2">
                          <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="md" />
                          <span className="text-sm font-semibold">{app.name}</span>
                          <Badge variant="secondary" className="font-normal">{app.category}</Badge>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Description" icon={<Container className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center text-xs text-muted-foreground">
                        <span className="line-clamp-3">{app.description}</span>
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Docker image" icon={<Container className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center">
                        <code className="text-xs font-mono">{app.dockerImage}</code>
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Container port" icon={<Container className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center text-sm font-medium">
                        {app.containerPort}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Category" icon={<Tag className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center">
                        <Badge variant="outline" className="font-normal">{app.category}</Badge>
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Simulator" icon={<Container className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center text-xs font-mono">
                        {app.simulator}
                      </td>
                    ))}
                  </CompareRow>
                  {apps[0]?.version && (
                    <CompareRow label="Version" icon={<Tag className="size-3.5" />}>
                      {apps.map((app) => (
                        <td key={app.id} className="border-b border-border/60 p-3 text-center text-xs font-mono">
                          {app.version ?? "—"}
                        </td>
                      ))}
                    </CompareRow>
                  )}
                  <CompareRow label="Deployments" icon={<Rocket className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          <Rocket className="size-3 text-emerald-500" /> {app.deploymentCount}
                        </span>
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="CPU limit" icon={<Cpu className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center text-sm">
                        0.5 core
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Memory limit" icon={<MemoryStick className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center text-sm">
                        512 MB
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Isolation" icon={<ShieldCheck className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center">
                        <Check className="mx-auto size-4 text-emerald-500" />
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Persistent volume" icon={<ShieldCheck className="size-3.5" />}>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border/60 p-3 text-center">
                        <Check className="mx-auto size-4 text-emerald-500" />
                      </td>
                    ))}
                  </CompareRow>
                  <tr>
                    <td className="sticky left-0 z-10 border-b border-border bg-card p-3"></td>
                    {apps.map((app) => (
                      <td key={app.id} className="border-b border-border p-3 text-center">
                        <Button
                          size="sm"
                          className="bg-brand text-brand-foreground hover:bg-brand/90"
                          onClick={() => { setOpen(false); navigate({ name: "app", slug: app.slug }); }}
                        >
                          <Rocket className="mr-1.5 size-3" /> Deploy
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function CompareRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 border-b border-border/60 bg-card p-3 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
      </td>
      {children}
    </tr>
  );
}
