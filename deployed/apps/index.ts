/**
 * Catalog of all marketplace applications available for deployment.
 *
 * This is the single source of truth consumed by the backend seed route
 * (`src/app/api/seed/route.ts`). To add a new application to the marketplace:
 *
 *   1. Create `deployed/apps/<slug>.ts` exporting a default `AppDefinition`.
 *   2. Import it below and add it to the `MARKETPLACE_APPS` array.
 *
 * Only apps listed here can be deployed — the deployment manager refuses to
 * run arbitrary images supplied by users.
 */

import type { AppDefinition } from "./types";

import demoCounter from "./demo-counter";
import staticWelcome from "./static-welcome";
import giteaLite from "./gitea-lite";
import markdownWiki from "./markdown-wiki";
import redisCache from "./redis-cache";
import postgresql from "./postgresql";
import grafanaDashboard from "./grafana-dashboard";
import prometheus from "./prometheus";
import nginxProxy from "./nginx-proxy";
import mattermostChat from "./mattermost-chat";
import n8n from "./n8n";
import uptimeKuma from "./uptime-kuma";
import gitea from "./gitea";
import nextcloud from "./nextcloud";
import minio from "./minio";
import ghost from "./ghost";
import wordpress from "./wordpress";
import vaultwarden from "./vaultwarden";
import jellyfin from "./jellyfin";
import openWebui from "./open-webui";
import ollama from "./ollama";
import meilisearch from "./meilisearch";
import wikijs from "./wikijs";
import mongodb from "./mongodb";
import supabase from "./supabase";

export type { AppDefinition } from "./types";

export const MARKETPLACE_APPS: readonly AppDefinition[] = [
  demoCounter,
  staticWelcome,
  giteaLite,
  markdownWiki,
  redisCache,
  postgresql,
  grafanaDashboard,
  prometheus,
  nginxProxy,
  mattermostChat,
  n8n,
  uptimeKuma,
  gitea,
  nextcloud,
  minio,
  ghost,
  wordpress,
  vaultwarden,
  jellyfin,
  openWebui,
  ollama,
  meilisearch,
  wikijs,
  mongodb,
  supabase,
];

/** Look up a definition by slug. */
export function findAppDefinition(slug: string): AppDefinition | undefined {
  return MARKETPLACE_APPS.find((a) => a.slug === slug);
}
