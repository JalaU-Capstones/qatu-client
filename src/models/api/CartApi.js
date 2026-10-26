import { apiFetch } from './client.js';

/**
 * Cart API client.
 *
 * Today only `addItem` is implemented (US-08). Future stories will add
 * `getCart`, `updateItem`, `removeItem` when the backend endpoints ship.
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
      withAuth: true,
      body: JSON.stringify({ product_id: productId, quantity }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `Failed to add to cart (${response.status})`);
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }
}
