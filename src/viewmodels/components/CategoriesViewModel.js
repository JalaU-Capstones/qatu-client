/**
 * ViewModel for Categories component.
 * Manages category list and section header configuration.
 */

/**
 * Visual style per category, keyed by slug.
 * Unknown slugs fall back to a rotating palette in construction order.
 * Icon names map to the SVG factory in CategoriesView.
 */
const CATEGORY_STYLES = {
  tecnologia: { color: 'pink', icon: 'laptop' },
  'alimentos-y-bebidas': { color: 'amber', icon: 'coffee' },
  alimentos: { color: 'amber', icon: 'coffee' },
  artesanias: { color: 'pink', icon: 'vase' },
  electronica: { color: 'purple', icon: 'headphones' },
  'hogar-y-decoracion': { color: 'teal', icon: 'home' },
  hogar: { color: 'teal', icon: 'home' },
  textiles: { color: 'pink', icon: 'vase' },
  deportes: { color: 'green', icon: 'ball' },
};

const COLOR_CYCLE = ['pink', 'amber', 'teal', 'purple', 'green'];
const ICON_CYCLE = ['laptop', 'coffee', 'vase', 'home', 'ball', 'headphones'];

function normalizeCategories(categories) {
  return (categories || []).map((cat, i) => {
    const known =
      CATEGORY_STYLES[cat.slug] ||
      CATEGORY_STYLES[cat.id] ||
      CATEGORY_STYLES[cat.name?.toLowerCase()] ||
      (cat.name ? CATEGORY_STYLES[cat.name.toLowerCase().replace(/\s+/g, '-')] : null);
    return {
      ...cat,
      style: known || {
        color: COLOR_CYCLE[i % COLOR_CYCLE.length],
        icon: ICON_CYCLE[i % ICON_CYCLE.length],
      },
    };
  });
}

export class CategoriesViewModel {
  /**
   * @param {Object} [options]
   * @param {Array<{id: string, name: string, productCount: number, href: string}>} [options.categories]
   * @param {string} [options.eyebrow]
   * @param {string} [options.title]
   * @param {string} [options.subtitle]
   * @param {string} [options.seeAllLabel]
   * @param {string} [options.seeAllHref]
   */
  constructor(options = {}) {
    this.eyebrow = options.eyebrow || 'Encuentra tu próximo favorito';
    this.title = options.title || 'Explora por categoría';
    this.subtitle = options.subtitle || '';
    this.seeAllLabel = options.seeAllLabel || 'Ver todas';
    this.seeAllHref = options.seeAllHref || '/categorias';
    this.categories = normalizeCategories(
      options.categories || CategoriesViewModel.defaultCategories()
    );
    this.isLoading = !options.categories;
    this.categoriesApi = options.categoriesApi || new CategoriesApi();
    this.limit = options.limit || 6;
    this.errorMessage = '';
    this._listeners = new Set();
  }

  /**
   * Returns the default list of categories matching the Figma mockup.
   * @returns {Array<{id: string, name: string, productCount: number, href: string}>}
   */
  static defaultCategories() {
    return [
      {
        id: 'textiles',
        name: 'Textiles y moda',
        productCount: 248,
        href: '/categorias/textiles-y-moda',
      },
      {
        id: 'alimentos',
        name: 'Alimentos y bebidas',
        productCount: 126,
        href: '/categorias/alimentos-y-bebidas',
      },
      { id: 'artesanias', name: 'Artesanías', productCount: 92, href: '/categorias/artesanias' },
      {
        id: 'electronica',
        name: 'Electrónica',
        productCount: 184,
        href: '/categorias/electronica',
      },
      {
        id: 'hogar',
        name: 'Hogar y decoración',
        productCount: 76,
        href: '/categorias/hogar-y-decoracion',
      },
      { id: 'deportes', name: 'Deportes', productCount: 64, href: '/categorias/deportes' },
    ];
  }

  /**
   * Updates the category list and notifies subscribers.
   * @param {Array<{id: string, name: string, productCount: number, href: string}>} categories
   */
  setCategories(categories) {
    this.categories = normalizeCategories(categories);
    this._notify();
  }

  async loadCategories() {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();
    try {
      const categories = await this.categoriesApi.getCategoriesWithCounts();
      const sorted = [...categories].sort((a, b) => {
        if (a.product_count !== null && b.product_count !== null) {
          const countDifference = (b.product_count || 0) - (a.product_count || 0);
          if (countDifference !== 0) return countDifference;
        }
        return String(a.name || '').localeCompare(String(b.name || ''), 'es');
      });
      this.categories = normalizeCategories(sorted.slice(0, this.limit));
    } catch (error) {
      this.categories = [];
      this.errorMessage = error?.message || '';
      // eslint-disable-next-line no-console
      console.warn('[CategoriesViewModel] failed to load categories:', error?.message || error);
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Subscribes to changes in ViewModel state.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notifies all listeners of state changes.
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
import { CategoriesApi } from '../../models/api/CategoriesApi.js';
