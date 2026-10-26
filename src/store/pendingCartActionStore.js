const STORAGE_KEY = 'qatu.cart.pending';
const SCHEMA_VERSION = 1;

export class PendingCartActionStore {
  /**
   * Stores an intention to add an item after authentication succeeds.
   * @param {{ productId: string, quantity?: number }} action
   */
  set(action) {
    if (!action || typeof action.productId !== 'string' || !action.productId) return;
    const quantity = Number.isInteger(action.quantity) && action.quantity > 0 ? action.quantity : 1;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: SCHEMA_VERSION, productId: action.productId, quantity })
      );
    } catch {
      // ignore
    }
  }

  /** @returns {{ productId: string, quantity: number } | null} */
  get() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== SCHEMA_VERSION) return null;
      if (typeof parsed.productId !== 'string' || !parsed.productId) return null;
      if (!Number.isInteger(parsed.quantity) || parsed.quantity < 1) return null;
      return { productId: parsed.productId, quantity: parsed.quantity };
    } catch {
      return null;
    }
  }

  clear() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const pendingCartActionStore = new PendingCartActionStore();
