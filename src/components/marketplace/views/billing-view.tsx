"use client";

import { useAuth, navigate } from "@/lib/store";
import { CreditCard, Activity, Cpu, HardDrive, Globe, Zap, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function getProgressColor(value: number, max: number = 100) {
  const percent = (value / max) * 100;
  if (percent < 60) return { 
    text: "text-emerald-500", 
    bg: "bg-emerald-500/10",
    bar: "text-emerald-500" // We'll pass this directly to Progress className since we changed progress.tsx to use text color for the indicator
  };
  if (percent < 85) return { 
    text: "text-amber-500", 
    bg: "bg-amber-500/10",
    bar: "text-amber-500" 
  };
  return { 
    text: "text-red-500", 
    bg: "bg-red-500/10",
    bar: "text-red-500" 
  };
}

export function BillingView() {
  const user = useAuth((s) => s.user);

  if (!user) {
    navigate({ name: "login" });
    return null;
  }

  // Mock data for usage and billing
  const currentPlan = "Hobby";
  const nextBillingDate = "Sep 1, 2026";
  const computeUsage = 34; // percent
  const storageUsage = 68; // percent
  const bandwidthUsage = 12; // percent
  const domainsUsed = 2;
  const domainsLimit = 5;

  const computeColors = getProgressColor(computeUsage);
  const storageColors = getProgressColor(storageUsage);
  const bandwidthColors = getProgressColor(bandwidthUsage);
  const domainColors = getProgressColor(domainsUsed, domainsLimit);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Usage & Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription plan, payment methods, and monitor resource usage.
        </p>
      </div>

      {/* Banner Alerts */}
      <div className="mb-8 flex flex-col gap-4">
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment method expiring soon</AlertTitle>
          <AlertDescription>
            Your card ending in 4242 will expire on 12/28. Please update your payment method to avoid service interruption.
          </AlertDescription>
        </Alert>
        
        {storageUsage >= 60 && (
          <Alert className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Storage capacity warning</AlertTitle>
            <AlertDescription>
              Your persistent storage usage is at {storageUsage}%. Consider upgrading to the Pro plan for more capacity.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        {/* Current Plan Card */}
        <div className="md:col-span-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300">
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <h2 className="text-3xl font-bold tracking-tight">{currentPlan}</h2>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-emerald-500/10 dark:text-emerald-500">Active</Badge>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-brand-soft text-brand">
                <Zap className="h-6 w-6" />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              You are currently on the free Hobby plan. Upgrade to Pro for more resources and priority support.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm">
                Upgrade to Pro
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                View all plans
              </Button>
            </div>
          </div>
          <div className="bg-muted/30 border-t border-border px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Next billing cycle: {nextBillingDate}</span>
            <span className="text-xs font-medium">$0.00 / month</span>
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
          <div className="p-8 flex-1">
            <h3 className="text-sm font-semibold mb-4">Payment Method</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 mb-4">
              <div className="h-8 w-12 rounded bg-background border border-border flex items-center justify-center shadow-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">•••• 4242</p>
                <p className="text-[10px] text-red-500 font-medium">Expires 12/28</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This card will be charged for any extra usage beyond the Hobby plan limits.
            </p>
          </div>
          <div className="bg-muted/30 border-t border-border px-6 py-3">
            <button className="text-xs font-medium text-brand hover:text-brand/80 transition-colors w-full text-left">
              Update payment method
            </button>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Current Usage</h2>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Compute Usage */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${computeColors.bg} ${computeColors.text}`}>
                <Cpu className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Compute Hours</h3>
            </div>
            <span className="text-xs text-muted-foreground">340 / 1000 hrs</span>
          </div>
          <Progress value={computeUsage} className={`h-2 mb-3 ${computeColors.bar}`} />
          <p className="text-xs text-muted-foreground">
            {computeUsage}% of included compute used this month.
          </p>
        </div>

        {/* Storage Usage */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-6 border-l-4" style={{ borderLeftColor: storageUsage >= 60 ? (storageUsage >= 85 ? '#ef4444' : '#f59e0b') : 'transparent' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${storageColors.bg} ${storageColors.text}`}>
                <HardDrive className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Persistent Storage</h3>
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-500">6.8 / 10 GB</span>
          </div>
          <Progress value={storageUsage} className={`h-2 mb-3 ${storageColors.bar}`} />
          <p className="text-xs text-muted-foreground">
            {storageUsage}% of included storage used across all volumes.
          </p>
        </div>

        {/* Bandwidth Usage */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${bandwidthColors.bg} ${bandwidthColors.text}`}>
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Network Bandwidth</h3>
            </div>
            <span className="text-xs text-muted-foreground">12 / 100 GB</span>
          </div>
          <Progress value={bandwidthUsage} className={`h-2 mb-3 ${bandwidthColors.bar}`} />
          <p className="text-xs text-muted-foreground">
            {bandwidthUsage}% of included egress bandwidth used.
          </p>
        </div>

        {/* Custom Domains */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${domainColors.bg} ${domainColors.text}`}>
                <Globe className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Custom Domains</h3>
            </div>
            <span className="text-xs text-muted-foreground">{domainsUsed} / {domainsLimit}</span>
          </div>
          <div className="flex gap-1 mb-4 mt-2">
            {Array.from({ length: domainsLimit }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 h-2 rounded-full ${i < domainsUsed ? 'bg-current ' + domainColors.text : 'bg-secondary/40'}`} 
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            You have {domainsLimit - domainsUsed} custom domains remaining on your current plan.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-12">
        <div className="p-8">
          <h2 className="text-sm font-semibold mb-4">Recent Invoices</h2>
          <div className="space-y-4">
            {[
              { date: "Aug 1, 2026", amount: "$0.00", status: "Paid", invoice: "INV-2026-08" },
              { date: "Jul 1, 2026", amount: "$0.00", status: "Paid", invoice: "INV-2026-07" },
              { date: "Jun 1, 2026", amount: "$0.00", status: "Paid", invoice: "INV-2026-06" },
            ].map((invoice) => (
              <div key={invoice.invoice} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{invoice.date}</p>
                  <p className="text-xs text-muted-foreground">{invoice.invoice}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-emerald-500/10 dark:text-emerald-500 shadow-none">
                    {invoice.status}
                  </Badge>
                  <span className="text-sm font-medium tabular-nums">{invoice.amount}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
