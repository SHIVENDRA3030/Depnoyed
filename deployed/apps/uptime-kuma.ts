import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Uptime Kuma",
  slug: "uptime-kuma",
  description:
    "Self-hosted monitoring tool with an fancy, easy to use UI — uptime checks for HTTP(s), TCP, ping, DNS and more, with alert notifications.",
  dockerImage: "louislam/uptime-kuma:1",
  containerPort: 3001,
  logo: "uptime-kuma",
  category: "Monitoring",
  simulator: "static",
  version: "1",
  repository: "https://github.com/louislam/uptime-kuma",
  website: "https://uptime.kuma.pet",
  readme:
    "# Uptime Kuma\n\nSelf-hosted monitoring tool — an open-source alternative to \"Uptime Robot\", with a polished status page and dozens of notification integrations.\n\n## Features\n\n- Monitoring for HTTP(s), TCP, Ping, DNS records, Docker containers and more\n- Fancy, reactive status pages that you can share publicly\n- Notifications via Telegram, Discord, Slack, email (SMTP), Webhooks and 90+ other services\n- Two-factor authentication (2FA) support\n- Multi-language UI with light/dark themes\n\n## First Login\n\nThere is **no default account**. On first launch you are greeted by the **setup wizard** where you create your own admin account (username + password, optionally with 2FA). Credentials are stored locally inside the container.\n\n## Setup\n\n1. Deploy Uptime Kuma from the marketplace.\n2. Open the running app and create your admin account via the setup wizard.\n3. Add your first monitor (e.g. an HTTP check against a URL) and pick an interval.\n4. Optionally enable a public status page under **Settings → Status Pages**.\n\n## Notes\n\n- All monitors, incidents and settings persist under `/app/data` on a dedicated 1Gi volume that survives restarts.\n- The admin-creation wizard only appears while no account exists — once created, the login screen is shown to everyone else.",
  defaultEnv: ["UPTIME_KUMA_HOST=0.0.0.0", "UPTIME_KUMA_PORT=3001"].join("\n"),
};

export default definition;
