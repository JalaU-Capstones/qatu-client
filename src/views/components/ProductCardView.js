/**
 * Product card — single reusable renderer used by Home (featured variant)
 * and Catalog (/products, default variant).
 *
 * Pure renderer: caller formats the data before passing it in.
 * Caller also wires the callbacks.
 */

/**
 * @typedef {Object} ProductCardData
 * @property {string}   id
 * @property {string}   name
 * @property {string}   sellerLine      Pre-formatted "Seller · Country" line
 * @property {string}   priceLabel      Pre-formatted price "US$ 40.00"
 * @property {string}   ratingLabel     Pre-formatted "4.9 (24)"
 * @property {string}   ratingAccessible Pre-formatted screen-reader label
 * @property {boolean[]} starsFilled    5 booleans
 * @property {string|null} imageUrl
 * @property {boolean} [isNew]
 */

/**
 * @typedef {Object} ProductCardOptions
 * @property {'featured'|'default'} [variant='default']
 * @property {Function} [onAddToCart]     Called with productId
 * @property {Function} [onToggleFavorite]
 */

export class ProductCardView {
  /**
   * @param {ProductCardData} data
   * @param {ProductCardOptions} [options]
   */
  constructor(data = {}, options = {}) {
    this.data = data;
    this.variant = options.variant || 'default';
    this.onAddToCart = options.onAddToCart || null;
    this.onToggleFavorite = options.onToggleFavorite || null;
    this.element = null;
  }

  render() {
    if (this.element) return this.element;

    const variant = this.variant;

    const card = document.createElement('li');
    card.className = `q-product-card q-product-card--${variant}`;
    card.dataset.productId = this.data.id;

    // ─── Media ───────────────────────────────────────────────
    const media = document.createElement('div');
    media.className = 'q-product-card-media';

    media.appendChild(this._renderImage());

    if (variant === 'featured' && this.data.isNew) {
      const badge = document.createElement('span');
      badge.className = 'q-product-card-new-badge';
      badge.textContent = 'Nuevo';
      badge.setAttribute('aria-label', 'Producto nuevo');
      media.appendChild(badge);
    }

    if (variant === 'featured') {
      const heartBtn = document.createElement('button');
      heartBtn.type = 'button';
      heartBtn.className = 'q-product-card-heart-btn';
      heartBtn.setAttribute('aria-label', `Guardar ${this.data.name} en favoritos`);
      heartBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      heartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof this.onToggleFavorite === 'function') {
          this.onToggleFavorite(this.data.id);
        }
      });
      media.appendChild(heartBtn);
    }

    card.appendChild(media);

    // ─── Info ────────────────────────────────────────────────
    const info = document.createElement('div');
    info.className = 'q-product-card-info';

    const seller = document.createElement('p');
    seller.className = 'q-product-card-seller';
    seller.textContent = this.data.sellerLine;

    const title = document.createElement('h3');
    title.className = 'q-product-card-title';
    title.textContent = this.data.name;

    const rating = document.createElement('p');
    rating.className = 'q-product-card-rating';

    const starsWrap = document.createElement('span');
    starsWrap.className = 'q-product-card-stars';
    starsWrap.setAttribute('aria-hidden', 'true');
    starsWrap.innerHTML = (this.data.starsFilled || [false, false, false, false, false])
      .map(
        (isFilled) =>
          `<svg class="q-product-card-star${isFilled ? ' is-filled' : ''}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
      )
      .join('');

    const ratingValue = document.createElement('span');
    ratingValue.className = 'q-product-card-rating-value';
    ratingValue.textContent = this.data.ratingLabel;

    const ratingText = document.createElement('span');
    ratingText.className = 'q-sr-only';
    ratingText.textContent = this.data.ratingAccessible;

    rating.appendChild(starsWrap);
    rating.appendChild(ratingValue);
    rating.appendChild(ratingText);

    const price = document.createElement('p');
    price.className = 'q-product-card-price';
    price.textContent = this.data.priceLabel;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'q-product-card-action';
    action.textContent = 'Añadir';
    action.setAttribute('aria-label', `${action.textContent}: ${this.data.name}`);
    action.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof this.onAddToCart === 'function') {
        this.onAddToCart(this.data.id);
      }
    });

    info.appendChild(seller);
    info.appendChild(title);
    info.appendChild(rating);
    info.appendChild(price);
    info.appendChild(action);
    card.appendChild(info);

    this.element = card;
    return this.element;
  }

  _renderImage() {
    const image = document.createElement('div');
    image.className = 'q-product-card-image';

    const showPlaceholder = () => {
      image.innerHTML = '';

      const mark = document.createElement('span');
      mark.className = 'q-product-card-mark';

      const markImg = document.createElement('img');
      markImg.src = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url).href;
      markImg.alt = '';
      markImg.setAttribute('width', '24.7071');
      markImg.setAttribute('height', '24.7071');
      mark.appendChild(markImg);

      const label = document.createElement('p');
      label.className = 'q-product-card-image-label';
      label.textContent = 'Imagen del producto';

      image.appendChild(mark);
      image.appendChild(label);
    };

    // No image URL → placeholder immediately
    if (!this.data.imageUrl) {
      showPlaceholder();
      return image;
    }

    // Has a URL → try to load; on failure fall back to placeholder
    const photo = document.createElement('img');
    photo.className = 'q-product-card-photo';
    photo.alt = '';
    photo.loading = 'lazy';
    photo.addEventListener('error', showPlaceholder);
    photo.src = this.data.imageUrl;
    image.appendChild(photo);

    return image;
  }

  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
