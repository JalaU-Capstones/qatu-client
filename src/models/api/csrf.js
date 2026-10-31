/**
 * CSRF helper for the double-submit cookie pattern.
 *
 * The backend sets a `csrf_token` cookie on login/register/refresh. This
 * cookie is NOT HttpOnly — the frontend MUST read it and echo the value in
 * the `X-CSRF-Token` header on every state-changing request (POST/PATCH/PUT/
 * DELETE) EXCEPT the auth endpoints (`/auth/*`) which are exempt per the
 * backend contract and `components/parameters/csrf-token.yaml`.
 *
 * Why not a store? The value lives in the cookie already; reading it is
 * cheap and idempotent. No need to mirror it in memory.
 */

/**
 * Reads a cookie value by name from `document.cookie`.
 * Returns `null` when not found, when running in a non-browser environment,
 * or when the value is empty.
 *
 * @param {string} name
 * @returns {string|null}
 */
export function readCookie(name) {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
    return null;
  }
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const raw of parts) {
    const part = raw.trim();
    if (part.startsWith(prefix)) {
      const value = part.slice(prefix.length);
      // Cookies with empty values: treat as missing (logout clears them with
      // an empty value + Max-Age=0, so this path is reachable).
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/**
 * Returns the current CSRF token from the `csrf_token` cookie, or `null`.
 *
 * @returns {string|null}
 */
export function getCsrfToken() {
  return readCookie('csrf_token');
}

/**
 * Returns `true` for HTTP methods that mutate state on the server.
 * GET / HEAD / OPTIONS are safe and do not require CSRF.
 *
 * @param {string} method
 * @returns {boolean}
 */
export function isMutatingMethod(method) {
  const m = (method || 'GET').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

/**
 * Returns `true` for paths exempt from CSRF. Mirrors the backend
 * `AUTH_PATH_PREFIX` in `csrfMiddleware.js`. Any future auth endpoint added
 * under `/auth/` is automatically exempt here, which matches the backend.
 *
 * @param {string} path  Relative API path (e.g. "/auth/login", "/cart/items")
 * @returns {boolean}
 */
export function isCsrfExemptPath(path) {
  return typeof path === 'string' && path.startsWith('/auth/');
}
