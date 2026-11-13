# Testing the Seller Flow (US-12 / US-13)

How to verify `/seller/orders` by hand, and what the automated checks cover. Design notes are in
[`SELLER-ORDERS-FRONTEND.md`](./SELLER-ORDERS-FRONTEND.md).

## Automated checks

```bash
pnpm lint
pnpm format:check
pnpm test                                  # Jasmine, headless Chrome (supabase is stubbed)
MATRIX_ROUTES=seller-orders pnpm test:matrix   # 1 route x 2 themes x 3 viewports (needs `pnpm dev`)
```

| Spec                                                 | Covers                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/router/guards.spec.js`                          | anonymous / buyer / seller / admin, metadata role ignored                    |
| `src/store/authStore.spec.js`                        | `hasRole`, `isSeller`, `clearSession`                                        |
| `src/viewmodels/components/HeaderViewModel.spec.js`  | `isSeller`, notifies only on change                                          |
| `src/views/components/HeaderView.spec.js`            | link hidden for buyers, shown for sellers, appears/disappears on role change |
| `src/models/api/OrdersApi.spec.js`                   | invalid `view`/`status`, 403/404/422/CSRF codes, non-JSON fallback           |
| `src/viewmodels/pages/SellerOrdersViewModel.spec.js` | terminal guard, per-order busy, error mapping, list reload, buyer cache      |
| `src/views/pages/SellerOrdersPageView.spec.js`       | rendering, XSS regression, terminal rows, a11y, filter, pagination           |

The matrix mocks a **seller** session and three sample orders for this route only; the other
authenticated routes keep the buyer role (see `scripts/README.md`).

## Manual walkthrough

You need the API running, a database with migrations and seeders applied, and a seller account
that can log in. The backend guide
[`TEST-SELLER-SETUP.md`](../../api/.docs/TEST-SELLER-SETUP.md) explains how to create one (the
seeded `seller@example.qatu.pe` owns the sample products but has no password).

1. **Access control**
   - Signed out, open `/seller/orders` → you land on `/login`; after logging in as the seller you
     return to `/seller/orders`.
   - Log in as a plain buyer → the avatar menu has no "Mis ventas", and typing `/seller/orders`
     sends you to `/`.
   - Log in as the seller, then open `/seller/orders` in a **new tab** (cold start): you must
     stay on the dashboard.
2. **List**: only orders containing the seller's products appear, each row listing only the
   seller's lines and revenue. With two sellers in one order, each sees only their own lines.
3. **Status flow**: `Pendiente → Confirmada → Enviada → Entregada`. Each change shows a success
   notice and refreshes the row. `Entregada` and `Cancelada` rows show a dash and no selector.
4. **Stale data**: open the dashboard in two tabs, advance an order in tab 2, then try the old
   transition in tab 1 → a clear message and the list refreshes to the real status.
5. **Busy state**: throttle the network in DevTools and change one order: only that row is
   disabled and shows "Actualizando…".
6. **Logout**: "Mis ventas" disappears and `/seller/orders` redirects to `/login` again.

Check the backend side too: every change writes one `OrderStatusChanged` row in `outbox_events`
(`routing_key = order.status_changed`), and the buyer sees the new status in `/orders`.

## End-to-end run without Docker or Supabase (what was done for US-12/13)

The API integration tests need Docker and the browser flow needs Supabase Auth, so for a
throw-away end-to-end run the real pieces were wired like this:

- **PostgreSQL 14** from the OS packages (`initdb`/`pg_ctl`) in a temp dir, with
  `pnpm db:migrate` and `pnpm db:seed` from `api/` (the first migration creates the `auth` stub).
- A **fake GoTrue** (~150 lines, Node `http`) answering only the calls the API makes:
  `POST /auth/v1/admin/users`, `POST /auth/v1/token?grant_type=password|refresh_token`,
  `GET /auth/v1/user`, `POST /auth/v1/logout`, `GET /auth/v1/admin/users`. Users are rows in
  `auth.users`, so the real `handle_new_user` trigger creates the profile and buyer role.
- The **real API** (`RABBITMQ_ENABLED=false`, so outbox rows stay `pending` and can be read) and
  the **real client** (`vite` with `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` pointing at the fake), driven by **Puppeteer**.
- The API's `express-rate-limit` was replaced by a pass-through _in the harness only_ (Node
  loader hook), because the 20 req/15 min auth limiter blocks a browser that calls `/auth/me`
  on every page load.

Scenarios exercised: API authorization between sellers, forged `user_metadata.role`, CSRF and
invalid transitions, outbox rows, route guard (anonymous, buyer, seller, cold start), the full
status flow, stale list, per-order busy state, CSRF error message, buyer-name caching,
pagination, token expiry with silent refresh, session loss mid-use, logout, stored XSS, and a
mobile layout without horizontal overflow.

Limits of this setup, so nobody over-trusts it: the identity provider is a fake (real Supabase
token semantics are not exercised), RabbitMQ is off (publishing and the notification consumer
are covered by the API's own integration tests, which need Docker), and the browser is headless
Chrome only.
