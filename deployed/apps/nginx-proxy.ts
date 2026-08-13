import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Nginx Proxy",
  slug: "nginx-proxy",
  description:
    "A high-performance HTTP server and reverse proxy. Serve static content, load-balance applications, and act as an API gateway — all with minimal resource usage.",
  dockerImage: "traefik/whoami",
  containerPort: 80,
  logo: null,
  category: "Web",
  simulator: "static",
  version: "1.25",
  repository: "https://github.com/nginx/nginx",
  website: "https://nginx.org",
  readme: "# Nginx Proxy\n\nA high-performance HTTP server and reverse proxy.\n\n## Common Use Cases\n\n- Reverse proxy for backend services\n- Load balancing\n- SSL/TLS termination\n- Static file serving\n- API gateway\n\n## Performance\n\nKnown for high concurrency, low memory usage, and event-driven architecture.",
  defaultEnv: null,
};

export default definition;
