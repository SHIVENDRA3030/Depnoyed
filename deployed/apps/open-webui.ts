import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Open WebUI",
  slug: "open-webui",
  description: "User-friendly WebUI for LLMs (Formerly Ollama WebUI).",
  dockerImage: "ghcr.io/open-webui/open-webui:main",
  containerPort: 8080,
  logo: null,
  category: "AI",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/open-webui/open-webui",
  website: "https://openwebui.com",
  readme: "# Open WebUI\\n\\nAn extensible, feature-rich, and user-friendly web interface for LLMs.\\n\\n## Login\\nThe first user to register becomes the administrator.",
  defaultEnv: "OLLAMA_BASE_URL=http://host.docker.internal:11434",
};

export default definition;
