import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Static Welcome",
  slug: "static-welcome",
  description:
    "An nginx:alpine based static welcome page. The simplest possible deployment to validate the control plane.",
  dockerImage: "nginx:alpine",
  containerPort: 80,
  logo: "nginx",
  category: "Web",
  simulator: "static",
  version: "1.25",
  repository: "https://github.com/nginx/nginx",
  website: "https://nginx.org",
  readme: "# Static Welcome\n\nA simple **nginx:alpine** container serving a static HTML welcome page.\n\n## Use Cases\n\n- Validate the deployment pipeline end-to-end\n- Serve static assets (HTML, CSS, JS, images)\n- Act as a reverse proxy or load balancer\n\n## Configuration\n\nThe container listens on port 80 and serves files from `/usr/share/nginx/html`.",
};

export default definition;
