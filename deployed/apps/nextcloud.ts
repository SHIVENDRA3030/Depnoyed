import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Nextcloud",
  slug: "nextcloud",
  description: "A safe home for all your data. Private cloud storage and collaboration platform.",
  dockerImage: "nextcloud:latest",
  containerPort: 80,
  logo: null,
  category: "Productivity",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/nextcloud/server",
  website: "https://nextcloud.com",
  readme: "# Nextcloud\\n\\nA self-hosted productivity platform that keeps you in control.\\n\\n## Setup\\nYou will be asked to create an admin account on the first visit.",
  defaultEnv: "",
};

export default definition;
