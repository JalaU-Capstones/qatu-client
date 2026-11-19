import { authStore as realAuthStore } from '../../store/authStore.js';
import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';
import { ProductCard } from './ProductCard.js';

/**
 * View component for the Featured products section of the home page.
 */
export class FeaturedProductsView {
  /**
   * @param {FeaturedProductsViewModel} [viewModel]
   * @param {Object} [options]
   * @param {Object} [options.authStore] Injectable for testing; defaults to the real singleton.
   */
  constructor(viewModel = new FeaturedProductsViewModel(), { authStore = realAuthStore } = {}) {
    this.viewModel = viewModel;
    this.authStore = authStore;
    this.element = null;
    this._unsubscribe = null;
    this._authUnsubscribe = null;
  }

  /**
   * Builds and returns the DOM element for the section.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    this.element = this._buildSection();
    return this.element;
  }

  /**
   * Builds the section DOM without mutating the mounted instance.
   * @returns {HTMLElement}
   * @private
   */
  _buildSection() {
    const section = document.createElement('section');
    section.className = 'q-featured';
    section.setAttribute('aria-labelledby', 'q-featured-title');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    container.appendChild(this._renderHeading());
    container.appendChild(this.viewModel.errorMessage ? this._renderMessage() : this._renderGrid());
    section.appendChild(container);

    return section;
  }

  /**
   * Re-renders the section contents in place without destroying the view.
   * @private
   */
  _refresh() {
    if (!this.element) return;
    const section = this._buildSection();
    this.element.replaceChildren(...section.childNodes);
  }

  /**
   * Mounts the section into a container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    if (!this.element) {
      this.render();
    }

    if (this.element.parentNode !== container) {
      container.appendChild(this.element);
    }

    if (!this._unsubscribe) {
      this._unsubscribe = this.viewModel.subscribe(() => this._refresh());
    }

    if (!this._authUnsubscribe) {
      this._authUnsubscribe = this.authStore.subscribe(() => this._refresh());
    }

    return this.element;
  }

  /**
   * Cleans up subscriptions and removes the element from the DOM.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._authUnsubscribe?.();
    this._authUnsubscribe = null;
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderHeading() {
    const heading = document.createElement('div');
    heading.className = 'q-featured-heading';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-featured-eyebrow';
    eyebrow.textContent = this.viewModel.eyebrow;

    const row = document.createElement('div');
    row.className = 'q-featured-heading-row';

    const copy = document.createElement('div');
    copy.className = 'q-featured-heading-copy';

    const title = document.createElement('h2');
    title.id = 'q-featured-title';
    title.className = 'q-featured-title';
    title.textContent = this.viewModel.title;

    copy.appendChild(title);

    if (this.viewModel.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'q-featured-subtitle';
      subtitle.textContent = this.viewModel.subtitle;
      copy.appendChild(subtitle);
    }

    const link = document.createElement('a');
    link.className = 'q-featured-link';
    link.href = this.viewModel.link.href;
    link.textContent = this.viewModel.link.label;
    link.dataset.route = '';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Router will handle navigation via data-route
    });

    row.appendChild(copy);
    row.appendChild(link);
    heading.appendChild(eyebrow);
    heading.appendChild(row);

    return heading;
  }

  /**
   * Shows the ViewModel error message instead of the grid.
   * @returns {HTMLElement}
   * @private
   */
  _renderMessage() {
    const message = document.createElement('p');
    message.className = 'q-featured-message';
    message.setAttribute('role', 'alert');
    message.textContent = this.viewModel.errorMessage;
    return message;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderGrid() {
    const grid = document.createElement('div');
    grid.className = 'q-featured-grid';
    grid.setAttribute('role', 'list');

    this.viewModel.products.forEach((product) => {
      grid.appendChild(this._renderCard(product));
    });

    return grid;
  }

  /**
   * @param {Object} product
   * @returns {HTMLElement}
   * @private
   */
  _renderCard(product) {
    const user = this.authStore.getUser();
    const isOwn = Boolean(user && user.id && product.seller_id && user.id === product.seller_id);
    return new ProductCard({
      product,
      variant: 'featured',
      onAddToCart: (item, quantity) => this.viewModel.addToCart(item.id, quantity),
      onView: () => {},
      hideAddToCart: isOwn,
    }).render();
  }
}
