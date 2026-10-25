/**
 * Shared state store for user authentication and session profile.
 */

const STORAGE_KEY = 'qatu.auth.session';
const SESSION_SCHEMA_VERSION = 1;

export class AuthStore {
  constructor() {
    this._token = null;
    this._user = null;
    this._profile = null;
    this._roles = [];
    this._savedAt = null;
    this._listeners = new Set();
  }

  /**
   * Updates the authentication session.
   * @param {Object|null} session
   * @param {string} [session.token]
   * @param {Object} [session.user]
   * @param {Object} [session.profile]
   * @param {Array} [session.roles]
   */
  setSession(session) {
    if (!session) {
      this.clearSession();
      return;
    }
    this._token = session.token || session.accessToken || null;
    this._user = session.user || null;
    this._profile = session.profile || session.user || null;
    this._roles = Array.isArray(session.roles) ? session.roles : [];
    this._savedAt = new Date().toISOString();
    this._notify();
    this._persist();
  }

  /**
   * Clears the active session.
   */
  clearSession() {
    this._token = null;
    this._user = null;
    this._profile = null;
    this._roles = [];
    this._savedAt = null;
    this._notify();
    this._clearPersisted();
  }

  /**
   * @returns {string|null}
   */
  getToken() {
    return this._token;
  }

  /**
   * @returns {Object|null}
   */
  getUser() {
    return this._user;
  }

  /**
   * @returns {Object|null}
   */
  getProfile() {
    return this._profile;
  }

  /**
   * @returns {Array}
   */
  getRoles() {
    return this._roles;
  }

  /**
   * @returns {string|null}
   */
  getSavedAt() {
    return this._savedAt;
  }

  /**
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this._token);
  }

  /**
   * Hydrates the store from localStorage. Safe to call multiple times.
   * Never throws: invalid, corrupt, or schema-mismatched data is
   * silently discarded and the store stays anonymous.
   * @returns {boolean}
   */
  loadFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      if (!parsed.token || typeof parsed.token !== 'string') return false;
      if (!parsed.user || typeof parsed.user !== 'object') return false;
      // profile and roles are optional — tolerate absence
      this._token = parsed.token;
      this._user = parsed.user;
      this._profile = parsed.profile || null;
      this._roles = Array.isArray(parsed.roles) ? parsed.roles : [];
      this._savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
      this._notify();
      return true;
    } catch {
      // Corrupt storage: clear it to avoid crashing every load
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
    try {
      const payload = {
        v: SESSION_SCHEMA_VERSION,
        token: this._token,
        user: this._user,
        profile: this._profile,
        roles: this._roles,
        savedAt: this._savedAt,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded or storage disabled — fail silent, session stays in-memory
    }
  }

  /**
   * @private
   */
  _clearPersisted() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const authStore = new AuthStore();
