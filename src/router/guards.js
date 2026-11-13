/**
 * Route guards. They are UX only: they spare users a dead-end page, but the API enforces the
 * real permission on every request (ADR-017, ADR-012).
 */

/**
 * Decides what to do with a visit to a seller-only route.
 *
 * Call it only after the session bootstrap settled: on a cold start (new tab) the cached
 * roles do not exist until `GET /auth/me` answers, and a seller would be bounced.
 *
 * @param {{ isAuthenticated: () => boolean, isSeller: () => boolean }} store authStore
 * @returns {'allow'|'login'|'home'} `login` when anonymous, `home` when signed in without
 *   the seller (or admin) role, `allow` otherwise.
 */
export function getSellerRouteAccess(store) {
  if (!store.isAuthenticated()) return 'login';
  if (!store.isSeller()) return 'home';
  return 'allow';
}
