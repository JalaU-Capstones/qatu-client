/**
 * ViewModel for Categories component.
 * Manages category list and section header configuration.
 */
export class CategoriesViewModel {
  /**
   * @param {Object} [options]
   * @param {Array<{id: string, name: string, productCount: number, href: string}>} [options.categories]
   * @param {string} [options.title]
   * @param {string} [options.subtitle]
   * @param {string} [options.seeAllLabel]
   * @param {string} [options.seeAllHref]
   */
  constructor(options = {}) {
    this.categories = options.categories || CategoriesViewModel.defaultCategories();
    this.title = options.title || 'Explora por categoría';
    this.subtitle = options.subtitle || 'Encuentra tu próximo favorito';
    this.seeAllLabel = options.seeAllLabel || 'Ver todas';
    this.seeAllHref = options.seeAllHref || '/categorias';
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
    this.categories = categories;
    this._notify();
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
