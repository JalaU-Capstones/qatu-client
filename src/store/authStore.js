/**
 * Shared state store for user authentication and session profile.
 */
export class AuthStore {
  constructor() {
    this._token = null;
    this._user = null;
    this._profile = null;
    this._listeners = new Set();
  }

  /**
   * Updates the authentication session.
   * @param {Object|null} session
   * @param {string} [session.token]
   * @param {Object} [session.user]
   * @param {Object} [session.profile]
   */
  setSession(session) {
    if (!session) {
      this.clearSession();
      return;
    }
    this._token = session.token || session.accessToken || null;
    this._user = session.user || null;
    this._profile = session.profile || session.user || null;
    this._notify();
  }

  /**
   * Clears the active session.
   */
  clearSession() {
    this._token = null;
    this._user = null;
    this._profile = null;
    this._notify();
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
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this._token);
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
}

export const authStore = new AuthStore();
