# Seller Product Management (US-16)

## Overview

Sellers can create, upload images for, and publish products through a
guided 3-step wizard. The entire flow ships as of Sprint 6 backend + frontend.

**User story:** US-16 — Create and Publish Product (EP-05 Seller Management).

## End-to-end flow

```
Login (seller role)
  → /seller/products (list)
  → /seller/products/new (wizard)
      Step 1: fill product data → POST /v1/products      → returns draft
      Step 2: upload 1-5 images → POST /v1/products/:id/images (per file)
      Step 3: review + publish  → PATCH /v1/products/:id/publish
  → redirect /seller/products (list refreshes, new product visible)
```

## Endpoints used

| Method | Path                                    | Purpose                                | Auth           |
| ------ | --------------------------------------- | -------------------------------------- | -------------- |
| GET    | `/v1/seller/products?page&limit&status` | List own products (drafts + published) | seller         |
| POST   | `/v1/products`                          | Create draft                           | seller         |
| POST   | `/v1/products/:id/images`               | Upload image (multipart)               | seller         |
| PATCH  | `/v1/products/:id/publish`              | Publish draft                          | seller (owner) |

Full contract: `src/presentation/docs/paths/products.yaml` and
`product-images.yaml` in the API repo. Live docs via `pnpm openapi:preview`.

## Business rules

- **Draft → published** is the only valid transition (via PATCH publish).
  Any other source state returns `409 INVALID_STATE_TRANSITION`.
- **At least 1 image required** before publishing.
  Returns `422 IMAGE_REQUIRED` otherwise. The wizard enforces this in step
  2 → 3 transition.
- **Max 5 images per product.** 6th upload returns `422 IMAGE_LIMIT_REACHED`.
- **Max 5 MiB per image.** `422 FILE_TOO_LARGE`.
- **Allowed formats:** JPEG, PNG, WebP. `422 INVALID_FILE_FORMAT`.
- **Slug uniqueness per seller.** Client-provided slug → `409
SLUG_ALREADY_EXISTS`. Auto-generated → retries with `-2..-5` suffix; after
  5 attempts → `409`.
- **Only the owning seller** can publish / upload. Cross-seller → `403
FORBIDDEN`.
- **Sellers cannot buy their own products.** Enforced at `POST
/v1/cart/items` and `POST /v1/orders` with `422 CANNOT_BUY_OWN_PRODUCT`.
  See `.docs/CHECKOUT.md` for details.

## Images

- Storage paths are relative in DB (`product-images/{uuid}/{file}.webp`),
  resolved to full URLs at read time via `resolveImageUrl()` in the DTOs.
- The URL origin is controlled by the API's `PUBLIC_APP_URL` env var.
  Empty → Supabase direct URL. Set → SPA-origin URL (requires nginx proxy,
  ADR-019 Phase 2, now shipped on the client).
- See `.docs/STORAGE.md` (in the API repo) for the full pattern.
- Frontend nginx proxy (`client/nginx/default.conf`):
  `location ^~ /product-images/` and `location ^~ /avatars/` forward to
  Supabase Storage. The `^~` modifier is critical — without it, the regex
  asset location swallows `.webp`/`.png` requests before the proxy runs.

## Wizard UX (`/seller/products/new`)

### Step 1 — Form

Fields: `name`, `price`, `currency`, `category`, `description`, `stock`,
`attributes` (optional JSON textarea). Client-side validation mirrors the
backend. On success: `POST /v1/products` → returns `productId` + `slug` →
advances to step 2.

### Step 2 — Upload

Drag-and-drop + file picker. Fast-fail client checks (size, MIME, count).
Thumbnails rendered with `onerror` placeholder. "Siguiente" enabled only
when ≥ 1 image uploaded. "Guardar como borrador" → redirect to
`/seller/products` without publishing.

### Step 3 — Review + publish

Read-only review (name, price, category, thumbnails). "Publicar producto"
→ `PATCH /v1/products/:id/publish`. On success → `/seller/products`.
On error → inline banner.

### Abandon protection

`beforeunload` listener while a draft exists and is not yet published.
Browser-native warning (only shown if the user interacted with the page).

## Known limitations (Sprint 7 debt)

The backend lacks several endpoints needed for a fully editable flow. As of
Sprint 6, they are marked `x-status: planned` in the OpenAPI spec.

| Missing endpoint                          | Impact                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /v1/seller/products/:id`             | Seller cannot view a single draft by ID. Only the list is available.                                   |
| `PATCH /v1/products/:id`                  | Step 1 fields are read-only after creation. The user must abandon the draft to start over.             |
| `DELETE /v1/products/:id`                 | Drafts cannot be soft-deleted from the client. Abandoned drafts stay as orphans in `/seller/products`. |
| `DELETE /v1/products/:id/images/:imageId` | Uploaded images cannot be removed or reordered in step 2. Max 5 is the only guard.                     |

**Impact:** the wizard only supports the "create → upload → publish in one
session" flow. Orphan drafts (created + navigated away mid-wizard) can
still be published inline from `/seller/products` IF they have at least one
image. Drafts without images are stuck.

## Visual matrix coverage

`scripts/visual-matrix.mjs` includes:

- `seller-products` — `/seller/products` (KPI cards + filter tabs + grid)
- `seller-product-new` — `/seller/products/new` (step 1 form)

Both run in 2 themes × 3 viewports. Screenshots saved to `/tmp/qatu-matrix/`.
Note: `/seller/products/:id` is NOT in the matrix because the edit route
does not exist (see limitations).

## How to test manually

```bash
# 1. Stack must be up (Supabase CLI + API container + client prod container)
npx supabase status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 2. Login as seller (in browser)
open http://localhost:8080/login
# seller@example.qatu.pe / Seller123!

# 3. Navigate to /seller/products
# 4. Click "Crear producto" → /seller/products/new
# 5. Fill step 1 → "Crear borrador y continuar"
# 6. Upload 1+ images → "Siguiente"
# 7. "Publicar producto" → redirect to list, new product visible
```

## How to run automated tests

- Frontend unit + view:
  ```
  pnpm test -- --filter="SellerProductsViewModel"
  pnpm test -- --filter="SellerProductsPageView"
  pnpm test -- --filter="SellerProductFormViewModel"
  pnpm test -- --filter="SellerProductFormView"
  ```
- Backend integration (real PostgreSQL, from `api/` repo):
  ```
  pnpm vitest run src/application/use-cases/__tests__/SellerProductFlow.integration.test.js
  ```

## Related docs

- `.docs/STORAGE.md` (api repo) — path vs URL, `PUBLIC_APP_URL` toggle
- `.docs/CHECKOUT.md` (api repo) — `CANNOT_BUY_OWN_PRODUCT` rule
- `.docs/CONTAINERIZATION.md` — nginx proxy for images
- ADR-019 — image delivery URL strategy
- ADR-020 — database topology (Mode A)
