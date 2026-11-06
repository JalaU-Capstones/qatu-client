# Qatu Marketplace Frontend Client

![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen)

Frontend client for the Qatu Marketplace, a digital marketplace for buyers and sellers. Built as the capstone project for Jala University SD4.

## Tech Stack

| Component     | Technology                               | ADR     |
| ------------- | ---------------------------------------- | ------- |
| Language      | HTML5, CSS3, Vanilla JavaScript (ES2022) | —       |
| Build Tool    | Vite                                     | ADR-007 |
| Architecture  | MVVM                                     | —       |
| CSS Framework | Bulma CSS                                | ADR-008 |
| Testing       | Jasmine                                  | ADR-006 |
| HTTP Client   | Fetch API                                | —       |
| Linting       | ESLint                                   | —       |
| Formatting    | Prettier                                 | —       |

## Prerequisites

- Node.js v26.x
- pnpm v11.x

## Getting Started

1. Clone the repository
2. Run `make install` (or `pnpm install`)
3. Copy `.env.example` to `.env` and fill in the values
4. Run `make dev` (or `pnpm dev`) to start the development server

## Authentication (Cookie-Based Session)

The frontend uses **HttpOnly cookies** for the session (ADR-012). There is **no JWT in localStorage or sessionStorage** — the token is invisible to JavaScript by design.

### How it works

1. `POST /v1/auth/login` and `POST /v1/auth/register` set three cookies:
   - `access_token` (HttpOnly, Secure in prod, SameSite=Strict, 1h TTL)
   - `refresh_token` (HttpOnly, Secure in prod, SameSite=Strict, 30d TTL)
   - `csrf_token` (readable, SameSite=Strict, 1h TTL) — for CSRF double-submit
2. Every request uses `credentials: 'include'` (`apiFetch` does this automatically).
3. Mutating requests (`POST`/`PATCH`/`PUT`/`DELETE`) on non-`/auth/*` paths attach `X-CSRF-Token` from the `csrf_token` cookie.
4. On `401 REFRESH_REQUIRED`, `apiFetch` calls `POST /v1/auth/refresh` once and retries the original request with fresh cookies. On failure, it clears the local state and emits `qatu:auth-expired`.
5. On boot, `AuthBootstrapService` calls `GET /v1/auth/me` to revalidate the session from the cookie. The header paints from the `sessionStorage` cache for optimistic UI.
6. `POST /v1/auth/logout` invalidates the session on the server and clears the cookies.

### SameSite=Strict deployment requirement

The cookies use `SameSite=Strict`. This requires the frontend and API to share the **same site** (eTLD+1):

- ✅ `qatu.com` (FE) + `api.qatu.com` (BE)
- ✅ `qatu.app` (FE) + `qatu.app/api` (BE, reverse proxy)
- ✅ `localhost:5173` + `localhost:3000`
- ❌ `qatu.vercel.app` + `qatu-api.onrender.com` (different sites → cookies dropped)

If a cross-site deployment is required, change `sameSite` to `'none'` in the backend `cookieHelper.js` (HTTPS only). The CSRF defense via double-submit already covers that case.

### E2E verification

Run the full 6-scenario cookie-auth E2E against a live backend:

```bash
# Terminal 1: backend
cd ../api && pnpm dev

# Terminal 2: frontend
pnpm dev

# Terminal 3: E2E
pnpm test:e2e:auth
```

Scenarios covered: fresh visit, login → avatar, reload → persists, logout → cleared, cookie deletion → anonymous, sessionStorage clear + reload → rehydrate via `/me`.

See `.docs/ARCHITECTURE.md` §"Auth Flow (Cookie-Based)" and `.docs/TROUBLESHOOTING.md` §"Auth (Cookie-Based Session)" for details.

## Available Scripts

Run `make help` to see all available scripts.

## Project Structure

See [.docs/ARCHITECTURE.md](.docs/ARCHITECTURE.md) for details on the MVVM folder structure.

## Design System

The visual design system is documented in the Wiki and in `.docs/DESIGN-SYSTEM.md`. Design tokens are authored in Figma and exported as DTCG JSON.

### Regenerating Design Tokens

When tokens change in Figma:

1. Export the updated `tokens.json` from Figma.
2. Replace `src/views/styles/tokens/tokens.json`.
3. Run `pnpm tokens:build` to regenerate `tokens.css`.
4. Commit both `tokens.json` and `tokens.css`.

The Figma source: [Q-atu Design System](https://www.figma.com/design/CdDUOKZHnmoPbvgxMolUNE/Q-atu?node-id=9-1370&m=dev&t=Ybulw0EgYe4IZW5j-1)

## Containerization

The client runs in Docker for both development and production. Full guide: [`.docs/CONTAINERIZATION.md`](./.docs/CONTAINERIZATION.md).

**Quick start (development):**

```bash
cp .env.example .env
# Ensure the api stack is running so /v1 reverse proxy can resolve:
#   In a separate terminal: cd ../api && make docker-up-dev
make network
make up-dev
```

The client will be available at `http://localhost:5173`. Healthcheck: `curl http://localhost:5173/` returns the SPA.

**Quick start (production):**

```bash
make network
make up-prod
```

The client will be available at `http://localhost:8080`. Healthcheck: `curl http://localhost:8080/healthz` returns `ok`. The SPA reverse-proxies `/v1/*` to `api:3000` over the shared `qatu-net` external network.

**Images:**

- `ghcr.io/jalau-capstones/qatu-client:latest` (GHCR, via GitHub Actions)
- `$CI_REGISTRY_IMAGE:latest` (GitLab Container Registry, via GitLab CI)

Publishing is triggered by pushing a `v*` tag (e.g. `git tag v0.1.0 && git push origin v0.1.0`).

See [`.docs/CONTAINERIZATION.md`](./.docs/CONTAINERIZATION.md) for prerequisites, the `/v1` reverse proxy, deferred DNS resolution, the three `VITE_API_BASE_URL` modes (dev/prod), and the "add a new service" checklist.

## Documentation

Detailed documentation is available in the `.docs/` directory:

- [Containerization](.docs/CONTAINERIZATION.md) — Docker multi-stage build, compose topology (dev/prod), nginx /v1 reverse proxy, deferred DNS, debugging, and CI/CD publishing.
- [Architecture](.docs/ARCHITECTURE.md) — MVVM pattern, components, folder structure, cross-cutting concerns, and testing strategy.
- [Profile Management](.docs/PROFILE-MANAGEMENT.md) — View and edit profile, upload avatar (US-04).
- [Design System](.docs/DESIGN-SYSTEM.md) — Overview of design tokens, token build pipeline, Bulma overrides, fonts, and dark mode.
- [Troubleshooting](.docs/TROUBLESHOOTING.md) — Common issues with pnpm, Node.js, Vite, Bulma, Jasmine, Husky, ESLint, and Supabase.
- [Git Rules](.docs/GIT_RULES.md) — Branching strategy (GitFlow), commit message convention (Conventional Commits), merge request guidelines, and remote configuration.

## License

MIT
