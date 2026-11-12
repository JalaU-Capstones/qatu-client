const STORAGE_KEY = 'qatu.cart.pending';
const SCHEMA_VERSION = 1;

/**
 * Pending cart action — a single queued "add to cart" intent.
 *
 * When an unauthenticated visitor clicks "Añadir", CartService cannot call
 * POST /v1/cart/items (no session). Instead it records {productId, quantity}
 * here and redirects the user to /login. After a successful login, CartService
 * .processPending() replays the intent against POST /v1/cart/items and clears
 * this store.
 *
 * WHY THIS IS IN localStorage (unlike cartStore):
 *  - The /login redirect is a full page navigation. In-memory state is lost.
 *    localStorage is the only mechanism that survives the round-trip.
 *  - It is a SINGLE intent, not cart state. The review's "no localStorage cart"
 *    rule applies to the cart itself, not to a queued action.
 *  - It is cleared on: (a) successful replay, (b) explicit logout. No user can
 *    inherit another user's pending intent.
 *
 * Do NOT extend this store to hold cart items, prices, totals, or anything
 * derived from GET /v1/cart. If you need cart state, use `cartStore` (which is
 * in-memory) and let CartService hydrate it from the API.
 */
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
