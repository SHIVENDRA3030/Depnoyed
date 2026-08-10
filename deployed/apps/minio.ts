import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "MinIO",
  slug: "minio",
  description: "High Performance Object Storage compatible with Amazon S3 APIs.",
  dockerImage: "minio/minio:latest",
  containerPort: 9001,
  logo: null,
  category: "Database",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/minio/minio",
  website: "https://min.io",
  readme: "# MinIO\\n\\nS3-compatible object storage server.\\n\\n## Access\\nThe web console is available on this port. Use the configured credentials to log in.",
  defaultEnv: "MINIO_ROOT_USER=admin\\nMINIO_ROOT_PASSWORD=depnoyed",
};

export default definition;
