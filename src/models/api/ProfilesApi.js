import { apiFetch } from './client.js';

/**
 * API service for User Profile endpoints.
 *
 * Uses `apiFetch` so HttpOnly session cookies and double-submit CSRF tokens
 * are handled automatically.
 */
export class ProfilesApi {
  /**
   * Retrieves a profile by ID (`GET /v1/profiles/:id`).
   *
   * @param {string} id
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async getById(id) {
    const response = await apiFetch(`/profiles/${encodeURIComponent(id)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data?.error?.details?.[0]?.message ||
        data?.error?.message ||
        data?.message ||
        'No se pudo cargar el perfil';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Partially updates the authenticated user's profile (`PATCH /v1/profiles/me`).
   *
   * @param {Object} payload
   * @param {string} [payload.full_name]
   * @param {string|null} [payload.bio]
   * @param {string|null} [payload.avatar_path]
   * @param {string} [payload.locale]
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async updateMe(payload) {
    const response = await apiFetch('/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data?.error?.details?.[0]?.message ||
        data?.error?.message ||
        data?.message ||
        'No se pudo actualizar el perfil';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}
