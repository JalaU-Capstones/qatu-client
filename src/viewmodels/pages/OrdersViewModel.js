import { OrdersApi } from '../../models/api/OrdersApi.js';

/**
 * ViewModel for the Orders page ('/orders').
 * Manages order history list, pagination, order details, loading state, and error handling.
 */
export class OrdersViewModel {
  /**
   * @param {Object} [options]
   * @param {OrdersApi} [options.ordersApi]
   */
  constructor({ ordersApi = new OrdersApi() } = {}) {
    this.ordersApi = ordersApi;

    /** @type {Array<Object>} Current page of orders */
    this.orders = [];

    /** @type {{ page: number, per_page: number, total: number, total_pages: number }} */
    this.meta = { page: 1, per_page: 10, total: 0, total_pages: 0 };

    /** @type {boolean} */
    this.isLoading = false;

    /** @type {string} */
    this.errorMessage = '';

    /** @type {boolean} True if the user attempted to access another buyer's order or received 403 */
    this.forbiddenError = false;

    /** @type {Object|null} */
    this.selectedOrder = null;

    /** @type {string} */
    this.statusFilter = '';

    this._listeners = new Set();
  }

  /**
   * Subscribes a callback to receive state changes.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of this._listeners) {
      listener(this);
    }
  }

  /**
   * Loads a paginated list of orders for the authenticated user.
   * @param {number} [page=1]
   * @returns {Promise<void>}
   */
  async loadOrders(page = 1) {
    this.isLoading = true;
    this.errorMessage = '';
    this.forbiddenError = false;
    this._notify();

    try {
      const { data, meta } = await this.ordersApi.listOrders({
        page,
        limit: this.meta.per_page,
        status: this.statusFilter || undefined,
      });

      this.orders = Array.isArray(data) ? data : [];
      this.meta = {
        page: meta?.page ?? page,
        per_page: meta?.per_page ?? this.meta.per_page,
        total: meta?.total ?? 0,
        total_pages: meta?.total_pages ?? (this.orders.length > 0 ? 1 : 0),
      };
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.forbiddenError = true;
      }
      this.errorMessage = err?.message || 'Failed to load orders';
      this.orders = [];
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Loads a specific order by ID (e.g. when viewing details).
   * @param {string} orderId
   * @returns {Promise<void>}
   */
  async loadOrderById(orderId) {
    this.isLoading = true;
    this.errorMessage = '';
    this.forbiddenError = false;
    this._notify();

    try {
      const response = await this.ordersApi.getOrderById(orderId);
      this.selectedOrder = response?.data || null;
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.forbiddenError = true;
      }
      this.errorMessage = err?.message || 'Failed to load order details';
      this.selectedOrder = null;
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Updates the order status filter and reloads page 1.
   * @param {string} status
   */
  setStatusFilter(status) {
    this.statusFilter = status;
    return this.loadOrders(1);
  }

  /**
   * Navigates to the next page if available.
   */
  nextPage() {
    if (this.meta.page < this.meta.total_pages && !this.isLoading) {
      return this.loadOrders(this.meta.page + 1);
    }
    return Promise.resolve();
  }

  /**
   * Navigates to the previous page if available.
   */
  prevPage() {
    if (this.meta.page > 1 && !this.isLoading) {
      return this.loadOrders(this.meta.page - 1);
    }
    return Promise.resolve();
  }
}
