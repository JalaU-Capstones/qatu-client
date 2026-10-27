const STORAGE_KEY = 'qatu.cart';
const SCHEMA_VERSION = 2;

export const FREE_SHIPPING_THRESHOLD = 50;
export const FLAT_SHIPPING_RATE = 4.99;

/**
 * Local shopping cart.
 *
 * The cart is intentionally frontend-only for the current lab: it stores
 * product snapshots (name, price, image, seller) plus the quantity, so the
 * cart page can render without contacting the API. Persistence lives in
 * localStorage and works for anonymous visitors as well as logged-in users.
 *
 * The `setFromAddResponse` / `setFromGet` helpers are kept for the existing
 * CartService contract, even though the current shell no longer uses it.
 */
export class CartStore {
  constructor() {
    /** @type {Map<string, { productId: string, name: string, price: number, currency: string, imageUrl: string|null, seller: string, quantity: number }>} */
    this._items = new Map();
    this._userId = null;
    this._listeners = new Set();
    this._storage = this._getStorage();
    this._loadFromStorage();
  }

  /**
   * Keeps the active user id for consumers that still read it. The local cart
   * itself is not scoped per user: an anonymous cart survives login/logout so
   * the shopper never loses the products they selected.
   * @param {string|null} userId
   */
  setUser(userId) {
    const nextUserId = userId || null;
    if (this._userId === nextUserId) return;
    this._userId = nextUserId;
    this._persist();
    this._notify();
  }

  /**
   * Adds a product snapshot to the cart. When the product already exists the
   * quantities are summed.
   *
   * @param {Object} product Product snapshot or `{ id, name, price, ... }`.
   * @param {number} [quantity=1]
   * @returns {Object|null} A copy of the stored item, or null for invalid input.
   */
  addItem(product, quantity = 1) {
    const existing = this._findByAnyId(product);
    const item = this._normalizeItem(product, existing);
    if (!item) return null;

    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    item.quantity = existing ? existing.quantity + amount : amount;

    this._items.set(item.productId, item);
    this._persist();
    this._notify();
    return this._copyItem(item);
  }

  /**
   * Sets an item quantity. Quantities below 1 are clamped to 1; removing an
   * item is an explicit action via `removeItem`.
   *
   * @param {string} productId
   * @param {number} quantity
   * @returns {Object|null}
   */
  updateQuantity(productId, quantity) {
    const existing = this._items.get(productId);
    if (!existing) return null;

    const nextQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const updated = { ...existing, quantity: nextQuantity };
    this._items.set(productId, updated);
    this._persist();
    this._notify();
    return this._copyItem(updated);
  }

  /**
   * Removes one product from the cart.
   * @param {string} productId
   * @returns {boolean} True when the product existed.
   */
  removeItem(productId) {
    const removed = this._items.delete(productId);
    if (removed) {
      this._persist();
      this._notify();
    }
    return removed;
  }

  clear() {
    this._items.clear();
    this._clearPersisted();
    this._notify();
  }

  /**
   * Legacy CartService helper: upserts one item from POST /cart/items.
   * @param {{ product_id?: string, productId?: string, quantity?: number }} item
   */
  setFromAddResponse(item) {
    if (!item || (!item.product_id && !item.productId)) return;
    const existing = this._findByAnyId(item);
    const normalized = this._normalizeItem(item, existing);
    if (!normalized) return;
    this._items.set(normalized.productId, normalized);
    this._persist();
    this._notify();
  }

  /**
   * Legacy CartService helper: replaces the cart from a GET /cart response.
   * @param {Array<{ product_id?: string, productId?: string, quantity?: number }>} items
   */
  setFromGet(items) {
    this._items.clear();
    if (Array.isArray(items)) {
      for (const item of items) {
        const normalized = this._normalizeItem(item);
        if (normalized) {
          this._items.set(normalized.productId, normalized);
        }
      }
    }
    this._persist();
    this._notify();
  }

