/**
 * Default featured products, taken from the Figma home page (node 44:2768).
 * The API does not expose store name or country yet, so these are mocked
 * until the catalog model (`models/api/`) feeds the section.
 */
const DEFAULT_PRODUCTS = [
  {
    id: 'aguayo-tradicional-tarabuco',
    name: 'Aguayo tradicional de Tarabuco',
    seller: 'Tejidos Illimani',
    country: 'Bolivia',
    rating: 4.9,
    ratingsCount: 24,
    price: 40,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'cafe-especialidad-cusco',
    name: 'Café de especialidad de Cusco 500 g',
    seller: 'Café Altura Cusco',
    country: 'Perú',
    rating: 4.8,
    ratingsCount: 18,
    price: 14,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'jarron-barro-negro-oaxaca',
    name: 'Jarrón de barro negro de Oaxaca',
    seller: 'Barro Negro Oaxaca',
    country: 'México',
    rating: 5.0,
    ratingsCount: 12,
    price: 38,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'bolso-cuero-artesanal',
    name: 'Bolso de cuero artesanal',
    seller: 'Pampa Cuero',
    country: 'Argentina',
    rating: 4.7,
    ratingsCount: 31,
    price: 85,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'audifonos-inalambricos-anc-pro',
    name: 'Audífonos inalámbricos ANC Pro',
    seller: 'Andes Tech',
    country: 'Chile',
    rating: 4.6,
    ratingsCount: 46,
    price: 165,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'chocolate-cacao-esmeraldas',
    name: 'Chocolate 70% cacao de Esmeraldas',
    seller: 'Cacao Esmeraldas',
    country: 'Ecuador',
    rating: 4.9,
    ratingsCount: 27,
    price: 6,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'mochila-trekking-45l',
    name: 'Mochila de trekking 45 L',
    seller: 'Sabores del Eje',
    country: 'Colombia',
    rating: 4.8,
    ratingsCount: 15,
    price: 92,
    currency: 'USD',
    imageUrl: null,
  },
  {
    id: 'huipil-bordado-guatemalteco',
    name: 'Huipil bordado guatemalteco',
    seller: 'Telar Maya',
    country: 'Guatemala',
    rating: 4.9,
    ratingsCount: 9,
    price: 65,
    currency: 'USD',
    imageUrl: null,
  },
];

const CURRENCY_LABELS = {
  USD: 'US$',
};

/**
 * ViewModel for the Featured products section of the home page.
 * Holds the section copy, the product list and the "Add to cart" interaction.
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
   * @param {Array<Object>} [options.products]
   * @param {Function} [options.onAddToCart] Called with the product when "Add to cart" is pressed.
   */
  constructor(options = {}) {
    this.eyebrow = options.eyebrow || 'PRODUCTOS DESTACADOS';
    this.title = options.title || 'Destacados de la semana';
    this.subtitle = options.subtitle || 'Seleccionados para ti';
    this.link = options.link || { label: 'Ver catálogo →', href: '/productos' };
    this.addToCartLabel = options.addToCartLabel || 'Add to cart';
    this.imagePlaceholderLabel = options.imagePlaceholderLabel || 'Imagen del producto';
    this.products = options.products || DEFAULT_PRODUCTS.map((product) => ({ ...product }));
    this.onAddToCart = options.onAddToCart || null;
    this._listeners = new Set();
  }

  /**
   * Replaces the product list (for example with the API response).
   * @param {Array<Object>} products
   */
  setProducts(products) {
    this.products = Array.isArray(products) ? products : [];
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
   * Formats the seller line, e.g. "Tejidos Illimani · Bolivia".
   * @param {{ seller: string, country?: string }} product
   * @returns {string}
   */
  getOriginLabel(product) {
    return product.country ? `${product.seller} · ${product.country}` : product.seller;
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
