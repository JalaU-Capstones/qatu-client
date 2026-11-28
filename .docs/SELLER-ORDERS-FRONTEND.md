# Seller Orders — Frontend (US-12 / US-13, SC-11)

## Overview

`/seller/orders` is the seller dashboard: it lists the orders that include the seller's products
(US-12) and lets the seller move an order through its lifecycle (US-13). The API contract and
the authorization rules live in the backend
[`SELLER-ORDERS.md`](../../api/.docs/SELLER-ORDERS.md) and ADR-017; this page explains how the
client uses them.

## Endpoints used

| Call                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `GET /v1/orders?view=seller`  | Orders with at least one of the seller's products      |
| `PATCH /v1/orders/:id/status` | Change the status (`X-CSRF-Token` added by `apiFetch`) |
| `GET /v1/profiles/:id`        | Buyer display name (public profile, never the e-mail)  |

`items[]` and the revenue column only contain the seller's own lines. `total` is the whole
order total, which is why revenue is computed from `items[].subtotal`
(`SellerOrdersViewModel.sellerRevenue`).

## Who can see it (and why the client never decides alone)

| Layer                   | What it does                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Route guard (`main.js`) | Awaits the session bootstrap, then `getSellerRouteAccess(authStore)` → `allow`, `login` or `home`.       |
| Header link             | "Mis ventas" is shown only when `HeaderViewModel.isSeller` is true (seller or admin role).               |
| View gate               | `SellerOrdersPageView.mount` shows a message and never calls the API for anonymous users or non-sellers. |
| **API (the real one)**  | Resolves roles from `user_roles` on every request: buyers get `403`, sellers only get their own items.   |

The first three are UX only. Hiding a link or redirecting a route protects nobody; the API
rejects anything the user is not allowed to do. That is also why roles are **never** read from
`user.user_metadata` (the user can edit it).

### The guard must wait for the session

On a cold start (a new tab, a bookmark, a reload) there is no cached role until `GET /auth/me`
answers. `main.js` keeps the promise returned by `AuthBootstrapService.bootstrap()` (it never
rejects) as `sessionReady`, and `renderSellerOrders` awaits it before deciding. Without that
wait a legitimate seller who opens `/seller/orders` directly would be bounced to the home page.

- Anonymous → `/login`, with `/seller/orders` saved through `authRedirectStore`, so after
  signing in the user lands back on the dashboard.
- Signed in without the role → `/` (replace, so Back does not loop).
- Navigating away while the session is still resolving cancels the pending render.

The same helper is meant for future role-gated routes: add a function next to
`getSellerRouteAccess` in `src/router/guards.js` instead of repeating the checks in `main.js`.

## Status transitions

The single source of truth is `src/models/entities/orderStatus.js`
(`getSellerNextStatuses`, `isTerminalOrderStatus`). Nothing else hardcodes a transition.

| From        | A seller can move it to |
| ----------- | ----------------------- |
| `pending`   | `confirmed`             |
| `confirmed` | `shipped`, `cancelled`  |
| `shipped`   | `delivered`             |
| `delivered` | — (final)               |
| `cancelled` | — (final)               |

- A final order renders **no selector**: a dash with a "Estado final" hint for assistive tech.
- `SellerOrdersViewModel.updateStatus` also refuses a transition that is not in that table, so a
  request from a final state cannot be sent even if the view were bypassed.
- The API repeats the check (`422 INVALID_STATUS_TRANSITION`); the client list is only a hint
  and may be stale.

## Errors the user sees

`OrdersApi` errors carry a stable `code`; the ViewModel maps `code` (not the HTTP status) to a
Spanish message. A CSRF failure is also `403`, so mapping by status would wrongly tell the user
they have no permission.

| `code`                      | Status | Message (summary)                                   | Extra behaviour                       |
| --------------------------- | ------ | --------------------------------------------------- | ------------------------------------- |
| `FORBIDDEN`                 | 403    | You do not have permission to update this order     |                                       |
| `NOT_FOUND`                 | 404    | Order not found                                     | Reloads the list                      |
| `INVALID_STATUS_TRANSITION` | 422    | Cannot change the order from "X" to "Y"             | Reloads the list                      |
| `INVALID_CSRF_TOKEN`        | 403    | Could not verify your session, reload and try again |                                       |
| `SESSION_EXPIRED`           | 401    | Your session expired                                | `apiFetch` also redirects to `/login` |
| anything else               | —      | Generic "could not update, try again"               |                                       |

After `422`/`404` the list is reloaded because the screen was out of date (for example another
tab already moved the order); the error message is kept next to the refreshed data.

`OrdersApi` validates its input before calling the network: an unknown `view` or `status`
throws `INVALID_REQUEST` (400) instead of silently falling back to another scope.

## Loading, accessibility and rendering

- **Per-order busy state.** Only the order being updated is disabled, with an "Actualizando…"
  indicator and `aria-busy` on the row. Other rows stay usable; a second submit for the same
  order is ignored.
- **Reloading keeps the table.** Changing page or filter dims the previous rows instead of
  replacing them with a spinner.
- **Live regions.** `[data-role="notice"]` is `aria-live="polite"`; `[data-role="error"]` is
  `role="alert"`. Both exist from the first render so changes are announced.
- Every selector has an `aria-label` with the order number; table headers use `scope="col"`.
- **No `innerHTML` with API data.** Buyers choose their own `full_name` (the API only checks its
  length), so a name such as `<img src=x onerror=…>` is stored. Every cell is built with
  `textContent`, and the status badge class comes from a whitelist. A regression test covers
  this (`SellerOrdersPageView.spec.js`).

## Buyer names

A seller sees `buyer_id`; the name comes from the public profile endpoint. The ViewModel:

- requests each buyer **once per session** (cache), including concurrent loads (in-flight
  dedupe);
- does not retry a failed lookup (no request storm) and falls back to the first 8 characters of
  the id;
- never falls back to the e-mail.

## Files

| File                                               | Role                                          |
| -------------------------------------------------- | --------------------------------------------- |
| `src/router/guards.js`                             | `getSellerRouteAccess`                        |
| `src/main.js`                                      | `sessionReady`, guarded `renderSellerOrders`  |
| `src/viewmodels/pages/SellerOrdersViewModel.js`    | State, error mapping, buyer cache             |
| `src/views/pages/SellerOrdersPageView.js` / `.css` | Table, KPIs, a11y                             |
| `src/viewmodels/components/HeaderViewModel.js`     | `isSeller`                                    |
| `src/views/components/HeaderView.js`               | "Mis ventas" link, kept in sync with the role |
| `src/models/api/OrdersApi.js`                      | Calls, input validation, error codes          |
| `src/models/entities/orderStatus.js`               | Statuses, labels, seller transitions          |

Manual and automated verification steps: [`TESTING-SELLER-FLOW.md`](./TESTING-SELLER-FLOW.md).
