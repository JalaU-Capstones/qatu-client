import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';

const PLACEHOLDER_MARK_URL = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url)
  .href;

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
    link.addEventListener('click', (e) => {
      // No client-side router yet: avoid a full page navigation.
      e.preventDefault();
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
    const card = document.createElement('li');
    card.className = 'q-product-card';
    card.dataset.productId = product.id;

    card.appendChild(this._renderImage(product));

    const info = document.createElement('div');
    info.className = 'q-product-card-info';

    const seller = document.createElement('p');
    seller.className = 'q-product-card-seller';
    seller.textContent = this.viewModel.getOriginLabel(product);

    const title = document.createElement('h3');
    title.className = 'q-product-card-title';
    title.textContent = product.name;

    const rating = document.createElement('p');
    rating.className = 'q-product-card-rating';

    const stars = document.createElement('span');
    stars.setAttribute('aria-hidden', 'true');
    stars.textContent = '☆☆☆☆☆';

    const ratingValue = document.createElement('span');
    ratingValue.setAttribute('aria-hidden', 'true');
    ratingValue.textContent = this.viewModel.getRatingLabel(product);

    const ratingText = document.createElement('span');
    ratingText.className = 'q-sr-only';
    ratingText.textContent = this.viewModel.getRatingAccessibleLabel(product);

    rating.appendChild(stars);
    rating.appendChild(ratingValue);
    rating.appendChild(ratingText);

    const price = document.createElement('p');
    price.className = 'q-product-card-price';
    price.textContent = this.viewModel.getPriceLabel(product);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'q-product-card-action';
    action.textContent = this.viewModel.addToCartLabel;
    action.setAttribute('aria-label', `${this.viewModel.addToCartLabel}: ${product.name}`);
    action.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.addToCart(product.id);
    });

    info.appendChild(seller);
    info.appendChild(title);
    info.appendChild(rating);
    info.appendChild(price);
    info.appendChild(action);
    card.appendChild(info);

    return card;
  }

  /**
   * Renders the product photo, or the design placeholder when there is no image yet.
   * @param {Object} product
   * @returns {HTMLElement}
   * @private
   */
  _renderImage(product) {
    const image = document.createElement('div');
    image.className = 'q-product-card-image';

    if (product.imageUrl) {
      const photo = document.createElement('img');
      photo.className = 'q-product-card-photo';
      photo.src = product.imageUrl;
      photo.alt = product.name;
      photo.loading = 'lazy';
      image.appendChild(photo);
      return image;
    }

    const mark = document.createElement('span');
    mark.className = 'q-product-card-mark';

    const markImg = document.createElement('img');
    markImg.src = PLACEHOLDER_MARK_URL;
    markImg.alt = '';
    // Keep the SVG's own root size. The `width`/`height` properties would truncate to integers.
    markImg.setAttribute('width', '24.7071');
    markImg.setAttribute('height', '24.7071');
    mark.appendChild(markImg);

    const label = document.createElement('p');
    label.className = 'q-product-card-image-label';
    label.textContent = this.viewModel.imagePlaceholderLabel;

    image.appendChild(mark);
    image.appendChild(label);

    return image;
  }
}
