import { apiFetch } from './client.js';

/**
 * Orders API client for fetching and managing buyer orders.
 */
export class OrdersApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn] Override for tests; defaults to apiFetch.
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    this._fetch = apiFetchFn;
  }

  /**
   * Returns a paginated list of orders for the authenticated buyer.
   *
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.status]
   * @returns {Promise<{ data: Array<Object>, meta: { page: number, per_page: number, total: number, total_pages: number } }>}
   */
  async listOrders({ page = 1, limit = 10, status } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (status) params.append('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this._fetch(`/orders${queryString}`, {
      method: 'GET',
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `Failed to fetch orders (${response.status})`);
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }

  /**
   * Returns a single order by ID for the authenticated buyer.
   *
   * @param {string} orderId
   * @returns {Promise<{ data: Object, meta: Object }>}
   * @throws {Error} with statusCode: 403 on forbidden access to other buyers' orders.
   */
  async getOrderById(orderId) {
    if (!orderId || typeof orderId !== 'string') {
      const err = new Error('orderId is required');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      throw err;
    }

    const response = await this._fetch(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(
        body?.error?.message || `Failed to fetch order details (${response.status})`
      );
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }
}
