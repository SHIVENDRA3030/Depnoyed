import os

apps = [
    {
        "name": "Uptime Kuma",
        "slug": "uptime-kuma",
        "description": "A fancy self-hosted monitoring tool.",
        "dockerImage": "louislam/uptime-kuma:1",
        "containerPort": 3001,
        "category": "Monitoring",
        "simulator": "static",
        "version": "1.0",
        "repository": "https://github.com/louislam/uptime-kuma",
        "website": "https://uptime.kuma.pet",
        "readme": "# Uptime Kuma\\n\\nA self-hosted monitoring tool like Uptime Robot.\\n\\n## First Login\\nYou will be prompted to create an admin account upon first login.",
        "defaultEnv": ""
    },
    {
        "name": "Gitea",
        "slug": "gitea",
        "description": "Git with a cup of tea. A painless self-hosted Git service.",
        "dockerImage": "gitea/gitea:latest",
        "containerPort": 3000,
        "category": "Developer Tools",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/go-gitea/gitea",
        "website": "https://gitea.io",
        "readme": "# Gitea\\n\\nA painless self-hosted Git service.\\n\\n## Setup\\nThe initial configuration screen will guide you through setting up the administrator account.",
        "defaultEnv": "USER_UID=1000\\nUSER_GID=1000"
    },
    {
        "name": "Nextcloud",
        "slug": "nextcloud",
        "description": "A safe home for all your data. Private cloud storage and collaboration platform.",
        "dockerImage": "nextcloud:latest",
        "containerPort": 80,
        "category": "Productivity",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/nextcloud/server",
        "website": "https://nextcloud.com",
        "readme": "# Nextcloud\\n\\nA self-hosted productivity platform that keeps you in control.\\n\\n## Setup\\nYou will be asked to create an admin account on the first visit.",
        "defaultEnv": ""
    },
    {
        "name": "MinIO",
        "slug": "minio",
        "description": "High Performance Object Storage compatible with Amazon S3 APIs.",
        "dockerImage": "minio/minio:latest",
        "containerPort": 9001,
        "category": "Database",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/minio/minio",
        "website": "https://min.io",
        "readme": "# MinIO\\n\\nS3-compatible object storage server.\\n\\n## Access\\nThe web console is available on this port. Use the configured credentials to log in.",
        "defaultEnv": "MINIO_ROOT_USER=admin\\nMINIO_ROOT_PASSWORD=depnoyed"
    },
    {
        "name": "Ghost",
        "slug": "ghost",
        "description": "The professional publishing platform. Fast, secure, and open source.",
        "dockerImage": "ghost:latest",
        "containerPort": 2368,
        "category": "CMS",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/TryGhost/Ghost",
        "website": "https://ghost.org",
        "readme": "# Ghost\\n\\nA powerful app for new-media creators to publish, share, and grow a business around their content.\\n\\n## Setup\\nAccess `/ghost` to set up your administrator account.",
        "defaultEnv": "NODE_ENV=development"
    },
    {
        "name": "WordPress",
        "slug": "wordpress",
        "description": "The world's most popular website builder and CMS.",
        "dockerImage": "wordpress:latest",
        "containerPort": 80,
        "category": "CMS",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/WordPress/WordPress",
        "website": "https://wordpress.org",
        "readme": "# WordPress\\n\\nCreate a website, blog, or app.\\n\\n## Setup\\nThe famous 5-minute install will appear on your first visit.",
        "defaultEnv": ""
    },
    {
        "name": "Vaultwarden",
        "slug": "vaultwarden",
        "description": "Unofficial Bitwarden compatible server written in Rust, perfect for self-hosted deployments.",
        "dockerImage": "vaultwarden/server:latest",
        "containerPort": 80,
        "category": "Security",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/dani-garcia/vaultwarden",
        "website": "https://github.com/dani-garcia/vaultwarden",
        "readme": "# Vaultwarden\\n\\nAlternative implementation of the Bitwarden server API written in Rust.\\n\\n## Registration\\nYou can create an account directly from the login page.",
        "defaultEnv": "SIGNUPS_ALLOWED=true"
    },
    {
        "name": "Jellyfin",
        "slug": "jellyfin",
        "description": "The Free Software Media System. No strings attached.",
        "dockerImage": "jellyfin/jellyfin:latest",
        "containerPort": 8096,
        "category": "Media",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/jellyfin/jellyfin",
        "website": "https://jellyfin.org",
        "readme": "# Jellyfin\\n\\nJellyfin is the volunteer-built media solution that puts you in control of your media.\\n\\n## Setup\\nThe setup wizard will guide you through creating an admin user and adding media.",
        "defaultEnv": ""
    },
    {
        "name": "Open WebUI",
        "slug": "open-webui",
        "description": "User-friendly WebUI for LLMs (Formerly Ollama WebUI).",
        "dockerImage": "ghcr.io/open-webui/open-webui:main",
        "containerPort": 8080,
        "category": "AI",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/open-webui/open-webui",
        "website": "https://openwebui.com",
        "readme": "# Open WebUI\\n\\nAn extensible, feature-rich, and user-friendly web interface for LLMs.\\n\\n## Login\\nThe first user to register becomes the administrator.",
        "defaultEnv": "OLLAMA_BASE_URL=http://host.docker.internal:11434"
    },
    {
        "name": "Ollama",
        "slug": "ollama",
        "description": "Get up and running with large language models locally.",
        "dockerImage": "ollama/ollama:latest",
        "containerPort": 11434,
        "category": "AI",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/ollama/ollama",
        "website": "https://ollama.com",
        "readme": "# Ollama\\n\\nRun Llama 3, Mistral, Gemma, and other models.\\n\\n## Usage\\nInteract with the API on port 11434.",
        "defaultEnv": ""
    },
    {
        "name": "Meilisearch",
        "slug": "meilisearch",
        "description": "A lightning-fast search engine that fits effortlessly into your apps, websites, and workflow.",
        "dockerImage": "getmeili/meilisearch:latest",
        "containerPort": 7700,
        "category": "Database",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/meilisearch/meilisearch",
        "website": "https://www.meilisearch.com",
        "readme": "# Meilisearch\\n\\nFast, relevant, and typo-tolerant search engine.\\n\\n## Access\\nThe search dashboard is available at the root URL.",
        "defaultEnv": "MEILI_ENV=development"
    },
    {
        "name": "Wiki.js",
        "slug": "wikijs",
        "description": "The most powerful and extensible open source Wiki software.",
        "dockerImage": "requarks/wiki:2",
        "containerPort": 3000,
        "category": "Productivity",
        "simulator": "static",
        "version": "2",
        "repository": "https://github.com/requarks/wiki",
        "website": "https://js.wiki",
        "readme": "# Wiki.js\\n\\nA modern, lightweight and powerful wiki app built on Node.js.\\n\\n## Setup\\nThe setup wizard will guide you through the configuration.",
        "defaultEnv": "DB_TYPE=sqlite\\nDB_FILEPATH=/wiki/db.sqlite"
    }
]

