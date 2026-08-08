import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Gitea Lite",
  slug: "gitea-lite",
  description:
    "A lightweight note-taking app that simulates a self-hosted Gitea instance. Notes are persisted to a per-tenant volume.",
  dockerImage: "gitea/gitea:1.21",
  containerPort: 3000,
  logo: "gitea",
  category: "DevOps",
  simulator: "notes",
  version: "1.21.0",
  repository: "https://github.com/go-gitea/gitea",
  website: "https://gitea.io",
  readme: "# Gitea Lite\n\nA self-hosted Git service simulation. This lightweight variant persists **notes** to a dedicated volume.\n\n## Features\n\n- Create, edit, and delete notes\n- All notes survive container restarts\n- Per-tenant isolation\n\n> **Note:** This is a simulator. Real Gitea provides full Git hosting, issue tracking, and CI/CD.",
};

export default definition;
