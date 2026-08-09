/**
 * Database access layer — MongoDB-backed facade.
 *
 * This module replaces the original Prisma/SQLite client with a thin facade
 * over the raw `mongodb` driver (backend/mongo.ts). It deliberately exposes
 * the SAME method shapes the application already uses (`db.user.findUnique`,
 * `db.app.findMany`, `db.deployment.update`, etc.) so that route handlers,
 * backend/auth.ts, and backend/deployments.ts required ZERO changes during the
 * SQLite → MongoDB migration.
 *
 * Document model:
 *   - Each collection (users / apps / deployments) stores documents with a
 *     string `id` field (24-char hex, generated via newId()) as the business
 *     primary key, plus MongoDB's default `_id` (ObjectId) for internal use.
 *   - `createdAt` / `updatedAt` are stored as native JS Date objects (BSON
 *     Date) and set automatically by this facade, mirroring Prisma's
 *     @default(now()) / @updatedAt semantics.
 *   - `envVars` on deployments is stored as a JSON-encoded string (same as
 *     Prisma stored it) to keep the serializers unchanged.
 *
 * Indexes (created idempotently on module load via ensureIndexes):
 *   - users:        unique { id }, unique { email }
 *   - apps:         unique { id }, unique { slug }
 *   - deployments:  unique { id }, unique { subdomain }, { userId }, { appId }, { status }
 *
 * Relations:
 *   - Prisma's `include: { app: true }` (join) is implemented with a secondary
 *     findOne on the apps collection by appId. With ~10 apps and per-user
 *     deployment lists this is efficient; for larger scale, a $lookup
 *     aggregation or denormalisation would be preferable.
 *   - Prisma's `include: { _count: { deployments: true } }` is implemented
 *     with countDocuments({ appId }).
 */

import { mongoDb } from "@backend/mongo";
import type { Collection } from "mongodb";
import { randomBytes } from "crypto";

/* -------------------------------------------------------------------------- */
/*  Types — exported so serializers (backend/api.ts) can use them instead of    */
/*  the now-removed @prisma/client types.                                       */
/* -------------------------------------------------------------------------- */

