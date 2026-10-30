import { CategoriesApi } from '../../models/api/CategoriesApi.js';
import { ProductsApi } from '../../models/api/ProductsApi.js';
import {
  SEARCH_MAX_LENGTH,
  createEmptyFilters,
  validateSearchFilters,
} from '../../models/validation/productSearchFilters.js';

const NO_RESULTS_SUGGESTIONS = [
  'Revisa que las palabras estén bien escritas.',
  'Usa términos más generales, por ejemplo «café» en lugar de «café molido 500 g».',
  'Amplía el rango de precios o elige otra categoría.',
  'Quita algunos filtros para ver más productos.',
];

/**
 * ViewModel for the Catalog page ('/products').
 * Manages paginated product state, search and filters (US-06), loading status,
 * and error handling.
 * Never touches the DOM — the CatalogView reads from this class and subscribes to updates.
 *
 * API contract (GET /v1/products):
 *   Query: page, limit, search, category_id, min_price, max_price
 *   Response: { data: Array<ProductListItemDTO>, meta: { page, per_page, total, total_pages } }
 *   Product fields: id, seller_id, category_id, name, slug, description, price, currency,
 *                   stock, attributes, primary_image_path, state, average_rating,
 *                   ratings_count, published_at, created_at, updated_at
 */
export class CatalogViewModel {
  /**
   * @param {Object} [options]
   * @param {ProductsApi} [options.productsApi] Model used by `loadProducts()`.
   * @param {CategoriesApi} [options.categoriesApi] Model used by `loadCategories()`.
   * @param {Function} [options.onFiltersChange] Called with the page query string
   */
  constructor({
    productsApi = new ProductsApi(),
    categoriesApi = new CategoriesApi(),
    onFiltersChange = null,
  } = {}) {
    /** @type {ProductsApi} */
    this.productsApi = productsApi;

    /** @type {CategoriesApi} */
    this.categoriesApi = categoriesApi;

    /** @type {Function|null} */
    this.onFiltersChange = onFiltersChange;

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

    /** @type {import('../../models/validation/productSearchFilters.js').ProductSearchFilters} */
    this.filters = createEmptyFilters();

    /** @type {string} Validation message for the filter form, empty when valid. */
    this.filterError = '';

    /** @type {Array<Object>} Active categories for the category filter. */
    this.categories = [];

    /** @type {string[]} Shown when a search or filter returns no products. */
    this.noResultsSuggestions = NO_RESULTS_SUGGESTIONS;

    this._categoriesPromise = null;
    this._requestId = 0;
    this._listeners = new Set();
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  /** @returns {boolean} True when a search term or any filter is applied. */
  get hasActiveFilters() {
    const { search, category, minPrice, maxPrice } = this.filters;
    return Boolean(search || category || minPrice !== null || maxPrice !== null);
  }

  /** @returns {string} Page heading. */
  get title() {
    return this.filters.search ? `Resultados para «${this.filters.search}»` : 'Catálogo';
  }

  /** @returns {string} e.g. "48 resultados encontrados". */
  get resultsLabel() {
    const total = this.meta.total || 0;
    return total === 1 ? '1 resultado encontrado' : `${total} resultados encontrados`;
  }

  /** @returns {boolean} True when a search or filter finished with zero products. */
  get isNoResults() {
    return (
      !this.isLoading && !this.errorMessage && this.products.length === 0 && this.hasActiveFilters
    );
  }

  /**
   * One removable chip per applied filter.
   * @returns {Array<{ key: 'search'|'category'|'price', label: string }>}
   */
  get activeFilterChips() {
    const { search, category, minPrice, maxPrice } = this.filters;
    const chips = [];

    if (search) {
      chips.push({ key: 'search', label: `«${search}»` });
    }
    if (category) {
      const match = this.categories.find((item) => item.slug === category);
      chips.push({ key: 'category', label: match ? match.name : category });
    }
    if (minPrice !== null && maxPrice !== null) {
      chips.push({
        key: 'price',
        label: `${this._formatPrice(minPrice)} — ${this._formatPrice(maxPrice)}`,
      });
    } else if (minPrice !== null) {
      chips.push({ key: 'price', label: `Desde ${this._formatPrice(minPrice)}` });
    } else if (maxPrice !== null) {
      chips.push({ key: 'price', label: `Hasta ${this._formatPrice(maxPrice)}` });
    }

    return chips;
  }

  // ─── URL sync ───────────────────────────────────────────────────────────────

  /**
   * Restores filters from the page query string. Invalid values are ignored.
   * Does not notify or load; call `loadProducts()` afterwards.
   * @param {string} queryString e.g. window.location.search
   */
  setFiltersFromQuery(queryString = '') {
    const params = new URLSearchParams(queryString);
    const search = (params.get('q') || '').trim();
    const price = validateSearchFilters({
      minPrice: params.get('min_price'),
      maxPrice: params.get('max_price'),
    });

    this.filters = {
      search: search.length <= SEARCH_MAX_LENGTH ? search : '',
      category: (params.get('category') || '').trim(),
      minPrice: price.error ? null : price.filters.minPrice,
      maxPrice: price.error ? null : price.filters.maxPrice,
    };
  }

  /**
   * @returns {string} Page query string for the current filters, '' when none.
   */
  toQueryString() {
    const params = new URLSearchParams();
    const { search, category, minPrice, maxPrice } = this.filters;
    if (search) params.set('q', search);
    if (category) params.set('category', category);
    if (minPrice !== null) params.set('min_price', String(minPrice));
    if (maxPrice !== null) params.set('max_price', String(maxPrice));
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Loads the active categories once. A failure leaves the list empty so the
   * catalog keeps working with "Todas las categorías" only.
   * @returns {Promise<void>}
   */
  loadCategories() {
    if (!this._categoriesPromise) {
      this._categoriesPromise = this.categoriesApi
        .getCategories()
        .then(({ data }) => {
          this.categories = Array.isArray(data) ? data : [];
        })
        .catch(() => {
          this.categories = [];
        })
        .then(() => this._notify());
    }
    return this._categoriesPromise;
  }

  /**
   * Loads a page of products from the API with the current filters and notifies subscribers.
   * Sets `isLoading` during the request; on failure sets `errorMessage`.
   * Responses from older requests are discarded so fast filter changes cannot overwrite
   * newer results.
   * @param {number} [page=1]
   * @returns {Promise<void>}
   */
  async loadProducts(page = 1) {
    const requestId = ++this._requestId;
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();

    try {
      const query = await this._buildProductQuery();
      const { data, meta } = await this.productsApi.getProducts({
        page,
        limit: this.meta.per_page,
        ...query,
      });
      if (requestId !== this._requestId) return;
      this.products = Array.isArray(data) ? data : [];
      this.meta = {
        page: meta?.page ?? page,
        per_page: meta?.per_page ?? this.meta.per_page,
        total: meta?.total ?? 0,
        total_pages: meta?.total_pages ?? 0,
      };
    } catch (err) {
      if (requestId !== this._requestId) return;
      this.products = [];
      this.errorMessage =
        err instanceof Error ? err.message : 'No pudimos cargar el catálogo de productos.';
    }

    this.isLoading = false;
    this._notify();
  }

  /**
   * Validates and applies the filter form values, then reloads page 1.
   * @param {Object} values Raw form values: search, category, minPrice, maxPrice.
   * @returns {Promise<boolean>} False when validation failed and nothing was loaded.
   */
  async applyFilters(values = {}) {
    const { filters, error } = validateSearchFilters({ ...this.filters, ...values });
    if (error) {
      this.filterError = error;
      this._notify();
      return false;
    }

    await this._commitFilters(filters);
    return true;
  }

  /**
   * Runs a keyword search keeping the other filters.
   * @param {string} term
   * @returns {Promise<boolean>}
   */
  search(term) {
    return this.applyFilters({ search: term });
  }

  /**
   * Removes one applied filter and reloads page 1.
   * @param {'search'|'category'|'price'} key
   * @returns {Promise<void>}
   */
  removeFilter(key) {
    const next = { ...this.filters };
    if (key === 'search') next.search = '';
    if (key === 'category') next.category = '';
    if (key === 'price') {
      next.minPrice = null;
      next.maxPrice = null;
    }
    return this._commitFilters(next);
  }

  /**
   * Removes the search term and every filter, then reloads page 1.
   * @returns {Promise<void>}
   */
  clearFilters() {
    return this._commitFilters(createEmptyFilters());
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

  // ─── Private ────────────────────────────────────────────────────────────────

  /**
   * @param {Object} filters Already validated filters.
   * @returns {Promise<void>}
   * @private
   */
  _commitFilters(filters) {
    this.filters = filters;
    this.filterError = '';
    if (typeof this.onFiltersChange === 'function') {
      this.onFiltersChange(this.toQueryString());
    }
    return this.loadProducts(1);
  }

  /**
   * Maps the filters to `ProductsApi.getProducts` params, leaving out empty ones.
   * Resolves the category slug to its UUID; an unknown slug is dropped.
   * @returns {Promise<Object>}
   * @private
   */
  async _buildProductQuery() {
    const { search, category, minPrice, maxPrice } = this.filters;
    const query = {};

    if (search) query.search = search;
    if (category) {
      await this.loadCategories();
      const match = this.categories.find((item) => item.slug === category);
      if (match) {
        query.categoryId = match.id;
      } else {
        this.filters = { ...this.filters, category: '' };
      }
    }
    if (minPrice !== null) query.minPrice = minPrice;
    if (maxPrice !== null) query.maxPrice = maxPrice;

    return query;
  }

  /**
   * @param {number} value
   * @returns {string}
   * @private
   */
  _formatPrice(value) {
    return `USD ${Number(value).toFixed(2)}`;
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
