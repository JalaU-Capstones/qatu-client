import { ProductsApi } from '../../models/api/ProductsApi.js';

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
    this.publishingId = null; // productId currently being published
    this.publishErrors = {}; // { [productId]: string }
    this.currentPage = 1;
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

  async load({ page = this.currentPage, status = this.filterStatus } = {}) {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();
    try {
      const response = await this.productsApi.getSellerProducts({
        page,
        limit: this.meta?.per_page || 20,
        status: status || undefined,
      });
      this.products = response.data || [];
      this.meta = response.meta || this.meta;
      this.filterStatus = status || null;
      this.currentPage = page;
    } catch {
      this.errorMessage = 'No pudimos cargar tus productos. Intenta de nuevo.';
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  async setFilter(status) {
    this.filterStatus = status;
    await this.load({ page: 1, status });
  }

  async setPage(page) {
    const totalPages = this.meta?.total_pages || 0;
    if (page < 1 || (totalPages > 0 && page > totalPages)) return;
    await this.load({ page });
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

  async publishProduct(productId) {
    if (this.publishingId) return; // prevent double-clicks
    this.publishingId = productId;
    delete this.publishErrors[productId];
    this._notify();
    try {
      await this.productsApi.publishProduct(productId);
      // Update the product in-place
      const idx = this.products.findIndex((p) => p.id === productId);
      if (idx !== -1) {
        this.products[idx] = { ...this.products[idx], state: 'published' };
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

  // Derived getters used by the view
  get kpis() {
    const list = this.products;
    const total = list.length;
    const published = list.filter((p) => p.state === 'published').length;
    const drafts = list.filter((p) => p.state === 'draft').length;
    const withImage = list.filter((p) => Boolean(p.primary_image_path)).length;
    return { total, published, drafts, withImage };
  }

  canPublish(product) {
    return Boolean(product && product.state === 'draft' && product.primary_image_path);
  }

  get publishTooltip() {
    return 'Sube al menos una imagen para publicar este producto.';
  }
}
