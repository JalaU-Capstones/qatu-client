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
    this.isUpdating = false;
    this.errorMessage = '';
    this.noticeMessage = '';
    this.statusFilter = '';
    this.buyerNames = {};
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
      this.errorMessage = err?.message || 'No se pudieron cargar las ventas';
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
    this.isUpdating = true;
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      const { data } = await this.ordersApi.updateOrderStatus(orderId, nextStatus);
      this.orders = this.orders.map((order) =>
        order.id === orderId ? { ...order, ...data, items: data.items || order.items } : order
      );
      this.noticeMessage = `Estado actualizado a ${getOrderStatusLabel(nextStatus)}`;
    } catch (err) {
      if (err?.code === 'INVALID_STATUS_TRANSITION' || err?.statusCode === 422) {
        this.errorMessage = err.message || 'Invalid status transition';
      } else if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.errorMessage = 'No tienes permiso para actualizar este pedido';
      } else {
        this.errorMessage = err?.message || 'No se pudo actualizar el estado';
      }
    } finally {
      this.isUpdating = false;
      this._notify();
    }
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

  /** @private */
  async _hydrateBuyerNames(orders) {
    const ids = [...new Set(orders.map((o) => o.buyer_id).filter(Boolean))];
    await Promise.all(
      ids.map(async (id) => {
        if (this.buyerNames[id]) return;
        try {
          const body = await this.profilesApi.getById(id);
          const profile = body?.data || body;
          const name = profile?.full_name || profile?.username || profile?.email || id.slice(0, 8);
          this.buyerNames[id] = name;
        } catch {
          this.buyerNames[id] = id.slice(0, 8);
        }
      })
    );
  }
}
