import { MongoClient, type Db } from 'mongodb'

/**
 * MongoDB client singleton for the raw `mongodb` driver.
 *
 * Mirrors the `globalThis`-singleton pattern used by backend/db.ts (Prisma)
 * so that Next.js dev-mode hot-reloads do not spawn multiple connections.
 *
 * Configuration (read from environment, never hardcoded):
 *   - MONGODB_URI     — Atlas SRV connection string. Lives in .env (gitignored).
 *                       Example: mongodb+srv://<user>:<password>@<cluster>/?appName=depnoyed
 *   - MONGODB_DB_NAME — default database name, used when the URI path does not
 *                       include one. Defaults to "depnoyed".
 *
 * Usage:
 *   import { mongo, mongoDb } from '@backend/mongo'
 *   const users = mongoDb.collection('users')
 *   await users.insertOne({ email: 'a@b.c', createdAt: new Date() })
 *
 * Security:
 *   - The connection string contains real credentials and MUST stay in .env.
 *   - .env is gitignored; only .env.example (placeholders) is committed.
 *   - This module never logs the URI. If you need to debug connectivity, log
 *     only `MONGODB_DB_NAME` or the host extracted from the URI.
 */

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? 'depnoyed'

if (!MONGODB_URI) {
  // Fail fast with a clear message rather than a cryptic driver error.
  // This mirrors backend/auth.ts's AUTH_SECRET guard.
  throw new Error(
    'MONGODB_URI is not configured. Set it in .env (see .env.example). ' +
      'The raw MongoDB driver (backend/mongo.ts) requires an Atlas SRV ' +
      'connection string.',
  )
}

/**
 * Reuse a single MongoClient across hot-reloads in development. The driver
 * itself pools connections internally, so we only need one client per process.
 */
const globalForMongo = globalThis as unknown as {
  mongoClient?: MongoClient
  mongoDb?: Db
}

function createClient(): { client: MongoClient; db: Db } {
  const client = new MongoClient(MONGODB_URI, {
    // Atlas-recommended defaults. The driver handles SRV resolution, TLS,
    // and retryable writes automatically.
    serverSelectionTimeoutMS: 10_000, // fail fast if Atlas unreachable
    connectTimeoutMS: 10_000,
  })
  // Named db from env (or 'depnoyed' default). The URI path is empty in the
  // default Atlas connection string, so we must specify the db explicitly.
  const db = client.db(MONGODB_DB_NAME)
  return { client, db }
}

const { client, db } = globalForMongo.mongoClient
  ? { client: globalForMongo.mongoClient, db: globalForMongo.mongoDb! }
  : createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForMongo.mongoClient = client
  globalForMongo.mongoDb = db
}

/**
 * The shared MongoClient. Use this only if you need driver-level operations
 * (e.g. starting a session, accessing a different database, ping).
 */
export const mongo: MongoClient = client

/**
 * The default Db handle (database name from MONGODB_DB_NAME, default "depnoyed").
 * Use `mongoDb.collection('users')` etc. for normal CRUD.
 */
export const mongoDb: Db = db

/**
 * Convenience: ping the cluster. Useful for health checks and startup
 * verification. Returns the server's hello response (isWritable + round-trip ms).
 *
 * @example
 *   const ping = await pingMongo()
 *   console.log(ping.ok, ping.ms) // 1, 42
 */
export async function pingMongo(): Promise<{ ok: number; ms: number; host?: string }> {
  const start = Date.now()
  // `adminCommand` is the lightest way to verify the cluster is reachable.
  const res = await mongo.db('admin').command({ hello: 1 })
  const ms = Date.now() - start
  return {
    ok: Number(res.ok ?? 0),
    ms,
    host: typeof res.me === 'string' ? res.me : undefined,
  }
}
