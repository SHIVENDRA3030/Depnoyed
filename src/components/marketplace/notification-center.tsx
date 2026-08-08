"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, CheckCheck, Rocket, Play, Square, RotateCw, Trash2 } from "lucide-react";
import { api, type DeploymentItem } from "@/lib/store";
import { navigate } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEvent {
  id: string;
  appName: string;
  appSlug: string;
  action: ActionVerb;
  timestamp: string;
  status: string;
}

type ActionVerb = "deployed" | "started" | "stopped" | "restarted" | "deleted";

const ACTION_ICONS: Record<ActionVerb, React.ElementType> = {
  deployed: Rocket,
  started: Play,
  stopped: Square,
  restarted: RotateCw,
  deleted: Trash2,
};

const ACTION_COLORS: Record<ActionVerb, string> = {
  deployed: "text-emerald-600 dark:text-emerald-400",
  started: "text-teal-600 dark:text-teal-400",
  stopped: "text-amber-600 dark:text-amber-400",
  restarted: "text-sky-600 dark:text-sky-400",
  deleted: "text-destructive",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "oss-deploy-notifications-last-viewed";

function getLastViewed(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setLastViewed(ts: string) {
  try {
    localStorage.setItem(STORAGE_KEY, ts);
  } catch {
    /* noop */
  }
}

/** Derive an action verb from deployment status. */
function statusToAction(status: string): ActionVerb {
  switch (status) {
    case "running":
      return "started";
    case "stopped":
      return "stopped";
    case "restarting":
      return "restarted";
    case "removed":
    case "deleted":
      return "deleted";
    default:
      return "deployed";
  }
}

/** Friendly relative time string. */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Transform deployment list → activity events, newest first. */
function deploymentsToEvents(deployments: DeploymentItem[]): ActivityEvent[] {
  return deployments.map((d) => {
    const action = statusToAction(d.status);
    return {
      id: d.id,
      appName: d.app?.name ?? d.containerName,
      appSlug: d.app?.slug ?? "",
      action,
      timestamp: d.updatedAt,
      status: d.status,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NotificationCenter() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Fetch deployments ---- */
  const fetchEvents = useCallback(async () => {
    try {
      const { deployments } = await api<{ deployments: DeploymentItem[] }>("/api/deployments");
      const activityEvents = deploymentsToEvents(deployments);
      setEvents(activityEvents);

      // Compute unread count
      if (activityEvents.length === 0) {
        setUnreadCount(0);
        return;
      }
      const lastViewed = getLastViewed();
      if (!lastViewed) {
        // Never viewed — everything is unread, cap at 9+
        setUnreadCount(Math.min(activityEvents.length, 99));
        return;
      }
      const lastViewedTs = new Date(lastViewed).getTime();
      const count = activityEvents.filter(
        (e) => new Date(e.timestamp).getTime() > lastViewedTs
      ).length;
      setUnreadCount(count);
    } catch {
      /* not authenticated or network error — silently ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Initial fetch + polling ---- */
  useEffect(() => {
    fetchEvents();
    intervalRef.current = setInterval(fetchEvents, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEvents]);

  /* ---- Mark all read ---- */
  const markAllRead = useCallback(() => {
    if (events.length === 0) return;
    const newestTs = events[0].timestamp;
    setLastViewed(newestTs);
    setUnreadCount(0);
  }, [events]);

  /* ---- When popover opens, mark as read ---- */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        markAllRead();
      }
    },
    [markAllRead]
  );

  /* ---- Render ---- */
  const bellIcon = unreadCount > 0 ? BellRing : Bell;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {(() => {
            const Icon = bellIcon;
            return <Icon className="size-4" />;
          })()}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white dark:bg-emerald-500">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Activity</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              onClick={(e) => {
                e.stopPropagation();
                markAllRead();
              }}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {/* Events list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Bell className="size-6 opacity-40" />
            <p className="text-xs">No deployment activity yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="flex flex-col">
              {events.map((event, idx) => {
                const Icon = ACTION_ICONS[event.action];
                const colorClass = ACTION_COLORS[event.action];
                return (
                  <button
                    key={event.id}
                    className="flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
                    onClick={() => {
                      setOpen(false);
                      navigate({ name: "deployment", id: event.id });
                    }}
                  >
                    <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent ${colorClass}`}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {event.appName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.action} &middot; {timeAgo(event.timestamp)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <Separator />
        {/* Footer */}
        <div className="px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            onClick={() => {
              setOpen(false);
              navigate({ name: "dashboard" });
            }}
          >
            View all deployments
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
