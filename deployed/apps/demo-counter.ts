import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Demo Counter",
  slug: "demo-counter",
  description:
    "A tiny demo app that persists a counter in its dedicated volume. Perfect for proving that data survives container restarts.",
  dockerImage: "ossmp/demo-counter:1.0",
  containerPort: 80,
  logo: "counter",
  category: "Demo",
  simulator: "counter",
  version: "1.0.0",
  repository: "https://github.com/ossmp/demo-counter",
  website: "https://example.com/demo-counter",
  readme: "# Demo Counter\n\nA minimal application that demonstrates **volume persistence** in OSS Deploy.\n\n## Features\n\n- Increments a counter stored in a dedicated volume\n- Survives container stop/start cycles\n- Proves multi-tenant isolation\n\n## Usage\n\nClick **Increment** to increase the counter. The value is persisted to `/data/counter.json` inside the container's dedicated volume.",
};

export default definition;
