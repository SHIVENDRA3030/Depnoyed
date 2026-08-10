import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Uptime Kuma",
  slug: "uptime-kuma",
  description: "A fancy self-hosted monitoring tool.",
  dockerImage: "louislam/uptime-kuma:1",
  containerPort: 3001,
  logo: null,
  category: "Monitoring",
  simulator: "static",
  version: "1.0",
  repository: "https://github.com/louislam/uptime-kuma",
  website: "https://uptime.kuma.pet",
  readme: "# Uptime Kuma\\n\\nA self-hosted monitoring tool like Uptime Robot.\\n\\n## First Login\\nYou will be prompted to create an admin account upon first login.",
  defaultEnv: "",
};

export default definition;
