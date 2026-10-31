/**
 * Shared state store for user authentication and session profile.
 *
 * Session model (ADR-012):
 * - The access JWT lives in an HttpOnly cookie (invisible to JS).
 * - The refresh token lives in an HttpOnly cookie.
 * - The CSRF token lives in a readable cookie.
 * - This store caches `{ user, profile, roles }` in `sessionStorage` for
 *   optimistic UI paint (header avatar, role-based rendering) while
 *   `GET /auth/me` revalidates in the background.
 *
 * There is NO token in this store. `isAuthenticated()` is derived from
 * `user.id` being present — it is an optimistic signal, not a security
 * check. The backend enforces auth via cookie validation on every request.
 */

const STORAGE_KEY = 'qatu.auth.session';
const SCHEMA_VERSION = 2; // v1 was localStorage with token; v2 is sessionStorage without token
const LEGACY_STORAGE_KEY = 'qatu.auth.session'; // same key, different storage medium

export class AuthStore {
  constructor() {
    this._user = null;
    this._profile = null;
    this._roles = [];
    this._savedAt = null;
    this._listeners = new Set();
  }

  /**
   * Updates the authentication session cache.
   *
   * @param {Object|null} session
   * @param {Object} [session.user]     Supabase user object (must have `id`).
   * @param {Object} [session.profile]  Profile row (optional; defaults to user).
   * @param {Array<Object>} [session.roles] Assigned roles (optional; defaults to []).
   */
  setSession(session) {
    if (!session || !session.user || !session.user.id) {
      // No valid user → treat as clear. Guards against malformed payloads
      // (e.g. a backend bug that returns `{ data: { user: null } }`).
      this.clearSession();
      return;
    }
    this._user = session.user;
    this._profile = session.profile || session.user;
    this._roles = Array.isArray(session.roles) ? session.roles : [];
    this._savedAt = new Date().toISOString();
    this._notify();
    this._persist();
  }

  /**
   * Clears the active session cache. Does NOT touch cookies — the backend
   * invalidates the session on `POST /auth/logout`, which is called from
   * `main.js` before this method.
   */
  clearSession() {
    this._user = null;
    this._profile = null;
    this._roles = [];
    this._savedAt = null;
    this._notify();
    this._clearPersisted();
  }

  /** @returns {Object|null} */
  getUser() {
    return this._user;
  }

  /** @returns {Object|null} */
  getProfile() {
    return this._profile;
  }

  /** @returns {Array<Object>} */
  getRoles() {
    return this._roles;
  }

  /** @returns {string|null} */
  getSavedAt() {
    return this._savedAt;
  }

  /**
   * Optimistic auth signal derived from cached user identity.
   *
   * This is NOT a security check — the backend enforces auth via cookie
   * validation. It exists so the header and interactive UI can render in an
   * authenticated state during the brief async window before
   * `GET /auth/me` resolves on boot.
   *
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this._user?.id);
  }

  /**
   * Hydrates the store from `sessionStorage`. Safe to call multiple times.
   * Never throws: invalid, corrupt, or schema-mismatched data is
   * silently discarded and the store stays anonymous.
   *
   * Side effect: if a legacy `localStorage` entry exists from schema v1
   * (which persisted the JWT in plaintext), it is deleted as a security
   * cleanup. The user is not migrated because the token is now useless
   * (auth happens via cookie) and `GET /auth/me` revalidates on boot.
   *
   * @returns {boolean} true when a valid session was hydrated
   */
  loadFromStorage() {
    // 1) Security cleanup: remove legacy localStorage (schema v1 had `token`).
    try {
      if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // ignore
    }

    // 2) Load from sessionStorage (new source of truth).
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      if (parsed.v !== SCHEMA_VERSION) return false;
      if (!parsed.user || typeof parsed.user !== 'object') return false;
      if (!parsed.user.id || typeof parsed.user.id !== 'string') return false;

      this._user = parsed.user;
      this._profile = parsed.profile || null;
      this._roles = Array.isArray(parsed.roles) ? parsed.roles : [];
      this._savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
      this._notify();
      return true;
    } catch {
      // Corrupt storage: clear it to avoid crashing every load.
      this._clearPersisted();
      return false;
    }
  }

  /**
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  /**
   * @private
   */
  _persist() {
    if (!this._user?.id) return;
    try {
      const payload = {
        v: SCHEMA_VERSION,
        user: this._user,
        profile: this._profile,
        roles: this._roles,
        savedAt: this._savedAt,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded or storage disabled — fail silent, session stays in-memory
    }
  }

  /**
   * @private
   */
  _clearPersisted() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const authStore = new AuthStore();
