import type { AppDefinition } from "./types";

const definition: AppDefinition = {
  name: "Vaultwarden",
  slug: "vaultwarden",
  description:
    "Unofficial Bitwarden-compatible password server written in Rust — lightweight self-hosting of your password vault with all official Bitwarden clients.",
  dockerImage: "vaultwarden/server:latest",
  containerPort: 80,
  logo: "vaultwarden",
  category: "Security",
  simulator: "static",
  version: "latest",
  repository: "https://github.com/dani-garcia/vaultwarden",
  website: "https://github.com/dani-garcia/vaultwarden",
  readme:
    "# Vaultwarden\n\nUnofficial Bitwarden-compatible server written in Rust. It implements the Bitwarden server API so you can use every official Bitwarden client (browser extension, desktop and mobile apps) against your own self-hosted instance — ideal for individuals and small teams.\n\n## Features\n\n- Full Bitwarden client compatibility (sync, autofill, attachments, TOTP, folders)\n- Organizations with collections and sharing for small teams\n- 2FA via TOTP, WebAuthn/passkeys and email codes\n- Web vault served at the root URL for managing your vault in a browser\n- Very lightweight — a few MB of RAM in typical use\n\n## First Login / Security Notice\n\nThis deployment ships with `SIGNUPS_ALLOWED=true`, so **anyone who can reach the URL can create an account** on your instance. There is no default account:\n\n1. Open the running app and click **Create Account** on the web vault login page.\n2. Register your own account, then log in.\n3. Once you have registered, redeploy with the environment variable `SIGNUPS_ALLOWED=false` (or edit it in the deploy dialog) to lock the instance down to existing users.\n\n## Setup\n\n1. Deploy Vaultwarden from the marketplace.\n2. Open the running app, create your account (see above), and close signups.\n3. Point the official Bitwarden browser extension / mobile app at your deployment URL under the client's \"self-hosted server\" settings.\n\n## Notes\n\n- The encrypted vault database persists under `/data` on a dedicated 1Gi volume that survives restarts.\n- Runs behind HTTP here; the official clients still work, but avoid reusing passwords across HTTPS and HTTP instances of the same account.",
  defaultEnv: ["SIGNUPS_ALLOWED=true", "DOMAIN={{APP_URL}}"].join("\n"),
};

export default definition;
