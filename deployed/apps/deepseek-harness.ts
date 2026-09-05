import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "DeepSeek Harness",
  slug: "deepseek-harness",
  description:
    "Open-source agent harness from DeepSeek. Agent = Model + Harness — a plugin-based runtime for building, running, and inspecting AI agents.",
  dockerImage: "depnoyed/deepseek-harness:0.1.1-rc.2-fixed",
  containerPort: 3080,
  logo: "deepseek",
  category: "AI",
  simulator: "static",
  version: "0.1.1-rc.2",
  repository: "https://github.com/deepseek-ai/deepseek-harness",
  website: "https://www.deepseek.com/harness/en/",
  readme:
    "# DeepSeek Harness\n\nDeepSeek's open-source agent harness (dsh) — \"Agent = Model + Harness\". The harness lets an agent understand its environment, use tools, and keep working in real-world settings. Built on the Cordis kernel, where every capability (models, tools, skills, sessions, sandboxes, storage, loops, scheduling, and the UI) is a swappable plugin.\n\n## Features\n\n- Everything is a plugin: recompose models, tools, and skills without touching source code\n- Append-only session log with a Trajectory view: resume, fork, search, and replay agent runs\n- Runtime modes: Standard (full toolset), Code (TypeScript SDK), Minimal (bash + file editor, for benchmarking), and Creator (author presets and inspect the runtime)\n- Community plugins discoverable via the `dsh-plugin` GitHub topic\n\n## Access\n\nThe web UI sits behind HTTP Basic Auth. Default credentials:\n\n- Username: `admin`\n- Password: `depnoyed`\n\nOverride `PROXY_USERNAME` / `PROXY_PASSWORD` in the deploy dialog (auth is disabled when both are empty).\n\n## Setup\n\n1. Deploy DeepSeek Harness from the marketplace.\n2. Open the running app and sign in with the credentials above.\n3. Configure a model provider / API key in the harness UI, then start an agent session.\n\n## Notes\n\n- Sessions, config, and installed plugins persist under `/root/.dsh` on a dedicated volume that survives restarts.\n- Deployed image: `depnoyed/deepseek-harness:0.1.1-rc.2-fixed` (built from `deployed/apps/deepseek-harness/Dockerfile`) — pins the community `smanx/deepseek-harness:0.1.1-rc.2` image and launches dsh with `node --expose-internals`, because dsh's HMR plugin crashes on this Node base otherwise. Inside the container the DSH service listens on loopback :3079 and a Node proxy serves the web UI on :3080 (WebSocket included).\n- DeepSeek Harness is in developer preview (MIT-licensed); core plugin APIs may still change between releases.",
  defaultEnv: ["PROXY_USERNAME=admin", "PROXY_PASSWORD=depnoyed"].join("\n"),
};

export default definition;
