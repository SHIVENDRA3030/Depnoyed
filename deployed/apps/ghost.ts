import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Ghost",
  slug: "ghost",
  description: "The professional publishing platform. Fast, secure, and open source.",
  dockerImage: "ghost:latest",
  containerPort: 2368,
  logo: null,
  category: "CMS",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/TryGhost/Ghost",
  website: "https://ghost.org",
  readme: "# Ghost\\n\\nA powerful app for new-media creators to publish, share, and grow a business around their content.\\n\\n## Setup\\nAccess `/ghost` to set up your administrator account.",
  defaultEnv: "NODE_ENV=development",
};

export default definition;
