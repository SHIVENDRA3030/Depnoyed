import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Jellyfin",
  slug: "jellyfin",
  description: "The Free Software Media System. No strings attached.",
  dockerImage: "jellyfin/jellyfin:latest",
  containerPort: 8096,
  logo: null,
  category: "Media",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/jellyfin/jellyfin",
  website: "https://jellyfin.org",
  readme: "# Jellyfin\\n\\nJellyfin is the volunteer-built media solution that puts you in control of your media.\\n\\n## Setup\\nThe setup wizard will guide you through creating an admin user and adding media.",
  defaultEnv: "",
};

export default definition;
