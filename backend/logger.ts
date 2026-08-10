import pino from "pino";

/**
 * Enterprise Logging layer.
 * Outputs structured JSON logs to stdout which are scraped by Promtail/Loki
 * or OpenTelemetry collectors in Kubernetes.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
