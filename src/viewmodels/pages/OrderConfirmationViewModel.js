import { OrdersApi } from '../../models/api/OrdersApi.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';

// Loads the order from the API (not from checkout state) so the page survives a refresh.
export class OrderConfirmationViewModel {
  constructor({ ordersApi = new OrdersApi(), authStore = defaultAuthStore } = {}) {
    this.ordersApi = ordersApi;
    this.authStore = authStore;

    this.order = null;
    this.isLoading = false;
    this.requiresAuth = false;
    this.errorMessage = '';

    this._orderNumber = null;
    this._listeners = new Set();
    // On a cold start the session only resolves after GET /auth/me.
    this._authUnsubscribe =
      this.authStore.subscribe?.(() => {
        if (this.requiresAuth && this._orderNumber && this.authStore.isAuthenticated()) {
          void this.load(this._orderNumber);
        }
      }) ?? null;
  }

  get firstName() {
    const fullName = this.authStore.getProfile?.()?.full_name ?? '';
    return fullName.trim().split(/\s+/)[0] ?? '';
  }

  async load(orderNumber) {
    this._orderNumber = orderNumber;
    this.order = null;
    this.errorMessage = '';
    this.requiresAuth = !this.authStore.isAuthenticated();

    if (this.requiresAuth) {
      this._notify();
      return;
    }

    this.isLoading = true;
    this._notify();

    try {
      this.order = await this._findOrderByNumber(orderNumber);
      if (!this.order) this.errorMessage = 'No encontramos este pedido.';
    } catch (error) {
      this.errorMessage = this._messageFor(error);
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  // Totals come exactly as the API returned them; nothing is recomputed here.
  formatAmount(amount) {
    return formatPrice(amount, this.order?.currency);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    if (typeof this._authUnsubscribe === 'function') this._authUnsubscribe();
    this._authUnsubscribe = null;
    this._listeners.clear();
  }

  _messageFor(error) {
    if (error?.code === 'SESSION_EXPIRED') return '';
    if (error?.statusCode === 403) return 'No tienes permiso para ver este pedido.';
    if (error?.statusCode === 404) return 'No encontramos este pedido.';
    return 'No pudimos cargar tu pedido. Inténtalo de nuevo en unos minutos.';
  }

  async _findOrderByNumber(orderNumber) {
    let page = 1;
    while (true) {
      const response = await this.ordersApi.listOrders({ page, limit: 100 });
      const order = response.data.find((item) => item.order_number === orderNumber);
      if (order) return order;

      const totalPages = Number(response.meta?.total_pages ?? 0);
      if (!Number.isInteger(totalPages) || page >= totalPages) return null;
      page += 1;
    }
  }

  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }
}
