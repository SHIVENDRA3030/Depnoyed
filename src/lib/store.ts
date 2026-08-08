"use client";

import { create } from "zustand";

/* ------------------------------- API types -------------------------------- */

export interface AppItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  dockerImage: string;
  containerPort: number;
  logo: string | null;
  category: string;
  simulator: string;
  createdAt: string;
  deploymentCount: number;
}

export interface DeploymentApp {
  id: string;
  name: string;
  slug: string;
  dockerImage: string;
  containerPort: number;
  logo: string | null;
  simulator: string;
}

export interface DeploymentItem {
  id: string;
  status: string;
  subdomain: string;
  publicUrl: string;
  previewPath: string;
  containerId: string | null;
  containerName: string;
  volumeName: string;
  port: number | null;
  createdAt: string;
  updatedAt: string;
  volumeDataSize?: number;
  app: DeploymentApp | null;
}

export interface UserItem {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

/* ------------------------------ Fetch helper ------------------------------ */

export async function api<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, (data as { code?: string }).code);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

/* ------------------------------- Auth store ------------------------------- */

interface AuthState {
  user: UserItem | null;
  loading: boolean;
  hydrating: boolean;
  setUser: (u: UserItem | null) => void;
  setLoading: (b: boolean) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  hydrating: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  hydrate: async () => {
    try {
      const { user } = await api<{ user: UserItem | null }>("/api/auth/me");
      set({ user, hydrating: false });
    } catch {
      set({ user: null, hydrating: false });
    }
  },
  logout: async () => {
    await api("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));

/* ------------------------------ Route helpers ----------------------------- */

export type Route =
  | { name: "marketplace" }
  | { name: "login" }
  | { name: "app"; slug: string }
  | { name: "dashboard" }
  | { name: "deployment"; id: string };

export function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "marketplace" };
  if (parts[0] === "login") return { name: "login" };
  if (parts[0] === "dashboard") return { name: "dashboard" };
  if (parts[0] === "apps" && parts[1]) return { name: "app", slug: decodeURIComponent(parts[1]) };
  if (parts[0] === "deployments" && parts[1]) return { name: "deployment", id: decodeURIComponent(parts[1]) };
  return { name: "marketplace" };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "marketplace":
      return "#/marketplace";
    case "login":
      return "#/login";
    case "dashboard":
      return "#/dashboard";
    case "app":
      return `#/apps/${encodeURIComponent(route.slug)}`;
    case "deployment":
      return `#/deployments/${encodeURIComponent(route.id)}`;
  }
}

export function navigate(route: Route) {
  window.location.hash = routeToHash(route);
}
