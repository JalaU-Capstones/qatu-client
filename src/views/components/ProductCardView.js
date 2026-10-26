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
 * @property {string}   sellerLine
 * @property {string}   priceLabel
 * @property {string}   ratingLabel
 * @property {string}   ratingAccessible
 * @property {boolean[]} starsFilled
 * @property {string|null} imageUrl
 * @property {boolean}  [isNew]
 * @property {number|null} [stock]     null = unknown → allow click
 * @property {string}   [state]        'published' | 'draft' | 'unpublished'
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
    this._status = 'idle'; // 'idle' | 'loading' | 'success' | 'error' | 'disabled'
    this._errorMessage = '';
    this._successTimer = null;
    this._actionBtn = null; // cached reference
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
    action.setAttribute('aria-label', `Añadir: ${this.data.name}`);
    this._actionBtn = action;

    // Disabled state: out of stock OR not published
    if (this._isDisabledByData()) {
      this._status = 'disabled';
      action.disabled = true;
      action.classList.add('is-disabled');
      action.textContent = this._disabledLabel();
      action.setAttribute('aria-label', `${action.textContent}: ${this.data.name}`);
    }

    action.addEventListener('click', async (e) => {
      e.preventDefault();
      if (this._status === 'loading' || this._status === 'disabled') return;
      if (typeof this.onAddToCart !== 'function') return;

      this._setStatus('loading');
      let result;
      try {
        result = await this.onAddToCart(this.data.id);
      } catch (error) {
        result = { status: 'error', error };
      }
      this._handleResult(result);
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

  /**
   * @returns {boolean}
   * @private
   */
  _isDisabledByData() {
    const { stock, state } = this.data;
    if (state && state !== 'published') return true;
    if (typeof stock === 'number' && stock <= 0) return true;
    return false;
  }

  /**
   * @returns {string}
   * @private
   */
  _disabledLabel() {
    const { stock, state } = this.data;
    if (state && state !== 'published') return 'No disponible';
    if (typeof stock === 'number' && stock <= 0) return 'Sin stock';
    return 'Añadir';
  }

  /**
   * @param {string} status
   * @private
   */
  _setStatus(status) {
    this._status = status;
    if (!this._actionBtn) return;

    this._actionBtn.classList.remove('is-loading', 'is-success', 'is-error', 'is-disabled');

    switch (status) {
      case 'loading':
        this._actionBtn.disabled = true;
        this._actionBtn.classList.add('is-loading');
        this._actionBtn.textContent = 'Añadiendo…';
        break;
      case 'success':
        this._actionBtn.disabled = false;
        this._actionBtn.classList.add('is-success');
        this._actionBtn.textContent = '✓ Añadido';
        break;
      case 'error':
        this._actionBtn.disabled = false;
        this._actionBtn.classList.add('is-error');
        this._actionBtn.textContent = 'Añadir';
        break;
      case 'disabled':
        this._actionBtn.disabled = true;
        this._actionBtn.classList.add('is-disabled');
        this._actionBtn.textContent = this._disabledLabel();
        break;
      case 'idle':
      default:
        this._actionBtn.disabled = false;
        this._actionBtn.textContent = 'Añadir';
    }
  }

  /**
   * @param {{ status?: string, error?: Error } | undefined} result
   * @private
   */
  _handleResult(result) {
    if (this._successTimer) {
      clearTimeout(this._successTimer);
      this._successTimer = null;
    }

    const status = result?.status;

    if (status === 'added' || status === 'auth-required') {
      // auth-required triggers a redirect in main.js; the card will likely unmount.
      // For UX we still flash success so the user sees feedback before redirect.
      this._setStatus('success');
      this._successTimer = setTimeout(() => {
        this._setStatus('idle');
        this._successTimer = null;
      }, 1500);
      return;
    }

    this._errorMessage = result?.error?.message || 'No se pudo añadir';
    this._setStatus('error');
    this._renderError();
  }

  /**
   * Inserts an inline error message below the action button.
   * @private
   */
  _renderError() {
    const info = this.element?.querySelector('.q-product-card-info');
    if (!info) return;
    let errEl = info.querySelector('.q-product-card-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'q-product-card-error';
      errEl.setAttribute('role', 'alert');
      info.appendChild(errEl);
    }
    errEl.textContent = this._errorMessage;
  }

  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  destroy() {
    if (this._successTimer) {
      clearTimeout(this._successTimer);
      this._successTimer = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this._actionBtn = null;
  }
}
