# Seller Product Management (US-16)

## Overview

Sellers create, upload images for, and publish products through a progressive
single-page flow. Product details stay visible and become read-only after draft
creation while the image upload section appears below them.

**User story:** US-16 — Create and Publish Product (EP-05 Seller Management).

## End-to-end flow

```
Login (seller role)
  → /seller/products (list)
  → /seller/products/new (single-page progressive form)
      Create draft: fill product data → POST /v1/products
      Upload 1-5 images: POST /v1/products/:id/images (per file)
      Publish: PATCH /v1/products/:id/publish
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
  Returns `422 IMAGE_REQUIRED` otherwise. The creation view keeps publishing
  disabled until at least one image has uploaded.
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

## Seller product creation UX (`/seller/products/new`)

### Before draft creation

The single-page form accepts `name`, optional editable `slug`, `price`,
`currency`, `category`, `description`, `stock`, and `attributes` (optional JSON
textarea). Client-side validation mirrors the backend. On success,
`POST /v1/products` returns a draft and `productId`; the form remains on screen
with its fields locked, and the image section is revealed beneath it.

### After draft creation

Drag-and-drop and file picker upload images to the existing draft. Fast-fail
client checks enforce size, MIME, and count. Thumbnails use an image fallback
and offer an accessible delete confirmation. "Guardar como borrador" returns
to `/seller/products`; "Publicar producto" stays disabled until an image has
uploaded and then calls `PATCH /v1/products/:id/publish`. On success the view
returns to the product list; errors remain visible inline.

### Abandon protection

`beforeunload` listener while a draft exists and is not yet published.
Browser-native warning (only shown if the user interacted with the page).

## Editing a draft

The creation view locks product details after the draft is created because
images require an existing `productId`. Sellers can update product details
later from the edit modal in `/seller/products`; uploaded images can be
removed from the creation view.

## Visual matrix coverage

`scripts/visual-matrix.mjs` includes:

- `seller-products` — `/seller/products` (KPI cards + filter tabs + grid)
- `seller-product-new` — `/seller/products/new` (before/after draft and image
  deletion confirmation)

Both run in 2 themes × 3 viewports. Screenshots saved to `/tmp/qatu-matrix/`.
To run only product creation, use
`MATRIX_ROUTES=seller-product-new pnpm test:matrix`.

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
# 5. Fill the form → "Crear borrador"
# 6. Upload 1+ images in the revealed section
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
