import { CategoriesApi } from '../../models/api/CategoriesApi.js';

export class CategoriesViewModel {
  constructor({ categoriesApi = new CategoriesApi() } = {}) {
    this.categoriesApi = categoriesApi;
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
      const categories = await this.categoriesApi.getCategoriesWithCounts();
      this.categories = Array.isArray(categories) ? categories : [];
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
