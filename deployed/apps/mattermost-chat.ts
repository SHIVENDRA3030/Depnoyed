import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Mattermost Chat",
  slug: "mattermost-chat",
  description:
    "An open-source, self-hosted Slack-alternative for secure team collaboration. Chat, file sharing, and integrations — all persisted to your dedicated volume.",
  dockerImage: "mattermost/mattermost-preview:latest",
  containerPort: 8065,
  logo: null,
  category: "Productivity",
  simulator: "notes",
  version: "9.2",
  repository: "https://github.com/mattermost/mattermost",
  website: "https://mattermost.com",
  readme: "# Mattermost Chat\n\nAn open-source, self-hosted Slack-alternative for secure team collaboration.\n\n## Features\n\n- Real-time messaging (channels, DMs, threads)\n- File sharing and search\n- Webhooks and integrations (Slack-compatible)\n- Compliance and audit logs\n\n> **Note:** This is a preview deployment. For production, configure SMTP, SSO, and a managed database.",
  defaultEnv: null,
};

export default definition;
