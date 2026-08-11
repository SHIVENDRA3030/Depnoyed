"use client";

import { useEffect, useState } from "react";
import { useAuth, parseHash, navigate, type Route } from "@/lib/store";
import { Nav } from "@/components/marketplace/nav";
import { Footer } from "@/components/marketplace/footer";
import { LoginView } from "@/components/marketplace/views/login-view";
import { MarketplaceView } from "@/components/marketplace/views/marketplace-view";
import { AppDetailView } from "@/components/marketplace/views/app-detail-view";
import { DashboardView } from "@/components/marketplace/views/dashboard-view";
import { DeploymentView } from "@/components/marketplace/views/deployment-view";
import { SettingsView } from "@/components/marketplace/views/settings-view";
import { AdminView } from "@/components/marketplace/views/admin-view";
import { BillingView } from "@/components/marketplace/views/billing-view";
import { LandingView } from "@/components/marketplace/views/landing-view";
import { DeploymentsListView } from "@/components/marketplace/views/deployments-list-view";
import { UsageView } from "@/components/marketplace/views/usage-view";
import { HelpView } from "@/components/marketplace/views/help-view";
import { AppShell } from "@/components/marketplace/app-shell";
import { Loader2 } from "lucide-react";
import { CommandPalette } from "@/components/marketplace/command-palette";
import { OnboardingBanner } from "@/components/marketplace/onboarding-banner";
import { KeyboardShortcuts } from "@/components/marketplace/keyboard-shortcuts";
import { CompareTray } from "@/components/marketplace/compare-tray";

export function MarketplaceApp() {
  const [route, setRoute] = useState<Route>({ name: "landing" });
  const user = useAuth((s) => s.user);
  const hydrating = useAuth((s) => s.hydrating);
  const hydrate = useAuth((s) => s.hydrate);

  // Hydrate the session once on mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hash-based router.
  useEffect(() => {
    setRoute(parseHash());
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Auth-gate protected routes. Public: marketplace, app detail, login.
  useEffect(() => {
    if (hydrating) return;
    const protectedRoute = route.name === "dashboard" || route.name === "deployment" || route.name === "settings" || route.name === "admin";
    if (protectedRoute && !user) {
      navigate({ name: "login" });
    }
  }, [route, user, hydrating]);

  // After login, bounce away from the login screen.
  useEffect(() => {
    if (!hydrating && user && route.name === "login") {
      navigate({ name: "dashboard" });
    }
  }, [user, route, hydrating]);

  // G + key navigation (vim-style)
  useEffect(() => {
    let prefixPressed = false;
    let timeout: ReturnType<typeof setTimeout>;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "g" && !prefixPressed) {
        prefixPressed = true;
        clearTimeout(timeout);
        timeout = setTimeout(() => { prefixPressed = false; }, 1000);
        return;
      }
      if (prefixPressed && user) {
        prefixPressed = false;
        clearTimeout(timeout);
        const key = e.key.toLowerCase();
        if (key === "m") { e.preventDefault(); navigate({ name: "marketplace" }); }
        else if (key === "d") { e.preventDefault(); navigate({ name: "dashboard" }); }
        else if (key === "s") { e.preventDefault(); navigate({ name: "settings" }); }
        else if (key === "a" && user.isAdmin) { e.preventDefault(); navigate({ name: "admin" }); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(timeout); };
  }, [user]);

  const isAppShellRoute = user && ["dashboard", "deployment", "settings", "admin", "usage", "billing", "marketplace", "app", "deployments", "help"].includes(route.name);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isAppShellRoute && route.name !== 'landing' && route.name !== 'login' && <Nav />}
      {!isAppShellRoute && route.name !== 'landing' && route.name !== 'login' && <OnboardingBanner />}
      
      {isAppShellRoute ? (
        <AppShell route={route}>
          {hydrating ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RouteView route={route} />
          )}
        </AppShell>
      ) : (
        <main className="flex-1">
          {hydrating ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RouteView route={route} />
          )}
        </main>
      )}

      {!isAppShellRoute && route.name !== 'landing' && route.name !== 'login' && <Footer />}
      <CommandPalette />
      <KeyboardShortcuts />
      <CompareTray />
    </div>
  );
}

function RouteView({ route }: { route: Route }) {
  return (
    <div className="view-fade-in" key={routeToKey(route)}>
      <InnerRouteView route={route} />
    </div>
  );
}

function routeToKey(route: Route): string {
  switch (route.name) {
    case "app": return `app-${route.slug}`;
    case "deployment": return `dep-${route.id}`;
    default: return route.name;
  }
}

function InnerRouteView({ route }: { route: Route }) {
  switch (route.name) {
    case "landing":
      return <LandingView />;
    case "login":
      return <LoginView />;
    case "marketplace":
      return <MarketplaceView />;
    case "app":
      return <AppDetailView slug={route.slug} />;
    case "dashboard":
      return <DashboardView />;
    case "settings":
      return <SettingsView />;
    case "billing":
      return <BillingView />;
    case "admin":
      return <AdminView />;
    case "deployment":
      return <DeploymentView id={route.id} />;
    case "deployments":
      return <DeploymentsListView />;
    case "usage":
      return <UsageView />;
    case "help":
      return <HelpView />;
    default:
      return <LandingView />;
  }
}
