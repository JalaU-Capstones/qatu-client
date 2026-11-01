/**
 * CartService — orchestration layer between UI intent and the cart API.
 *
 * Responsibilities:
 *  - Auth gate: unauthenticated adds queue a pending action instead of firing.
 *  - API call: delegates to CartApi with the current session cookie.
 *  - State sync: writes the API response into CartStore (which persists + notifies).
 *  - Pending flush: after a successful login, `processPending()` retries the
 *    queued add, if any.
 *  - Cart hydration: `loadCart()` pulls GET /cart into CartStore on boot,
 *    after login, and after cart-affecting actions (the cart icon badge and
 *    the cart page both rely on this).
 *
 * Returns a discriminated union instead of throwing so callers (main.js,
 * ProductCardView) can branch on `status` without try/catch noise:
 *   { status: 'added', item }        — API succeeded, cartStore updated
 *   { status: 'auth-required' }      — not authenticated; pending queued
 *   { status: 'error', error, statusCode } — API failed
 */
import { CartApi } from '../models/api/CartApi.js';
import { authStore } from '../store/authStore.js';
import { cartStore } from '../store/cartStore.js';
import { pendingCartActionStore } from '../store/pendingCartActionStore.js';

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
   * ⚠️ Boot-race assumption: `authStore.isAuthenticated()` is derived from
   * the `sessionStorage` cache (see `authStore.js`). During the ~100-300ms
   * window between page load and `GET /auth/me` resolving (FE-35-03), it
   * returns `false` even when a valid HttpOnly cookie exists. This method
   * will queue a pending action + trigger the caller's redirect to `/login`
   * in that window. Acceptable for MVP because:
   *   1. Returning users have `sessionStorage` populated → no race.
   *   2. First-time visitors legitimately need to log in → correct.
   *   3. The rare bad case (reload + click within 300ms) is recoverable:
   *      after `/me` resolves, the user is authenticated and can retry.
   * FE-35-03 boot flow mitigates this further by rendering the header from
   * cache before enabling interactive UI.
   */
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

        // POST /cart/items returns a lightweight cart item (no nested
        // `product`). Trigger a fire-and-forget reload so the next render
        // of the cart page (or a shared device that navigates to /cart)
        // sees name/price/image/slug. The badge updates immediately from
        // setFromAddResponse above; loadCart() only enriches the store.
        // Failures are non-fatal — the user still sees the correct count.
        void this.loadCart().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[CartService] post-add refresh failed:', err?.message || err);
        });
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

  /**
   * Hydrates the local cart from the backend. Contract: GET /v1/cart.
   * No-op (`auth-required`) for guests — the API cart only exists for
   * authenticated users. Never throws; API errors are mapped to the
   * `error` union, consistent with the rest of the service.
   *
   * Boot-race note: same caveat as `addToCart` — during the brief window
   * before `GET /auth/me` resolves it returns `auth-required`; main.js
   * recalls it through the authStore subscription when `/me` resolves.
   *
   * @returns {Promise<{ status: 'auth-required' } | { status: 'loaded', items: Array<Object>, itemCount: number } | { status: 'error', error: Error, statusCode: number }>}
   */
  async loadCart() {
    if (!this.authStore.isAuthenticated()) {
      return { status: 'auth-required' };
    }

    try {
      // Request the product expansion so the cart page can render name,
      // price, image, and slug without N+1 fetches. The backend supports
      // ?include=product (added in API commit 4fbf68b); without it, every
      // cart item arrives lightweight and renders as "Producto — US$ 0.00".
      const response = await this.cartApi.getCart({ include: ['product'] });
      const items = Array.isArray(response?.data) ? response.data : [];
      this.cartStore.setFromGet(items);
      return { status: 'loaded', items, itemCount: this.cartStore.getCount() };
    } catch (error) {
      return {
        status: 'error',
        error,
        statusCode: error?.statusCode || 0,
      };
    }
  }

  /**
   * Sets a cart item quantity. Contract: PATCH /v1/cart/items/{cartItemId}.
   * The cart-item id is resolved from the store (`itemId`, populated by the
   * API responses). Updates the store from the API response on success and
   * keeps the local snapshot untouched on failure.
   *
   * @param {string} productId
   * @param {number} quantity
   * @returns {Promise<{ status: 'updated', item: Object|null, productId: string, quantity: number } | { status: 'error', error: Error, statusCode: number }>}
   */
  async updateItem(productId, quantity) {
    if (!productId) {
      const err = new Error('productId is required');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      return { status: 'error', error: err, statusCode: 400 };
    }

    const storeItem = this.cartStore.getItem?.(productId);
    const cartItemId = storeItem?.itemId;
    if (!cartItemId) {
      const err = new Error('No se encontró el item del carrito en el servidor.');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      return { status: 'error', error: err, statusCode: 400 };
    }

    try {
      const response = await this.cartApi.updateItem({ cartItemId, quantity });
      const item = response?.data;
      if (item) {
        this.cartStore.setFromAddResponse(item);
      }
      return { status: 'updated', item, productId, quantity };
    } catch (error) {
      return {
        status: 'error',
        error,
        statusCode: error?.statusCode || 0,
      };
    }
  }

  /**
   * Removes one cart item. Contract: DELETE /v1/cart/items/{cartItemId}.
   * Removes the store snapshot only after the API confirms.
   *
   * @param {string} productId
   * @returns {Promise<{ status: 'removed', productId: string } | { status: 'error', error: Error, statusCode: number }>}
   */
  async removeItem(productId) {
    if (!productId) {
      const err = new Error('productId is required');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      return { status: 'error', error: err, statusCode: 400 };
    }

    const storeItem = this.cartStore.getItem?.(productId);
    const cartItemId = storeItem?.itemId;
    if (!cartItemId) {
      const err = new Error('No se encontró el item del carrito en el servidor.');
      err.code = 'INVALID_REQUEST';
      err.statusCode = 400;
      return { status: 'error', error: err, statusCode: 400 };
    }

    try {
      await this.cartApi.removeItem({ cartItemId });
      this.cartStore.removeItem(productId);
      return { status: 'removed', productId };
    } catch (error) {
      return {
        status: 'error',
        error,
        statusCode: error?.statusCode || 0,
      };
    }
  }

  /**
   * Clears the authenticated user's cart. Contract: DELETE /v1/cart.
   * Clears the store snapshot only after the API confirms.
   *
   * @returns {Promise<{ status: 'cleared' } | { status: 'auth-required' } | { status: 'error', error: Error, statusCode: number }>}
   */
  async clear() {
    if (!this.authStore.isAuthenticated()) {
      return { status: 'auth-required' };
    }

    try {
      await this.cartApi.clear();
      this.cartStore.clear();
      return { status: 'cleared' };
    } catch (error) {
      return {
        status: 'error',
        error,
        statusCode: error?.statusCode || 0,
      };
    }
  }
}

export const cartService = new CartService({
  cartApi: new CartApi(),
  cartStore,
  authStore,
  pendingCartActionStore,
});
