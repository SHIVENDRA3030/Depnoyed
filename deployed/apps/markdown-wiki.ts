import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Markdown Wiki",
  slug: "markdown-wiki",
  description:
    "A lightweight wiki engine that renders Markdown content with live preview. All pages are persisted to your dedicated volume, surviving restarts.",
  dockerImage: "ossmp/markdown-wiki:1.0",
  containerPort: 8080,
  logo: "wiki",
  category: "Productivity",
  simulator: "wiki",
  version: "1.0.0",
  repository: "https://github.com/ossmp/markdown-wiki",
  website: "https://example.com/markdown-wiki",
  readme: "# Markdown Wiki\n\nA lightweight wiki engine that renders Markdown content with live preview.\n\n## Features\n\n- Create and edit wiki pages in Markdown\n- Live preview while editing\n- Pages persisted to `/data/wiki_pages.json`\n- Sidebar navigation\n- Delete pages with confirmation\n\n## Markdown Support\n\nSupports standard Markdown including **bold**, *italic*, `code`, [links](https://example.com), lists, and headings.",
};

export default definition;
