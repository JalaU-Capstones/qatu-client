import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';
import { ProductCardView } from './ProductCardView.js';

/**
 * View component for the Featured products section of the home page.
 */
export class FeaturedProductsView {
  /**
   * @param {FeaturedProductsViewModel} [viewModel]
   */
  constructor(viewModel = new FeaturedProductsViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._unsubscribe = null;
  }

  /**
   * Builds and returns the DOM element for the section.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const section = document.createElement('section');
    section.className = 'q-featured';
    section.setAttribute('aria-labelledby', 'q-featured-title');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    container.appendChild(this._renderHeading());
    container.appendChild(this.viewModel.errorMessage ? this._renderMessage() : this._renderGrid());
    section.appendChild(container);

    this.element = section;

    this._unsubscribe = this.viewModel.subscribe(() => {
      if (this.element && this.element.parentNode) {
        const parent = this.element.parentNode;
        const next = this.element.nextSibling;
        this.destroy();
        parent.insertBefore(this.render(), next);
      }
    });

    return this.element;
  }

  /**
   * Mounts the section into a container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Cleans up subscriptions and removes the element from the DOM.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
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

    const subtitle = document.createElement('p');
    subtitle.className = 'q-featured-subtitle';
    subtitle.textContent = this.viewModel.subtitle;

    copy.appendChild(title);
    copy.appendChild(subtitle);

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
    const grid = document.createElement('ul');
    grid.className = 'q-featured-grid';

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
    const cardView = new ProductCardView(
      {
        id: product.id,
        name: product.name,
        sellerLine: this.viewModel.getOriginLabel(product),
        priceLabel: this.viewModel.getPriceLabel(product),
        ratingLabel: this.viewModel.getRatingLabel(product),
        ratingAccessible: this.viewModel.getRatingAccessibleLabel(product),
        starsFilled: this.viewModel.getStarsFilled(product),
        imageUrl: product.imageUrl || null,
        isNew: this.viewModel.isNewProduct(product),
      },
      {
        variant: 'featured',
        onAddToCart: (id) => this.viewModel.addToCart(id),
        onToggleFavorite: () => {
          // no-op for now
        },
      }
    );
    return cardView.render();
  }
}
