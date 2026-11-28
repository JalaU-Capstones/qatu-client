import { CategoriesApi } from '../../models/api/CategoriesApi.js';
import { ProductsApi } from '../../models/api/ProductsApi.js';

export class CategoriesViewModel {
  constructor({ categoriesApi = new CategoriesApi(), productsApi = new ProductsApi() } = {}) {
    this.categoriesApi = categoriesApi;
    this.productsApi = productsApi;
    this.categories = [];
    this.isLoading = false;
    this.errorMessage = '';
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }

  async loadCategories() {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();
    try {
      const categoryResponse = await this.categoriesApi.getCategories();
      const categories = Array.isArray(categoryResponse?.data)
        ? categoryResponse.data
        : Array.isArray(categoryResponse)
          ? categoryResponse
          : [];
      const productResponse = await this.productsApi.getProducts({ limit: 100 });
      const products = Array.isArray(productResponse?.data) ? productResponse.data : [];
      const counts = new Map();

      products.forEach((product) => {
        const categoryKeys = [
          product?.category_id,
          product?.categoryId,
          product?.category?.id,
          product?.category_slug,
          product?.categorySlug,
          product?.category?.slug,
        ].filter((key) => key !== null && key !== undefined && key !== '');
        new Set(categoryKeys).forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
      });

      this.categories = categories.map((category) => ({
        ...category,
        product_count: counts.get(category.id) ?? counts.get(category.slug) ?? 0,
      }));
    } catch (error) {
      this.categories = [];
      this.errorMessage = error?.message || 'No se pudieron cargar las categorías.';
      // eslint-disable-next-line no-console
      console.warn('[CategoriesViewModel] failed to load categories:', error?.message || error);
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }
}
