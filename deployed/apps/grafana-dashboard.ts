import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Grafana Dashboard",
  slug: "grafana-dashboard",
  description:
    "The open-source platform for monitoring and observability. Visualize metrics, logs, and traces from any data source with beautiful, dynamic dashboards.",
  dockerImage: "grafana/grafana:latest",
  containerPort: 3000,
  logo: "grafana",
  category: "Monitoring",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/grafana/grafana",
  website: "https://grafana.com",
  readme:
    "# Grafana Dashboard\n\nThe open-source platform for monitoring and observability.\n\n## Features\n\n- Dynamic, reusable dashboards\n- 150+ data source plugins (Prometheus, Loki, Postgres, ...)\n- Alerting and notification system\n- Annotations, variables, and templating\n\n## First Login\n\nDefault credentials: `admin` / `depnoyed` (overridable via `GF_SECURITY_ADMIN_PASSWORD` in the deploy dialog). Grafana asks you to set a new password on first login.\n\n## Notes\n\n- Dashboards, data sources, and plugins persist under `/var/lib/grafana` on a dedicated 5Gi volume that survives restarts.\n- `GF_SERVER_ROOT_URL` is pre-configured to the deployment's public URL so links and callbacks resolve correctly.",
  defaultEnv: [
    "GF_SECURITY_ADMIN_USER=admin",
    "GF_SECURITY_ADMIN_PASSWORD=depnoyed",
    "GF_SERVER_ROOT_URL={{APP_URL}}",
    "GF_USERS_ALLOW_SIGN_UP=false",
    "GF_ANALYTICS_REPORTING_ENABLED=false",
    "GF_ANALYTICS_CHECK_FOR_UPDATES=false",
  ].join("\n"),
  dockerUser: "0",
};

export default definition;
