import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Wiki.js",
  slug: "wikijs",
  description: "The most powerful and extensible open source Wiki software.",
  dockerImage: "requarks/wiki:2",
  containerPort: 3000,
  logo: null,
  category: "Productivity",
  simulator: "static",
  version: "2",
  repository: "https://github.com/requarks/wiki",
  website: "https://js.wiki",
  readme: "# Wiki.js\\n\\nA modern, lightweight and powerful wiki app built on Node.js.\\n\\n## Setup\\nThe setup wizard will guide you through the configuration.",
  defaultEnv: "DB_TYPE=sqlite\\nDB_FILEPATH=/wiki/db.sqlite",
};

export default definition;
