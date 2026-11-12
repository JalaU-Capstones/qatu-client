/**
 * AuthBootstrapService — orchestrates session rehydration on app boot.
 *
 * The problem: after page load, the browser HAS the HttpOnly session cookie
 * (if the user is logged in), but JavaScript cannot read it. The frontend
 * must call `GET /auth/me` to ask the backend "who am I?".
 *
 * This service wraps that call with the retry/error semantics we want:
 *  - On 200 with `user.id` → sets `authStore` session (updates header, cart
 *    user-id scope, etc.).
 *  - On 401 → clears `authStore` (silent — no user is logged in).
 *  - On network error / 5xx → keeps the cache state from `loadFromStorage`
 *    so optimistic paint does not flicker back to anonymous. Logs a warning.
 *  - On any other error → clears + warns.
 *
 * `main.js` calls this fire-and-forget after the shell mounts. It MUST be
 * safe to call multiple times (idempotent — setSession/clearSession are).
 *
 * Boot-race note: this service is async. During the ~100-300ms before it
 * resolves, `authStore.isAuthenticated()` reflects the `sessionStorage`
 * cache from `loadFromStorage()`. Returning users have cache → no race.
 * First-time visitors legitimately see anonymous. Recoverable edge case
 * documented in `CartService.addToCart`'s JSDoc.
 */
export class AuthBootstrapService {
  /**
   * @param {Object} deps
   * @param {import('../models/api/AuthApi.js').AuthApi} deps.authApi
   * @param {import('../store/authStore.js').AuthStore} deps.authStore
   * @param {Console} [deps.consoleRef] Optional console override for tests.
   */
  constructor({ authApi, authStore, consoleRef = console } = {}) {
    if (!authApi) throw new Error('authApi is required');
    if (!authStore) throw new Error('authStore is required');
    this.authApi = authApi;
    this.authStore = authStore;
    this.console = consoleRef;
  }

  /**
   * Attempts to rehydrate the auth session from the HttpOnly cookie.
   *
   * @returns {Promise<{ status: 'authenticated' | 'anonymous' | 'uncertain' }>}
   *  - 'authenticated': /me returned a valid user → session set
   *  - 'anonymous': /me returned 401 → session cleared
   *  - 'uncertain': network/5xx → cache preserved (no state change)
   */
  async bootstrap() {
    try {
      const response = await this.authApi.me();
      const user = response?.data?.user;
      const profile = response?.data?.profile;
      const roles = response?.data?.roles;

      if (!user?.id) {
        // Defensive: 200 with no user.id is a backend contract violation.
        // Treat as anonymous so the UI doesn't pretend to be logged in.
        this.authStore.clearSession();
        return { status: 'anonymous' };
      }

      this.authStore.setSession({ user, profile, roles });
      return { status: 'authenticated' };
    } catch (error) {
      const status = error?.status;
      if (status === 401) {
        // No valid session. Silent — first-time visitors hit this on every load.
        this.authStore.clearSession();
        return { status: 'anonymous' };
      }

      // Network error, 5xx, or unexpected shape. Preserve the cache from
      // loadFromStorage so an already-authenticated user doesn't flicker
      // back to anonymous on a transient backend hiccup.
      this.console.warn?.(
        '[AuthBootstrapService] /me failed; keeping cached state:',
        error?.message || error
      );
      return { status: 'uncertain' };
    }
  }
}
