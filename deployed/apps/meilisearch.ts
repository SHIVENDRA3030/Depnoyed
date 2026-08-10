import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Meilisearch",
  slug: "meilisearch",
  description: "A lightning-fast search engine that fits effortlessly into your apps, websites, and workflow.",
  dockerImage: "getmeili/meilisearch:latest",
  containerPort: 7700,
  logo: null,
  category: "Database",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/meilisearch/meilisearch",
  website: "https://www.meilisearch.com",
  readme: "# Meilisearch\\n\\nFast, relevant, and typo-tolerant search engine.\\n\\n## Access\\nThe search dashboard is available at the root URL.",
  defaultEnv: "MEILI_ENV=development",
};

export default definition;
