/**
 * API service for Authentication endpoints.
 */
export class AuthApi {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl='']
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
  }

  /**
   * Registers a new buyer user account.
   * Sends POST to /v1/auth/register with { email, password, username, full_name }.
   *
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} payload.password
   * @param {string} payload.username
   * @param {string} [payload.full_name]
   * @returns {Promise<Object>} API response payload
   */
  async register({ email, password, username, full_name }) {
    const url = `${this.baseUrl}/v1/auth/register`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
   * Sends POST to /v1/auth/login with { email, password }.
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<Object>} API response payload
   */
  async login({ email, password }) {
    const url = `${this.baseUrl}/v1/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
}