  /** @returns {number} total quantity across all items */
  getCount() {
    let total = 0;
    for (const item of this._items.values()) total += item.quantity;
    return total;
  }

  /** @returns {number} number of distinct products */
  getDistinctCount() {
    return this._items.size;
  }

  /** @returns {Array<Object>} copies of the stored items */
  getItems() {
    return Array.from(this._items.values()).map((item) => this._copyItem(item));
  }

  /**
   * @param {string} productId
   * @returns {Object|null}
   */
  getItem(productId) {
    const item = this._items.get(productId);
    return item ? this._copyItem(item) : null;
  }

  /** @returns {number} */
  getSubtotal() {
    let subtotal = 0;
    for (const item of this._items.values()) {
      subtotal += Number(item.price) * item.quantity;
    }
    return Math.round(subtotal * 100) / 100;
  }

  /**
   * Shipping is free from US$ 50; below that a flat rate applies.
   * @returns {number}
   */
  getShipping() {
    if (this._items.size === 0) return 0;
    return this.getSubtotal() >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  }

  /** @returns {number} */
  getTotal() {
    return Math.round((this.getSubtotal() + this.getShipping()) * 100) / 100;
  }

  /** @returns {{ subtotal: number, shipping: number, total: number, count: number, distinctCount: number }} */
  getTotals() {
    return {
      subtotal: this.getSubtotal(),
      shipping: this.getShipping(),
      total: this.getTotal(),
      count: this.getCount(),
      distinctCount: this.getDistinctCount(),
    };
  }

  /** @returns {string|null} */
  getUserId() {
    return this._userId;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  /**
   * @param {Object} raw
   * @param {Object|null} [existing]
   * @returns {Object|null}
   * @private
   */
  _normalizeItem(raw, existing = null) {
    if (!raw || typeof raw !== 'object') return null;
    const rawId = raw.productId || raw.product_id || raw.id;
    if (!rawId) return null;

    const rawPrice = Number(raw.price);
    const hasPrice = Number.isFinite(rawPrice);

    return {
      productId: String(rawId),
      name: raw.name || existing?.name || 'Producto',
      price: hasPrice ? rawPrice : (existing?.price ?? 0),
      currency: raw.currency || existing?.currency || 'USD',
      imageUrl: raw.imageUrl ?? raw.primary_image_path ?? existing?.imageUrl ?? null,
      seller: raw.seller || existing?.seller || '',
      quantity: Math.max(1, Math.floor(Number(raw.quantity) || 1)),
    };
  }

  /**
   * @param {Object} product
   * @returns {Object|undefined}
   * @private
   */
  _findByAnyId(product) {
    const rawId = product?.productId || product?.product_id || product?.id;
    return rawId ? this._items.get(String(rawId)) : undefined;
  }

  /**
   * @param {Object} item
   * @returns {Object}
   * @private
   */
  _copyItem(item) {
    return { ...item };
  }

  /**
   * @returns {Storage|null}
   * @private
   */
  _getStorage() {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  _loadFromStorage() {
    if (!this._storage) return;
    try {
      const raw = this._storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.v !== SCHEMA_VERSION && parsed.v !== 1) return;
      if (!Array.isArray(parsed.items)) return;

      this._items.clear();
      for (const rawItem of parsed.items) {
        const item = this._normalizeItem(rawItem);
        if (item) {
          this._items.set(item.productId, item);
        }
      }

      // Migrate the old v1 shape (productId + quantity only) to v2 snapshots.
      if (parsed.v === 1) this._persist();
    } catch {
      // Corrupt storage — ignore, start empty
    }
  }

  _persist() {
    if (!this._storage) return;
    try {
      const payload = {
        v: SCHEMA_VERSION,
        userId: this._userId,
        items: this.getItems(),
      };
      this._storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota / private mode — fail silent
    }
  }

  _clearPersisted() {
    if (!this._storage) return;
    try {
      this._storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const cartStore = new CartStore();
