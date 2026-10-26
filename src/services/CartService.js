/**
 * CartService — orchestration layer between UI intent and the cart API.
 *
 * Responsibilities:
 *  - Auth gate: unauthenticated adds queue a pending action instead of firing.
 *  - API call: delegates to CartApi with the current Bearer token.
 *  - State sync: writes the response into CartStore (which persists + notifies).
 *  - Pending flush: after a successful login, `processPending()` retries the
 *    queued add, if any.
 *
 * Returns a discriminated union instead of throwing so callers (main.js,
 * ProductCardView) can branch on `status` without try/catch noise:
 *   { status: 'added', item }        — API succeeded, cartStore updated
 *   { status: 'auth-required' }      — not authenticated; pending queued
 *   { status: 'error', error, statusCode } — API failed
 */
export class CartService {
  /**
   * @param {Object} deps
   * @param {import('../models/api/CartApi.js').CartApi} deps.cartApi
   * @param {import('../store/cartStore.js').CartStore} deps.cartStore
   * @param {import('../store/authStore.js').AuthStore} deps.authStore
   * @param {import('../store/pendingCartActionStore.js').PendingCartActionStore} deps.pendingCartActionStore
   */
  constructor({ cartApi, cartStore, authStore, pendingCartActionStore }) {
    if (!cartApi) throw new Error('cartApi is required');
    if (!cartStore) throw new Error('cartStore is required');
    if (!authStore) throw new Error('authStore is required');
    if (!pendingCartActionStore) throw new Error('pendingCartActionStore is required');
    this.cartApi = cartApi;
    this.cartStore = cartStore;
    this.authStore = authStore;
    this.pendingCartActionStore = pendingCartActionStore;
  }

  /**
   * Adds a product to the cart for the authenticated user, or queues a
   * pending action when unauthenticated.
   *
   * @param {string} productId
   * @param {number} [quantity=1]
   * @param {Object} [options]
   * @param {boolean} [options.skipPendingWrite=false] Used by processPending
   *   to avoid re-queueing on its own auth check.
   * @returns {Promise<{ status: 'added', item: Object } | { status: 'auth-required' } | { status: 'error', error: Error, statusCode: number }>}
   */
  async addToCart(productId, quantity = 1, { skipPendingWrite = false } = {}) {
    if (!this.authStore.isAuthenticated()) {
      if (!skipPendingWrite) {
        this.pendingCartActionStore.set({ productId, quantity });
      }
      return { status: 'auth-required' };
    }

    try {
      const response = await this.cartApi.addItem({ productId, quantity });
      const item = response?.data;
      if (item) {
        this.cartStore.setFromAddResponse(item);
      }
      return { status: 'added', item };
    } catch (error) {
      return {
        status: 'error',
        error,
        statusCode: error?.statusCode || 0,
      };
    }
  }

  /**
   * Flushes any pending cart action queued before authentication.
   * Safe to call when no pending action exists (returns null).
   * Called by main.js inside the auth `onNavigate` flow, fire-and-forget.
   *
   * Retry policy:
   *  - Terminal errors (400/404/422) → clear pending (user must choose differently)
   *  - Retryable errors (5xx, network, SESSION_EXPIRED) → keep pending
   *
   * @returns {Promise<{ status: 'added' | 'auth-required' | 'error', ... } | null>}
   */
  async processPending() {
    const pending = this.pendingCartActionStore.get();
    if (!pending) return null;

    const result = await this.addToCart(pending.productId, pending.quantity, {
      skipPendingWrite: true,
    });

    const keepPending =
      result.status === 'error' &&
      (result.error?.code === 'SESSION_EXPIRED' ||
        result.statusCode === 0 ||
        result.statusCode >= 500);

    if (!keepPending) {
      this.pendingCartActionStore.clear();
    }

    return result;
  }
}
