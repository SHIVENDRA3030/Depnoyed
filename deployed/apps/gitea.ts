import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Gitea",
  slug: "gitea",
  description:
    "Painless self-hosted Git service — a lightweight, community-managed code forge with repositories, pull requests, issues and CI (Gitea Actions).",
  dockerImage: "gitea/gitea:latest",
  containerPort: 3000,
  logo: "gitea",
  category: "Developer Tools",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/go-gitea/gitea",
  website: "https://gitea.io",
  readme:
    "# Gitea\n\nPainless self-hosted, all-in-one software development service — Git hosting with code review, team permissions, issues, wiki and Gitea Actions CI, in a single lightweight container.\n\n## Features\n\n- Git repositories with pull requests, code review and protected branches\n- Issues, labels, milestones, kanban boards and a built-in wiki\n- Gitea Actions (GitHub Actions-compatible CI) with runner support\n- Organizations, teams, LDAP/OAuth2 authentication options\n- Built-in package registry (container, npm, Maven, PyPI, ...)\n- Web-based administration and API\n\n## First Login\n\nOn first launch you land on the **installation wizard** (`/install`) where you configure the database (the embedded SQLite default is correct for this single-container deployment) and create the initial **administrator account**. Set the \"Gitea Base URL\" / \"Server Domain\" to your deployment's public URL so clones and links resolve. After installation the login screen appears.\n\n## Setup\n\n1. Deploy Gitea from the marketplace.\n2. Open the running app, complete the install wizard and create your admin account.\n3. Start pushing repositories over HTTPS (`https://<your-app-url>/<user>/<repo>.git`).\n\n## Notes\n\n- Repositories and all settings persist under `/data` on a dedicated 2Gi volume that survives restarts.\n- Only the HTTP UI/protocol (port 3000) is exposed — Git over SSH is not reachable; use HTTPS credentials or a token for pushes.\n- `USER_UID`/`USER_GID` are preset to 1000 so the data volume stays readable; adjust them in the deploy dialog if needed.",
  defaultEnv: ["USER_UID=1000", "USER_GID=1000"].join("\n"),
};

export default definition;
