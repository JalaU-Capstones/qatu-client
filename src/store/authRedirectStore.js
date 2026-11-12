const RETURN_TO_KEY = 'qatu.auth.returnTo';

/**
 * Stores the path the user was on before being redirected to an auth page,
 * so that after a successful login/registration we can send them back.
 *
 * Uses sessionStorage: it survives a full page reload within the same tab,
 * but is discarded when the tab closes. This is the correct semantic for
 * "return to where I was".
 *
 * Rules:
 * - Auth routes (/login, /register) are never stored — nothing to return to.
 * - Empty / null paths are ignored.
 * - The store does NOT default to '/'; getReturnTo() returns null when
 *   nothing is stored. The consumer decides the fallback (usually '/').
 */
export class AuthRedirectStore {
  /**
   * @param {string} path  window.location.pathname at the moment of redirect.
   */
  setReturnTo(path) {
    if (!path || typeof path !== 'string') return;
    if (path === '/login' || path === '/register') return;
    try {
      window.sessionStorage.setItem(RETURN_TO_KEY, path);
    } catch {
      // sessionStorage disabled (Safari private): silently no-op
    }
  }

  /**
   * @returns {string|null}  The stored path, or null if none.
   */
  getReturnTo() {
    try {
      const v = window.sessionStorage.getItem(RETURN_TO_KEY);
      if (!v || v === '/login' || v === '/register') return null;
      return v;
    } catch {
      return null;
    }
  }

  clearReturnTo() {
    try {
      window.sessionStorage.removeItem(RETURN_TO_KEY);
    } catch {
      // ignore
    }
  }
}

export const authRedirectStore = new AuthRedirectStore();
