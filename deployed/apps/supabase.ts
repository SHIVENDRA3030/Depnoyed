import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Supabase Studio",
  slug: "supabase",
  description: "The open source Firebase alternative. (Studio UI)",
  dockerImage: "supabase/studio:latest",
  containerPort: 3000,
  logo: null,
  category: "Database",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/supabase/supabase",
  website: "https://supabase.com",
  readme: "# Supabase\n\nOpen source Firebase alternative.\n\n## Access\nAccess the Studio dashboard via the provided URL.",
  defaultEnv: "STUDIO_PG_META_URL={{APP_URL}}\nSUPABASE_URL={{APP_URL}}",
};

export default definition;
