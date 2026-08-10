import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "MongoDB",
  slug: "mongodb",
  description: "A document-based, distributed database built for modern application developers and for the cloud era.",
  dockerImage: "mongo:latest",
  containerPort: 27017,
  logo: null,
  category: "Database",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/mongodb/mongo",
  website: "https://www.mongodb.com",
  readme: "# MongoDB\\n\\nA general purpose, document-based, distributed database.\\n\\n## Access\\nConnect to port 27017 using your MongoDB client.",
  defaultEnv: "MONGO_INITDB_ROOT_USERNAME=admin\\nMONGO_INITDB_ROOT_PASSWORD=depnoyed",
};

export default definition;
