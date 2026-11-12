import { apiFetch } from './client.js';

/**
 * Cart API client.
 *
 * Implemented endpoints (all require an authenticated session via cookies):
 *   - addItem (US-08): POST /cart/items
 *   - getCart: GET /cart
 *   - updateItem: PATCH /cart/items/{cartItemId}
 *   - removeItem: DELETE /cart/items/{cartItemId}
 *   - clear: DELETE /cart
 *
 * Injects `apiFetch` via constructor so tests can mock the network without
 * patching globals.
 */
export class CartApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn] Override for tests; defaults to the real apiFetch.
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    this._fetch = apiFetchFn;
  }

  /**
   * Adds a product to the authenticated user's cart. Upsert semantics —
   * calling twice with the same productId increments the quantity.
   *
   * @param {Object} params
   * @param {string} params.productId
   * @param {number} [params.quantity=1]
   * @returns {Promise<{ data: { id: string, user_id: string, product_id: string, quantity: number, created_at: string, updated_at: string }, meta: Object }>}
   * @throws {Error} with `.code`, `.statusCode`, `.details` when the backend returns a non-2xx.
   */
  async addItem({ productId, quantity = 1 } = {}) {
    if (!productId || typeof productId !== 'string') {
      const err = new Error('productId is required');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      throw err;
    }

    const response = await this._fetch('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });

    return this._parseDataResponse(response, 'add to cart');
  }

  /**
   * Fetches the authenticated user's cart contents. Contract: GET /v1/cart.
   *
   * @param {Object} [options]
   * @param {string[]} [options.include] Related resources to expand. Only
   *   `'product'` is supported by the backend today. When omitted, the
   *   response contains only the cart item fields (lightweight).
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   * @throws {Error} with `.code`, `.statusCode`, `.details` when the backend returns a non-2xx.
   */
  async getCart({ include = [] } = {}) {
    const query = new URLSearchParams();
    const validIncludes = Array.isArray(include)
      ? include.filter((value) => value === 'product')
      : [];
    if (validIncludes.length > 0) {
      query.set('include', validIncludes.join(','));
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await this._fetch(`/cart${suffix}`);
    return this._parseDataResponse(response, 'get cart');
  }

  /**
   * Updates the quantity of a cart item. Contract: PATCH /v1/cart/items/{cartItemId}.
   *
   * @param {Object} params
   * @param {string} params.cartItemId
   * @param {number} params.quantity
   * @returns {Promise<{ data: Object|null, meta: Object }>} null when the item was deleted (quantity 0).
   * @throws {Error} with `.code`, `.statusCode`, `.details` when the backend returns a non-2xx.
   */
  async updateItem({ cartItemId, quantity } = {}) {
    if (!cartItemId || typeof cartItemId !== 'string') {
      const err = new Error('cartItemId is required');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      throw err;
    }

    const response = await this._fetch(`/cart/items/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });

    return this._parseDataResponse(response, 'update cart item');
  }

  /**
   * Removes one cart item. Contract: DELETE /v1/cart/items/{cartItemId}.
   *
   * @param {Object} params
   * @param {string} params.cartItemId
   * @returns {Promise<Object>} Empty object (204 has no body).
   * @throws {Error} with `.code`, `.statusCode`, `.details` when the backend returns a non-2xx.
   */
  async removeItem({ cartItemId } = {}) {
    if (!cartItemId || typeof cartItemId !== 'string') {
      const err = new Error('cartItemId is required');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      throw err;
    }

    const response = await this._fetch(`/cart/items/${cartItemId}`, { method: 'DELETE' });
    return this._parseOkResponse(response, 'remove cart item');
  }

  /**
   * Clears the authenticated user's cart. Contract: DELETE /v1/cart.
   *
   * @returns {Promise<Object>} Empty object (204 has no body).
   * @throws {Error} with `.code`, `.statusCode`, `.details` when the backend returns a non-2xx.
   */
  async clear() {
    const response = await this._fetch('/cart', { method: 'DELETE' });
    return this._parseOkResponse(response, 'clear cart');
  }

  /**
   * Shared JSON-body parsing for data endpoints following the OpenAPI
   * `{ data, meta }` envelope.
   *
   * @param {Response} response
   * @param {string} action
   * @returns {Promise<Object>}
   * @private
   */
  async _parseDataResponse(response, action) {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `Failed to ${action} (${response.status})`);
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }

  /**
   * Shared handling for 204 No Content responses.
   *
   * @param {Response} response
   * @param {string} action
   * @returns {Promise<Object>}
   * @private
   */
  async _parseOkResponse(response, action) {
    if (response.status === 204) return {};

    const body = await response.json().catch(() => ({}));
    const err = new Error(body?.error?.message || `Failed to ${action} (${response.status})`);
    err.code = body?.error?.code || 'UNKNOWN_ERROR';
    err.statusCode = response.status;
    err.details = body?.error?.details;
    throw err;
  }
}
