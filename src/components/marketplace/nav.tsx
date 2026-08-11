"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogOut, Store, Menu, Command, Settings, Shield, Keyboard, Sun, Moon } from "lucide-react";
import { useAuth, navigate } from "@/lib/store";
import { NotificationCenter } from "@/components/marketplace/notification-center";
import { useTheme } from "next-themes";
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
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const hydrating = useAuth((s) => s.hydrating);
  const [hydrated, setHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setHydrated(true);
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
      className="sticky top-0 z-40 transition-all duration-200"
      style={{
        background: scrolled ? "rgba(5,5,5,0.92)" : "rgba(5,5,5,0.75)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <button
          onClick={() => navigate({ name: "marketplace" })}
          className="group flex items-center gap-2.5"
          aria-label="DEPLOYED home"
        >
          {/* Orange dot + monospace wordmark */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
            style={{ background: "#FF6A00" }}
          >
            <span className="text-[#050505] font-bold text-xs font-mono leading-none">D</span>
          </div>
          <span
            className="font-mono text-[13px] font-semibold tracking-[0.12em] uppercase transition-colors group-hover:text-[#FF6A00]"
            style={{ color: "#F5F5F0" }}
          >
            DEPNOYED
          </span>
          <span
            className="hidden sm:block text-[10px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
            style={{
              color: "rgba(255,106,0,0.70)",
              borderColor: "rgba(255,106,0,0.25)",
              background: "rgba(255,106,0,0.08)",
            }}
          >
            Beta
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          <button
            onClick={() => navigate({ name: "marketplace" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 text-[rgba(255,255,255,0.50)] hover:text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.05)]"
          >
            <Store className="size-4" />
            Marketplace
          </button>
          {user && (
            <button
              onClick={() => navigate({ name: "dashboard" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 text-[rgba(255,255,255,0.50)] hover:text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.05)]"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </button>
          )}

          {user && <NotificationCenter />}

          {/* Theme Toggle */}
          {hydrated && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden sm:flex items-center px-2 py-1.5 rounded-lg text-sm transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          )}

          {/* Cmd+K hint */}
          <button
            className="hidden gap-1.5 sm:flex items-center px-2 py-1.5 rounded-lg text-sm transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            title="Command palette (⌘K)"
          >
            <Command className="size-3.5" />
            <span className="text-xs font-mono">K</span>
          </button>

          <button
            className="hidden sm:flex items-center px-2 py-1.5 rounded-lg text-sm transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", metaKey: true }));
            }}
            title="Keyboard shortcuts (⌘/)"
          >
            <Keyboard className="size-3.5" />
          </button>

          {hydrated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                  <Avatar className="size-8 border border-border">
                    <AvatarFallback
                      className="text-xs font-bold bg-brand-soft text-brand"
                    >
                      {initials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#0f0f10] border-[rgba(255,255,255,0.10)]"
              >
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium text-[#F5F5F0]">{user.name || user.email}</span>
                  <span className="truncate text-xs font-normal text-[rgba(255,255,255,0.40)]">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.07)]" />
                <DropdownMenuItem
                  onClick={() => navigate({ name: "dashboard" })}
                  className="text-[rgba(255,255,255,0.70)] hover:text-[#F5F5F0] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer"
                >
                  <LayoutDashboard className="mr-2 size-4" /> My deployments
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ name: "marketplace" })}
                  className="text-[rgba(255,255,255,0.70)] hover:text-[#F5F5F0] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer"
                >
                  <Store className="mr-2 size-4" /> Browse apps
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ name: "settings" })}
                  className="text-[rgba(255,255,255,0.70)] hover:text-[#F5F5F0] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer"
                >
                  <Settings className="mr-2 size-4" /> Settings
                </DropdownMenuItem>
                {user.isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate({ name: "admin" })}
                    className="text-[rgba(255,255,255,0.70)] hover:text-[#F5F5F0] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer"
                  >
                    <Shield className="mr-2 size-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.07)]" />
                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300 hover:bg-[rgba(239,68,68,0.08)] cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : hydrated ? (
            <button
              onClick={() => navigate({ name: "login" })}
              className="ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold font-mono tracking-wide uppercase transition-all duration-150 hover:-translate-y-px"
              style={{
                background: "#FF6A00",
                color: "#050505",
              }}
            >
              Sign In
            </button>
          ) : (
            <div className="size-8" />
          )}
        </nav>

        {/* Mobile */}
        <div className="flex items-center gap-1.5 sm:hidden">
          {user && <NotificationCenter />}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 px-2 text-[rgba(255,255,255,0.60)] hover:text-[#F5F5F0] hover:bg-[rgba(255,255,255,0.06)]"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72"
              style={{ background: "#050505", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
            >
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ background: "#FF6A00" }}
                  >
                    <span className="text-[#050505] font-bold text-xs font-mono">D</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tracking-[0.10em] uppercase text-[#F5F5F0]">
                    DEPNOYED
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 mt-4">
                {[
                  { label: "Marketplace", icon: Store, route: "marketplace" },
                  ...(user ? [{ label: "Dashboard", icon: LayoutDashboard, route: "dashboard" }] : []),
                  ...(user ? [{ label: "Settings", icon: Settings, route: "settings" }] : []),
                  ...(user?.isAdmin ? [{ label: "Admin", icon: Shield, route: "admin" }] : []),
                ].map(({ label, icon: Icon, route: r }) => (
                  <button
                    key={label}
                    onClick={() => { navigate({ name: r as any }); setMobileOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all text-[rgba(255,255,255,0.60)] hover:text-[#F5F5F0] hover:bg-[rgba(255,255,255,0.05)]"
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
                <div className="my-2 h-px bg-[rgba(255,255,255,0.07)]" />
                {hydrated && user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Avatar className="size-8 border border-[rgba(255,255,255,0.12)]">
                        <AvatarFallback style={{ background: "rgba(255,106,0,0.15)", color: "#FF6A00" }} className="text-xs font-bold">
                          {initials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[rgba(255,255,255,0.85)]">{user.name || user.email}</p>
                        <p className="truncate text-xs text-[rgba(255,255,255,0.35)]">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left text-red-400 hover:text-red-300 hover:bg-[rgba(239,68,68,0.08)] transition-all"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </>
                ) : hydrated ? (
                  <button
                    onClick={() => { navigate({ name: "login" }); setMobileOpen(false); }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold font-mono tracking-wide uppercase text-[#050505] transition-all hover:-translate-y-px"
                    style={{ background: "#FF6A00" }}
                  >
                    Sign In
                  </button>
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
