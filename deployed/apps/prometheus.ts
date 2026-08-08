import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Prometheus",
  slug: "prometheus",
  description:
    "An open-source systems monitoring and alerting toolkit. Collects metrics from configured targets, evaluates rule expressions, and triggers alerts.",
  dockerImage: "prom/prometheus:latest",
  containerPort: 9090,
  logo: null,
  category: "Monitoring",
  simulator: "static",
  version: "2.48",
  repository: "https://github.com/prometheus/prometheus",
  website: "https://prometheus.io",
  readme: "# Prometheus\n\nAn open-source systems monitoring and alerting toolkit.\n\n## Features\n\n- Multi-dimensional data model (time series identified by metric name and key/value pairs)\n- PromQL query language\n- Pull-based collection via HTTP\n- Time series database with on-disk storage\n\n## Configuration\n\nConfigure scrape targets in `/etc/prometheus/prometheus.yml`.",
  defaultEnv: null,
};

export default definition;
