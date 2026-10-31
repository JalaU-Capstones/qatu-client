import { cartService as defaultCartService } from '../../services/CartService.js';
import {
  cartStore as defaultCartStore,
  FLAT_SHIPPING_RATE,
  FREE_SHIPPING_THRESHOLD,
} from '../../store/cartStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';

/**
 * ViewModel for the shopping cart page (`/cart`).
 *
 * The backend cart (`GET /v1/cart`) is the source of truth; `CartService`
 * hydrates the local `CartStore` on load and keeps it in sync after every
 * mutation, while this ViewModel mirrors the store into presentation-ready
 * items and totals and exposes the quantity/remove/clear actions used by
 * the view. Guests see `requiresAuth` and are prompted to log in — the API
 * cart only exists for authenticated users.
 */
export class CartViewModel {
  /**
   * @param {Object} [options]
   * @param {Object} [options.cartStore] Store with the CartStore public API.
   * @param {import('../../services/CartService.js').CartService} [options.cartService]
   */
  constructor({ cartStore = defaultCartStore, cartService = defaultCartService } = {}) {
    this.cartStore = cartStore;
    this.cartService = cartService;

    /** @type {Array<Object>} */
    this.items = [];
    this.subtotal = 0;
    this.shipping = 0;
    this.total = 0;
    this.itemCount = 0;
    this.distinctCount = 0;
    this.isEmpty = true;
    this.notice = '';
    /** True when the visitor is not authenticated and must log in. */
    this.requiresAuth = false;

    this._listeners = new Set();
    this._storeUnsubscribe =
      typeof cartStore.subscribe === 'function' ? cartStore.subscribe(() => this.refresh()) : null;

    this.refresh({ notify: false });
  }

  /**
   * Hydrates the cart from the backend (`CartService.loadCart`).
   * Resolves the `requiresAuth` flag for guests.
   * @returns {Promise<void>}
   */
  async load() {
    if (typeof this.cartService?.loadCart !== 'function') return;

    const result = await this.cartService.loadCart();

    if (result.status === 'auth-required') {
      this.requiresAuth = true;
    } else {
      this.requiresAuth = false;
    }

    if (result.status === 'error') {
      this.notice = 'No pudimos actualizar tu carrito.';
    }

    this.refresh({ notify: false });
    this._notify();
  }

  /**
   * Recomputes the presentation state from the store.
   * @param {Object} [options]
   * @param {boolean} [options.notify=true]
   */
  refresh({ notify = true } = {}) {
    const rawItems = this.cartStore.getItems();
    this.items = rawItems.map((item) => {
      const subtotal = Math.round(Number(item.price) * item.quantity * 100) / 100;
      return {
        ...item,
        detailHref: `/products/${item.slug || item.productId}`,
        priceLabel: formatPrice(item.price, item.currency),
        subtotal,
        subtotalLabel: formatPrice(subtotal, item.currency),
      };
    });

    this.subtotal = this._readNumber('getSubtotal', () =>
      this.items.reduce((sum, item) => sum + item.subtotal, 0)
    );
    this.shipping = this._readNumber('getShipping', () =>
      this.items.length === 0 || this.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE
    );
    this.total = this._readNumber('getTotal', () => this.subtotal + this.shipping);
    this.itemCount = this._readNumber('getCount', () =>
      this.items.reduce((sum, item) => sum + item.quantity, 0)
    );
    this.distinctCount = this.items.length;
    this.isEmpty = this.items.length === 0;

    if (notify) this._notify();
  }

  /**
   * Sets an item quantity via the API (PATCH /cart/items/{cartItemId}).
   * The local store is updated optimistically and reconciled with the API
   * response inside the service; on failure the previous value is restored.
   * @param {string} productId
   * @param {number} quantity
   */
  async setQuantity(productId, quantity) {
    const previous = this.items.find((entry) => entry.productId === productId);
    this.cartStore.updateQuantity(productId, quantity);

    const result = await this.cartService.updateItem(productId, quantity);
    if (result.status === 'error') {
      if (previous) this.cartStore.updateQuantity(productId, previous.quantity);
      this.notice = result.error?.message || 'No pudimos actualizar tu carrito.';
      this._notify();
      return;
    }
    this._afterMutation();
  }

  /** @param {string} productId */
  async increment(productId) {
    const item = this.items.find((entry) => entry.productId === productId);
    if (item) await this.setQuantity(productId, item.quantity + 1);
  }

  /** @param {string} productId */
  async decrement(productId) {
    const item = this.items.find((entry) => entry.productId === productId);
    if (item) await this.setQuantity(productId, item.quantity - 1);
  }

  /**
   * Removes one item via the API (DELETE /cart/items/{cartItemId}).
   * The store is updated only after the API confirms.
   * @param {string} productId
   */
  async remove(productId) {
    const result = await this.cartService.removeItem(productId);
    if (result.status === 'error') {
      this.notice = result.error?.message || 'No pudimos quitar el producto del carrito.';
      this._notify();
      return;
    }
    this._notify();
  }

  /**
   * Clears the whole cart via the API (DELETE /cart).
   */
  async clear() {
    const result = await this.cartService.clear();
    if (result.status === 'error') {
      this.notice = result.error?.message || 'No pudimos vaciar tu carrito.';
      this._notify();
      return;
    }
    this._notify();
  }

  /**
   * Frontend-only placeholder for the checkout flow.
   */
  checkout() {
    this.notice = 'El pago estará disponible próximamente. Tu carrito se mantiene guardado.';
    this._notify();
  }

  dismissNotice() {
    if (!this.notice) return;
    this.notice = '';
    this._notify();
  }

  /** @returns {string} */
  getCurrency() {
    return this.items[0]?.currency || 'USD';
  }

  /** @returns {string} */
  getSubtotalLabel() {
    return formatPrice(this.subtotal, this.getCurrency());
  }

  /** @returns {string} */
  getShippingLabel() {
    if (this.isEmpty) return '';
    return this.shipping === 0 ? 'Gratis' : formatPrice(this.shipping, this.getCurrency());
  }

  /** @returns {string} */
  getTotalLabel() {
    return formatPrice(this.total, this.getCurrency());
  }

  /** @returns {string} */
  getItemCountLabel() {
    return `${this.itemCount} ${this.itemCount === 1 ? 'artículo' : 'artículos'}`;
  }

  /** @returns {string} */
  getShippingNotice() {
    if (this.isEmpty) return '';
    if (this.subtotal >= FREE_SHIPPING_THRESHOLD) {
      return '¡Tienes envío gratis!';
    }
    const remaining = FREE_SHIPPING_THRESHOLD - this.subtotal;
    return `Te faltan ${formatPrice(remaining, this.getCurrency())} para obtener envío gratis.`;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    if (typeof this._storeUnsubscribe === 'function') {
      this._storeUnsubscribe();
      this._storeUnsubscribe = null;
    }
    this._listeners.clear();
  }

  /**
   * Uses the store total helpers when available, otherwise the local fallback.
   * @param {string} method
   * @param {Function} fallback
   * @returns {number}
   * @private
   */
  _readNumber(method, fallback) {
    if (typeof this.cartStore[method] === 'function') {
      return Number(this.cartStore[method]());
    }
    return Math.round(Number(fallback()) * 100) / 100;
  }

  /**
   * Stores with a subscription already notify after a mutation; stores without
   * one (used in unit tests) need an explicit refresh.
   * @private
   */
  _afterMutation() {
    if (typeof this._storeUnsubscribe !== 'function') {
      this.refresh();
    }
  }

  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }
}
