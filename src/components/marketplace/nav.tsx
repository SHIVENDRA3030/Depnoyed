"use client";

import { useEffect } from "react";
import { Rocket, LayoutDashboard, LogOut, Store } from "lucide-react";
import { useAuth, navigate } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";
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

export function Nav() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const hydrating = useAuth((s) => s.hydrating);
  const hydrated = !hydrating;

  useEffect(() => {
    // Default to marketplace view on first load if there's no hash.
    if (!window.location.hash) {
      window.location.hash = "#/marketplace";
    }
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

        <nav className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => navigate({ name: "marketplace" })}
          >
            <Store className="size-4" /> Marketplace
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden gap-1.5 sm:inline-flex"
              onClick={() => navigate({ name: "dashboard" })}
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Button>
          )}

          <ThemeToggle />

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
      </div>
    </header>
  );
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}
