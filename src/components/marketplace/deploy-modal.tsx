"use client";

import { useState } from "react";
import {
  Rocket,
  Loader2,
  Container,
  Database,
  Globe,
  ShieldCheck,
  Cpu,
  MemoryStick,
  Tag,
  Plus,
  X,
  Variable,
  Calculator,
  Network,
  HardDrive,
} from "lucide-react";
import { api, navigate, type AppItem, type DeploymentItem, ApiError } from "@/lib/store";
import { AppLogo } from "@/components/marketplace/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DeployModalProps {
  app: AppItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful deployment with the deployment item */
  onDeployed?: (deployment: DeploymentItem) => void;
}

export function DeployModal({ app, open, onOpenChange, onDeployed }: DeployModalProps) {
  const [label, setLabel] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>([]);
  const [deploying, setDeploying] = useState(false);

  function addEnvPair() {
    setEnvPairs((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeEnvPair(idx: number) {
    setEnvPairs((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEnvPair(idx: number, field: "key" | "value", val: string) {
    setEnvPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const body: Record<string, unknown> = { appId: app.id };
      if (label.trim()) body.label = label.trim();
      if (subdomain.trim()) body.subdomain = subdomain.trim();
      
      // Add env vars if any
      const envObj: Record<string, string> = {};
      for (const p of envPairs) {
        if (p.key.trim() && p.value) envObj[p.key.trim()] = p.value;
      }
      if (Object.keys(envObj).length > 0) body.envVars = envObj;

      const { deployment } = await api<{ deployment: DeploymentItem }>('/api/deployments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('Deployment created!');
      onOpenChange(false);
      setLabel("");
      setEnvPairs([]);
      onDeployed?.(deployment);
      navigate({ name: "deployment", id: deployment.id });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toast.error("Your session expired. Please sign in to deploy.");
        onOpenChange(false);
        navigate({ name: "login" });
      } else {
        toast.error(e instanceof ApiError ? e.message : "Deployment failed");
      }
    } finally {
      setDeploying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
              <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="md" />
            </div>
            <div>
              <span className="block font-semibold">Deploy {app.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {app.category}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Label input */}
          <div className="space-y-1.5">
            <label
              htmlFor="deploy-label"
              className="text-xs font-medium text-foreground"
            >
              Deployment Name (Optional)
            </label>
            <Input
              id="deploy-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. prod, staging, client-A"
              disabled={deploying}
              className="bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDeploy();
              }}
            />
          </div>

          {/* Subdomain input */}
          <div className="space-y-1.5">
            <label
              htmlFor="deploy-subdomain"
              className="text-xs font-medium text-foreground"
            >
              Custom Subdomain (Optional)
            </label>
            <div className="flex rounded-md shadow-sm">
              <Input
                id="deploy-subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-app-name"
                disabled={deploying}
                className="bg-background rounded-r-none border-r-0 focus-visible:z-10"
              />
              <span className="inline-flex items-center rounded-r-md border border-l-0 border-border bg-muted px-3 text-muted-foreground text-sm">
                .apps.local
              </span>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Environment Variables
              </label>
              <button
                type="button"
                onClick={addEnvPair}
                disabled={deploying || envPairs.length >= 10}
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline disabled:opacity-50"
              >
                <Plus className="size-3" /> Add Variable
              </button>
            </div>
            {envPairs.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border border-border/50 text-center">
                No custom environment variables.
              </p>
            ) : (
              <div className="space-y-2">
                {envPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={pair.key}
                      onChange={(e) => updateEnvPair(idx, "key", e.target.value)}
                      placeholder="KEY"
                      disabled={deploying}
                      className="flex-1 font-mono text-xs bg-background"
                    />
                    <Input
                      value={pair.value}
                      onChange={(e) => updateEnvPair(idx, "value", e.target.value)}
                      placeholder="Value"
                      disabled={deploying}
                      className="flex-1 text-xs bg-background"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvPair(idx)}
                      disabled={deploying}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deploying}
            className="bg-background"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={deploying}
            className={`min-w-[120px] transition-all ${deploying ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-foreground text-background hover:bg-foreground/90"}`}
          >
            {deploying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deploying...
              </>
            ) : (
              "Deploy Application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </li>
  );
}
