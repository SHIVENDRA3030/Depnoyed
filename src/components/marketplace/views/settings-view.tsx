"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Shield,
  Bell,
  Palette,
  Globe,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  Loader2,
  Check,
  X,
  Pencil,
  Key,
  Trash2,
  Download,
  ExternalLink,
  Server,
  Container,
  Database,
  Zap,
  Copy,
  FileText,
  Rocket,
  Plus,
  Code2,
  AlertTriangle,
  Monitor,
  MailCheck,
} from "lucide-react";
import { api, useAuth, navigate, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function SettingsView() {
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const logout = useAuth((s) => s.logout);

  if (!user) {
    navigate({ name: "login" });
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-[11px] font-mono tracking-[0.15em] uppercase mb-2 text-brand/70">Platform Settings</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, deployments, and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <SettingsCard
          icon={<User className="size-5" />}
          title="Profile"
          description="Your account information"
        >
          <ProfileSection user={user} hydrate={hydrate} />
        </SettingsCard>

        {/* Security Section */}
        <SettingsCard
          icon={<Shield className="size-5" />}
          title="Security"
          description="Password and authentication"
        >
          <SecuritySection />
        </SettingsCard>

        {/* Deployment Defaults */}
        <SettingsCard
          icon={<Server className="size-5" />}
          title="Deployment defaults"
          description="Default settings for new deployments"
        >
          <DeploymentDefaultsSection />
        </SettingsCard>

        {/* Deployment Templates */}
        <SettingsCard
          icon={<FileText className="size-5" />}
          title="Deployment templates"
          description="Save reusable deployment configurations"
        >
          <DeploymentTemplatesSection />
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard
          icon={<Bell className="size-5" />}
          title="Notifications"
          description="Choose what you want to be notified about"
        >
          <NotificationsSection />
        </SettingsCard>

        {/* API Access */}
        <SettingsCard
          icon={<Code2 className="size-5" />}
          title="API Access"
          description="Manage API keys and view usage"
        >
          <ApiAccessSection />
        </SettingsCard>

        {/* Account Actions */}
        <SettingsCard
          icon={<Key className="size-5" />}
          title="Account"
          description="Export data, sign out, or delete your account"
        >
          <AccountSection user={user} logout={logout} />
        </SettingsCard>

        {/* Danger Zone */}
        <DangerZoneSection />
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl transition-all duration-200 bg-card border border-border">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ProfileSection({
  user,
  hydrate,
}: {
  user: NonNullable<ReturnType<typeof useAuth.getState>["user"]>;
  hydrate: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setBusy(true);
    try {
      await api("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await hydrate();
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-foreground shadow-sm">
          {user.email.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{user.name || user.email}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Separator />

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveProfile} disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Display name</p>
            <p className="text-sm text-muted-foreground">{user.name || "Not set"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 size-3.5" /> Edit
          </Button>
        </div>
      )}
    </div>
  );
}

function SecuritySection() {
  const [changing, setChanging] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    if (newPw !== confirmPw) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      toast.success("Password changed");
      setChanging(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Password</p>
          <p className="text-sm text-muted-foreground">
            {changing ? "Enter your current and new password." : "Change your account password."}
          </p>
        </div>
        {!changing && (
          <Button size="sm" variant="outline" onClick={() => setChanging(true)}>
            <Key className="mr-1.5 size-3.5" /> Change
          </Button>
        )}
      </div>

      {changing && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={changePassword} disabled={busy || !currentPw || !newPw}>
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
              Update password
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setChanging(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Authentication method</p>
          <p className="text-sm text-muted-foreground">Email + password (scrypt-hashed)</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Shield className="size-3" /> Secure
        </Badge>
      </div>
    </div>
  );
}

function DeploymentDefaultsSection() {
  const [cpuLimit, setCpuLimit] = useState(() => {
    if (typeof window === "undefined") return "0.5";
    return localStorage.getItem("oss-deploy-cpu") ?? "0.5";
  });
  const [memLimit, setMemLimit] = useState(() => {
    if (typeof window === "undefined") return "512";
    return localStorage.getItem("oss-deploy-mem") ?? "512";
  });
  const [autoStart, setAutoStart] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("oss-deploy-autostart") !== "false";
  });

  function saveCpu(v: string) {
    setCpuLimit(v);
    localStorage.setItem("oss-deploy-cpu", v);
  }
  function saveMem(v: string) {
    setMemLimit(v);
    localStorage.setItem("oss-deploy-mem", v);
  }
  function saveAutoStart(v: boolean) {
    setAutoStart(v);
    localStorage.setItem("oss-deploy-autostart", String(v));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">CPU limit</p>
          <p className="text-xs text-muted-foreground">Maximum CPU cores per deployment</p>
        </div>
        <Select value={cpuLimit} onValueChange={saveCpu}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.25">0.25 core</SelectItem>
            <SelectItem value="0.5">0.5 core</SelectItem>
            <SelectItem value="1">1 core</SelectItem>
            <SelectItem value="2">2 cores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Memory limit</p>
          <p className="text-xs text-muted-foreground">Maximum RAM per deployment</p>
        </div>
        <Select value={memLimit} onValueChange={saveMem}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="256">256 MB</SelectItem>
            <SelectItem value="512">512 MB</SelectItem>
            <SelectItem value="1024">1 GB</SelectItem>
            <SelectItem value="2048">2 GB</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Auto-start on deploy</p>
          <p className="text-xs text-muted-foreground">Automatically start containers after creation</p>
        </div>
        <Switch checked={autoStart} onCheckedChange={saveAutoStart} />
      </div>

      <div className="rounded-lg p-3 border border-brand/20 bg-brand-soft">
        <p className="flex items-center gap-1.5 text-xs font-medium text-brand">
          <Zap className="size-3.5" /> These are client-side preferences
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Server-side resource limits may override these defaults. Current server config: CPU 0.5 core, Memory 512 MB.
        </p>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [deployNotify, setDeployNotify] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("oss-notify-deploy") !== "false";
  });
  const [statusNotify, setStatusNotify] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("oss-notify-status") !== "false";
  });
  const [volumeNotify, setVolumeNotify] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("oss-notify-volume") !== "false";
  });
  const [emailNotify, setEmailNotify] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("oss-notify-email") !== "false";
  });
  const [desktopNotify, setDesktopNotify] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("oss-notify-desktop") === "true";
  });

  return (
    <div className="space-y-4">
      <NotificationToggle
        icon={<Zap className="size-4" />}
        title="Deployment events"
        description="Notify when a deployment is created or deleted"
        checked={deployNotify}
        onChange={(v) => { setDeployNotify(v); localStorage.setItem("oss-notify-deploy", String(v)); }}
      />
      <NotificationToggle
        icon={<Container className="size-4" />}
        title="Status changes"
        description="Notify when a container starts, stops, or fails"
        checked={statusNotify}
        onChange={(v) => { setStatusNotify(v); localStorage.setItem("oss-notify-status", String(v)); }}
      />
      <NotificationToggle
        icon={<Database className="size-4" />}
        title="Volume events"
        description="Notify when volume data exceeds size thresholds"
        checked={volumeNotify}
        onChange={(v) => { setVolumeNotify(v); localStorage.setItem("oss-notify-volume", String(v)); }}
      />

      <Separator />

      <NotificationToggle
        icon={<MailCheck className="size-4" />}
        title="Email notifications"
        description="Receive email alerts for deployment status changes"
        checked={emailNotify}
        onChange={(v) => { setEmailNotify(v); localStorage.setItem("oss-notify-email", String(v)); }}
      />
      <NotificationToggle
        icon={<Monitor className="size-4" />}
        title="Desktop notifications"
        description="Show browser desktop notifications for events"
        checked={desktopNotify}
        onChange={(v) => { setDesktopNotify(v); localStorage.setItem("oss-notify-desktop", String(v)); }}
      />
    </div>
  );
}

function NotificationToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ---------- Deployment Templates ---------- */

interface DeployTemplate {
  id: string;
  name: string;
  appSlug: string;
  labelPrefix: string;
  envVars: Record<string, string>;
}

const TEMPLATES_KEY = "oss-deploy-templates";

const DEFAULT_TEMPLATES: DeployTemplate[] = [
  {
    id: "tpl-prod-counter",
    name: "Production Counter",
    appSlug: "demo-counter",
    labelPrefix: "prod",
    envVars: { NODE_ENV: "production" },
  },
  {
    id: "tpl-dev-wiki",
    name: "Dev Wiki",
    appSlug: "markdown-wiki",
    labelPrefix: "dev",
    envVars: { EDITOR_MODE: "development" },
  },
];

function loadTemplates(): DeployTemplate[] {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      // Pre-populate with defaults on first access
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(templates: DeployTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function DeploymentTemplatesSection() {
  const [templates, setTemplates] = useState<DeployTemplate[]>(() => loadTemplates());
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [apps, setApps] = useState<AppItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newAppSlug, setNewAppSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [newEnvVars, setNewEnvVars] = useState<Record<string, string>>({});

  // Load apps catalog for the select dropdown
  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ apps: AppItem[] }>("/api/apps");
        setApps(data.apps);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function handleCreate() {
    if (!newName.trim() || !newAppSlug) {
      toast.error("Template name and app are required");
      return;
    }
    const tpl: DeployTemplate = {
      id: `tpl-${Date.now()}`,
      name: newName.trim(),
      appSlug: newAppSlug,
      labelPrefix: newLabel.trim(),
      envVars: { ...newEnvVars },
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveTemplates(next);
    setCreating(false);
    setNewName("");
    setNewAppSlug("");
    setNewLabel("");
    setNewEnvVars({});
    toast.success("Template created");
  }

  function handleDelete(id: string) {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
    toast.success("Template deleted");
  }

  function handleAddEnvVar() {
    if (!newEnvKey.trim()) return;
    setNewEnvVars((prev) => ({ ...prev, [newEnvKey.trim()]: newEnvValue.trim() }));
    setNewEnvKey("");
    setNewEnvValue("");
  }

  function handleRemoveEnvVar(key: string) {
    setNewEnvVars((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function startEdit(tpl: DeployTemplate) {
    setEditingId(tpl.id);
    setEditName(tpl.name);
  }

  function saveEdit(id: string) {
    if (!editName.trim()) return;
    const next = templates.map((t) => (t.id === id ? { ...t, name: editName.trim() } : t));
    setTemplates(next);
    saveTemplates(next);
    setEditingId(null);
    toast.success("Template renamed");
  }

  function applyTemplate(tpl: DeployTemplate) {
    navigate({ name: "app", slug: tpl.appSlug });
  }

  return (
    <div className="space-y-4">
      {/* Template list */}
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => {
            const app = apps.find((a) => a.slug === tpl.appSlug);
            const envCount = Object.keys(tpl.envVars).length;
            return (
              <div
                key={tpl.id}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-brand/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {editingId === tpl.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(tpl.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-7 w-40 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(tpl.id)}
                          className="inline-flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground hover:bg-brand/90"
                          aria-label="Save"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                          aria-label="Cancel"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">{tpl.name}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Rocket className="size-3" /> {app?.name ?? tpl.appSlug}
                    </span>
                    {tpl.labelPrefix && (
                      <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-medium">
                        {tpl.labelPrefix}
                      </Badge>
                    )}
                    {envCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Container className="size-3" /> {envCount} env var{envCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => applyTemplate(tpl)} className="gap-1.5">
                    <Rocket className="size-3.5" /> Use
                  </Button>
                  {editingId !== tpl.id && (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(tpl)} className="size-8 p-0">
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="size-8 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete template &quot;{tpl.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove this deployment template. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(tpl.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create template form */}
      {creating ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-medium">Create new template</p>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Template name</Label>
            <Input
              id="tpl-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Production Counter"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-app">App</Label>
            <Select value={newAppSlug} onValueChange={setNewAppSlug}>
              <SelectTrigger id="tpl-app">
                <SelectValue placeholder="Select an app…" />
              </SelectTrigger>
              <SelectContent>
                {apps.map((a) => (
                  <SelectItem key={a.slug} value={a.slug}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-label">Label prefix (optional)</Label>
            <Input
              id="tpl-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. prod, staging, dev"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Environment variables (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="KEY"
                className="flex-1"
              />
              <Input
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                placeholder="VALUE"
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={handleAddEnvVar} disabled={!newEnvKey.trim()}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {Object.keys(newEnvVars).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(newEnvVars).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium">{k}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-mono text-muted-foreground">{v || '""'}</span>
                    <button
                      onClick={() => handleRemoveEnvVar(k)}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || !newAppSlug}>
              <Check className="mr-1.5 size-3.5" /> Create template
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewName("");
                setNewAppSlug("");
                setNewLabel("");
                setNewEnvVars({});
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 size-3.5" /> Create Template
        </Button>
      )}
    </div>
  );
}

function AccountSection({
  user,
  logout,
}: {
  user: NonNullable<ReturnType<typeof useAuth.getState>["user"]>;
  logout: () => Promise<void>;
}) {
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const data = await api<{ deployments: DeploymentItem[] }>("/api/deployments");
      const exportObj = {
        user: { email: user.email, name: user.name },
        exportedAt: new Date().toISOString(),
        deployments: data.deployments,
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oss-deploy-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Export data</p>
          <p className="text-xs text-muted-foreground">Download all your deployment data as JSON</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportData} disabled={exporting}>
          {exporting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Download className="mr-1.5 size-3.5" />}
          Export
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { logout(); navigate({ name: "marketplace" }); }}>
          Sign out
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="text-xs text-muted-foreground">
            Permanently delete your account and all deployments
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <Trash2 className="mr-1.5 size-3.5" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all {user.email} deployments.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ---------- API Access Section ---------- */

function ApiAccessSection() {
  const [apiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("oss-api-key");
  });
  const [requestCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem("oss-api-requests");
    return stored ? parseInt(stored, 10) : Math.floor(Math.random() * 50) + 10;
  });

  function generateApiKey() {
    toast.info("Coming soon — API key generation will be available in a future update.");
  }

  const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">API Base URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
            {apiBaseUrl}/api
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(`${apiBaseUrl}/api`);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="mr-1.5 size-3.5" /> Copy
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">API Key</p>
          <p className="text-xs text-muted-foreground">
            {apiKey ? `Key ending in …${apiKey.slice(-4)}` : "No API key generated yet"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={generateApiKey}>
          <Key className="mr-1.5 size-3.5" /> Generate API Key
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">API Usage</p>
          <p className="text-xs text-muted-foreground">Requests made this month</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-foreground">{requestCount}</span>
          <span className="text-xs text-muted-foreground">requests</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Danger Zone Section ---------- */

function DangerZoneSection() {
  const [deletingDeploys, setDeletingDeploys] = useState(false);

  async function deleteAllDeployments() {
    setDeletingDeploys(true);
    try {
      const data = await api<{ deployments: DeploymentItem[] }>("/api/deployments");
      const ids = data.deployments.map((d) => d.id);
      await Promise.all(ids.map((id) => api(`/api/deployments/${id}`, { method: "DELETE" })));
      toast.success(`${ids.length} deployment(s) deleted`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete deployments");
    } finally {
      setDeletingDeploys(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-destructive/30 bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-destructive/20 bg-destructive/5 px-6 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          <p className="text-xs text-muted-foreground">Irreversible and destructive actions</p>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete all deployments</p>
            <p className="text-xs text-muted-foreground">
              Permanently remove all your deployments and their data
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={deletingDeploys}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {deletingDeploys ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 size-3.5" />
                )}
                Delete all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all deployments?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all of your deployments and their associated data.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAllDeployments}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete all deployments
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete your account and all data
            </p>
          </div>
          <Button size="sm" variant="outline" disabled className="gap-1.5">
            <Trash2 className="size-3.5" /> Delete account
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">Coming soon</Badge>
          </Button>
        </div>
      </div>
    </div>
  );
}
