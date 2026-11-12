# Scripts

## `visual-matrix.mjs`

Automated cross-page visual verification for the Sprint Review. Runs 60 combinations (10 routes × 2 themes × 3 viewports) and saves screenshots.

### Usage

```bash
# Terminal 1
pnpm dev

# Terminal 2 (backend also running on :3000)
pnpm test:matrix

# Only some routes (comma-separated names)
MATRIX_ROUTES=seller-orders,orders pnpm test:matrix
```

### Output

- Screenshots: `/tmp/qatu-matrix/{route}-{theme}-{viewport}.png` (60 files)
- Report: `/tmp/qatu-matrix/report.json`

### Routes

`home`, `login`, `register`, `catalog`, `product-detail`, `cart`, `search` (public) and `orders`, `profile`, `seller-orders` (authenticated).

Authenticated routes run with a mocked session (`/auth/me`, `/profiles`, `/cart`, `/orders` are stubbed, no backend data needed). `seller-orders` is mocked with the **seller** role and three sample orders (pending, confirmed, delivered), because the route guard redirects anyone without the seller or admin role. The other authenticated routes keep the **buyer** role.

### What it validates per combination

| Check                       | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `HORIZONTAL_OVERFLOW`       | Document scrollWidth ≤ clientWidth + 2px                                      |
| `MISSING_ELEMENTS`          | Route-specific key elements (header, hero, cards, footer, etc.) all present   |
| `ALT_TEXT_LEAK`             | No product image has a non-empty `alt` (would render alt text if image fails) |
| `THEME_NOT_APPLIED`         | `data-theme` attribute matches the requested theme                            |
| `PAGEERROR` / `CONSOLE-ERR` | No JS exceptions or console errors during load                                |

### Exit codes

- `0` — all combinations passed
- `1` — at least one failure (details in stdout + `report.json`)

### Notes

- Requires a running backend (`http://localhost:3000/health`) and Vite dev server (`http://localhost:5173`).
- Override the base URL with `MATRIX_BASE_URL=http://other-host:port`.
- `MATRIX_SKIP_AUTH_ROUTES=1` skips every authenticated route (including `seller-orders`).
- Screenshots are `fullPage: true` — for mobile this can be very tall (e.g. 8000+ px on Home). That's intentional for review.

## `e2e-auth-cookies.mjs`

End-to-end smoke test for the HttpOnly cookie authentication flow. Runs 6 scenarios against a live backend + frontend. Used in Sprint 4 to verify US-35 (auth session refactor).

### Usage

```bash
# Terminal 1: backend (see ../api)
cd ../api && pnpm dev

# Terminal 2: frontend
pnpm dev

# Terminal 3: E2E
pnpm test:e2e:auth
# (runs node scripts/e2e-auth-cookies.mjs)
```

### Scenarios

| #   | Name                        | What it verifies                                              |
| --- | --------------------------- | ------------------------------------------------------------- |
| 1   | Fresh visit                 | Anonymous header, no cookies, empty sessionStorage            |
| 2   | Login                       | Avatar renders, sessionStorage has `v:2` without `token`      |
| 3   | Reload                      | Avatar persists across reload (cache paint + `/me` rehydrate) |
| 4   | Logout                      | Cookies cleared, sessionStorage cleared, redirect to `/login` |
| 5   | Session expiry              | Cookie deletion → boot `/me` returns 401 → anonymous          |
| 6   | Rehydrate after cache clear | Delete sessionStorage, keep cookies, reload → avatar returns  |

### Exit codes

- `0` — all 6 scenarios PASS
- `1` — any scenario fails (assertion details in stderr)

### Notes

- Requires `puppeteer` (already a devDependency from FE-09).
- The script seeds a throwaway user on the real backend (`POST /v1/auth/register`) and cleans up via logout. No persistent data is left behind except the seed user itself (harmless).
- Override base URLs with `E2E_BASE_URL` and `E2E_API_URL` env vars if running on non-default ports.
