import { apiFetch } from './client.js';

/**
 * API service for Authentication endpoints. All methods use `apiFetch`, so
 * session cookies are sent automatically and auth paths are CSRF-exempt.
 */
export class AuthApi {
  /**
   * Registers a new buyer user account.
   *
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} payload.password
   * @param {string} payload.username
   * @param {string} [payload.full_name]
   * @returns {Promise<{ data: { user: Object, profile: Object, roles: Array }, meta: Object }>}
   */
  async register({ email, password, username, full_name }) {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, full_name }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data?.error?.details?.[0]?.message ||
        data?.error?.message ||
        data?.message ||
        'Error en el registro';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Authenticates an existing user.
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{ data: { user: Object, profile: Object, roles: Array }, meta: Object }>}
   */
  async login({ email, password }) {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || 'Credenciales inválidas';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Fetches the current authenticated user's profile and roles.
   *
   * @returns {Promise<{ data: { user: Object, profile: Object, roles: Array }, meta: Object }>}
   */
  async me() {
    const response = await apiFetch('/auth/me');

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || 'No se pudo cargar el usuario';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Refreshes the access token using the refresh_token cookie. Available for
   * explicit invocation; `apiFetch` handles the refresh-then-retry
   * automatically.
   *
   * @returns {Promise<{ data: { user: Object, profile: Object, roles: Array }, meta: Object }>}
   */
  async refresh() {
    const response = await apiFetch('/auth/refresh', { method: 'POST' });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || data?.message || 'No se pudo refrescar la sesión';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Invalidates the current session on the server and clears the session
   * cookies. Returns 204 even when the session was already revoked.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    const response = await apiFetch('/auth/logout', { method: 'POST' });
    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => ({}));
      const errorMessage = data?.error?.message || data?.message || 'No se pudo cerrar sesión';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }
  }

  /**
   * Exchanges the short-lived Supabase OAuth tokens for the backend cookie
   * session.
   *
   * @param {string} accessToken
   * @param {string} refreshToken
   * @returns {Promise<{ data: { user: Object, profile: Object, roles: Array }, meta: Object }>}
   */
  async exchangeOAuthToken(accessToken, refreshToken) {
    const response = await apiFetch('/auth/oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || 'Error en el handoff de OAuth';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}
