import { CategoriesView } from '../components/CategoriesView.js';
import { FeaturedProductsView } from '../components/FeaturedProductsView.js';
import { FeaturedStoresView } from '../components/FeaturedStoresView.js';
import { HeroView } from '../components/HeroView.js';
import { ShippingBannerView } from '../components/ShippingBannerView.js';

/**
 * Home page content view. Mounts INSIDE the persistent <main class="q-main">.
 * Header, footer, and the <main> wrapper are owned by the app shell (main.js).
 */
export class HomeView {
  /**
   * @param {Object} [options]
   * @param {Function} [options.onAddToCart] Called when a featured product's
   *   "Add to cart" button is clicked. The app shell uses this to update the
   *   header cart badge. Defaults to a no-op.
   * @param {Function} [options.onSearch] Called with the hero search term on submit.
   *   The app shell uses this to open the catalog results. Defaults to a no-op.
   */
  constructor({
    onAddToCart = () => Promise.resolve({ status: 'added' }),
    onSearch = () => {},
  } = {}) {
    this.onAddToCart = onAddToCart;
    this.onSearch = onSearch;
    this._hero = null;
    this._categories = null;
    this._featuredProducts = null;
    this._shippingBanner = null;
    this._stores = null;
    this.element = null;
  }

  /**
   * @param {HTMLElement} container
   */
  mount(container) {
    this.element = document.createElement('div');
    this.element.className = 'q-home';
    container.appendChild(this.element);

    this._hero = new HeroView();
    this._hero.viewModel.onSearch = (term) => this.onSearch(term);
    this._hero.mount(this.element);

    this._categories = new CategoriesView();
    this._categories.mount(this.element);

    this._featuredProducts = new FeaturedProductsView();
    this._featuredProducts.viewModel.onAddToCart = (product) => this.onAddToCart(product, 1);
    this._featuredProducts.mount(this.element);
    this._featuredProducts.viewModel.load();

    this._shippingBanner = new ShippingBannerView();
    this._shippingBanner.mount(this.element);

    this._stores = new FeaturedStoresView();
    this._stores.mount(this.element);
  }

  destroy() {
    if (this._shippingBanner) {
      this._shippingBanner.destroy();
      this._shippingBanner = null;
    }
    if (this._stores) {
      this._stores.destroy();
      this._stores = null;
    }
    if (this._featuredProducts) {
      this._featuredProducts.destroy();
      this._featuredProducts = null;
    }
    if (this._categories) {
      this._categories.destroy();
      this._categories = null;
    }
    if (this._hero) {
      this._hero.destroy();
      this._hero = null;
    }
    this.element?.remove();
    this.element = null;
  }
}
