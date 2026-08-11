import os

apps = [
    {
        "name": "MongoDB",
        "slug": "mongodb",
        "description": "A document-based, distributed database built for modern application developers and for the cloud era.",
        "dockerImage": "mongo:latest",
        "containerPort": 27017,
        "category": "Database",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/mongodb/mongo",
        "website": "https://www.mongodb.com",
        "readme": "# MongoDB\\n\\nA general purpose, document-based, distributed database.\\n\\n## Access\\nConnect to port 27017 using your MongoDB client.",
        "defaultEnv": "MONGO_INITDB_ROOT_USERNAME=admin\\nMONGO_INITDB_ROOT_PASSWORD=depnoyed"
    },
    {
        "name": "Supabase Studio",
        "slug": "supabase",
        "description": "The open source Firebase alternative. (Studio UI)",
        "dockerImage": "supabase/studio:latest",
        "containerPort": 3000,
        "category": "Database",
        "simulator": "static",
        "version": "latest",
        "repository": "https://github.com/supabase/supabase",
        "website": "https://supabase.com",
        "readme": "# Supabase\\n\\nOpen source Firebase alternative.\\n\\n## Access\\nAccess the Studio dashboard via the provided URL.",
        "defaultEnv": "STUDIO_PG_META_URL=http://host.docker.internal:8080\\nSUPABASE_URL=http://host.docker.internal:8000"
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

print("Generated files.")
