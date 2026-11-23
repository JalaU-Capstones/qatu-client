import { apiFetch } from './client.js';

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:3000/v1';

const CODE_BY_STATUS = Object.freeze({
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
});

export class CategoriesApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn] Override for tests; defaults to apiFetch.
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    this._fetch = apiFetchFn;
  }

  /**
   * Fetches the active categories, ordered by position and name.
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=100] The API accepts at most 100
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   * @throws {Error} When the server responds with a non-2xx status
   */
  async getCategories({ page = 1, limit = 100 } = {}) {
    const url = `${BASE_URL}/categories?page=${page}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Creates a new category (admin only).
   * @param {{ name: string, slug?: string, description?: string|null, parent_id?: string|null }} payload
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async createCategory(payload = {}) {
    const bodyPayload = {
      name: typeof payload.name === 'string' ? payload.name.trim() : '',
    };

    if (typeof payload.slug === 'string' && payload.slug.trim() !== '') {
      bodyPayload.slug = payload.slug.trim().toLowerCase();
    }
    if (payload.description !== undefined) {
      bodyPayload.description =
        typeof payload.description === 'string' && payload.description.trim() !== ''
          ? payload.description.trim()
          : null;
    }
    if (payload.parent_id !== undefined) {
      bodyPayload.parent_id = payload.parent_id || null;
    }

    const response = await this._fetch('/admin/categories', {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(bodyPayload),
    });

    return this._handleJson(response, 'Failed to create category');
  }

  /**
   * Updates an existing category (admin only).
   * @param {string} categoryId
   * @param {{ name?: string, slug?: string, description?: string|null, parent_id?: string|null }} payload
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async updateCategory(categoryId, payload = {}) {
    const bodyPayload = {};

    if (payload.name !== undefined) {
      bodyPayload.name = typeof payload.name === 'string' ? payload.name.trim() : '';
    }
    if (payload.slug !== undefined && payload.slug !== '') {
      bodyPayload.slug = String(payload.slug).trim().toLowerCase();
    }
    if (payload.description !== undefined) {
      bodyPayload.description =
        typeof payload.description === 'string' && payload.description.trim() !== ''
          ? payload.description.trim()
          : null;
    }
    if (payload.parent_id !== undefined) {
      bodyPayload.parent_id = payload.parent_id || null;
    }

    const response = await this._fetch(`/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      withAuth: true,
      body: JSON.stringify(bodyPayload),
    });

    return this._handleJson(response, 'Failed to update category');
  }

  /**
   * Deletes a category by ID (admin only).
   * @param {string} categoryId
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    const response = await this._fetch(`/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
      withAuth: true,
    });

    if (response.status === 204) {
      return;
    }

    await this._handleJson(response, 'Failed to delete category');
  }

  async _handleJson(response, fallbackMessage) {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `${fallbackMessage} (${response.status})`);
      err.code = body?.error?.code || CODE_BY_STATUS[response.status] || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }
}
