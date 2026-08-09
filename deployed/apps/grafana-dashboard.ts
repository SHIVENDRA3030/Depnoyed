import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Grafana Dashboard",
  slug: "grafana-dashboard",
  description:
    "The open-source platform for monitoring and observability. Visualize metrics, logs, and traces from any data source with beautiful, dynamic dashboards.",
  dockerImage: "grafana/grafana:latest",
  containerPort: 3000,
  logo: null,
  category: "Monitoring",
  simulator: "static",
  version: "10.2",
  repository: "https://github.com/grafana/grafana",
  website: "https://grafana.com",
  readme: "# Grafana Dashboard\n\nThe open-source platform for monitoring and observability.\n\n## Features\n\n- Dynamic, reusable dashboards\n- 150+ data source plugins\n- Alerting and notification system\n- Annotations and templating\n\n## First Login\n\nDefault credentials: `admin` / `depnoyed` (overridable via `GF_SECURITY_ADMIN_PASSWORD` in the deploy dialog). Change on first login.",
  defaultEnv: "GF_SECURITY_ADMIN_USER=admin\nGF_SECURITY_ADMIN_PASSWORD=depnoyed",
};

export default definition;
