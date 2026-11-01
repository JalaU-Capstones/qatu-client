export const FREE_SHIPPING_THRESHOLD = 50;
export const FLAT_SHIPPING_RATE = 4.99;

/**
 * Cart store — IN-MEMORY projection of the server cart.
 *
 * The server cart (GET /v1/cart) is the single source of truth for
 * authenticated users. CartService copies API responses into this store
 * so the header badge and the cart page can render synchronously, but
 * nothing here is persisted to storage — a page refresh always
 * re-hydrates from the API (see main.js#syncCartWithSession).
 *
 * Why in-memory only (vs. caching in storage):
 *  - The review requires cart state to come from the API, not storage.
 *  - Cart contents can change server-side (seller updates stock, another
 *    device mutates the cart, etc.); a stale storage cache would
 *    briefly render the wrong badge.
 *  - The API is only fetched on boot/login and when the cart page mounts,
 *    so the cost is negligible.
 *
 * The single exception is `pendingCartActionStore`, which persists a
 * queued add-to-cart intent across the /login redirect.
 */
export class CartStore {
  constructor() {
    /** @type {Map<string, { productId: string, itemId: string|null, slug: string|null, name: string, price: number, currency: string, imageUrl: string|null, seller: string, quantity: number }>} */
    this._items = new Map();
    this._userId = null;
    this._listeners = new Set();
  }

  /**
   * Keeps the active user id for consumers that still read it. The local cart
   * mirrors what the API returns for the signed-in user (see `setFromGet`).
   * @param {string|null} userId
   */
  setUser(userId) {
    const nextUserId = userId || null;
    if (this._userId === nextUserId) return;
    this._userId = nextUserId;
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
      this._notify();
    }
    return removed;
  }

  clear() {
    this._items.clear();
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
   * Normalizes a cart entry into the internal item shape. Accepts both:
   *  - Product snapshots (home/detail "add to cart" flows): `{ id|productId, name, price, ... }`
   *  - API cart items (`GET /cart` / `POST /cart/items` responses, CartItem
   *    schema): `{ id, user_id, product_id, quantity, product }`. The `id`
   *    there is the CART ITEM id (kept as `itemId` — PATCH/DELETE need it),
   *    `product_id` stays the cart key, and name/price/etc. come from the
   *    populated `product`.
   *
   * @param {Object} raw
   * @param {Object|null} [existing]
   * @returns {Object|null}
   * @private
   */
  _normalizeItem(raw, existing = null) {
    if (!raw || typeof raw !== 'object') return null;
    const rawId = raw.productId || raw.product_id || raw.id;
    if (!rawId) return null;

    const isApiCartItem = Boolean(raw.product_id) && Boolean(raw.id) && raw.id !== raw.product_id;
    const price = Number(raw.price ?? raw.product?.price);
    const hasPrice = Number.isFinite(price);

    return {
      productId: String(rawId),
      itemId: raw.cartItemId ?? (isApiCartItem ? String(raw.id) : (existing?.itemId ?? null)),
      slug: raw.slug ?? raw.product?.slug ?? existing?.slug ?? null,
      name: raw.name || raw.product?.name || existing?.name || 'Producto',
      price: hasPrice ? price : (existing?.price ?? 0),
      currency: raw.currency || raw.product?.currency || existing?.currency || 'USD',
      imageUrl:
        raw.imageUrl ??
        raw.primary_image_path ??
        raw.product?.primary_image_path ??
        existing?.imageUrl ??
        null,
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
}

export const cartStore = new CartStore();
