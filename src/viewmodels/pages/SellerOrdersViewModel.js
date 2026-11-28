import { OrdersApi } from '../../models/api/OrdersApi.js';
import { ProfilesApi } from '../../models/api/ProfilesApi.js';
import {
  getOrderStatusLabel,
  getSellerNextStatuses,
  isTerminalOrderStatus,
} from '../../models/entities/orderStatus.js';

/** SC-11 seller orders dashboard (`/seller/orders`). */
export class SellerOrdersViewModel {
  /** @param {{ ordersApi?: OrdersApi, profilesApi?: ProfilesApi }} [options] */
  constructor({ ordersApi = new OrdersApi(), profilesApi = new ProfilesApi() } = {}) {
    this.ordersApi = ordersApi;
    this.profilesApi = profilesApi;
    this.orders = [];
    this.meta = { page: 1, per_page: 10, total: 0, total_pages: 0 };
    this.isLoading = false;
    this.errorMessage = '';
    this.noticeMessage = '';
    this.statusFilter = '';
    /** Resolved buyer display names by `buyer_id` (session-long cache). */
    this.buyerNames = {};
    this._updatingOrderIds = new Set();
    /** In-flight profile lookups by `buyer_id`, so concurrent loads share one request. */
    this._buyerLookups = new Map();
    /** Buyers whose lookup failed: not retried this session (no request storm). */
    this._unresolvedBuyerIds = new Set();
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of this._listeners) {
      listener(this);
    }
  }

  /** True while any status update is in flight. */
  get isUpdating() {
    return this._updatingOrderIds.size > 0;
  }

  /** True while a status update for this specific order is in flight. */
  isOrderUpdating(orderId) {
    return this._updatingOrderIds.has(orderId);
  }

  /** Revenue = sum(items[].subtotal), not order.total. */
  static sellerRevenue(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  }

  /** KPIs from the current page. */
  getKpis() {
    let toConfirm = 0;
    let toShip = 0;
    let shipped = 0;
    let revenue = 0;
    for (const order of this.orders) {
      if (order.status === 'pending') toConfirm += 1;
      if (order.status === 'confirmed') toShip += 1;
      if (order.status === 'shipped') shipped += 1;
      revenue += SellerOrdersViewModel.sellerRevenue(order);
    }
    return { toConfirm, toShip, shipped, revenue };
  }

  async loadOrders(page = 1) {
    this.isLoading = true;
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      const { data, meta } = await this.ordersApi.listOrders({
        page,
        limit: this.meta.per_page,
        status: this.statusFilter || undefined,
        view: 'seller',
      });

      this.orders = Array.isArray(data) ? data : [];
      this.meta = {
        page: meta?.page ?? page,
        per_page: meta?.per_page ?? this.meta.per_page,
        total: meta?.total ?? 0,
        total_pages: meta?.total_pages ?? (this.orders.length > 0 ? 1 : 0),
      };

      await this._hydrateBuyerNames(this.orders);
    } catch (err) {
      this.errorMessage = SellerOrdersViewModel.messageForLoadError(err);
      this.orders = [];
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  setStatusFilter(status) {
    this.statusFilter = status || '';
    return this.loadOrders(1);
  }

  async updateStatus(orderId, nextStatus) {
    // One request per order at a time: ignore a second submit while one is in flight.
    if (this._updatingOrderIds.has(orderId)) return;

    const current = this.orders.find((order) => order.id === orderId);
    if (!current || !this.getNextStatuses(current).includes(nextStatus)) {
      // Never send a transition the state machine forbids (e.g. from a terminal state).
      this.errorMessage = 'Ese cambio de estado no está disponible para este pedido.';
      this.noticeMessage = '';
      this._notify();
      return;
    }

    this._updatingOrderIds.add(orderId);
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    let listIsStale = false;
    try {
      const { data } = await this.ordersApi.updateOrderStatus(orderId, nextStatus);
      this.orders = this.orders.map((order) =>
        order.id === orderId ? { ...order, ...data, items: data.items || order.items } : order
      );
      this.noticeMessage = `Estado actualizado a ${getOrderStatusLabel(nextStatus)}`;
    } catch (err) {
      this.errorMessage = SellerOrdersViewModel.messageForUpdateError(err, {
        from: current.status,
        to: nextStatus,
      });
      // The order changed (or vanished) under us: what is on screen is out of date.
      listIsStale = err?.code === 'INVALID_STATUS_TRANSITION' || err?.code === 'NOT_FOUND';
    } finally {
      this._updatingOrderIds.delete(orderId);
    }

    if (listIsStale) {
      const message = this.errorMessage;
      await this.loadOrders(this.meta.page);
      if (!this.errorMessage) this.errorMessage = message;
    }
    this._notify();
  }

  getNextStatuses(order) {
    if (!order || isTerminalOrderStatus(order.status)) return [];
    return getSellerNextStatuses(order.status);
  }

  getBuyerLabel(order) {
    const id = order?.buyer_id;
    if (!id) return 'Comprador';
    return this.buyerNames[id] || id.slice(0, 8);
  }

  /**
   * User-facing (Spanish) message for a failed `PATCH /orders/:id/status`.
   * Mapped by error `code`, so a CSRF 403 is not reported as "no permission".
   */
  static messageForUpdateError(err, { from, to } = {}) {
    switch (err?.code) {
      case 'FORBIDDEN':
        return 'No tienes permiso para actualizar este pedido.';
      case 'NOT_FOUND':
        return 'Pedido no encontrado.';
      case 'INVALID_STATUS_TRANSITION':
        return `No se puede cambiar el pedido de "${getOrderStatusLabel(from)}" a "${getOrderStatusLabel(to)}".`;
      case 'INVALID_CSRF_TOKEN':
        return 'No se pudo verificar tu sesión. Recarga la página e inténtalo de nuevo.';
      case 'SESSION_EXPIRED':
      case 'UNAUTHORIZED':
        return 'Tu sesión expiró. Inicia sesión de nuevo.';
      default:
        return 'No se pudo actualizar el estado. Inténtalo de nuevo.';
    }
  }

  /** User-facing (Spanish) message for a failed `GET /orders?view=seller`. */
  static messageForLoadError(err) {
    switch (err?.code) {
      case 'FORBIDDEN':
        return 'No tienes permisos de vendedor para ver estas ventas.';
      case 'SESSION_EXPIRED':
      case 'UNAUTHORIZED':
        return 'Tu sesión expiró. Inicia sesión de nuevo.';
      default:
        return 'No se pudieron cargar las ventas. Inténtalo de nuevo.';
    }
  }

  /** @private */
  async _hydrateBuyerNames(orders) {
    const ids = [...new Set(orders.map((order) => order.buyer_id).filter(Boolean))];
    await Promise.all(ids.map((id) => this._resolveBuyerName(id)));
  }

  /**
   * One profile request per buyer per session: cached names are reused, concurrent
   * lookups share the same promise, and failed lookups are not retried.
   * @private
   */
  _resolveBuyerName(id) {
    if (this.buyerNames[id] || this._unresolvedBuyerIds.has(id)) {
      return Promise.resolve();
    }
    if (!this._buyerLookups.has(id)) {
      const lookup = this._fetchBuyerName(id).finally(() => this._buyerLookups.delete(id));
      this._buyerLookups.set(id, lookup);
    }
    return this._buyerLookups.get(id);
  }

  /** @private */
  async _fetchBuyerName(id) {
    try {
      const body = await this.profilesApi.getById(id);
      const profile = body?.data || body;
      // Public profile fields only: never the e-mail (a seller does not need it here).
      const name = profile?.full_name || profile?.username;
      if (name) {
        this.buyerNames[id] = name;
      } else {
        this._unresolvedBuyerIds.add(id);
      }
    } catch {
      this._unresolvedBuyerIds.add(id);
    }
  }
}