template = '''import type {{ AppDefinition }} from "./types";

const definition: AppDefinition = {{
  name: "{name}",
  slug: "{slug}",
  description: "{description}",
  dockerImage: "{dockerImage}",
  containerPort: {containerPort},
  logo: null,
  category: "{category}",
  simulator: "{simulator}",
  version: "{version}",
  repository: "{repository}",
  website: "{website}",
  readme: "{readme}",
  defaultEnv: "{defaultEnv}",
}};

export default definition;
'''

out_dir = "deployed/apps"
imports = []
exports = []

for app in apps:
    file_path = os.path.join(out_dir, app["slug"] + ".ts")
    content = template.format(
        name=app["name"],
        slug=app["slug"],
        description=app["description"].replace('"', '\\"'),
        dockerImage=app["dockerImage"],
        containerPort=app["containerPort"],
        category=app["category"],
        simulator=app["simulator"],
        version=app["version"],
        repository=app["repository"],
        website=app["website"],
        readme=app["readme"].replace('\\n', '\\\\n').replace('"', '\\"'),
        defaultEnv=app["defaultEnv"].replace('\\n', '\\\\n')
    )
    with open(file_path, "w") as f:
        f.write(content)
    
    # format import name to camelCase
    import_name = "".join(x.capitalize() for x in app["slug"].split("-"))
    import_name = import_name[0].lower() + import_name[1:]
    
    imports.append(f'import {import_name} from "./{app["slug"]}";')
    exports.append(f"  {import_name},")

print("Generated files.")
print("\\n".join(imports))
print("\\n".join(exports))
