import { ProductsApi } from '../../models/api/ProductsApi.js';

const CURRENCY_LABELS = {
  USD: 'US$',
};

/**
 * ViewModel for the Featured products section of the home page.
 * Holds the section copy, the loading state, the product list and the "Add to cart" interaction.
 * Product data comes from the `ProductsApi` model; this class never touches the DOM.
 */
export class FeaturedProductsViewModel {
  /**
   * @param {Object} [options]
   * @param {string} [options.eyebrow]
   * @param {string} [options.title]
   * @param {string} [options.subtitle]
   * @param {{ label: string, href: string }} [options.link]
   * @param {string} [options.addToCartLabel]
   * @param {string} [options.imagePlaceholderLabel]
   * @param {string} [options.loadErrorMessage]
   * @param {ProductsApi} [options.productsApi] Model used by `load()`.
   * @param {Array<Object>} [options.products] Initial products, skips the need to call `load()`.
   * @param {Function} [options.onAddToCart] Called with the product when "Add to cart" is pressed.
   */
  constructor(options = {}) {
    this.eyebrow = options.eyebrow || 'Seleccionados para ti';
    this.title = options.title || 'Destacados de la semana';
    this.subtitle = options.subtitle || 'Seleccionados para ti';
    this.link = options.link || { label: 'Ver catálogo →', href: '/products' };
    this.addToCartLabel = options.addToCartLabel || 'Add to cart';
    this.imagePlaceholderLabel = options.imagePlaceholderLabel || 'Imagen del producto';
    this.loadErrorMessage =
      options.loadErrorMessage || 'No pudimos cargar los productos destacados.';
    this.productsApi = options.productsApi || new ProductsApi();
    this.products = options.products || [];
    /** @type {'idle' | 'loading' | 'ready' | 'error'} */
    this.status = options.products ? 'ready' : 'idle';
    this.errorMessage = '';
    this.onAddToCart = options.onAddToCart || null;
    this._listeners = new Set();
  }

  /**
   * Loads the featured products from the model and notifies the view.
   * A failure is stored in `errorMessage` so the view can show it.
   * @returns {Promise<void>}
   */
  async load() {
    this.status = 'loading';
    this.errorMessage = '';

    try {
      const products = await this.productsApi.getFeaturedProducts();
      this.products = Array.isArray(products) ? products : [];
      this.status = 'ready';
    } catch {
      this.products = [];
      this.status = 'error';
      this.errorMessage = this.loadErrorMessage;
    }

    this._notify();
  }

  /**
   * Replaces the product list.
   * @param {Array<Object>} products
   */
  setProducts(products) {
    this.products = Array.isArray(products) ? products : [];
    this.status = 'ready';
    this.errorMessage = '';
    this._notify();
  }

  /**
   * Formats a product price as shown in the design, e.g. "US$ 40.00".
   * @param {{ price: number, currency?: string }} product
   * @returns {string}
   */
  getPriceLabel(product) {
    const symbol = CURRENCY_LABELS[product.currency] || product.currency || '';
    const amount = Number(product.price).toFixed(2);
    return symbol ? `${symbol} ${amount}` : amount;
  }

  /**
   * Formats the visible rating, e.g. "4.9 (24)".
   * @param {{ rating: number, ratingsCount: number }} product
   * @returns {string}
   */
  getRatingLabel(product) {
    return `${Number(product.rating).toFixed(1)} (${product.ratingsCount})`;
  }

  /**
   * Builds the rating sentence read by screen readers, e.g. "Calificación 4.9 de 5, 24 reseñas".
   * @param {{ rating: number, ratingsCount: number }} product
   * @returns {string}
   */
  getRatingAccessibleLabel(product) {
    return `Calificación ${Number(product.rating).toFixed(1)} de 5, ${product.ratingsCount} reseñas`;
  }

  /**
   * Formats the seller line, e.g. "Tejidos Illimani · Bolivia".
   * @param {{ seller: string, country?: string }} product
   * @returns {string}
   */
  getOriginLabel(product) {
    return product.country ? `${product.seller} · ${product.country}` : product.seller;
  }

  /**
   * Returns an array of 5 booleans indicating which stars are filled
   * for the given product's rating (e.g. 4.2 → [true, true, true, true, false]).
   * @param {{ rating: number }} product
   * @returns {boolean[]}
   */
  getStarsFilled(product) {
    const rating = Number(product.rating) || 0;
    return Array.from({ length: 5 }, (_, i) => rating >= i + 0.5);
  }

  /**
   * Returns the label for the "Add to cart" action button.
   * @returns {string}
   */
  getAddButtonLabel() {
    return 'Añadir';
  }

  /**
   * Returns true when the given product should display the "Nuevo" badge.
   * Checks `product.isNew` first; falls back to checking the product's
   * position in `this.products` (index < 2).
   * @param {Object} product
   * @returns {boolean}
   */
  isNewProduct(product) {
    if (typeof product.isNew === 'boolean') return product.isNew;
    const idx = this.products.findIndex((p) => p.id === product.id);
    return idx >= 0 && idx < 2;
  }

  /**
   * Triggers the "Add to cart" action for a product.
   * @param {string} productId
   * @returns {boolean} true when the product exists
   */
  addToCart(productId) {
    const product = this.products.find((item) => item.id === productId);
    if (!product) return false;

    if (typeof this.onAddToCart === 'function') {
      this.onAddToCart(product);
    }
    return true;
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
   * Iterates over a copy because a listener may unsubscribe and subscribe again
   * (the view re-renders itself), and a Set visits entries added while iterating.
   * @private
   */
  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }
}
