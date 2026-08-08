import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Redis Cache",
  slug: "redis-cache",
  description:
    "An in-memory data structure store used as a database, cache, and message broker. This simulator tracks key-value operations and expiry in a dedicated volume.",
  dockerImage: "redis:7-alpine",
  containerPort: 6379,
  logo: null,
  category: "Database",
  simulator: "counter",
  version: "7.2",
  repository: "https://github.com/redis/redis",
  website: "https://redis.io",
  readme: "# Redis Cache\n\nAn in-memory data structure store used as a database, cache, and message broker.\n\n## Common Use Cases\n\n- Caching layer for web applications\n- Session storage\n- Real-time analytics\n- Message queues and pub/sub\n\n## Configuration\n\nDefault port: `6379`. Data is persisted to the dedicated volume via RDB snapshots.",
  defaultEnv: null,
};

export default definition;
