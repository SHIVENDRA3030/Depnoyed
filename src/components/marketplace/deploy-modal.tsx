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
  const [deploying, setDeploying] = useState(false);

  async function handleDeploy() {
    setDeploying(true);
    try {
      const body: Record<string, string> = { appId: app.id };
      if (label.trim()) body.label = label.trim();

      const { deployment } = await api<{ deployment: DeploymentItem }>("/api/deployments", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Deployment created!");
      onOpenChange(false);
      setLabel("");
      onDeployed?.(deployment);
      navigate({ name: "deployment", id: deployment.id });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AppLogo logo={app.logo} simulator={app.simulator} name={app.name} size="lg" />
            <div>
              <span className="block">Deploy {app.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {app.category} · {app.dockerImage}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>
            Configure and launch your own isolated instance.
          </DialogDescription>
        </DialogHeader>

        {/* Label input */}
        <div className="space-y-1.5">
          <label
            htmlFor="deploy-label"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <Tag className="size-3" /> Label (optional)
          </label>
          <Input
            id="deploy-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. prod, staging, client-A"
            disabled={deploying}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDeploy();
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            A short label to help you identify this deployment in your dashboard.
          </p>
        </div>

        {/* What you get summary */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What you&apos;ll get
          </p>
          <ul className="space-y-2 text-sm">
            <SummaryRow
              icon={<Container className="size-4 text-brand" />}
              title="Isolated container"
              desc={`${app.dockerImage} · port ${app.containerPort}`}
            />
            <SummaryRow
              icon={<Database className="size-4 text-brand" />}
              title="Persistent volume"
              desc="Data survives stop / restart"
            />
            <SummaryRow
              icon={<Globe className="size-4 text-brand" />}
              title="Unique public URL"
              desc="<subdomain>.apps.local"
            />
            <SummaryRow
              icon={<ShieldCheck className="size-4 text-brand" />}
              title="Tenant isolation"
              desc="Only you can access it"
            />
          </ul>
          <div className="mt-3 flex items-center gap-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Cpu className="size-3" /> 0.5 core
            </span>
            <span className="flex items-center gap-1">
              <MemoryStick className="size-3" /> 512 MB
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={deploying}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {deploying ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 size-4" />
            )}
            {deploying ? "Deploying…" : "Deploy now"}
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
