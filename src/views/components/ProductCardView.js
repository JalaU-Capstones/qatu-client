/**
 * View component for a single product card in the catalog.
 */
export class ProductCardView {
  /**
   * @param {Object} [product]
   * @param {string} [product.id]
   * @param {string} [product.name]
   * @param {number|string} [product.price]
   * @param {string} [product.currency]
   * @param {string|null} [product.primary_image_path]
   * @param {string} [product.seller]
   */
  constructor(product = {}) {
    this.product = product;
    this.element = null;
  }

  /**
   * Builds and returns the DOM element for the product card.
   * Renders image (or placeholder), name, formatted price, and "Agregar al carrito" action button.
   * Internal identifiers (such as product UUIDs) are never displayed in the visible card text.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const card = document.createElement('div');
    card.className = 'q-product-card';

    // Image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'q-product-card__image';

    if (this.product.primary_image_path) {
      const img = document.createElement('img');
      img.className = 'q-product-card__img';
      img.src = this.product.primary_image_path;
      img.alt = this.product.name || 'Producto';
      img.loading = 'lazy';
      imageContainer.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'q-product-card__placeholder';

      const placeholderText = document.createElement('span');
      placeholderText.className = 'q-product-card__placeholder-text';
      placeholderText.textContent = 'Sin imagen';

      placeholder.appendChild(placeholderText);
      imageContainer.appendChild(placeholder);
    }

    // Content container
    const content = document.createElement('div');
    content.className = 'q-product-card__content';

    // Optional human-readable seller line (e.g. from mockups)
    if (this.product.seller) {
      const seller = document.createElement('p');
      seller.className = 'q-product-card__seller';
      seller.textContent = this.product.seller;
      content.appendChild(seller);
    }

    // Product name
    const title = document.createElement('h3');
    title.className = 'q-product-card__title';
    title.textContent = this.product.name || '';

    // Price
    const price = document.createElement('p');
    price.className = 'q-product-card__price';
    const numPrice = Number(this.product.price ?? 0);
    const currency = this.product.currency || 'USD';
    price.textContent = `${currency} ${numPrice.toFixed(2)}`;

    // Action button: "Agregar al carrito"
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'q-product-card__action';
    actionBtn.textContent = 'Agregar al carrito';
    actionBtn.setAttribute('aria-label', `Agregar al carrito: ${this.product.name || 'producto'}`);
    actionBtn.addEventListener('click', (e) => {
      e.preventDefault();
    });

    content.appendChild(title);
    content.appendChild(price);
    content.appendChild(actionBtn);

    card.appendChild(imageContainer);
    card.appendChild(content);

    this.element = card;
    return this.element;
  }

  /**
   * Mounts the product card into a container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Removes element from DOM and clears reference.
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
