"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Boxes,
  Users,
  Rocket,
  Database,
  Search,
  ExternalLink,
  Save,
  AlertCircle,
  Tag,
  Container,
  Globe,
  Code,
  GitBranch,
  FileText,
} from "lucide-react";
import { api, navigate, useAuth, type AppItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function AdminView() {
  const user = useAuth((s) => s.user);
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AppItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<{ apps: number; deployments: number; users: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ apps: AppItem[] }>("/api/admin/apps");
      setApps(data.apps);
      const deployCount = data.apps.reduce((s, a) => s + a.deploymentCount, 0);
      setStats({ apps: data.apps.length, deployments: deployCount, users: 0 });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load");
      setApps([]);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate({ name: "login" });
      return;
    }
    if (!user.isAdmin) {
      toast.error("Admin access required");
      navigate({ name: "dashboard" });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<{ apps: AppItem[] }>("/api/admin/apps");
        if (cancelled) return;
        setApps(data.apps);
        const deployCount = data.apps.reduce((s, a) => s + a.deploymentCount, 0);
        setStats({ apps: data.apps.length, deployments: deployCount, users: 0 });
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof ApiError ? err.message : "Failed to load");
        setApps([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user || !user.isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <Shield className="size-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need administrator privileges to access this page.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => navigate({ name: "dashboard" })}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const filtered = (apps ?? []).filter((a) => {
    const q = query.trim().toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Shield className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
              <p className="text-sm text-muted-foreground">Manage the app catalog</p>
            </div>
          </div>
        </div>
        <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setCreating(true)}>
          <Plus className="mr-2 size-4" /> Add app
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <AdminStatCard icon={<Boxes className="size-4" />} label="Apps" value={stats.apps} tone="default" />
          <AdminStatCard icon={<Rocket className="size-4" />} label="Deployments" value={stats.deployments} tone="emerald" />
          <AdminStatCard icon={<Database className="size-4" />} label="Total data" value="—" tone="brand" />
        </div>
      )}

      {/* Search */}
      <div className="mt-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps by name, slug, or category…"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <Loader2 className="mr-1.5 size-3.5" /> Refresh
        </Button>
      </div>

      {/* Apps table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">App</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">Category</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Image</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Deploys</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {apps === null ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground shadow-sm">
                        <Boxes className="size-5" />
                      </div>
                      <h3 className="text-sm font-semibold">No apps found</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try adjusting your search query or add a new app.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="group transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{app.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{app.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant="secondary" className="font-normal">{app.category}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{app.dockerImage}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium">
                        <Rocket className="size-3 text-emerald-500" /> {app.deploymentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate({ name: "app", slug: app.slug })}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="View"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setEditing(app)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-brand"
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {app.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the app from the marketplace catalog.
                                {app.deploymentCount > 0 && (
                                  <span className="mt-2 block rounded-md bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                    <AlertCircle className="mr-1 inline size-3.5" />
                                    This app has {app.deploymentCount} active deployment(s) and cannot be deleted.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={app.deploymentCount > 0}
                                onClick={async () => {
                                  try {
                                    await api(`/api/admin/apps/${app.id}`, { method: "DELETE" });
                                    toast.success("App deleted");
                                    load();
                                  } catch (err) {
                                    toast.error(err instanceof ApiError ? err.message : "Failed to delete");
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit dialog */}
      {(creating || editing) && (
        <AppEditor
          app={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function AdminStatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "default" | "emerald" | "brand" }) {
  const toneClass = tone === "emerald"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : tone === "brand"
    ? "bg-brand-soft text-brand"
    : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex size-7 items-center justify-center rounded-md ${toneClass}`}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

/* ------------------------------ App Editor ------------------------------ */

function AppEditor({ app, onClose, onSaved }: { app: AppItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(app?.name ?? "");
  const [slug, setSlug] = useState(app?.slug ?? "");
  const [description, setDescription] = useState(app?.description ?? "");
  const [dockerImage, setDockerImage] = useState(app?.dockerImage ?? "");
  const [category, setCategory] = useState(app?.category ?? "General");
  const [simulator, setSimulator] = useState(app?.simulator ?? "static");
  const [logo, setLogo] = useState(app?.logo ?? "");
  const [containerPort, setContainerPort] = useState(app?.containerPort ?? 80);
  const [readme, setReadme] = useState(app?.readme ?? "");
  const [repository, setRepository] = useState(app?.repository ?? "");
  const [website, setWebsite] = useState(app?.website ?? "");
  const [version, setVersion] = useState(app?.version ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !description.trim() || !dockerImage.trim()) {
      toast.error("Name, description, and Docker image are required");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        dockerImage: dockerImage.trim(),
        category: category.trim(),
        simulator: simulator.trim(),
        logo: logo.trim() || null,
        containerPort,
        readme: readme.trim() || null,
        repository: repository.trim() || null,
        website: website.trim() || null,
        version: version.trim() || null,
      };
      if (app) {
        await api(`/api/admin/apps/${app.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("App updated");
      } else {
        await api("/api/admin/apps", { method: "POST", body: JSON.stringify(body) });
        toast.success("App created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {app ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {app ? `Edit ${app.name}` : "Add new app"}
          </DialogTitle>
          <DialogDescription>
            {app ? "Update the app catalog entry." : "Add a new app to the marketplace catalog."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app-name">Name *</Label>
              <Input id="app-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-slug">Slug</Label>
              <Input id="app-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-app (auto from name)" className="font-mono text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="app-desc">Description *</Label>
            <Textarea id="app-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description…" maxLength={500} rows={2} />
          </div>

          {/* Image & port */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="app-image" className="flex items-center gap-1"><Container className="size-3" /> Docker image *</Label>
              <Input id="app-image" value={dockerImage} onChange={(e) => setDockerImage(e.target.value)} placeholder="nginx:alpine" className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-port">Container port</Label>
              <Input id="app-port" type="number" value={containerPort} onChange={(e) => setContainerPort(Number(e.target.value))} min={1} max={65535} />
            </div>
          </div>

          {/* Category & simulator */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="app-cat" className="flex items-center gap-1"><Tag className="size-3" /> Category</Label>
              <Input id="app-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-sim">Simulator</Label>
              <Select value={simulator} onValueChange={setSimulator}>
                <SelectTrigger id="app-sim"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">static</SelectItem>
                  <SelectItem value="counter">counter</SelectItem>
                  <SelectItem value="notes">notes</SelectItem>
                  <SelectItem value="wiki">wiki</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-logo">Logo key</Label>
              <Input id="app-logo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="auto" className="font-mono text-sm" />
            </div>
          </div>

          {/* Links */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="app-version" className="flex items-center gap-1"><GitBranch className="size-3" /> Version</Label>
              <Input id="app-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-repo" className="flex items-center gap-1"><Code className="size-3" /> Repository</Label>
              <Input id="app-repo" value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="https://github.com/…" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-web" className="flex items-center gap-1"><Globe className="size-3" /> Website</Label>
              <Input id="app-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="text-sm" />
            </div>
          </div>

          {/* README */}
          <div className="space-y-1.5">
            <Label htmlFor="app-readme" className="flex items-center gap-1"><FileText className="size-3" /> README (Markdown)</Label>
            <Textarea
              id="app-readme"
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
              placeholder="# My App&#10;&#10;Detailed description in Markdown…"
              rows={5}
              className="font-mono text-xs"
              maxLength={5000}
            />
            <p className="text-[11px] text-muted-foreground">{readme.length}/5000 chars · Rendered as Markdown on the app detail page</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {app ? "Save changes" : "Create app"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
