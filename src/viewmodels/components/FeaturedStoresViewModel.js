/**
 * ViewModel for Featured Stores component.
 * Manages store list and section header configuration.
 */

const STORE_COLOR_CYCLE = ['pink', 'blue', 'purple'];

export class FeaturedStoresViewModel {
  /**
   * @param {Object} [options]
   * @param {Array<{id: string, name: string, category: string, rating: number, reviewCount: number, href: string}>} [options.stores]
   * @param {string} [options.eyebrow]
   * @param {string} [options.title]
   * @param {string} [options.subtitle]
   * @param {string} [options.seeAllLabel]
   * @param {string} [options.seeAllHref]
   */
  constructor(options = {}) {
    this.eyebrow = options.eyebrow || 'Conoce a quienes crean';
    this.title = options.title || 'Tiendas destacadas';
    this.subtitle = options.subtitle || 'Conoce a quienes crean';
    this.seeAllLabel = options.seeAllLabel || 'Ver tiendas';
    this.seeAllHref = options.seeAllHref || '/tiendas';
    const rawStores = options.stores || FeaturedStoresViewModel.defaultStores();
    this.stores = rawStores.map((store, i) => ({
      ...store,
      accent: store.accent || STORE_COLOR_CYCLE[i % STORE_COLOR_CYCLE.length],
      initials: store.initials || this._computeInitials(store.name),
    }));
    this._listeners = new Set();
  }

  /**
   * Computes up to 2 uppercase initials from a store name.
   * "Tejidos Illimani" → "TI", "Café de los Yungas" → "CY", "Andes Tech" → "AT".
   * @param {string} name
   * @returns {string}
   */
  _computeInitials(name) {
    if (!name) return '?';
    const STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', '&']);
    const words = name.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
    if (words.length === 0) return name.slice(0, 2).toUpperCase();
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
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
    this.stores = (stores || []).map((store, i) => ({
      ...store,
      accent: store.accent || STORE_COLOR_CYCLE[i % STORE_COLOR_CYCLE.length],
      initials: store.initials || this._computeInitials(store.name),
    }));
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
