import { ProductsApi } from '../../models/api/ProductsApi.js';

/**
 * ViewModel for the Catalog page ('/products').
 * Manages paginated product state, loading status, and error handling.
 * Never touches the DOM — the CatalogView reads from this class and subscribes to updates.
 *
 * API contract (GET /v1/products):
 *   Response: { data: Array<ProductListItemDTO>, meta: { page, per_page, total, total_pages } }
 *   Product fields: id, seller_id, category_id, name, slug, description, price, currency,
 *                   stock, attributes, primary_image_path, state, average_rating,
 *                   ratings_count, published_at, created_at, updated_at
 */
export class CatalogViewModel {
  /**
   * @param {Object} [options]
   * @param {ProductsApi} [options.productsApi] Model used by `loadProducts()`.
   */
  constructor({ productsApi = new ProductsApi() } = {}) {
    /** @type {ProductsApi} */
    this.productsApi = productsApi;

    /** @type {Array<Object>} Current page of products from the API. */
    this.products = [];

    /**
     * Pagination metadata returned by the API.
     * @type {{ page: number, per_page: number, total: number, total_pages: number }}
     */
    this.meta = { page: 1, per_page: 20, total: 0, total_pages: 0 };

    /** @type {boolean} True while an API request is in flight. */
    this.isLoading = false;

    /** @type {string} Human-readable error description, empty when there is no error. */
    this.errorMessage = '';

    this._listeners = new Set();
  }

  /**
   * Loads a page of products from the API and notifies subscribers.
   * Sets `isLoading` during the request; on failure sets `errorMessage`.
   * @param {number} [page=1]
   * @returns {Promise<void>}
   */
  async loadProducts(page = 1) {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();

    try {
      const { data, meta } = await this.productsApi.getProducts({
        page,
        limit: this.meta.per_page,
      });
      this.products = Array.isArray(data) ? data : [];
      this.meta = {
        page: meta?.page ?? page,
        per_page: meta?.per_page ?? this.meta.per_page,
        total: meta?.total ?? 0,
        total_pages: meta?.total_pages ?? 0,
      };
    } catch (err) {
      this.products = [];
      this.errorMessage =
        err instanceof Error ? err.message : 'No pudimos cargar el catálogo de productos.';
    } finally {
      this.isLoading = false;
    }

    this._notify();
  }

  /**
   * Loads the next page if one exists.
   * @returns {Promise<void>}
   */
  async nextPage() {
    if (this.meta.page < this.meta.total_pages) {
      await this.loadProducts(this.meta.page + 1);
    }
  }

  /**
   * Loads the previous page if one exists.
   * @returns {Promise<void>}
   */
  async prevPage() {
    if (this.meta.page > 1) {
      await this.loadProducts(this.meta.page - 1);
    }
  }

  /**
   * Subscribes to state changes.
   * @param {Function} listener Called with this ViewModel instance after each state change.
   * @returns {Function} Unsubscribe function.
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notifies all subscribers of state changes.
   * Iterates over a snapshot so listeners can safely unsubscribe/re-subscribe during the call.
   * @private
   */
  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }
}
