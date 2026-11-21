import { ProductsApi } from '../../models/api/ProductsApi.js';

const PRODUCT_STATES = ['published', 'draft', 'unpublished'];
const STATE_KPI_KEYS = {
  published: 'published',
  draft: 'drafts',
  unpublished: 'unpublished',
};

function toNonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function countProducts(products) {
  return {
    published: products.filter((product) => product.state === 'published').length,
    drafts: products.filter((product) => product.state === 'draft').length,
    unpublished: products.filter((product) => product.state === 'unpublished').length,
    withImage: products.filter((product) => Boolean(product.primary_image_path)).length,
  };
}

export class SellerProductsViewModel {
  /**
   * @param {Object} [options]
   * @param {ProductsApi} [options.productsApi]
   * @param {Function} [options.onChange]
   */
  constructor({ productsApi = new ProductsApi(), onChange = null } = {}) {
    this.productsApi = productsApi;
    this.onChange = onChange;
    this._listeners = new Set();
    if (this.onChange) this._listeners.add(this.onChange);

    this.products = [];
    this.filterStatus = null; // null = all, 'draft', 'published'
    this.meta = { page: 1, per_page: 20, total: 0, total_pages: 0 };
    this.isLoading = false;
    this.errorMessage = '';
    this.publishingId = null; // productId currently in flight for an action (publish, unpublish, delete)
    // Used for any action error keyed by product id (publish, unpublish, delete).
    // Renamed in a future cleanup — internal only, do not rely on the name externally.
    this.publishErrors = {};
    this.currentPage = 1;
    this._catalogKpis = null;
    this._catalogProducts = new Map();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of this._listeners) {
      listener(this);
    }
  }

  async load({ page = this.currentPage, status = this.filterStatus, refreshSummary = true } = {}) {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();
    try {
      const limit = this.meta?.per_page || 20;
      const response = await this.productsApi.getSellerProducts({
        page,
        limit,
        status: status || undefined,
      });
      this.products = Array.isArray(response?.data) ? response.data : [];
      this.meta = this._normalizeMeta(response?.meta, {
        page,
        limit,
        dataLength: this.products.length,
      });
      this.filterStatus = status || null;
      this.currentPage = page;
      if (refreshSummary || !this._catalogKpis) {
        await this._loadCatalogKpis({ response, page, status });
      }
    } catch {
      this.errorMessage = 'No pudimos cargar tus productos. Intenta de nuevo.';
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  async setFilter(status) {
    this.filterStatus = status;
    await this.load({ page: 1, status, refreshSummary: !this._catalogKpis });
  }

  async setPage(page) {
    const totalPages = this.meta?.total_pages || 0;
    if (page < 1 || (totalPages > 0 && page > totalPages)) return;
    await this.load({ page, refreshSummary: !this._catalogKpis });
  }

  get hasPrevPage() {
    return this.currentPage > 1;
  }

  get hasNextPage() {
    const totalPages = this.meta?.total_pages || 0;
    return this.currentPage < totalPages;
  }

  get pageRangeLabel() {
    const total = this.meta?.total || 0;
    const perPage = this.meta?.per_page || 20;
    const start = total === 0 ? 0 : (this.currentPage - 1) * perPage + 1;
    const end = Math.min(this.currentPage * perPage, total);
    return `Mostrando ${start}\u2013${end} de ${total}`;
  }

  get compactPageRangeLabel() {
    const total = this.meta?.total || 0;
    const perPage = this.meta?.per_page || 20;
    const start = total === 0 ? 0 : (this.currentPage - 1) * perPage + 1;
    const end = Math.min(this.currentPage * perPage, total);
    return `${start}\u2013${end} / ${total}`;
  }

  _normalizeMeta(meta, { page, limit, dataLength }) {
    const normalizedPage = toNonNegativeInteger(meta?.page) || page;
    const perPage = toNonNegativeInteger(meta?.per_page) || limit;
    const total = toNonNegativeInteger(meta?.total) ?? dataLength;
    const totalPages =
      toNonNegativeInteger(meta?.total_pages) ?? (total > 0 ? Math.ceil(total / perPage) : 0);
    return { page: normalizedPage, per_page: perPage, total, total_pages: totalPages };
  }

  async _loadCatalogKpis({ response, page, status }) {
    const shouldReuseResponse = !status && page === 1;
    const statusResponsesPromise = Promise.all(
      PRODUCT_STATES.map((state) =>
        this.productsApi.getSellerProducts({ page: 1, limit: 1, status: state })
      )
    );
    const catalogPromise = this._loadCatalogProducts({
      response,
      shouldReuseResponse,
    });
    const [statusResponses, catalog] = await Promise.all([statusResponsesPromise, catalogPromise]);

    this._catalogProducts = new Map(
      catalog.products.filter((product) => product?.id).map((product) => [product.id, product])
    );
    const localCounts = countProducts(catalog.products);
    const catalogTotal = toNonNegativeInteger(catalog.meta?.total) ?? catalog.products.length;
    const stateTotals = Object.fromEntries(
      PRODUCT_STATES.map((state, index) => {
        const statusResponse = statusResponses[index];
        const statusProducts = Array.isArray(statusResponse?.data) ? statusResponse.data : [];
        const hasMismatchedState = statusProducts.some((product) => product.state !== state);
        const statusTotal = toNonNegativeInteger(statusResponse?.meta?.total);
        const fallback = localCounts[STATE_KPI_KEYS[state]];
        return [
          STATE_KPI_KEYS[state],
          statusTotal !== null && !hasMismatchedState ? statusTotal : fallback,
        ];
      })
    );

    this._catalogKpis = {
      total: catalogTotal,
      ...stateTotals,
      withImage: localCounts.withImage,
    };
  }

  async _loadCatalogProducts({ response, shouldReuseResponse }) {
    const firstResponse = shouldReuseResponse
      ? response
      : await this.productsApi.getSellerProducts({ page: 1, limit: 100 });
    const products = Array.isArray(firstResponse?.data) ? [...firstResponse.data] : [];
    const meta = firstResponse?.meta || {};
    const requestedLimit = shouldReuseResponse ? this.meta?.per_page || 20 : 100;
    const perPage = toNonNegativeInteger(meta.per_page) || requestedLimit;
    const total = toNonNegativeInteger(meta.total);
    const pagesFromMeta = toNonNegativeInteger(meta.total_pages);
    const totalPages = Math.max(
      pagesFromMeta || 0,
      total === null || total === 0 ? 0 : Math.ceil(total / perPage)
    );

    for (let firstPage = 2; firstPage <= totalPages; firstPage += 4) {
      const pages = Array.from(
        { length: Math.min(4, totalPages - firstPage + 1) },
        (_, index) => firstPage + index
      );
      const responses = await Promise.all(
        pages.map((page) => this.productsApi.getSellerProducts({ page, limit: perPage }))
      );
      for (const pageResponse of responses) {
        if (Array.isArray(pageResponse?.data)) products.push(...pageResponse.data);
      }
    }

    const uniqueProducts = new Map();
    const productsWithoutIds = [];
    for (const product of products) {
      if (product?.id) uniqueProducts.set(product.id, product);
      else productsWithoutIds.push(product);
    }

    return {
      products: [...uniqueProducts.values(), ...productsWithoutIds],
      meta,
    };
  }

  _adjustCatalogKpis(previousProduct, nextProduct) {
    if (!this._catalogKpis || !previousProduct || !nextProduct) return;

    const previousKey = STATE_KPI_KEYS[previousProduct.state];
    const nextKey = STATE_KPI_KEYS[nextProduct.state];
    if (previousKey && previousKey !== nextKey) {
      this._catalogKpis[previousKey] = Math.max(0, this._catalogKpis[previousKey] - 1);
    }
    if (nextKey && previousKey !== nextKey) {
      this._catalogKpis[nextKey] += 1;
    }
    this._catalogKpis.withImage = Math.max(
      0,
      this._catalogKpis.withImage +
        Number(Boolean(nextProduct.primary_image_path)) -
        Number(Boolean(previousProduct.primary_image_path))
    );
  }

  _applyProductUpdate(product) {
    const previousProduct =
      this._catalogProducts.get(product.id) || this.products.find((item) => item.id === product.id);
    if (!previousProduct) return false;

    const updatedProduct = { ...previousProduct, ...product };
    this._adjustCatalogKpis(previousProduct, updatedProduct);
    if (this._catalogProducts.has(product.id)) {
      this._catalogProducts.set(product.id, updatedProduct);
    }
    const productIndex = this.products.findIndex((item) => item.id === product.id);
    if (productIndex !== -1) this.products[productIndex] = updatedProduct;
    return true;
  }

  _removeProductFromCatalogKpis(product) {
    if (!this._catalogKpis) return;
    this._catalogKpis.total = Math.max(0, this._catalogKpis.total - 1);
    const stateKey = STATE_KPI_KEYS[product?.state];
    if (stateKey) this._catalogKpis[stateKey] = Math.max(0, this._catalogKpis[stateKey] - 1);
    if (product?.primary_image_path) {
      this._catalogKpis.withImage = Math.max(0, this._catalogKpis.withImage - 1);
    }
  }

  async publishProduct(productId) {
    if (this.publishingId) return; // prevent double-clicks
    this.publishingId = productId;
    delete this.publishErrors[productId];
    this._notify();
    try {
      const response = await this.productsApi.publishProduct(productId);
      const previousProduct =
        this._catalogProducts.get(productId) ||
        this.products.find((product) => product.id === productId);
      if (previousProduct) {
        this._applyProductUpdate({
          ...previousProduct,
          ...response?.data,
          id: productId,
          state: 'published',
        });
      }
      this._notify();
      return { status: 'success' };
    } catch (error) {
      this.publishErrors[productId] = error.message || 'Error al publicar.';
      this._notify();
      return { status: 'error', error };
    } finally {
      this.publishingId = null;
      this._notify();
    }
  }

  async unpublishProduct(productId) {
    if (this.publishingId) return; // prevent double-clicks / concurrent mutations
    this.publishingId = productId;
    delete this.publishErrors[productId];
    this._notify();
    try {
      const response = await this.productsApi.unpublishProduct(productId);
      const previousProduct =
        this._catalogProducts.get(productId) ||
        this.products.find((product) => product.id === productId);
      if (previousProduct) {
        this._applyProductUpdate({
          ...previousProduct,
          ...response?.data,
          id: productId,
          state: 'unpublished',
        });
      }
      this._notify();
      return { status: 'success' };
    } catch (error) {
      this.publishErrors[productId] = error.message || 'Error al despublicar.';
      this._notify();
      return { status: 'error', error };
    } finally {
      this.publishingId = null;
      this._notify();
    }
  }

  async deleteProduct(productId) {
    if (this.publishingId) return; // prevent double-clicks / concurrent mutations
    this.publishingId = productId;
    delete this.publishErrors[productId];
    this._notify();
    try {
      const deletedProduct =
        this._catalogProducts.get(productId) ||
        this.products.find((product) => product.id === productId);
      await this.productsApi.deleteProduct(productId);
      this._removeProductFromCatalogKpis(deletedProduct);
      this._catalogProducts.delete(productId);
      const previousTotal = toNonNegativeInteger(this.meta?.total) ?? this.products.length;
      this.products = this.products.filter((p) => p.id !== productId);
      if (this.meta) {
        const total = Math.max(0, previousTotal - 1);
        const perPage = this.meta.per_page || 20;
        this.meta = {
          ...this.meta,
          total,
          total_pages: total > 0 ? Math.ceil(total / perPage) : 0,
        };
      }
      // If the page was emptied and we're past page 1, rewind to the previous page
      if (this.products.length === 0 && this.currentPage > 1) {
        await this.load({ page: this.currentPage - 1 });
      }
      this._notify();
      return { status: 'success' };
    } catch (error) {
      this.publishErrors[productId] = error.message || 'Error al eliminar.';
      this._notify();
      return { status: 'error', error };
    } finally {
      this.publishingId = null;
      this._notify();
    }
  }

  /**
   * Applies an externally-produced ProductDetailDTO to the in-memory list.
   * Used after the edit modal resolves with a saved product.
   *
   * Products in the loaded catalog can update global KPIs even when they are
   * outside the current page. Unknown products are reconciled on the next load.
   *
   * @param {Object} product - ProductDetailDTO (must have an `id` field)
   */
  applyProductUpdate(product) {
    if (!product || !product.id) return;
    if (!this._applyProductUpdate(product)) return;
    this._notify();
  }

  // Derived getters used by the view
  get kpis() {
    return this._catalogKpis ? { ...this._catalogKpis } : this._getLocalKpis();
  }

  _getLocalKpis() {
    return { total: this.products.length, ...countProducts(this.products) };
  }

  canPublish(product) {
    if (!product) return false;
    const allowedState = product.state === 'draft' || product.state === 'unpublished';
    return Boolean(allowedState && product.primary_image_path);
  }

  get publishTooltip() {
    return 'Sube al menos una imagen para publicar este producto.';
  }
}
