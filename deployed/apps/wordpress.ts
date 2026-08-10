import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "WordPress",
  slug: "wordpress",
  description: "The world's most popular website builder and CMS.",
  dockerImage: "wordpress:latest",
  containerPort: 80,
  logo: null,
  category: "CMS",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/WordPress/WordPress",
  website: "https://wordpress.org",
  readme: "# WordPress\\n\\nCreate a website, blog, or app.\\n\\n## Setup\\nThe famous 5-minute install will appear on your first visit.",
  defaultEnv: "",
};

export default definition;
