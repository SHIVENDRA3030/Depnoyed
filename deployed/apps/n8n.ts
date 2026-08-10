import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "n8n",
  slug: "n8n",
  description:
    "Free and open node based Workflow Automation Tool. Easily automate tasks across different services.",
  dockerImage: "n8nio/n8n:latest",
  containerPort: 5678,
  logo: null,
  category: "Productivity",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/n8n-io/n8n",
  website: "https://n8n.io",
  readme: "# n8n\n\nFree and open node based Workflow Automation Tool.\n\n## Features\n\n- Connect everything to everything\n- Define your workflows with a visual editor\n- Host it yourself to keep your data secure\n\n## Setup\n\nYou will be prompted to set up an owner account on first launch.",
  defaultEnv: "GENERIC_TIMEZONE=UTC",
};

export default definition;
