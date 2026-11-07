import { apiFetch } from './client.js';

/**
 * API service for Authentication endpoints.
 *
 * All methods use `apiFetch` so cookies (`access_token`, `refresh_token`,
 * `csrf_token`) are sent automatically. Auth endpoints are CSRF-exempt —
 * `apiFetch` skips the X-CSRF-Token header for `/auth/*` paths.
 */
export class AuthApi {
  /**
   * Registers a new buyer user account.
   * Sends POST to /v1/auth/register. On success, the backend sets the
   * session cookies via Set-Cookie headers (handled by the browser).
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
   * Sends POST to /v1/auth/login. On success, the backend sets the session
   * cookies via Set-Cookie headers.
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
      const errorMessage =
        data?.error?.details?.[0]?.message ||
        data?.error?.message ||
        data?.message ||
        'Credenciales inválidas';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Fetches the current authenticated user's profile and roles.
   * Used on application boot to restore user context from the HttpOnly
   * cookie session. Requires a valid session cookie.
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
   * Refreshes the access token using the `refresh_token` cookie. Rotated
   * cookies are set by the backend via Set-Cookie.
   *
   * Note: `apiFetch` handles the refresh-then-retry automatically on 401
   * `REFRESH_REQUIRED`. This method is available for explicit invocation
   * (e.g. a future "Refresh session" button in the profile). Most UI code
   * does NOT need to call this directly.
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
   * cookies. Always succeeds from the client's perspective — the endpoint
   * returns 204 even when the session was already revoked (idempotent).
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
   * Sends temporal OAuth Token
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
