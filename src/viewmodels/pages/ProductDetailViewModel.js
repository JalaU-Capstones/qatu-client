import { ProductsApi } from '../../models/api/ProductsApi.js';
import { cartService as defaultCartService } from '../../services/CartService.js';
import { formatPrice } from '../../utils/formatCurrency.js';

const TABS = [
  { id: 'features', label: 'Características' },
  { id: 'description', label: 'Descripción' },
  { id: 'reviews', label: 'Reseñas' },
];

/**
 * ViewModel for the product detail page (`/products/:slug`).
 *
 * Loads the product by slug (resolved through the documented API) and its
 * recommendations, owns the quantity/tab/gallery state and delegates the
 * add-to-cart interaction to `CartService`. Presentation field names follow
 * the `GET /v1/products/{id}` contract (`average_rating`, `ratings_count`,
 * `seller.full_name`, `images[].image_path`, `attributes` object, ...).
 * This class never touches the DOM.
 */
export class ProductDetailViewModel {
  /**
   * @param {Object} [options]
   * @param {import('../../models/api/ProductsApi.js').ProductsApi} [options.productsApi]
   * @param {import('../../services/CartService.js').CartService} [options.cartService]
   */
  constructor({ productsApi = new ProductsApi(), cartService = defaultCartService } = {}) {
    this.productsApi = productsApi;
    this.cartService = cartService;

    this.productSlug = null;
    /** @type {Object|null} */
    this.product = null;
    /** @type {Array<Object>} */
    this.similarProducts = [];
    /** @type {'idle'|'loading'|'ready'|'not-found'|'error'} */
    this.status = 'idle';
    this.errorMessage = '';

    this.quantity = 1;
    this.activeTab = 'features';
    this.selectedImage = 0;
    this.isAdding = false;
    this.feedback = '';

    this.tabs = TABS;
    this._listeners = new Set();
  }

  /**
   * Loads the product by slug and up to three related products.
   * @param {string} productSlug
   * @returns {Promise<void>}
   */
  async load(productSlug) {
    this.productSlug = productSlug;
    this.status = 'loading';
    this.errorMessage = '';
    this.product = null;
    this.similarProducts = [];
    this.quantity = 1;
    this.activeTab = 'features';
    this.selectedImage = 0;
    this._notify();

    try {
      const product = await this.productsApi.getProductBySlug(productSlug);
      if (!product) {
        this.status = 'not-found';
        this._notify();
        return;
      }

      const similar = await this.productsApi.getSimilarProducts(product.id, 3);
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
    this.selectedImage = Math.min(Math.max(0, Math.floor(Number(index) || 0)), gallery.length - 1);
    this._notify();
  }

  /**
   * Adds the current product/quantity to the cart through `CartService`.
   * Returns the service union; `auth-required` lets the caller decide how to
   * prompt the guest (the shell redirects to `/login`).
   * @returns {Promise<{ status: 'added'|'auth-required'|'error', item?: Object, error?: Error }>}
   */
  async addToCart() {
    if (!this.product || this.isOutOfStock() || this.isAdding) {
      return { status: 'error', error: new Error('Producto no disponible') };
    }

    this.isAdding = true;
    this.feedback = '';
    this._notify();

    try {
      const result = await this.cartService.addToCart(this.product.id, this.quantity);

      if (result.status === 'added') {
        this.feedback = `Añadiste ${this.quantity} ${
          this.quantity === 1 ? 'unidad' : 'unidades'
        } al carrito.`;
      } else if (result.status === 'auth-required') {
        this.feedback = 'Inicia sesión para añadir productos al carrito.';
      } else {
        this.feedback = 'No pudimos añadir el producto al carrito.';
      }

      return result;
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
    const rating = Number(this.product.average_rating || 0).toFixed(1);
    return `${rating} (${this.product.ratings_count || 0} reseñas)`;
  }

  /** @returns {boolean[]} */
  getStarsFilled() {
    return this.getStarsForRating(Number(this.product?.average_rating) || 0);
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
    const seller = this.product?.seller;
    return seller?.full_name || seller?.username || 'Vendedor';
  }

  /** @returns {string} */
  getSellerInitials() {
    const seller = this.getSellerLine();
    return seller
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  /** @returns {string} */
  getSellerLocation() {
    return this.product?.category?.name || '';
  }

  /** @returns {string} */
  getStockLabel() {
    if (!this.product) return '';
    const stock = Number(this.product.stock) || 0;
    if (stock <= 0) return 'Agotado';
    return `${stock} disponibles`;
  }

  /**
   * Gallery normalized for the view from the contract `images[]`
   * (`image_path`, `position`). Falls back to `primary_image_path` when the
   * product has no gallery rows.
   * @returns {Array<{ path: string|null, label: string }>}
   */
  getGallery() {
    const product = this.product;
    if (!product) return [];

    const images = Array.isArray(product.images) ? product.images : [];
    if (images.length > 0) {
      return images.map((image, index) => ({
        path: typeof image?.image_path === 'string' ? image.image_path : null,
        label: image?.label || `Vista ${index + 1}`,
      }));
    }

    return product.primary_image_path
      ? [{ path: product.primary_image_path, label: 'Imagen del producto' }]
      : [];
  }

  /** @returns {string} */
  getSelectedImageLabel() {
    return this.getGallery()[this.selectedImage]?.label || 'Imagen principal';
  }

  /**
   * Flattens the contract `attributes` object into `[{ label, value }]` rows
   * for the features tab.
   * @returns {Array<{ label: string, value: string }>}
   */
  getAttributes() {
    const attributes = this.product?.attributes;
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return [];
    return Object.entries(attributes).map(([label, value]) => ({
      label,
      value:
        value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    }));
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