export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface App {
  id: string;
  name: string;
  slug: string;
  description: string;
  dockerImage: string;
  containerPort: number;
  logo: string | null;
  category: string;
  simulator: string;
  defaultEnv: string | null;
  readme: string | null;
  repository: string | null;
  website: string | null;
  version: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deployment {
  id: string;
  userId: string;
  appId: string;
  containerId: string | null;
  containerName: string;
  volumeName: string;
  status: string;
  subdomain: string;
  port: number | null;
  label: string | null;
  envVars: string | null; // JSON-encoded Record<string,string>, same as Prisma stored it
  createdAt: Date;
  updatedAt: Date;
}

/** Deployment with the related app joined (mirrors Prisma include: { app: true }). */
export type DeploymentWithApp = Deployment & { app?: App | null };

/** App with a deployment count (mirrors Prisma include: { _count: { deployments: true } }). */
export type AppWithCounts = App & { _count?: { deployments: number } };

/* -------------------------------------------------------------------------- */
/*  Collection handles + ID generation                                          */
/* -------------------------------------------------------------------------- */

const users: Collection<User> = mongoDb.collection<User>("users");
const apps: Collection<App> = mongoDb.collection<App>("apps");
const deployments: Collection<Deployment> = mongoDb.collection<Deployment>("deployments");

/** Generate a 24-char lowercase hex ID (URL-safe, similar in shape to ObjectId). */
export function newId(): string {
  return randomBytes(12).toString("hex");
}

/* -------------------------------------------------------------------------- */
/*  Indexes — created idempotently on module load (fire-and-forget).            */
/*  Unique indexes enforce the @unique constraints from the old Prisma schema.  */
/* -------------------------------------------------------------------------- */

let indexesReady: Promise<void> | null = null;

function ensureIndexes(): Promise<void> {
  if (indexesReady) return indexesReady;
  indexesReady = (async () => {
    await Promise.all([
      users.createIndex({ id: 1 }, { unique: true }),
      users.createIndex({ email: 1 }, { unique: true }),
      apps.createIndex({ id: 1 }, { unique: true }),
      apps.createIndex({ slug: 1 }, { unique: true }),
      deployments.createIndex({ id: 1 }, { unique: true }),
      deployments.createIndex({ subdomain: 1 }, { unique: true }),
      deployments.createIndex({ userId: 1 }),
      deployments.createIndex({ appId: 1 }),
      deployments.createIndex({ status: 1 }),
    ]);
  })().catch((err) => {
    // Log but don't crash — the app can still function without explicit indexes
    // (uniqueness would just not be enforced at the DB level until retry).
    console.error("[db] MongoDB index creation failed:", err instanceof Error ? err.message : err);
    indexesReady = null; // allow retry on next call
  });
  return indexesReady;
}

// Fire-and-forget on module load. By the time any request arrives, the unique
// indexes are almost certainly ready (createIndex is fast for empty collections).
void ensureIndexes();

/** Await this from a startup hook if you need indexes guaranteed before serving. */
export const indexesReadyPromise = ensureIndexes();

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Project a document to only the selected fields, mirroring Prisma's `select`.
 * If no select is given, returns the full document.
 */
function projectSelect<T extends Record<string, unknown>>(
  doc: T,
  select?: Record<string, true>
): T {
  if (!select || Object.keys(select).length === 0) return doc;
  const out = {} as Record<string, unknown>;
  for (const key of Object.keys(select)) {
    if (key in doc) out[key] = doc[key];
  }
  return out as T;
}

/**
 * Attach a deployment count to an app document, mirroring Prisma's
 * `include: { _count: { select: { deployments: true } } }`.
 */
async function withCount(app: App): Promise<AppWithCounts> {
  const deploymentsCount = await deployments.countDocuments({ appId: app.id });
  return { ...app, _count: { deployments: deploymentsCount } };
}

/* -------------------------------------------------------------------------- */
/*  The facade — mirrors the subset of the Prisma client API used by the app.  */
/* -------------------------------------------------------------------------- */

export const db = {
  user: {
    async findUnique(args: {
      where: { id?: string; email?: string };
      select?: Record<string, true>;
    }): Promise<User | null> {
      const filter: Record<string, unknown> = {};
      if (args.where.id !== undefined) filter.id = args.where.id;
      if (args.where.email !== undefined) filter.email = args.where.email;
      const doc = await users.findOne(filter);
      if (!doc) return null;
      return projectSelect(doc as unknown as Record<string, unknown>, args.select) as unknown as User;
    },

    async count(): Promise<number> {
      return users.countDocuments();
    },

    async create(args: {
      data: {
        email: string;
        name: string | null;
        passwordHash: string;
        isAdmin: boolean;
      };
      select?: Record<string, true>;
    }): Promise<User> {
      const now = new Date();
      const doc: User = {
        id: newId(),
        email: args.data.email,
        name: args.data.name,
        passwordHash: args.data.passwordHash,
        isAdmin: args.data.isAdmin,
        createdAt: now,
        updatedAt: now,
      };
      await users.insertOne(doc);
      return projectSelect(doc as unknown as Record<string, unknown>, args.select) as unknown as User;
    },

    async update(args: {
      where: { id: string };
      data: Partial<Pick<User, "name" | "passwordHash">>;
    }): Promise<User> {
      const doc = await users.findOneAndUpdate(
        { id: args.where.id },
        { $set: { ...args.data, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!doc) throw new Error(`User not found: ${args.where.id}`);
      return doc;
    },
  },

  app: {
    async findUnique(args: {
      where: { id?: string; slug?: string };
      include?: { _count?: { select: { deployments: true } } };
    }): Promise<AppWithCounts | null> {
      const filter: Record<string, unknown> = {};
      if (args.where.id !== undefined) filter.id = args.where.id;
      if (args.where.slug !== undefined) filter.slug = args.where.slug;
      const doc = await apps.findOne(filter);
      if (!doc) return null;
      return args.include?._count ? withCount(doc) : doc;
    },

    async findMany(args: {
      orderBy?: { createdAt?: "asc" | "desc" };
      include?: { _count?: { select: { deployments: true } } };
    }): Promise<AppWithCounts[]> {
      const sort: Record<string, 1 | -1> = {};
      if (args.orderBy?.createdAt) {
        sort.createdAt = args.orderBy.createdAt === "asc" ? 1 : -1;
      }
      const docs = await apps.find().sort(sort).toArray();
      return args.include?._count ? Promise.all(docs.map(withCount)) : docs;
    },

    async upsert(args: {
      where: { slug: string };
      update: Partial<Omit<App, "id" | "slug" | "createdAt" | "updatedAt">>;
      create: Omit<App, "id" | "createdAt" | "updatedAt">;
    }): Promise<App> {
      const now = new Date();
      // Try to find existing by slug first.
      const existing = await apps.findOne({ slug: args.where.slug });
      if (existing) {
        const doc = await apps.findOneAndUpdate(
          { slug: args.where.slug },
          { $set: { ...args.update, updatedAt: now } },
          { returnDocument: "after" }
        );
        if (!doc) throw new Error(`App upsert failed for slug: ${args.where.slug}`);
        return doc;
      }
      const doc: App = {
        ...args.create,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      await apps.insertOne(doc);
      return doc;
    },

    async count(): Promise<number> {
      return apps.countDocuments();
    },

    async create(args: {
      data: Omit<App, "id" | "createdAt" | "updatedAt">;
      include?: { _count?: { select: { deployments: true } } };
    }): Promise<AppWithCounts> {
      const now = new Date();
      const doc: App = {
        ...args.data,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      await apps.insertOne(doc);
      return args.include?._count ? withCount(doc) : doc;
    },

    async update(args: {
      where: { id: string };
      data: Partial<Omit<App, "id" | "createdAt" | "updatedAt">>;
      include?: { _count?: { select: { deployments: true } } };
    }): Promise<AppWithCounts> {
      const doc = await apps.findOneAndUpdate(
        { id: args.where.id },
        { $set: { ...args.data, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!doc) throw new Error(`App not found: ${args.where.id}`);
      return args.include?._count ? withCount(doc) : doc;
    },

    async delete(args: { where: { id: string } }): Promise<App> {
      const doc = await apps.findOneAndDelete({ id: args.where.id });
      if (!doc) throw new Error(`App not found: ${args.where.id}`);
      return doc;
    },
  },

  deployment: {
    async create(args: {
      data: Omit<Deployment, "id" | "createdAt" | "updatedAt" | "containerId" | "label"> &
        Partial<Pick<Deployment, "containerId" | "label">>;
    }): Promise<Deployment> {
      const now = new Date();
      const doc: Deployment = {
        id: newId(),
        userId: args.data.userId,
        appId: args.data.appId,
        containerId: args.data.containerId ?? null,
        containerName: args.data.containerName,
        volumeName: args.data.volumeName,
        status: args.data.status,
        subdomain: args.data.subdomain,
        port: args.data.port,
        label: args.data.label ?? null,
        envVars: args.data.envVars ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await deployments.insertOne(doc);
      return doc;
    },

    async update(args: {
      where: { id: string };
      data: Partial<Omit<Deployment, "id" | "createdAt" | "updatedAt">>;
      include?: { app?: boolean };
    }): Promise<DeploymentWithApp> {
      const doc = await deployments.findOneAndUpdate(
        { id: args.where.id },
        { $set: { ...args.data, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!doc) throw new Error(`Deployment not found: ${args.where.id}`);
      if (args.include?.app) {
        const app = doc.appId ? await apps.findOne({ id: doc.appId }) : null;
        return { ...doc, app };
      }
      return doc;
    },

    async findUnique(args: {
      where: { id?: string; subdomain?: string };
      include?: { app?: boolean };
    }): Promise<DeploymentWithApp | null> {
      const filter: Record<string, unknown> = {};
      if (args.where.id !== undefined) filter.id = args.where.id;
      if (args.where.subdomain !== undefined) filter.subdomain = args.where.subdomain;
      const doc = await deployments.findOne(filter);
      if (!doc) return null;
      if (args.include?.app) {
        const app = doc.appId ? await apps.findOne({ id: doc.appId }) : null;
        return { ...doc, app };
      }
      return doc;
    },

    async findMany(args: {
      where?: { userId?: string; appId?: string };
      include?: { app?: boolean };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<DeploymentWithApp[]> {
      const filter: Record<string, unknown> = {};
      if (args.where?.userId !== undefined) filter.userId = args.where.userId;
      if (args.where?.appId !== undefined) filter.appId = args.where.appId;
      const sort: Record<string, 1 | -1> = {};
      if (args.orderBy?.createdAt) {
        sort.createdAt = args.orderBy.createdAt === "asc" ? 1 : -1;
      }
      const docs = await deployments.find(filter).sort(sort).toArray();
      if (args.include?.app) {
        return Promise.all(
          docs.map(async (d) => {
            const app = d.appId ? await apps.findOne({ id: d.appId }) : null;
            return { ...d, app };
          })
        );
      }
      return docs;
    },

    async delete(args: { where: { id: string } }): Promise<Deployment> {
      const doc = await deployments.findOneAndDelete({ id: args.where.id });
      if (!doc) throw new Error(`Deployment not found: ${args.where.id}`);
      return doc;
    },

    async count(args: { where?: { appId?: string } }): Promise<number> {
      const filter: Record<string, unknown> = {};
      if (args.where?.appId !== undefined) filter.appId = args.where.appId;
      return deployments.countDocuments(filter);
    },
  },
};
