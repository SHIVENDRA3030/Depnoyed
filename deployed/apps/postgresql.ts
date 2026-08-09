import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "PostgreSQL",
  slug: "postgresql",
  description:
    "A powerful, open-source object-relational database system with over 35 years of active development. This static simulator confirms the service is running and healthy.",
  dockerImage: "postgres:16-alpine",
  containerPort: 5432,
  logo: null,
  category: "Database",
  simulator: "static",
  version: "16.1",
  repository: "https://github.com/postgres/postgres",
  website: "https://www.postgresql.org",
  readme: "# PostgreSQL\n\nA powerful, open-source object-relational database system.\n\n## Key Features\n\n- ACID compliance\n- Full-text search\n- JSON/JSONB support\n- Replication and partitioning\n- Extensive extension ecosystem\n\n## Connection\n\nDefault port: `5432`. A default password `depnoyed` is set via `POSTGRES_PASSWORD` — override it in the deploy dialog.\n\n## Connecting\n\n```\npsql -h localhost -p <hostPort> -U postgres\n# password: depnoyed (or whatever you set)\n```",
  defaultEnv: "POSTGRES_PASSWORD=depnoyed\nPOSTGRES_DB=appdb\nPOSTGRES_USER=postgres",
};

export default definition;
