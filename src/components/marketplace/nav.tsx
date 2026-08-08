"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, LayoutDashboard, LogOut, Store, Menu, Command, Settings, Shield, Keyboard } from "lucide-react";
import { useAuth, navigate } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/marketplace/notification-center";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Nav() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const hydrating = useAuth((s) => s.hydrating);
  const hydrated = !hydrating;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/marketplace";
    }
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur transition-shadow duration-200 supports-[backdrop-filter]:bg-background/60 ${scrolled ? "nav-scrolled" : ""}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <button
          onClick={() => navigate({ name: "marketplace" })}
          className="group flex items-center gap-2.5"
          aria-label="OSS Deploy home"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm transition-transform group-hover:scale-105">
            <Rocket className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight">OSS Deploy</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Marketplace
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1.5 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate({ name: "marketplace" })}
          >
            <Store className="size-4" /> Marketplace
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate({ name: "dashboard" })}
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Button>
          )}

          {user && <NotificationCenter />}
          <ThemeToggle />

          {/* Cmd+K hint */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-1.5 text-muted-foreground sm:flex"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            title="Command palette (⌘K)"
          >
            <Command className="size-3.5" />
            <span className="text-xs">K</span>
          </Button>

          {/* Keyboard shortcuts help */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground sm:flex"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", metaKey: true }));
            }}
            title="Keyboard shortcuts (⌘/)"
          >
            <Keyboard className="size-3.5" />
          </Button>

          {hydrated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="size-9 border border-border">
                    <AvatarFallback className="bg-brand-soft text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {initials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium">{user.name || user.email}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ name: "dashboard" })}>
                  <LayoutDashboard className="mr-2 size-4" /> My deployments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ name: "marketplace" })}>
                  <Store className="mr-2 size-4" /> Browse apps
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ name: "settings" })}>
                  <Settings className="mr-2 size-4" /> Settings
                </DropdownMenuItem>
                {user.isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ name: "admin" })}>
                    <Shield className="mr-2 size-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : hydrated ? (
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate({ name: "login" })}>
              Sign in
            </Button>
          ) : (
            <div className="size-9" />
          )}
        </nav>

        {/* Mobile hamburger + minimal actions */}
        <div className="flex items-center gap-1.5 sm:hidden">
          {user && <NotificationCenter />}
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                    <Rocket className="size-4" />
                  </span>
                  <span className="text-sm font-bold">OSS Deploy</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                <Button
                  variant="ghost"
                  className="justify-start gap-2"
                  onClick={() => { navigate({ name: "marketplace" }); setMobileOpen(false); }}
                >
                  <Store className="size-4" /> Marketplace
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={() => { navigate({ name: "dashboard" }); setMobileOpen(false); }}
                  >
                    <LayoutDashboard className="size-4" /> Dashboard
                  </Button>
                )}
                {user && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={() => { navigate({ name: "settings" }); setMobileOpen(false); }}
                  >
                    <Settings className="size-4" /> Settings
                  </Button>
                )}
                {user?.isAdmin && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={() => { navigate({ name: "admin" }); setMobileOpen(false); }}
                  >
                    <Shield className="size-4" /> Admin
                  </Button>
                )}
                <div className="my-2 border-t border-border" />
                {hydrated && user ? (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Avatar className="size-8 border border-border">
                        <AvatarFallback className="bg-brand-soft text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          {initials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{user.name || user.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => { logout(); setMobileOpen(false); }}
                    >
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </>
                ) : hydrated ? (
                  <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => { navigate({ name: "login" }); setMobileOpen(false); }}>
                    Sign in
                  </Button>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}
