import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Meilisearch",
  slug: "meilisearch",
  description:
    "Lightning-fast, typo-tolerant search engine with a REST API — instant, relevant full-text search out of the box, managed via a built-in mini dashboard.",
  dockerImage: "getmeili/meilisearch:latest",
  containerPort: 7700,
  logo: "meilisearch",
  category: "Database",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/meilisearch/meilisearch",
  website: "https://www.meilisearch.com",
  readme:
    "# Meilisearch\n\nLightning-fast, typo-tolerant, open-source search engine. Add documents over a REST API and get instant, relevant search results with almost no configuration — great for product catalogs, documentation, and any app that needs \"search as you type\".\n\n## Features\n\n- Instant, typo-tolerant full-text search out of the box\n- RESTful API: create indexes, add documents and query them with a single HTTP call\n- Built-in **mini dashboard** at the root URL for browsing indexes and trying queries\n- Faceted search, filters, sorting, synonyms, custom ranking rules\n- Multi-tenant search with tenant tokens and API-key management\n\n## First Login\n\nBy default this deployment runs **without an API key** (`MEILI_NO_ANALYTICS=true` only disables telemetry) — anyone with the URL can read and write data. The built-in mini dashboard needs no login in this mode.\n\nTo secure the instance, set `MEILI_MASTER_KEY=<a-strong-secret>` in the deploy dialog before launching; all API calls then require `Authorization: Bearer <key>`, and the dashboard will prompt for it.\n\n## Setup\n\n1. Deploy Meilisearch from the marketplace.\n2. Open the running app — the mini dashboard loads at the root URL.\n3. Add documents, e.g. `curl -X POST '<your-app-url>/indexes/movies/documents' -H 'Content-Type: application/json' --data-binary '[{\"id\":1,\"title\":\"Inception\"}]'`\n4. Search from the dashboard or `GET <your-app-url>/indexes/movies/search?q=inception`.\n\n## Notes\n\n- Indexes and documents persist under `/meili_data` on a dedicated 1Gi volume that survives restarts.\n- `MEILI_ENV=development` is preset so the dashboard is enabled without HTTPS; switch it to `production` together with a master key for hardened setups.",
  defaultEnv: ["MEILI_ENV=development", "MEILI_NO_ANALYTICS=true"].join("\n"),
};

export default definition;
