import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "n8n",
  slug: "n8n",
  description:
    "Free and open node based Workflow Automation Tool. Easily automate tasks across different services.",
  dockerImage: "n8nio/n8n:latest",
  containerPort: 5678,
  logo: "n8n",
  category: "Productivity",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/n8n-io/n8n",
  website: "https://n8n.io",
  readme:
    "# n8n\n\nFree and open source, fair-code licensed workflow automation tool.\n\n## Features\n\n- Visual workflow editor with 400+ integrations\n- Webhooks, schedules, and event-based triggers\n- Self-hosted — your credentials and data never leave your container\n- Workflows, credentials, and execution history persist in the deployment volume\n\n## Setup\n\n1. Deploy n8n from the marketplace.\n2. Open the running app via **Open real app** (or its public URL).\n3. Create your owner account on first launch (email + password are stored locally in the container).\n4. Build your first workflow and activate it.\n\n## Notes\n\n- `WEBHOOK_URL` is pre-configured to the deployment's public URL so inbound webhooks work.\n- Data is persisted under `/home/node/.n8n` on a dedicated 5Gi volume that survives restarts.",
  defaultEnv: [
    "GENERIC_TIMEZONE=UTC",
    "N8N_HOST={{APP_HOST}}",
    "N8N_PROTOCOL=https",
    "N8N_EDITOR_BASE_URL={{APP_URL}}",
    "WEBHOOK_URL={{APP_URL}}/",
    "N8N_RUNNERS_ENABLED=true",
    "N8N_DIAGNOSTICS_ENABLED=false",
    "N8N_PERSONALIZATION_ENABLED=false",
    "N8N_SECURE_COOKIE=false",
  ].join("\n"),
  dockerUser: "0",
};

export default definition;
