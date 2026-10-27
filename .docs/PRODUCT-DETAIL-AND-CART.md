# Product Detail and Shopping Cart

## Overview

This document describes the product detail page (`/products/:id`) and the
shopping cart page (`/cart`) added for the current lab. Both pages are a
**frontend-only wireframe**: they use a local product catalog and persist the
cart in `localStorage`. No backend endpoint is called, and the final visual
design will be applied in a later phase.

## Routes

The client router (`src/router/Router.js`) now supports dynamic segments in
addition to static paths. Handlers keep the `(path, params)` signature.

| Route           | Handler                   | Purpose                                 |
| --------------- | ------------------------- | --------------------------------------- |
| `/products/:id` | `renderProductDetail(id)` | Product detail for the given catalog id |
| `/cart`         | `renderCart()`            | Shopping cart                           |

Navigation entry points:

- Product titles in the Home featured grid and the Catalog grid link to
  `/products/:id`.
- Recommendation cards on the detail page link to other products.
- The header cart button navigates to `/cart`.
- Breadcrumbs link back to `/` and `/products`.

Unknown product ids render a "Producto no encontrado" state with a link back to
the catalog.

## Data source

`src/models/api/ProductsApi.js` exposes a local catalog of eight products. Each
product keeps the original card fields (`id`, `name`, `seller`, `country`,
`rating`, `ratingsCount`, `price`, `currency`, `imageUrl`) and adds:

| Field         | Description                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| `category`    | Used to prioritise recommendations                                                   |
| `stock`       | Available units; `0` disables purchase and excludes the product from recommendations |
| `description` | Long description shown on the detail page and in the tab                             |
| `attributes`  | `{ label, value }[]` rendered in the "Características" tab                           |
| `gallery`     | `{ label }[]` frames rendered as the main image and thumbnails                       |
| `reviews`     | `{ author, rating, date, comment }[]` for the "Reseñas" tab                          |
| `sellerSince` | Year the seller joined                                                               |
| `sellerSales` | Completed sales shown in the seller card                                             |

`imageUrl` intentionally stays `null`: the wireframe uses the placeholder
artwork already used by product cards. The `gallery` field is the future home
for real image URLs.

### API methods

- `getFeaturedProducts()` — the eight products, as fresh copies.
- `getProductById(id)` — one product or `null`.
- `getSimilarProducts(id, limit = 3)` — up to `limit` in-stock products,
  excluding the current one. Same-category products come first, then the rest of
  the in-stock catalog.

Every method returns deep copies, so views and view models cannot mutate the
catalog.

## Product detail page

`ProductDetailViewModel` owns the state and `ProductDetailView` renders it.

### Layout

1. Breadcrumb: Inicio / Catálogo / product name.
2. Gallery: main image placeholder plus three thumbnails. Selecting a thumbnail
   updates the main label.
3. Product info: seller line, title, rating, price, stock label, short
   description, quantity selector, "Agregar al carrito", "Comprar ahora" and the
   free-shipping note.
4. Tabs: "Descripción", "Características", "Reseñas".
5. Seller card: initials avatar, name, country, "Vendedor desde … · … ventas"
   and a "Ver tienda" link to the catalog.
6. "Productos similares": three recommendation cards with image placeholder,
   seller line, name, rating, price and a "Ver detalle" link.

### Quantity and stock rules

- Quantity starts at `1`.
- It is clamped between `1` and `product.stock`.
- Out-of-stock products show "Agotado"; the quantity selector and both purchase
  buttons are disabled.
- Stock labels: `Agotado` (0), `Últimas N unidades` (1–5), `N disponibles`
  (6+).

### Actions

- "Agregar al carrito" writes `{ product, quantity }` into the cart store and
  shows a confirmation message.
- "Comprar ahora" adds the same item and navigates to `/cart`.
- Adding is guarded by `isAdding` to avoid duplicate writes from double clicks.

## Shopping cart

### Data model (schema v2)

`src/store/cartStore.js` stores a snapshot per product, so the cart page can
render without contacting the API:

```json
{
  "v": 2,
  "userId": null,
  "items": [
    {
      "productId": "aguayo-tradicional-tarabuco",
      "name": "Aguayo tradicional de Tarabuco",
      "price": 40,
      "currency": "USD",
      "imageUrl": null,
      "seller": "Tejidos Illimani",
      "quantity": 2
    }
  ]
}
```

