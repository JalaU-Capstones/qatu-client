import { ORDER_STATUSES, ORDER_VIEWS } from '../entities/orderStatus.js';
import { apiFetch } from './client.js';

/** Used only when an error response carries no `error.code` (proxy, gateway). */
const CODE_BY_STATUS = Object.freeze({
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'INVALID_STATUS_TRANSITION',
});

function invalidRequest(message) {
  const err = new Error(message);
  err.code = 'INVALID_REQUEST';
  err.statusCode = 400;
  return err;
}

/**
 * Orders API client for buyer history and seller order dashboard (ADR-017).
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
   * Returns a paginated list of orders for the authenticated user.
   *
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.status]
   * @param {'buyer'|'seller'|'admin'} [params.view='buyer'] Seller dashboard must pass `seller`.
   * @returns {Promise<{ data: Array<Object>, meta: { page: number, per_page: number, total: number, total_pages: number } }>}
   */
  async listOrders({ page = 1, limit = 10, status, view } = {}) {
    // Fail loudly: silently falling back to another scope could show the wrong orders.
    if (view && !ORDER_VIEWS.includes(view)) {
      throw invalidRequest(`Invalid view "${view}". Expected one of: ${ORDER_VIEWS.join(', ')}`);
    }
    if (status && !ORDER_STATUSES.includes(status)) {
      throw invalidRequest(
        `Invalid status "${status}". Expected one of: ${ORDER_STATUSES.join(', ')}`
      );
    }

    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (status) params.append('status', status);
    if (view) params.append('view', view);

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
   * Checkout (POST /v1/orders). The cart is read by the API, never sent.
   * Errors carry `code`, `statusCode` and `details` (422: EMPTY_CART, INSUFFICIENT_STOCK...).
   */
  async createOrder({ shippingAddress, paymentMethod, notes } = {}) {
    const payload = { shipping_address: shippingAddress };
    if (paymentMethod) payload.payment_method = paymentMethod;
    if (notes) payload.notes = notes;

    const response = await this._fetch('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `Failed to create order (${response.status})`);
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }

  /**
   * Returns a single order by ID for the authenticated buyer or seller.
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

  /**
   * Updates order status. CSRF applied by apiFetch for cookies.
   *
   * Errors carry a stable `code` and `statusCode` so callers can show a specific message:
   * `FORBIDDEN` (403), `NOT_FOUND` (404), `INVALID_STATUS_TRANSITION` (422),
   * `INVALID_CSRF_TOKEN` (403). A 401 never reaches here: `apiFetch` refreshes the session
   * and, if that fails, clears it and emits `qatu:auth-expired` (throws `SESSION_EXPIRED`).
   *
   * @param {string} orderId
   * @param {string} status
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async updateOrderStatus(orderId, status) {
    if (!orderId || typeof orderId !== 'string') {
      throw invalidRequest('orderId is required');
    }
    if (!status || typeof status !== 'string') {
      throw invalidRequest('status is required');
    }
    if (!ORDER_STATUSES.includes(status)) {
      throw invalidRequest(
        `Invalid status "${status}". Expected one of: ${ORDER_STATUSES.join(', ')}`
      );
    }

    const response = await this._fetch(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(
        body?.error?.message || `Failed to update order status (${response.status})`
      );
      err.code = body?.error?.code || CODE_BY_STATUS[response.status] || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }
}
