const STORAGE_KEY = 'qatu.auth.session';
const SCHEMA_VERSION = 2;
const LEGACY_STORAGE_KEY = 'qatu.auth.session';

/**
 * Shared state store for user authentication and session profile. Caches
 * `{ user, profile, roles }` in sessionStorage (no tokens — the session lives
 * in HttpOnly cookies per ADR-012) and notifies subscribers on changes.
 */
export class AuthStore {
  constructor() {
    this._user = null;
    this._profile = null;
    this._roles = [];
    this._savedAt = null;
    this._listeners = new Set();
  }

  /**
   * Updates the authentication session cache. A session without a valid user
   * clears the store.
   *
   * @param {Object|null} session
   * @param {Object} [session.user]
   * @param {Object} [session.profile]
   * @param {Array<Object>} [session.roles]
   */
  setSession(session) {
    if (!session || !session.user || !session.user.id) {
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

  /** Clears the session cache without touching the auth cookies. */
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
   * Optimistic auth signal derived from the cached user identity — NOT a
   * security check; the backend enforces auth via cookie validation.
   *
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this._user?.id);
  }

  /**
   * Hydrates the store from sessionStorage; invalid or corrupt data is
   * discarded. Also deletes a legacy localStorage entry left by schema v1.
   *
   * @returns {boolean} true when a valid session was hydrated.
   */
  loadFromStorage() {
    try {
      if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      /* no session: user stays anonymous */
    }

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
      this._clearPersisted();
      return false;
    }
  }

  /**
   * @param {Function} listener
   * @returns {Function} Unsubscribe function.
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /** @private */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  /** @private */
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
      /* storage unavailable */
    }
  }

  /** @private */
  _clearPersisted() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const authStore = new AuthStore();
