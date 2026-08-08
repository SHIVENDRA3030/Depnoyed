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
import { Loader2 } from "lucide-react";
import { CommandPalette } from "@/components/marketplace/command-palette";
import { OnboardingBanner } from "@/components/marketplace/onboarding-banner";

export function MarketplaceApp() {
  const [route, setRoute] = useState<Route>(() =>
    typeof window !== "undefined" ? parseHash() : { name: "marketplace" },
  );
  const user = useAuth((s) => s.user);
  const hydrating = useAuth((s) => s.hydrating);
  const hydrate = useAuth((s) => s.hydrate);

  // Hydrate the session once on mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hash-based router. Initial route is captured by the lazy state initializer;
  // we only subscribe to future hash changes here.
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Auth-gate protected routes. Public: marketplace, app detail, login.
  useEffect(() => {
    if (hydrating) return;
    const protectedRoute = route.name === "dashboard" || route.name === "deployment" || route.name === "settings";
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

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <OnboardingBanner />
      <main className="flex-1">
        {hydrating ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : (
          <RouteView route={route} />
        )}
      </main>
      <Footer />
      <CommandPalette />
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
    case "deployment":
      return <DeploymentView id={route.id} />;
    default:
      return <MarketplaceView />;
  }
}
