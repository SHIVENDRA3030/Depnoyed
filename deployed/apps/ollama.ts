import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Ollama",
  slug: "ollama",
  description: "Get up and running with large language models locally.",
  dockerImage: "ollama/ollama:latest",
  containerPort: 11434,
  logo: null,
  category: "AI",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/ollama/ollama",
  website: "https://ollama.com",
  readme: "# Ollama\\n\\nRun Llama 3, Mistral, Gemma, and other models.\\n\\n## Usage\\nInteract with the API on port 11434.",
  defaultEnv: "",
};

export default definition;