Key `qatu.cart`, stored in `localStorage`.

- Anonymous visitors get a persistent cart; login/logout does **not** clear it.
- Corrupt payloads and unknown schema versions are ignored.
- Legacy v1 payloads (`{ productId, quantity }` only) are migrated to v2 on load.
- `setFromAddResponse` / `setFromGet` remain for the existing `CartService`
  contract, but the current shell does not use them.

### Totals and shipping

| Value    | Rule                                                     |
| -------- | -------------------------------------------------------- |
| Subtotal | Σ `price × quantity`                                     |
| Shipping | Free when subtotal ≥ `US$ 50`, otherwise flat `US$ 4.99` |
| Total    | Subtotal + shipping                                      |

Shipping is `0` for an empty cart. The summary also shows a helper notice:
"¡Tienes envío gratis!" or "Te faltan US$ X.XX para obtener envío gratis."

### Actions

- Quantity selector per item (`− N +`, minimum 1).
- "Eliminar" removes one product.
- "Vaciar carrito" empties the cart.
- "Continuar al pago" shows a placeholder notice: payment is not implemented in
  this phase.
- "Continuar comprando" links back to `/products`.
- When the cart is empty, the page shows an empty state with an icon, message
  and the same continue-shopping link.

### Reusable components

- `QuantitySelectorView` — `− N +` control used by both pages. Clamps typed
  values, disables buttons at the bounds and exposes `onChange`.
- `RecommendationCardView` — compact card for the recommendations grid.
- `src/utils/formatCurrency.js` — shared `formatPrice` / `getCurrencySymbol`
  helpers (`US$ 40.00` convention).

## Responsive behavior

Breakpoints follow the existing client conventions.

- **Desktop (≥ 1024 px):** two-column detail layout (gallery + info), three
  recommendation cards, cart grid with a sticky summary column.
- **Tablet (768–1023 px):** detail layout stacks into one column with a 16:10
  main image; recommendations become two columns; the cart summary moves below
  the item list; cart items switch to a two-row grid.
- **Mobile (≤ 767 px):** purchase buttons stack, gallery uses a 4:3 image,
  attributes become a single column, recommendations become one column, and cart
  items reflow to image + info with quantity and subtotal rows.

All interactive controls keep a visible `:focus-visible` outline, and the global
`prefers-reduced-motion` rule disables transitions.

## Tests

Coverage added for the new flow:

| Spec                                                  | Focus                                                   |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `src/router/Router.spec.js`                           | Dynamic matching, params decoding, exact-route priority |
| `src/models/api/ProductsApi.spec.js`                  | `getProductById`, `getSimilarProducts`, copy safety     |
| `src/store/cartStore.spec.js`                         | v2 schema, persistence, migration, totals, shipping     |
| `src/viewmodels/pages/ProductDetailViewModel.spec.js` | Loading/not-found/error, quantity, tabs, add            |
| `src/views/pages/ProductDetailView.spec.js`           | Rendering, states, controls, recommendations            |
| `src/viewmodels/pages/CartViewModel.spec.js`          | Items, totals, quantity, remove, clear, notice          |
| `src/views/pages/CartView.spec.js`                    | Empty state, item list, summary, actions                |
| `src/views/components/QuantitySelectorView.spec.js`   | Clamping, bounds, disabled state                        |
| `src/views/components/RecommendationCardView.spec.js` | Card content and links                                  |
| `src/utils/formatCurrency.spec.js`                    | Price formatting and currency symbols                   |

Run `pnpm test` (Jasmine browser runner). The visual matrix
(`pnpm test:matrix`) covers both new routes in light/dark and
mobile/tablet/desktop.

## Manual verification

1. Open `/products/aguayo-tradicional-tarabuco`.
2. Change the quantity with `−` / `+`.
3. Click "Agregar al carrito"; the header badge increases.
4. Open `/cart`; verify name, price, quantity and per-item subtotal.
5. Change the quantity; subtotal, shipping and total update.
6. Remove the item; the empty state appears.
7. "Continuar comprando" returns to the catalog.

## Limitations and next steps

- No backend integration: products, recommendations, cart and checkout are
  local.
- No real product images yet; placeholders stand in until the visual phase.
- Checkout is a placeholder notice.
- The cart is not validated against live stock or prices.
- `CartApi`, `CartService` and `pendingCartActionStore` are still present for
  the future authenticated cart flow but are not wired into `main.js`.
