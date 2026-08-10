import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Vaultwarden",
  slug: "vaultwarden",
  description: "Unofficial Bitwarden compatible server written in Rust, perfect for self-hosted deployments.",
  dockerImage: "vaultwarden/server:latest",
  containerPort: 80,
  logo: null,
  category: "Security",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/dani-garcia/vaultwarden",
  website: "https://github.com/dani-garcia/vaultwarden",
  readme: "# Vaultwarden\\n\\nAlternative implementation of the Bitwarden server API written in Rust.\\n\\n## Registration\\nYou can create an account directly from the login page.",
  defaultEnv: "SIGNUPS_ALLOWED=true",
};

export default definition;
