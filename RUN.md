# How to Run Depnoyed

Complete setup guide for running Depnoyed on your machine. Two modes are
available — pick the one that matches your goal.

| Mode | What it does | Requirements | Best for |
|------|--------------|--------------|----------|
| **Mock** (default) | In-process simulation of containers | Bun, Node, MongoDB Atlas | Exploring the UI, demos, development |
| **Real Docker** | Runs actual Docker containers | Bun, Node, MongoDB Atlas, **Docker** | Actually using Grafana, Postgres, Redis, etc. |

---

## Prerequisites (both modes)

| Tool | Version | Install from |
|------|---------|--------------|
| [Bun](https://bun.sh) | >= 1.3 | `curl -fsSL https://bun.sh/install \| bash` |
| [Node.js](https://nodejs.org) | >= 20 | [nodejs.org](https://nodejs.org) |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | free M0 tier | [mongodb.com/atlas](https://www.mongodb.com/atlas) (cloud, no local install) |
| [Docker](https://www.docker.com) | any recent | **Only for Real Docker mode** |

Verify your environment:

```bash
node --version   # >= 20
bun --version    # >= 1.3
docker --version # only needed for Real Docker mode
```

---

## Step 1: Clone and install

```bash
git clone https://github.com/SHIVENDRA3030/Depnoyed.git
cd Depnoyed
bun install
```

This installs all dependencies including `dockerode` (used by the real Docker
adapter).

## Step 2: Set up MongoDB Atlas (one-time, ~5 minutes)

Depnoyed uses MongoDB Atlas as its database. You need a free cluster.

1. **Sign up** at [mongodb.com/atlas](https://www.mongodb.com/atlas) (free M0
   tier, no credit card required).

2. **Create a cluster** — pick any cloud provider and region close to you.
   The free M0 tier is sufficient.

3. **Create a database user**:
   - Atlas dashboard → **Database Access** → **Add New Database User**
   - Username: anything (e.g. `depnoyed`)
   - Password: anything strong — **remember it**
   - Role: `Read and write to any database`

4. **Allow your IP**:
   - Atlas dashboard → **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) — easiest for local
     development. For production, restrict to your server's IP.

5. **Get your connection string**:
   - Atlas dashboard → **Connect** → **Drivers** → **Node.js**
   - Copy the SRV string. It looks like:
     ```
     mongodb+srv://depnoyed:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority&appName=Depnoyed
     ```
   - Replace `<password>` with your actual password from step 3.

## Step 3: Configure environment

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in **two required values**:

```bash
# Your Atlas connection string from step 2.5
MONGODB_URI="mongodb+srv://depnoyed:yourpassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority&appName=Depnoyed"

# Generate a random secret for session cookies:
#   openssl rand -hex 32
# Paste the output here:
AUTH_SECRET="paste-the-64-char-hex-string-here"
```

### For Mock mode (default)

Leave the rest at defaults. Your `.env` should have:

```bash
DOCKER_ADAPTER="mock"
MOCK_PERSIST="true"
```

### For Real Docker mode

Also set these two:

```bash
DOCKER_ADAPTER="docker"
DEPLOY_REAL_APP_BASE_URL="http://localhost"
```

Everything else in `.env` has sensible defaults — see [`.env.example`](.env.example)
for the full list with comments.

## Step 4: Create database indexes

```bash
bun run db:ensure-indexes
# Output: MongoDB indexes ensured
```

This creates unique indexes on the `users`, `apps`, and `deployments`
collections. It's idempotent — safe to run multiple times.

## Step 5: Verify the database connection

```bash
bun run db:ping
# Expected: ok=1 ms=42 host=cluster0.abc123.mongodb.net
```

If this fails:
- `alert 80 (internal_error)` → your IP isn't in the Atlas allowlist (step 2.4)
- `MONGODB_URI is not set` → you skipped step 3 or left the placeholder value
- `authentication failed` → wrong username/password in the connection string

## Step 6: Start the dev server

```bash
bun run dev
```

You'll see:

```
▲ Next.js 16.1.3 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in 700ms
```

The app is now running at **http://localhost:3000**.

## Step 7: Seed the marketplace catalog

The marketplace starts empty. Populate it with the 10 built-in apps:

```bash
curl -X POST http://localhost:3000/api/seed
# Output: {"ok":true,"upserted":9,"total":9}
```

This is idempotent — re-running it updates existing apps in place.

## Step 8: Use the app

1. Open **http://localhost:3000** in your browser.
2. **Register** an account (any email + password, >= 8 chars).
3. Browse the **Marketplace** — you'll see 9 apps.
4. Click any app → click **Deploy**.
5. Watch the deployment view:
   - **Logs** tab streams in real time
   - **Runtime details** show container name, volume name, port
   - **Persistent volume data** browser (for the counter/notes/wiki simulators)
6. **Start / Stop / Restart / Delete** buttons control the deployment.

### Mock mode — what you'll see

- Deployments are simulated (in-process). Logs are synthetic but realistic.
- The "preview URL" (`<subdomain>.apps.local`) renders a React simulator page.
- The Demo Counter simulator proves volume persistence: increment the counter,
  stop the deployment, start it again — the value is preserved.

### Real Docker mode — what you'll see

- Deployments are **real Docker containers**. Check with `docker ps`.
- First deploy of each image takes 30-60s (pulling from Docker Hub).
  Subsequent deploys are instant.
- A **green "Open real app" badge** appears next to the subdomain link on the
  deployment view. Click it → the real app opens at `http://localhost:<port>`.
- All 9 real apps are fully functional (see table below).

---

## Real Docker mode — the 9 working apps

| App | Docker image | Default login | First deploy |
|-----|--------------|---------------|--------------|
| n8n | `n8nio/n8n:latest` | (owner-account wizard on first launch) | ~30s |
| Grafana Dashboard | `grafana/grafana:latest` | `admin` / `depnoyed` | ~45s |
| Supabase Studio | `supabase/studio:latest` | (none — studio connects to a mock backend) | ~30s |
| DeepSeek Harness | `depnoyed/deepseek-harness:0.1.1-rc.2-fixed` | Basic Auth: `admin` / `depnoyed` | ~45s |
| Uptime Kuma | `louislam/uptime-kuma:1` | (admin-creation wizard on first launch) | ~30s |
| Gitea | `gitea/gitea:latest` | (install wizard on first launch) | ~30s |
| Vaultwarden | `vaultwarden/server:latest` | (create account; signups open by default) | ~15s |
| Jellyfin | `jellyfin/jellyfin:latest` | (setup wizard on first launch) | ~45s |
| Meilisearch | `getmeili/meilisearch:latest` | (no auth unless `MEILI_MASTER_KEY` is set) | ~15s |

> All 9 catalog images exist on Docker Hub and were smoke-tested
> (`docker run` + health check) before being added. Every app's readme in the
> marketplace UI discloses its first-login behavior in detail.

### Connecting to databases from your host

Once Postgres or Redis is running, connect from your laptop:

```bash
# PostgreSQL (use the port shown on the deployment view)
psql -h localhost -p <hostPort> -U postgres
# password: depnoyed

# Redis
redis-cli -h localhost -p <hostPort>
```

### Verifying real containers are running

```bash
docker ps
# CONTAINER ID   IMAGE                      STATUS         PORTS
# abc123def456   grafana/grafana:latest     Up 30 seconds  0.0.0.0:31245->3000/tcp

docker volume ls
# DRIVER    VOLUME NAME
# local     ossmp-vol-grafana-dashboard-abc123-xyz
```

---

## Common commands

| Command | What it does |
|---------|--------------|
| `bun run dev` | Start dev server at http://localhost:3000 |
| `bun run lint` | Run ESLint to check code quality |
| `bun run build` | Production build (outputs `.next/standalone/`) |
| `bun run start` | Run the production build |
| `bun run db:ensure-indexes` | Create MongoDB unique indexes (idempotent) |
| `bun run db:ping` | Test MongoDB connection |
| `curl -X POST http://localhost:3000/api/seed` | Seed the 9 marketplace apps |
| `curl http://localhost:3000/api/runtime` | Check which adapter (mock/docker) is active |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MONGODB_URI is not set` | You skipped `cp .env.example .env` or didn't fill in `MONGODB_URI` |
| TLS `alert 80 (internal_error)` | Your IP isn't in the Atlas allowlist → Atlas → Network Access → Add IP |
| Session cookies don't persist | `AUTH_SECRET` still says `replace-me-…` → run `openssl rand -hex 32` |
| Marketplace shows empty | You skipped the seed step → `curl -X POST http://localhost:3000/api/seed` |
| Port 3000 already in use | `lsof -i :3000` to find the process, then `kill <pid>` |
| `docker: command not found` | Docker isn't installed — use mock mode (`DOCKER_ADAPTER=mock`) |
| `docker: permission denied` | `sudo usermod -aG docker $USER` then log out + back in (Linux) |
| `[docker] daemon unreachable` | Start Docker Desktop / `sudo systemctl start docker` |
| Container exits immediately | Check the **Logs** tab in the deployment view for the error |
| Image pull fails (rate limit) | `docker login` to Docker Hub, or wait an hour for the limit to reset |
| Deploy hangs forever (Docker mode) | First image pull is slow. Check `docker images` to see pull progress. Check deployment Logs. |
| `ossmp/*` image not found | Those are fictional images. Use one of the 7 real apps instead. |

---

## Environment variables reference

All variables are documented in [`.env.example`](.env.example). The required
ones for basic operation:

| Variable | Required? | Description |
|----------|-----------|-------------|
| `MONGODB_URI` | **Yes** | Atlas SRV connection string |
| `AUTH_SECRET` | **Yes** | 64-char hex string for session cookies (`openssl rand -hex 32`) |
| `DOCKER_ADAPTER` | No (default `mock`) | `mock` or `docker` |
| `DEPLOY_REAL_APP_BASE_URL` | Docker mode only | Base URL for "Open real app" links (e.g. `http://localhost`) |
| `DOCKER_SOCKET` | No | Path to Docker socket (default `/var/run/docker.sock`) |
| `DEPLOY_CPU_LIMIT` | No (default `1`) | CPU cores per container |
| `DEPLOY_MEMORY_LIMIT_MB` | No (default `1024`) | Memory limit per container in MB |

See [`.env.example`](.env.example) for the complete list with inline comments.

---

## Which mode should I use?

- **First time / exploring / demo** → **Mock mode** (works in 5 min, no Docker)
- **Want to actually use the apps** → **Real Docker mode** (real Grafana, Postgres, etc.)
- **Developing the project itself** → **Mock mode** for fast iteration; switch
  to Docker mode only when testing the adapter

---

## Next steps

- Read [README.md](README.md) for the project overview and architecture.
- Read [docs/architecture.md](docs/architecture.md) for the layered design.
- Read [docs/deployment.md](docs/deployment.md) for the full adapter contract.
- Read [docs/development.md](docs/development.md) for contribution guidelines.

If you run into any issues not covered here, check the [Troubleshooting](#troubleshooting)
section above or open an issue on GitHub.
