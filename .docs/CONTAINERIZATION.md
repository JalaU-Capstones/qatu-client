# Containerization Guide — Qatu Client

This document describes how the Qatu Client (SPA) is containerized: how to run it locally, how to run it in production, the /v1 reverse proxy architecture, how to debug, and how CI/CD publishes images.

**Design references:**

- [SP-16: Containerization Strategy](../../Methodology/Spikes-and-PoC/SP-16-Containerization) (wiki)
- [ADR-016: Containerization Architecture](../../Architecture/ADR/ADR-016-Containerization) (wiki)
- [US-36](https://gitlab.com/jala-university1/cohort-5/ES.CSSD-245.GA.T2.26.M2/SD/group-b/grupo-2/client/-/work_items/37) (GitLab issue)

---

## Prerequisites

| Tool                               | Version       | Install                                 |
| ---------------------------------- | ------------- | --------------------------------------- |
| Docker Engine (not Docker Desktop) | 27.x or newer | https://docs.docker.com/engine/install/ |
| Docker Compose plugin              | v2.30+        | ships with Docker Engine 27+            |
| Git                                | any           | —                                       |

Verify:

```bash
docker --version              # Docker version 27.x.x
docker compose version        # Docker Compose version v2.x.x
```

**Local without Docker:** Node 26 + pnpm 11 are required **only** if running locally without Docker (`make dev` or `pnpm dev`). For Docker-based development (`make up-dev`) and production (`make up-prod`), only Docker and Docker Compose are needed.

**Disk space:** ~1 GB free for images (`node:26-alpine` build image ~200 MB, `nginx:1.29-alpine` base ~23 MB, client runtime ~25 MB compressed).

**Ports that must be free on the host:**

- `5173` (client dev server, `CLIENT_DEV_PORT`, dev only)
- `8080` (client prod nginx, `CLIENT_PORT`, prod default)

_(Note: Puppeteer E2E tests and visual regression tests are covered separately; see [Containerized E2E](#containerized-e2e).)_

---

## Environment Setup

Configuration is controlled via environment variables. Copy the template:

```bash
cp .env.example .env
```

The client cares about **three key environment variables**:

1. `VITE_API_BASE_URL` — **Build-time variable** baked by Vite into the client bundle at build time (`import.meta.env.VITE_API_BASE_URL`). The value **MUST** be reachable from the user's **browser**, not just inside the Docker network.
2. `CLIENT_DEV_PORT` — Host port mapped to container port `5173` in `docker-compose.dev.yml` (default: `5173`).
3. `CLIENT_PORT` — Host port mapped to container port `8080` in `docker-compose.prod.yml` (default: `8080`; recommended for production: `80`).

### Deployment Modes for `VITE_API_BASE_URL`

| Mode                        | When to use                      | `VITE_API_BASE_URL`        | Flow                                                            |
| --------------------------- | -------------------------------- | -------------------------- | --------------------------------------------------------------- |
| **A — Dev (Host Vite)**     | You run `pnpm dev` on host       | `http://localhost:3000/v1` | Browser → host:3000 (API) directly                              |
| **B — Dev (Containerized)** | `make up-dev` with API container | `http://localhost:3000/v1` | Browser → host:3000 (API) directly                              |
| **C — Prod (Nginx SPA)**    | `make up-prod` (Nginx runtime)   | `/v1`                      | Browser → same-origin `/v1` → Nginx → `api:3000` via `qatu-net` |

> **Important:** `VITE_API_BASE_URL` is baked at **build time** during `pnpm build` (or `docker compose build`). Changing this variable in `.env` requires rebuilding the image (`make build` or `docker compose build --no-cache`).

---

## Development Workflow

### First-time setup

```bash
cp .env.example .env
# The API stack MUST be running so the /v1 reverse proxy can resolve:
#   In a second terminal: cd ../api && make up-dev
make network    # creates qatu-net external network if missing (idempotent)
make up-dev     # docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Once running, navigate to `http://localhost:5173/` or test with:

```bash
curl -sf http://localhost:5173/ | grep '<div id="app">'
```

Vite Hot Module Replacement (HMR) is active: edits to `src/**` on the host immediately reload in the browser through the bind mount.

**Network requirement (`qatu-net`):** The client container joins `qatu-net` as an external network. This allows communication with other backend services (e.g. `api:3000`). If `qatu-net` does not exist, `make network` will create it automatically.

### Daily development

```bash
make up-dev             # Start client in dev mode (pnpm dev, port 5173)
make logs               # Follow client logs
make down               # Stop client container (preserves volumes)
make clean              # Stop container + remove local images
```

### Ports exposed in dev

| Port   | Service                 | Purpose                                   |
| ------ | ----------------------- | ----------------------------------------- |
| `5173` | client                  | Vite development server with HMR          |
| `8080` | pgAdmin (api dev-tools) | Database inspection (belongs to API repo) |

_(The client does not expose postgres or rabbitmq — those services belong to the api stack.)_

---

## Production Workflow

```bash
make network            # Ensure qatu-net exists
make up-prod            # Target: runtime stage, host:${CLIENT_PORT:-8080} → container:8080
```

Verify production health:

```bash
curl -sf http://localhost:8080/healthz
curl -s http://localhost:8080/ | grep '<div id="app">'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/v1/products
```

**Production differences from dev:**

- **Target:** `runtime` stage in multi-stage Dockerfile (`nginx:1.29-alpine`).
- **User:** Non-root `nginx` user (`UID 101`, `GID 101`).
- **Healthcheck:** Tested against `http://127.0.0.1:8080/healthz` every 30s.
- **Restart policy:** `restart: unless-stopped`.
- **No bind mounts:** Static production build copied from `build` stage into `/usr/share/nginx/html`.
- **Build argument:** `VITE_API_BASE_URL=/v1` (baked at build time).

### Integration with API (`qatu-net`)

1. **Shared Network:** The client joins `qatu-net` as `external: true`. Both the client container and the API container reside on this bridge network.
2. **Reverse Proxy:** Nginx proxies `/v1/*` requests to `http://api:3000/*`, preserving `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, and `Cookie` headers (ADR-012 HttpOnly session cookies).
3. **Deferred DNS Resolution:** Nginx is configured with Docker's embedded DNS (`resolver 127.0.0.11 valid=5s;`) and a dynamic upstream variable (`set $api_upstream http://api:3000;`). This defers DNS resolution to request time rather than config-parse time, guaranteeing the client container starts and remains healthy even if the API container is temporarily offline.
4. **Resilience:** If the API is offline or restarting, requests to `/v1/*` return `502 Bad Gateway`, while `/` and `/healthz` continue serving normally. When the API returns online, requests succeed without requiring a client restart.

### Troubleshooting: 502 on `/v1/products`

If `/v1/products` returns HTTP 502, check:

1. **API container status:** Confirm the API container is running:
   ```bash
   docker ps --format '{{.Names}}\t{{.Status}}' | grep api-1
   ```
2. **Network connectivity:** Confirm both `client-client-1` and `api-api-1` are attached to `qatu-net`:
   ```bash
   docker network inspect qatu-net --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
   ```

---

## How to Add a New Service

The client repository compose topology is intentionally lightweight and minimal (single client service). Most marketplace services (databases, message brokers, caching) belong to the API repository stack.

If you must add a client-side auxiliary service (e.g. a mock API or documentation server):

### 1. Add the service to `docker-compose.yml`

```yaml
services:
  mock-api:
    image: mockserver/mockserver:5.15.0
    networks:
      - qatu-net
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    expose:
      - '1080'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:1080/health']
      interval: 10s
      timeout: 5s
      retries: 3
```

### 2. Open the port in `docker-compose.dev.yml` only

```yaml
services:
  mock-api:
    ports:
      - '1080:1080'
```

Production compose (`docker-compose.prod.yml`) must **never** expose internal auxiliary services directly to host ports.

### Checklist when adding a service

- [ ] Pinned image tag (no `:latest`).
- [ ] `security_opt: ["no-new-privileges:true"]`.
- [ ] `cap_drop: ["ALL"]`.
- [ ] Connected to `qatu-net` network.
- [ ] Defined healthcheck with `test:`.
- [ ] Ports mapped in `docker-compose.dev.yml` only.
- [ ] Documented in this file.

---

## Debugging

### View logs

```bash
# Follow dev logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f client

# Follow prod nginx logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f client

# Last 100 lines
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 client
```

### Execute a shell inside a container

```bash
# Development container (node user)
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec client sh

# Production container (nginx user)
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec client sh
```

### Inspect the network and health

```bash
# List all containers on qatu-net
docker network inspect qatu-net --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'

# Check health endpoint from inside the container
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec client wget -q -O - http://127.0.0.1:8080/healthz
```

### Common issues

| Symptom                                                 | Likely cause                                        | Fix                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `curl :8080/v1/products` → 502                          | API not running or not attached to `qatu-net`       | Start API stack (`cd ../api && make up-dev`); verify `docker network inspect qatu-net` |
| `curl :8080/` → 404                                     | Build step failed or `dist/` is empty               | Rebuild runtime image: `make build` and inspect build output                           |
| `docker compose up` → `port is already allocated`       | Port 5173 or 8080 in use on the host                | Change `CLIENT_PORT=8090` or `CLIENT_DEV_PORT=5174` in `.env`                          |
| Container build fails with `ERR_PNPM_OUTDATED_LOCKFILE` | `pnpm-lock.yaml` is out of sync with `package.json` | Run `pnpm install` locally on host, commit lockfile, rebuild                           |
| Image build is slow (> 90s)                             | Build cache invalidated or `node_modules` walked    | Verify `.dockerignore` excludes `node_modules`, `dist`, `.git`, `spec`                 |

---

## Environment Variable Reference

| Variable            | Default                    | Required in prod | Description                                                       |
| ------------------- | -------------------------- | ---------------- | ----------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:3000/v1` | yes (`/v1`)      | Build-time base URL baked into the Vite bundle for API calls.     |
| `CLIENT_DEV_PORT`   | `5173`                     | no               | Host port mapped to Vite dev server in `docker-compose.dev.yml`.  |
| `CLIENT_PORT`       | `8080`                     | yes (or `80`)    | Host port mapped to Nginx container in `docker-compose.prod.yml`. |

---

## CI/CD: Publishing Images

Two automated pipelines publish the client image on every `v*` release tag:

### 1. GitHub Actions → GHCR

Workflow: `.github/workflows/publish-image.yml`

- **Triggers:** `push: tags: ['v*']` and manual `workflow_dispatch`.
- **Target registry:** `ghcr.io/jalau-capstones/qatu-client`.
- **Tags:** `:${VERSION}` (e.g. `v0.1.0`) and `:latest`.
- **Platforms:** Multi-arch `linux/amd64` and `linux/arm64` via QEMU and Docker Buildx.
- **Authentication:** `${{ secrets.GITHUB_TOKEN }}` with `packages: write` permission.
- **Repository Setting:** Settings → Actions → General → Workflow permissions = "Read and write permissions".

Pull the image:

```bash
docker pull ghcr.io/jalau-capstones/qatu-client:v0.1.0
```

### 2. GitLab CI → Container Registry

Job: `publish:image` in `.gitlab-ci.yml`

- **Triggers:** Tags matching `v*` only.
- **Target registry:** `$CI_REGISTRY_IMAGE` (`registry.gitlab.com/jala-university1/cohort-5/es.cssd-245.ga.t2.26.m2/sd/group-b/grupo-2/client`).
- **Tags:** `:$CI_COMMIT_TAG` and `:latest`.
- **Platforms:** `linux/amd64` (native GitLab shared runners).
- **Authentication:** `$CI_REGISTRY_USER` and `$CI_REGISTRY_PASSWORD` (automatic).
- **Quality Gates:** Must pass `lint`, `test`, `build`, and `security` prior to publishing.

Pull the image:

```bash
docker login registry.gitlab.com
docker pull registry.gitlab.com/jala-university1/cohort-5/es.cssd-245.ga.t2.26.m2/sd/group-b/grupo-2/client:v0.1.0
```

### Releasing

```bash
make tag        # Prompts for version (e.g. v0.1.0) and creates annotated tag
make tag-push   # Pushes the latest v* tag, triggering GHCR and GitLab pipelines
```

### Manual publish (without a tag)

For GHCR: Go to GitHub → Actions → "Publish Container Image" → Run workflow → optionally specify a tag name (defaults to current branch commit).

---

## Containerized E2E

Both test suites support running against the containerized stack via environment variables and
dedicated Makefile targets.

### Auth cookie E2E (`scripts/e2e-auth-cookies.mjs`)

Six scenarios cover the full session lifecycle (fresh visit → login → reload → logout → expiry → rehydration).
The script requires a live API (real Supabase + PostgreSQL) and a live frontend.

| Target          | Frontend                 | API     | Precondition                                       |
| --------------- | ------------------------ | ------- | -------------------------------------------------- |
| `make e2e`      | `:5173` (dev container)  | `:3000` | `make up-dev` + `cd ../api && make docker-up-dev`  |
| `make e2e-prod` | `:8080` (prod container) | `:3000` | `make up-prod` + `cd ../api && make docker-up-dev` |

```bash
# Dev stack
make up-dev
cd ../api && make docker-up-dev && cd -
make e2e

# Prod stack
make up-prod
make e2e-prod
```

**Exit codes:** `0` = all 6 PASS, `1` = scenario failure, `2` = pre-flight (FE or API unreachable).

> [!NOTE]
> `make e2e` and `make e2e-prod` will be **SKIPPED** (pre-flight exits 2) if Supabase is not running.
> This is expected in environments without a full backend stack.

### Visual regression matrix (`scripts/visual-matrix.mjs`)

8 routes × 2 themes × 3 viewports = **48 screenshots** saved to `/tmp/qatu-matrix/`.
The matrix uses Puppeteer request interception to mock the authenticated `/v1/auth/me` response for
the `orders` route — it does **not** require a live API unless `MATRIX_SKIP_AUTH_ROUTES` is unset
and the target is a real server.

| Target             | Frontend                 | API required | Output                   |
| ------------------ | ------------------------ | ------------ | ------------------------ |
| `make matrix`      | `:5173` (dev container)  | No           | `/tmp/qatu-matrix/*.png` |
| `make matrix-prod` | `:8080` (prod container) | No           | `/tmp/qatu-matrix/*.png` |

```bash
# Dev stack (client only)
make up-dev
make matrix
ls /tmp/qatu-matrix/*.png | wc -l   # → 48

# Prod stack (client only)
make up-prod
make matrix-prod
ls /tmp/qatu-matrix/*.png | wc -l   # → 48

# Skip authenticated routes when running against real API without credentials
MATRIX_SKIP_AUTH_ROUTES=1 pnpm test:matrix
```

### /v1 proxy verification

When the API is running, verify the reverse proxy before E2E:

```bash
# Dev
curl -sf http://localhost:5173/v1/products | head -c 100

# Prod
curl -sf http://localhost:8080/v1/products | head -c 100
```

Both should return JSON from the API (not an nginx error page).

---

## Test the production image locally (no compose)

This section simulates production locally with standalone `docker run` containers — no `docker-compose`. It exercises the same runtime image + nginx config that will ship in production, including the `/v1` reverse proxy and deferred DNS resolution.

There are two scenarios:

### Scenario A — Client alone (api down)

Proves the SPA is served correctly and the `/v1` reverse proxy is wired but unreachable (returns 502, container does NOT crash).

```bash
# 1. Ensure the shared network exists (idempotent)
docker network inspect qatu-net >/dev/null 2>&1 || docker network create qatu-net

# 2. Build the runtime image with the PROD base URL baked in
#    (MUST pass --build-arg VITE_API_BASE_URL=/v1 — the dev default is
#    http://localhost:3000/v1, which would bypass the /v1 proxy)
docker build --target runtime --build-arg VITE_API_BASE_URL=/v1 -t qatu-client:local-prod .

# 3. Run it (no api container on qatu-net yet)
docker run -d --name qatu-client-local \
  --network qatu-net \
  -p 8080:8080 \
  qatu-client:local-prod

# 4. Verify
sleep 2
curl -s http://localhost:8080/healthz        # → ok
curl -s http://localhost:8080/ | grep '<div id="app">'   # → matches
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/v1/products   # → 502
docker ps --filter name=qatu-client-local --format '{{.Status}}'
# → Up X seconds (healthy) — the container MUST NOT crash on the 502

# 5. Tear down
docker stop qatu-client-local && docker rm qatu-client-local
```

**Why this proves the deferred DNS fix works:** nginx resolves `api` at request time (via `resolver 127.0.0.11 valid=5s`). If we still used static upstream resolution (the Phase 1 behavior), the container would fail to start with `[emerg] host not found in upstream "api"`. The 502 response is the correct outcome when the upstream is absent.

### Scenario B — Client + api (end-to-end proxy)

Proves the `/v1` reverse proxy reaches a real api container on `qatu-net` and returns live JSON.

```bash
# 1. Start the api stack first (compose is fine here — this is about testing
#    the client image standalone, not about running the api standalone)
cd ../api
make docker-up-dev    # or docker-up-prod for a prod-like run
cd -

# 2. Build + run the client image (same as Scenario A steps 1–3)
docker build --target runtime --build-arg VITE_API_BASE_URL=/v1 -t qatu-client:local-prod .
docker run -d --name qatu-client-local \
  --network qatu-net \
  -p 8080:8080 \
  qatu-client:local-prod

# 3. Verify the proxy works
sleep 2
curl -sf http://localhost:8080/healthz        # → ok
curl -s http://localhost:8080/v1/products | head -c 100
# → {"data":[{"id":"..." — real JSON from the api
docker logs qatu-client-local --tail 20        # → nginx access log shows 200 on /v1/products

# 4. Tear down
docker stop qatu-client-local && docker rm qatu-client-local
cd ../api && make docker-down && cd -
```

### Why use this flow instead of compose?

- Proves the client image is self-contained (no compose magic, no bind mounts, no Vite dev server).
- Exercises the same nginx config a Kubernetes/ECS deployment would use.
- Verifies the `/v1` proxy is functional BEFORE publishing a `v*` tag.
- Useful for rollback drills: `docker run` a previous image tag and confirm `/healthz` + `/v1/products` behave as expected.

---

## Reference

- **Dockerfile:** `./Dockerfile` (four stages: deps → build → development → runtime)
- **Nginx config:** `./nginx/default.conf` (SPA fallback, asset caching, /healthz, /v1 reverse proxy)
- **Compose files:** `./docker-compose.yml`, `./docker-compose.dev.yml`, `./docker-compose.prod.yml`
- **CI workflows:** `.github/workflows/publish-image.yml`, `.gitlab-ci.yml` (`publish:image` job)
- **Design docs:** [SP-16: Containerization Strategy](../../Methodology/Spikes-and-PoC/SP-16-Containerization), [ADR-016: Containerization Architecture](../../Architecture/ADR/ADR-016-Containerization)
- **GitLab issue:** [US-36 Containerization](https://gitlab.com/jala-university1/cohort-5/ES.CSSD-245.GA.T2.26.M2/SD/group-b/grupo-2/client/-/work_items/37)
