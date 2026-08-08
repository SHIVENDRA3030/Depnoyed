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
} from "lucide-react";
import { api, useAuth, navigate, type DeploymentItem, ApiError } from "@/lib/store";
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, deployments, and preferences.
        </p>
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

        {/* Notifications */}
        <SettingsCard
          icon={<Bell className="size-5" />}
          title="Notifications"
          description="Choose what you want to be notified about"
        >
          <NotificationsSection />
        </SettingsCard>

        {/* Account Actions */}
        <SettingsCard
          icon={<Key className="size-5" />}
          title="Account"
          description="Export data, sign out, or delete your account"
        >
          <AccountSection user={user} logout={logout} />
        </SettingsCard>
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-6 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
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
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-md">
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

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <Zap className="size-3.5" /> These are client-side preferences
        </p>
        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
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
