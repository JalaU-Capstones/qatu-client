import { CategoriesView } from '../components/CategoriesView.js';
import { FeaturedProductsView } from '../components/FeaturedProductsView.js';
import { FeaturedStoresView } from '../components/FeaturedStoresView.js';
import { FooterView } from '../components/FooterView.js';
import { HeaderView } from '../components/HeaderView.js';
import { HeroView } from '../components/HeroView.js';

/**
 * Page view for the Home route ('/').
 * Composes Header, Hero, Categories, Featured Products, Featured Stores, and Footer.
 */
export class HomeView {
  constructor() {
    this._header = null;
    this._footer = null;
    this._main = null;
    this._hero = null;
    this._categories = null;
    this._featuredProducts = null;
    this._stores = null;
  }

  /**
   * Mounts the home page into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    container.className = 'q-app';

    this._header = new HeaderView();
    this._header.mount(container);

    this._main = document.createElement('main');
    this._main.className = 'q-main';

    this._hero = new HeroView();
    this._hero.mount(this._main);

    this._categories = new CategoriesView();
    this._categories.mount(this._main);

    this._featuredProducts = new FeaturedProductsView();
    // Wire the "Add to cart" action to update the header badge
    this._featuredProducts.viewModel.onAddToCart = () => {
      this._header.viewModel.setCartCount(this._header.viewModel.cartCount + 1);
    };
    this._featuredProducts.mount(this._main);
    this._featuredProducts.viewModel.load();

    this._stores = new FeaturedStoresView();
    this._stores.mount(this._main);

    container.appendChild(this._main);

    this._footer = new FooterView();
    this._footer.mount(container);
  }

  /**
   * Destroys all child components and cleans up the DOM.
   */
  destroy() {
    if (this._footer) {
      this._footer.destroy();
      this._footer = null;
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
    if (this._main && this._main.parentNode) {
      this._main.parentNode.removeChild(this._main);
      this._main = null;
    }
    if (this._header) {
      this._header.destroy();
      this._header = null;
    }
  }
}
