import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Gitea",
  slug: "gitea",
  description: "Git with a cup of tea. A painless self-hosted Git service.",
  dockerImage: "gitea/gitea:latest",
  containerPort: 3000,
  logo: null,
  category: "Developer Tools",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/go-gitea/gitea",
  website: "https://gitea.io",
  readme: "# Gitea\\n\\nA painless self-hosted Git service.\\n\\n## Setup\\nThe initial configuration screen will guide you through setting up the administrator account.",
  defaultEnv: "USER_UID=1000\\nUSER_GID=1000",
};

export default definition;
