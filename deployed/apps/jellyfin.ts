import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Jellyfin",
  slug: "jellyfin",
  description:
    "Free software media system — your own personal Netflix. Stream, organize and share your movies, shows and music from a self-hosted server with no tracking.",
  dockerImage: "jellyfin/jellyfin:latest",
  containerPort: 8096,
  logo: "jellyfin",
  category: "Media",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/jellyfin/jellyfin",
  website: "https://jellyfin.org",
  readme:
    "# Jellyfin\n\nFree software media system that puts you in control of your media. Stream to any device via the web UI or official clients, organize movies and shows with posters and metadata, and let multiple users watch simultaneously — with no central tracking and no paid tiers.\n\n## Features\n\n- Web interface plus official apps for Android, iOS, Fire TV, Roku and more\n- Automatic library organization with posters, metadata and subtitles (OpenSubtitles plugin)\n- Hardware/CI transcoding support and multiple simultaneous user streams\n- Users with per-library access rights and parental controls\n- Live TV and DVR support with a compatible tuner\n\n## First Login\n\nThere is **no default account**. On first launch the web UI starts the **setup wizard**: you choose your display language, create an administrator account (username + password), add your first media library, and pick metadata downloaders.\n\n## Setup\n\n1. Deploy Jellyfin from the marketplace.\n2. Open the running app and complete the setup wizard to create your admin account.\n3. Add a media library (point it at a folder inside the container) and start streaming.\n4. Install the official Jellyfin app on your devices and connect using your deployment URL.\n\n## Notes\n\n- Configuration, metadata and user data persist under `/config` on a dedicated 2Gi volume that survives restarts.\n- This single-container deployment does not mount a media volume — upload or `docker cp` media into `/config` (e.g. `/config/media`) or mount your own media into the container if you extend the deployment.",
  defaultEnv: ["JELLYFIN_PublishedServerUrl={{APP_URL}}"].join("\n"),
};

export default definition;
