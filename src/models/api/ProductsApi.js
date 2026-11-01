import { apiFetch } from './client.js';

/**
 * Products API client.
 *
 * Injects `apiFetch` via constructor so tests can mock the network without
 * patching globals (same pattern as `CartApi`). All methods parse the JSON
 * body of the response and throw `Error` objects carrying `code`, `statusCode`
 * and `details` for non-2xx responses, matching the OpenAPI error envelope.
 */
export class ProductsApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn] Override for tests; defaults to the real apiFetch.
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    if (!apiFetchFn) throw new Error('apiFetchFn is required');
    this._fetch = apiFetchFn;
  }

  /**
   * Fetches a paginated list of published products from the API, optionally
   * searched and filtered. Contract: GET /v1/products.
   *
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {string} [params.search]
   * @param {string} [params.categoryId]
   * @param {number} [params.minPrice]
   * @param {number} [params.maxPrice]
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   * @throws {Error} with `.code`, `.statusCode`, `.details` when the backend returns a non-2xx.
   */
  async getProducts({ page = 1, limit = 20, search, categoryId, minPrice, maxPrice } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);
    if (typeof minPrice === 'number') params.set('min_price', String(minPrice));
    if (typeof maxPrice === 'number') params.set('max_price', String(maxPrice));

    const response = await this._fetch(`/products?${params.toString()}`);

    return this._parseListResponse(response, 'products');
  }

  /**
   * Fetches the products shown in the "Destacados" section. Contract:
   * GET /v1/products with a small page size.
   *
   * @param {number} [limit=8]
   * @returns {Promise<Array<Object>>}
   */
  async getFeaturedProducts(limit = 8) {
    const response = await this.getProducts({ page: 1, limit });
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Fetches a single product by its ID. Contract: GET /v1/products/{id}.
   *
   * @param {string} productId
   * @returns {Promise<Object>} The product detail.
   * @throws {Error} with `.statusCode === 404` (or `code === 'PRODUCT_NOT_FOUND'`) when unknown/unpublished.
   */
  async getProductById(productId) {
    const response = await this._fetch(`/products/${productId}`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `Failed to fetch product (${response.status})`);
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body?.data ?? null;
  }

  /**
   * Resolves a product slug into a product detail. The contract only accepts
   * a productId on GET /v1/products/{id}, so the slug is resolved first with
   * the documented list endpoint:
   *   1. Fast path: `search=slug` — product names and slugs share most of
   *      their words, so the exact slug is usually already on page 1.
   *   2. Fallback: paginate the rest of the published catalog (`limit: 100`)
   *      and match `product.slug` exactly. Search does NOT cover the slug
   *      column, so this makes resolution reliable without any contract change.
   *
   * Unpublished products are never returned by the list endpoint, so they
   * resolve to `null` (handled as not-found by the caller).
   *
   * @param {string} slug
   * @returns {Promise<Object|null>} The product detail, or null when not found.
   */
  async getProductBySlug(slug) {
    if (typeof slug !== 'string' || slug.trim() === '') return null;

    const productId = await this._resolveProductIdFromSlug(slug.trim());
    if (!productId) return null;

    try {
      return await this.getProductById(productId);
    } catch (error) {
      if (error.statusCode === 404 || error.code === 'PRODUCT_NOT_FOUND') return null;
      throw error;
    }
  }

  /**
   * Resolves a slug into a product ID using only the documented
   * GET /v1/products contract (no dedicated slug endpoint exists).
   *
   * Strategy (3 attempts, cheapest first):
   *   1. Search with the raw slug. Matches when the backend eventually
   *      indexes the slug column or the product's name literally contains
   *      the hyphenated string (rare, but cheap to try).
   *   2. Search with hyphens replaced by spaces. Product slugs mirror the
   *      product name ("stainless-steel-kitchen-knife-set" →
   *      "stainless steel kitchen knife set"), so the backend's full-text
   *      search on `name`/`description` matches reliably.
   *   3. Paginate the FULL published catalog (no search filter) and match
   *      `product.slug === slug` exactly. This is the safety net: it works
   *      regardless of how the backend tokenizes text, at the cost of N
   *      list calls (N = total_pages of the unfiltered catalog, capped at
   *      MAX_FALLBACK_PAGES to bound the worst case).
   *
   * The bug this fixes: the previous implementation used the filtered
   * `total_pages` for the fallback loop, so a search that returned zero
   * results (e.g. slug with hyphens) never paginated — every product whose
   * name differed from its slug rendered "Producto no encontrado".
   *
   * @param {string} slug
   * @returns {Promise<string|null>} The product ID, or null when not found.
   * @private
   */
  async _resolveProductIdFromSlug(slug) {
    const PAGE_SIZE = 100;
    // Bounds the worst case: with ~100 products/page, 10 pages = 1000 products.
    // Capstone catalogs are far smaller; if this cap is hit we log and return
    // null rather than hammering the API.
    const MAX_FALLBACK_PAGES = 10;

    const findExactSlug = (items) =>
      (items || []).find((product) => product && product.slug === slug);

    // Attempt 1 — raw slug (with hyphens).
    const raw = await this.getProducts({ search: slug, limit: PAGE_SIZE });
    const rawMatch = findExactSlug(raw.data);
    if (rawMatch) return rawMatch.id;

    // Attempt 2 — hyphens replaced by spaces (mirrors the product name).
    const spaced = slug.replace(/-/g, ' ').trim();
    if (spaced && spaced !== slug) {
      const withSpaces = await this.getProducts({ search: spaced, limit: PAGE_SIZE });
      const spacedMatch = findExactSlug(withSpaces.data);
      if (spacedMatch) return spacedMatch.id;
    }

    // Attempt 3 — paginate the FULL catalog. `total_pages` here reflects the
    // unfiltered set, so the loop actually runs to completion.
    const firstPage = await this.getProducts({ page: 1, limit: PAGE_SIZE });
    const firstPageMatch = findExactSlug(firstPage.data);
    if (firstPageMatch) return firstPageMatch.id;

    const totalPages = Math.min(
      MAX_FALLBACK_PAGES,
      Math.max(1, Number(firstPage.meta?.total_pages) || 1)
    );

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await this.getProducts({ page, limit: PAGE_SIZE });
      const match = findExactSlug(nextPage.data);
      if (match) return match.id;
    }

    return null;
  }

  /**
   * Fetches the products shown as recommendations for a detail page. With no
   * "related" endpoint in the contract, the latest published catalog is used
   * and the current product is excluded.
   *
   * @param {string} productId
   * @param {number} [limit=3]
   * @returns {Promise<Array<Object>>}
   */
  async getSimilarProducts(productId, limit = 3) {
    // CONTRACT GAP: There is no `GET /products/{id}/similar` endpoint in the
    // contract. We approximate "similar" with the latest published catalog.
    // When the backend adds a real recommendations endpoint, swap this method.
    const response = await this.getProducts({ page: 1, limit: limit + 1 });
    return (response.data || []).filter((product) => product.id !== productId).slice(0, limit);
  }

  /**
   * Parses the JSON body of a list endpoint response, throwing in OpenAPI
   * error style for non-2xx statuses.
   *
   * @param {Response} response
   * @param {string} endpoint
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   * @private
   */
  async _parseListResponse(response, endpoint) {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(
        body?.error?.message || `Failed to fetch ${endpoint} (${response.status})`
      );
      err.code = body?.error?.code || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return {
      data: Array.isArray(body?.data) ? body.data : [],
      meta: body?.meta || {},
    };
  }
}
