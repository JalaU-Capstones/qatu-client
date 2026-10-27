const STORAGE_KEY = 'qatu.cart';
const SCHEMA_VERSION = 1;

export class CartStore {
  constructor() {
    /** @type {Map<string, { productId: string, quantity: number }>} */
    this._items = new Map();
    this._userId = null;
    this._listeners = new Set();
  }

  /**
   * Called on boot. Reads localStorage and hydrates if the stored userId
   * matches the active user. If userId is null (anonymous), clears.
   * @param {string|null} userId
   */
  setUser(userId) {
    this._userId = userId || null;
    if (!this._userId) {
      this._items.clear();
      this._clearPersisted();
      this._notify();
      return;
    }
    this._loadFromStorage();
    this._notify();
  }

  /**
   * Upserts a single item from a successful POST /cart/items response.
   * @param {{ product_id: string, quantity: number }} item
   */
  setFromAddResponse(item) {
    if (!item || !item.product_id) return;
    this._items.set(item.product_id, {
      productId: item.product_id,
      quantity: Number(item.quantity) || 1,
    });
    this._persist();
    this._notify();
  }

  /**
   * Replaces the entire cart from a future GET /cart response.
   * Reserved for US-09 — kept here so the API surface is stable.
   * @param {Array<{ product_id: string, quantity: number }>} items
   */
  setFromGet(items) {
    this._items.clear();
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && item.product_id) {
          this._items.set(item.product_id, {
            productId: item.product_id,
            quantity: Number(item.quantity) || 1,
          });
        }
      }
    }
    this._persist();
    this._notify();
  }

  clear() {
    this._items.clear();
    this._clearPersisted();
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

  /** @returns {Array<{ productId: string, quantity: number }>} */
  getItems() {
    return Array.from(this._items.values());
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
    this._listeners.forEach((l) => l(this));
  }

  _loadFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.v !== SCHEMA_VERSION) return;
      if (parsed.userId !== this._userId) return; // cross-user guard
      if (!Array.isArray(parsed.items)) return;
      this._items.clear();
      for (const item of parsed.items) {
        if (item && typeof item.productId === 'string' && item.quantity > 0) {
          this._items.set(item.productId, {
            productId: item.productId,
            quantity: Number(item.quantity),
          });
        }
      }
    } catch {
      // Corrupt storage — ignore, start empty
    }
  }

  _persist() {
    if (!this._userId) return;
    try {
      const payload = {
        v: SCHEMA_VERSION,
        userId: this._userId,
        items: this.getItems(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota / private mode — fail silent
    }
  }

  _clearPersisted() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const cartStore = new CartStore();
