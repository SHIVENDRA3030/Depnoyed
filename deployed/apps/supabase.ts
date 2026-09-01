import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Supabase Studio",
  slug: "supabase",
  description:
    "The open source Firebase alternative. This deployment runs Studio — the visual dashboard for managing your Supabase projects.",
  dockerImage: "supabase/studio:latest",
  containerPort: 3000,
  logo: "supabase",
  category: "Database",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/supabase/supabase",
  website: "https://supabase.com",
  readme:
    "# Supabase Studio\n\nThe open source Firebase alternative — this deployment runs **Studio**, Supabase's visual dashboard.\n\n## What you get\n\n- The full Studio UI: table editor, SQL editor, auth management views, storage browser\n- Connect it to any Supabase backend (self-hosted or cloud) by pointing `SUPABASE_URL` at it in the deploy dialog\n\n## Notes\n\n- A complete self-hosted Supabase stack (Postgres, Auth, Realtime, Storage, Kong) is a multi-service compose deployment; this single-container deployment provides the Studio dashboard.\n- Default project/org names are set via env and can be overridden in the deploy dialog.",
  defaultEnv: [
    "SUPABASE_URL={{APP_URL}}",
    "SUPABASE_PUBLIC_URL={{APP_URL}}",
    "STUDIO_PG_META_URL={{APP_URL}}",
    "POSTGRES_PASSWORD=postgres",
    "DEFAULT_ORGANIZATION_NAME=Deployed",
    "DEFAULT_PROJECT_NAME=Supabase",
    "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
  ].join("\n"),
};

export default definition;
