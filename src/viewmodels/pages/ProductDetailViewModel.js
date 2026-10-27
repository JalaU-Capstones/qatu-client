import { ProductsApi } from '../../models/api/ProductsApi.js';
import { cartStore as defaultCartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';

const TABS = [
  { id: 'description', label: 'Descripción' },
  { id: 'features', label: 'Características' },
  { id: 'reviews', label: 'Reseñas' },
];

/**
 * ViewModel for the product detail page (`/products/:id`).
 *
 * Loads the product and its recommendations from the local catalog, owns the
 * quantity/tab/gallery state and writes the selected quantity into the local
 * cart. It never touches the DOM.
 */
export class ProductDetailViewModel {
  /**
   * @param {Object} [options]
   * @param {ProductsApi} [options.productsApi]
   * @param {Object} [options.cartStore] Store with an `addItem(product, quantity)` method.
   */
  constructor({ productsApi = new ProductsApi(), cartStore = defaultCartStore } = {}) {
    this.productsApi = productsApi;
    this.cartStore = cartStore;

    this.productId = null;
    /** @type {Object|null} */
    this.product = null;
    /** @type {Array<Object>} */
    this.similarProducts = [];
    /** @type {'idle'|'loading'|'ready'|'not-found'|'error'} */
    this.status = 'idle';
    this.errorMessage = '';

    this.quantity = 1;
    this.activeTab = 'description';
    this.selectedImage = 0;
    this.isAdding = false;
    this.feedback = '';

    this.tabs = TABS;
    this._listeners = new Set();
  }

  /**
   * Loads the product and up to three related products.
   * @param {string} productId
   * @returns {Promise<void>}
   */
  async load(productId) {
    this.productId = productId;
    this.status = 'loading';
    this.errorMessage = '';
    this.product = null;
    this.similarProducts = [];
    this.quantity = 1;
    this.activeTab = 'description';
    this.selectedImage = 0;
    this.feedback = '';
    this._notify();

    try {
      const product = await this.productsApi.getProductById(productId);
      if (!product) {
        this.status = 'not-found';
        this._notify();
        return;
      }

      const similar = await this.productsApi.getSimilarProducts(productId, 3);
      this.product = product;
      this.similarProducts = Array.isArray(similar) ? similar : [];
      this.quantity = 1;
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      this.errorMessage =
        error instanceof Error ? error.message : 'No pudimos cargar la información del producto.';
    }

    this._notify();
  }

  /**
   * @param {number} value
   */
  setQuantity(value) {
    this.quantity = this._clampQuantity(value);
    this._notify();
  }

  incrementQuantity() {
    this.setQuantity(this.quantity + 1);
  }

  decrementQuantity() {
    this.setQuantity(this.quantity - 1);
  }

  /**
   * @param {string} tabId
   */
  setTab(tabId) {
    if (!TABS.some((tab) => tab.id === tabId) || this.activeTab === tabId) return;
    this.activeTab = tabId;
    this._notify();
  }

  /**
   * @param {number} index
   */
  setSelectedImage(index) {
    const gallery = this.getGallery();
    if (gallery.length === 0) return;
    const next = Math.min(gallery.length - 1, Math.max(0, Math.floor(Number(index) || 0)));
    if (next === this.selectedImage) return;
    this.selectedImage = next;
    this._notify();
  }

  /**
   * Adds the current product/quantity to the local cart.
   * @returns {Promise<{ status: 'added'|'error', item?: Object, error?: Error }>}
   */
  async addToCart() {
    if (!this.product || this.isOutOfStock() || this.isAdding) {
      return { status: 'error', error: new Error('Producto no disponible') };
    }

    this.isAdding = true;
    this.feedback = '';
    this._notify();

    try {
      const item = await this.cartStore.addItem(this.product, this.quantity);
      this.feedback = `Añadiste ${this.quantity} ${
        this.quantity === 1 ? 'unidad' : 'unidades'
      } al carrito.`;
      return { status: 'added', item };
    } catch (error) {
      this.feedback = 'No pudimos añadir el producto al carrito.';
      return { status: 'error', error };
    } finally {
      this.isAdding = false;
      this._notify();
    }
  }

  /** @returns {boolean} */
  isOutOfStock() {
    return !this.product || Number(this.product.stock) <= 0;
  }

  /** @returns {number} */
  getMaxQuantity() {
    const stock = Number(this.product?.stock);
    return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 1;
  }

  /** @returns {string} */
  getPriceLabel() {
    return this.product ? formatPrice(this.product.price, this.product.currency) : '';
  }

  /** @returns {string} */
  getRatingLabel() {
    if (!this.product) return '';
    const rating = Number(this.product.rating).toFixed(1);
    return `${rating} (${this.product.ratingsCount} reseñas)`;
  }

  /** @returns {boolean[]} */
  getStarsFilled() {
    return this.getStarsForRating(Number(this.product?.rating) || 0);
  }

  /**
   * @param {number} rating
   * @returns {boolean[]}
   */
  getStarsForRating(rating) {
    return Array.from({ length: 5 }, (_, index) => rating >= index + 0.5);
  }

  /** @returns {string} */
  getSellerLine() {
    if (!this.product) return '';
    return this.product.country
      ? `${this.product.seller} · ${this.product.country}`
      : this.product.seller;
  }

  /** @returns {string} */
  getSellerInitials() {
    const seller = this.product?.seller || '';
    return seller
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  /** @returns {string} */
  getStockLabel() {
    if (!this.product) return '';
    const stock = Number(this.product.stock) || 0;
    if (stock <= 0) return 'Agotado';
    if (stock <= 5) return `Últimas ${stock} unidades`;
    return `${stock} disponibles`;
  }

  /** @returns {Array<{ label: string }>} */
  getGallery() {
    return Array.isArray(this.product?.gallery) ? this.product.gallery : [];
  }

  /** @returns {string} */
  getSelectedImageLabel() {
    return this.getGallery()[this.selectedImage]?.label || 'Imagen principal';
  }

  /** @returns {Array<{ label: string, value: string }>} */
  getAttributes() {
    return Array.isArray(this.product?.attributes) ? this.product.attributes : [];
  }

  /** @returns {Array<Object>} */
  getReviews() {
    return Array.isArray(this.product?.reviews) ? this.product.reviews : [];
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * @param {number} value
   * @returns {number}
   * @private
   */
  _clampQuantity(value) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? Math.floor(parsed) : 1;
    return Math.min(this.getMaxQuantity(), Math.max(1, safe));
  }

  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }
}
