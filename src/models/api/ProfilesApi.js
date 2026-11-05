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
      throw this._createApiError(response.status, data, 'No se pudo cargar el perfil');
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
      throw this._createApiError(
        response.status,
        data,
        'Error al guardar los cambios. Inténtalo de nuevo más tarde'
      );
    }

    return data;
  }

  /**
   * Uploads an avatar image via `multipart/form-data` (`POST /v1/profiles/me/avatar`).
   *
   * @param {File|Blob} file
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiFetch('/profiles/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw this._createApiError(
        response.status,
        data,
        'Error al guardar los cambios. Inténtalo de nuevo más tarde'
      );
    }

    return data;
  }

  /**
   * Maps HTTP status codes and backend error payloads to user-safe errors.
   *
   * @param {number} status
   * @param {Object} data
   * @param {string} fallbackMessage
   * @returns {Error & { status: number, code?: string, data: Object }}
   * @private
   */
  _createApiError(status, data, fallbackMessage) {
    const code = data?.error?.code || '';
    let message;

    if (status === 403) {
      message = 'No tienes permiso para modificar este perfil';
    } else if (status === 404) {
      message = 'Perfil no encontrado';
    } else if (status === 422 && code === 'FILE_TOO_LARGE') {
      message = 'La imagen excede el límite de 2 MB';
    } else if (status === 422 && code === 'INVALID_FILE_FORMAT') {
      message = 'Solo se aceptan imágenes JPEG, PNG y WebP';
    } else if (status >= 500) {
      message = 'Error al guardar los cambios. Inténtalo de nuevo más tarde';
    } else {
      message =
        data?.error?.details?.[0]?.message ||
        data?.error?.message ||
        data?.message ||
        fallbackMessage;
    }

    const error = new Error(message);
    error.status = status;
    error.code = code;
    error.data = data;
    return error;
  }
}
