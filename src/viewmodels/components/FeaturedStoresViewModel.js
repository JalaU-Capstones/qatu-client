/**
 * ViewModel for Featured Stores component.
 * Manages store list and section header configuration.
 */
export class FeaturedStoresViewModel {
  /**
   * @param {Object} [options]
   * @param {Array<{id: string, name: string, category: string, rating: number, reviewCount: number, href: string}>} [options.stores]
   * @param {string} [options.title]
   * @param {string} [options.subtitle]
   * @param {string} [options.seeAllLabel]
   * @param {string} [options.seeAllHref]
   */
  constructor(options = {}) {
    this.stores = options.stores || FeaturedStoresViewModel.defaultStores();
    this.title = options.title || 'Tiendas destacadas';
    this.subtitle = options.subtitle || 'Conoce a quienes crean';
    this.seeAllLabel = options.seeAllLabel || 'Ver todas';
    this.seeAllHref = options.seeAllHref || '/tiendas';
    this._listeners = new Set();
  }

  /**
   * Returns default stores matching the Figma mockup.
   * @returns {Array<{id: string, name: string, category: string, rating: number, reviewCount: number, href: string}>}
   */
  static defaultStores() {
    return [
      {
        id: 'tejidos',
        name: 'Tejidos Illimani',
        category: 'Textiles artesanales',
        rating: 4.8,
        reviewCount: 132,
        href: '/tiendas/tejidos-illimani',
      },
      {
        id: 'yungas',
        name: 'Café de los Yungas',
        category: 'Café de especialidad',
        rating: 4.9,
        reviewCount: 98,
        href: '/tiendas/cafe-de-los-yungas',
      },
      {
        id: 'andes',
        name: 'Andes Tech',
        category: 'Tecnología para todos',
        rating: 4.7,
        reviewCount: 210,
        href: '/tiendas/andes-tech',
      },
    ];
  }

  /**
   * Updates store list and notifies subscribers.
   * @param {Array<{id: string, name: string, category: string, rating: number, reviewCount: number, href: string}>} stores
   */
  setStores(stores) {
    this.stores = stores;
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
