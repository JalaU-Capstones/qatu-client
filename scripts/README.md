# Scripts

## `visual-matrix.mjs`

Automated cross-page visual verification for the Sprint Review. Runs 36 combinations (6 routes × 2 themes × 3 viewports) and saves screenshots.

### Usage

```bash
# Terminal 1
pnpm dev

# Terminal 2 (backend also running on :3000)
pnpm test:matrix
```

### Routes covered

| Route            | Path                                    |
| ---------------- | --------------------------------------- |
| `home`           | `/`                                     |
| `login`          | `/login`                                |
| `register`       | `/register`                             |
| `catalog`        | `/products`                             |
| `product-detail` | `/products/aguayo-tradicional-tarabuco` |
| `cart`           | `/cart`                                 |

### Output

- Screenshots: `/tmp/qatu-matrix/{route}-{theme}-{viewport}.png` (36 files)
- Report: `/tmp/qatu-matrix/report.json`

### What it validates per combination

| Check                       | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `HORIZONTAL_OVERFLOW`       | Document scrollWidth ≤ clientWidth + 2px                                      |
| `MISSING_ELEMENTS`          | Route-specific key elements (header, hero, cards, footer, etc.) all present   |
| `ALT_TEXT_LEAK`             | No product image has a non-empty `alt` (would render alt text if image fails) |
| `THEME_NOT_APPLIED`         | `data-theme` attribute matches the requested theme                            |
| `PAGEERROR` / `CONSOLE-ERR` | No JS exceptions or console errors during load                                |

Route-specific element checks:

- **home:** header, hero, categories, featured products, shipping banner, featured stores, footer.
- **login / register:** header, auth page, auth card, footer.
- **catalog:** header, catalog section, product grid, footer.
- **product-detail:** header, detail section, breadcrumb, title, gallery, quantity selector, add-to-cart button, tabs, recommendation cards, footer.
- **cart:** header, cart section, title, empty state, continue-shopping link, footer.

### Exit codes

- `0` — all 36 combinations passed
- `1` — at least one failure (details in stdout + `report.json`)

### Notes

- Requires a running backend (`http://localhost:3000/health`) and Vite dev server (`http://localhost:5173`).
- Override the base URL with `MATRIX_BASE_URL=http://other-host:port`.
- The matrix opens each route with an empty `localStorage`, so `/cart` is validated in its empty state. The populated cart flow is covered by the unit/integration specs.
- Screenshots are `fullPage: true` — for mobile this can be very tall (e.g. 8000+ px on Home). That's intentional for review.
