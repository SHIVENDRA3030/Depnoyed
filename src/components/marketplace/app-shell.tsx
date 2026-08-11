"use client";

import { useAuth, navigate, type Route } from "@/lib/store";
import {
  LayoutDashboard,
  Store,
  Server,
  CreditCard,
  Settings as SettingsIcon,
  HelpCircle,
  Activity,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationCenter } from "@/components/marketplace/notification-center";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export function AppShell({ children, route }: { children: React.ReactNode; route: Route }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [route.name]);

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, route: "dashboard" },
    { name: "Marketplace", icon: Store, route: "marketplace" },
    { name: "Deployments", icon: Server, route: "deployments" },
  ];

  const secondaryItems = [
    { name: "Usage", icon: Activity, route: "usage" },
    { name: "Billing", icon: CreditCard, route: "billing" },
  ];

  const bottomItems = [
    { name: "Settings", icon: SettingsIcon, route: "settings" },
    { name: "Help", icon: HelpCircle, route: "help" },
  ];

  if (!user) return <>{children}</>;

  const isActive = (r: string) =>
    route.name === r || (r === "deployments" && route.name === "deployment");

  const NavLinks = () => (
    <nav className="flex flex-col flex-1 overflow-y-auto scroll-thin gap-6 w-full">
      {/* Primary nav */}
      <div className="flex flex-col gap-0.5">
        <span className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-[rgba(255,255,255,0.25)]">
          Platform
        </span>
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate({ name: item.route as any })}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${isActive(item.route)
                ? "bg-brand-soft text-brand border border-brand/20"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
              }`}
          >
            <item.icon
              className={`h-4 w-4 shrink-0 transition-colors ${isActive(item.route) ? "text-brand" : "text-muted-foreground group-hover:text-foreground/70"
                }`}
            />
            <span className="font-medium">{item.name}</span>
            {isActive(item.route) && (
              <span className="ml-auto w-1 h-4 rounded-full bg-brand opacity-80" />
            )}
          </button>
        ))}
      </div>

      {/* Secondary nav */}
      <div className="flex flex-col gap-0.5">
        <span className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/60">
          Account
        </span>
        {secondaryItems.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate({ name: item.route as any })}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${isActive(item.route)
                ? "bg-brand-soft text-brand border border-brand/20"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
              }`}
          >
            <item.icon
              className={`h-4 w-4 shrink-0 transition-colors ${isActive(item.route) ? "text-brand" : "text-muted-foreground group-hover:text-foreground/70"
                }`}
            />
            <span className="font-medium">{item.name}</span>
          </button>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="mt-auto flex flex-col gap-0.5">
        <div className="h-px bg-border mb-3" />
        {bottomItems.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate({ name: item.route as any })}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${isActive(item.route)
                ? "bg-brand-soft text-brand border border-brand/20"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
              }`}
          >
            <item.icon
              className={`h-4 w-4 shrink-0 transition-colors ${isActive(item.route) ? "text-brand" : "text-muted-foreground group-hover:text-foreground/70"
                }`}
            />
            <span className="font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="sticky top-0 h-screen hidden md:flex w-60 flex-col shrink-0 p-4 bg-card border-r border-border"
      >
        {/* Logo */}
        <button
          className="flex items-center gap-2.5 px-2 mb-8 group"
          onClick={() => navigate({ name: "landing" })}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-brand"
          >
            <span className="text-brand-foreground font-bold text-xs font-mono">D</span>
          </div>
          <span
            className="font-mono text-[13px] font-semibold tracking-[0.10em] uppercase group-hover:text-brand transition-colors text-foreground"
          >
            DEPLOYED
          </span>
        </button>

        <NavLinks />

        {/* User footer */}
        <div className="mt-4 pt-4 shrink-0 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback
                    className="text-xs font-bold bg-brand-soft text-brand"
                  >
                    {user.email.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user.name || "User"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card border-border">
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-foreground/70 hover:text-foreground hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate({ name: "settings" })}
              >
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-foreground/70 hover:text-foreground hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate({ name: "billing" })}
              >
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                onClick={() => logout()}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header
          className="sticky top-0 z-50 flex h-14 items-center justify-between px-4 md:hidden border-b border-border bg-background/90 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 flex flex-col p-4 bg-card border-r border-border"
              >
                <SheetHeader className="text-left mb-6">
                  <SheetTitle className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-brand"
                    >
                      <span className="text-brand-foreground font-bold text-xs font-mono">D</span>
                    </div>
                    <span className="font-mono text-[13px] font-semibold tracking-[0.10em] uppercase text-foreground">
                      DEPLOYED
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <NavLinks />
              </SheetContent>
            </Sheet>
            <span className="font-mono text-[13px] font-semibold tracking-[0.10em] uppercase text-foreground">
              DEPLOYED
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Desktop topbar notification area */}
        <header
          className="sticky top-0 z-40 hidden md:flex h-12 items-center justify-end px-6 gap-2 border-b border-border bg-background/50 backdrop-blur-md"
        >
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NotificationCenter />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 relative bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
