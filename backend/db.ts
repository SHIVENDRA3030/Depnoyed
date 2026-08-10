/**
 * Database access layer — Prisma ORM
 *
 * This module exports the Prisma client wrapped with Prisma Extensions to
 * auto-generate custom 24-char hex IDs, perfectly preserving the previous
 * MongoDB facade behavior while enabling full ORM features.
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import type { User, App, Deployment } from "@prisma/client";

export type { User, App, Deployment };

export type DeploymentWithApp = Deployment & { app?: App | null };
export type AppWithCounts = App & { _count?: { deployments: number } };

/** Generate a 24-char lowercase hex ID (URL-safe, similar in shape to ObjectId). */
export function newId(): string {
  return randomBytes(12).toString("hex");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Instantiate PrismaClient
const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

// Extend Prisma to auto-generate our custom `id` fields (since we use a separate string ID, not MongoDB's internal _id ObjectId).
export const db = prismaClient.$extends({
  query: {
    user: {
      async create({ args, query }) {
        if (!args.data.id) args.data.id = newId();
        return query(args);
      },
    },
    app: {
      async create({ args, query }) {
        if (!args.data.id) args.data.id = newId();
        return query(args);
      },
      async upsert({ args, query }) {
        if (!args.create.id) args.create.id = newId();
        return query(args);
      },
    },
    deployment: {
      async create({ args, query }) {
        if (!args.data.id) args.data.id = newId();
        return query(args);
      },
    },
  },
});

/** No-op promise for backwards compatibility with any startup hooks. Prisma connects automatically. */
export const indexesReadyPromise = Promise.resolve();
