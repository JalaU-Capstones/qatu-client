import { formatPrice } from '../../utils/formatCurrency.js';

const PRODUCT_PLACEHOLDER_SRC = new URL(
  '../../assets/icons/product-placeholder.svg',
  import.meta.url
).href;

const STATE_LABELS = {
  published: 'Publicado',
  draft: 'Borrador',
  unpublished: 'No publicado',
  archived: 'Archivado',
};

/**
 * Renders a product summary card without owning data fetching or navigation.
 */
export class ProductCard {
  /**
   * @param {Object} options
   * @param {Object} options.product
   * @param {'default'|'compact'|'seller'} [options.variant='default']
   * @param {Function} [options.onAddToCart]
   * @param {Function} [options.onView]
   * @param {Function} [options.onEdit]
   * @param {Function} [options.onDelete]
   * @param {boolean} [options.hideAddToCart]
   */
  constructor({
    product = {},
    variant = 'default',
    onAddToCart,
    onView,
    onEdit,
    onDelete,
    hideAddToCart = false,
  } = {}) {
    this.product = product || {};
    this.variant = ['default', 'compact', 'seller', 'featured'].includes(variant)
      ? variant
      : 'default';
    this.onAddToCart = onAddToCart;
    this.onView = onView;
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.hideAddToCart = hideAddToCart;
  }

  render() {
    const card = document.createElement('article');
    card.className = `product-card product-card--${this.variant}`;
    card.setAttribute('role', 'listitem');

    card.appendChild(this._renderImage());

    const body = document.createElement('div');
    body.className = 'product-card__body';

    const categoryName = this.product.category?.name;
    const sellerLine =
      this.variant === 'featured' ? this._getSellerLine(categoryName) : categoryName;
    if (sellerLine) {
      const category = document.createElement('p');
      category.className = 'product-card__category';
      category.textContent = sellerLine;
      body.appendChild(category);
    }

    const titlePrice = document.createElement('div');
    titlePrice.className = 'product-card__title-price';
    if (this.product.name) {
      const title = document.createElement('h3');
      title.className = 'product-card__title';
      const titleContent = document.createElement('span');
      titleContent.textContent = this.product.name;
      title.appendChild(this._wrapWithViewLink(titleContent));
      titlePrice.appendChild(title);
    }

    let rating = null;
    if (
      this.product.average_rating !== undefined &&
      this.product.average_rating !== null &&
      this.product.average_rating !== ''
    ) {
      const ratingValue = Number(this.product.average_rating);
      if (Number.isFinite(ratingValue)) {
        rating = document.createElement('p');
        rating.className = 'product-card__rating';

        const value = document.createElement('span');
        value.textContent = ratingValue.toFixed(1);
        const star = document.createElement('span');
        star.textContent = '★';
        star.setAttribute('aria-hidden', 'true');
        const count = document.createElement('span');
        count.textContent = `(${Number(this.product.ratings_count) || 0})`;
        rating.append(value, star, count);
      }
    }

    let hasPrice = false;
    if (
      this.product.price !== undefined &&
      this.product.price !== null &&
      this.product.price !== '' &&
      Number.isFinite(Number(this.product.price))
    ) {
      hasPrice = true;
      const price = document.createElement('p');
      price.className = 'product-card__price';
      price.textContent = this._formatPrice();
      if (this.variant !== 'featured') titlePrice.appendChild(price);
    }
    if (rating && this.variant !== 'featured') body.appendChild(rating);
    if (titlePrice.childNodes.length > 0) body.appendChild(titlePrice);
    if (rating && this.variant === 'featured') body.appendChild(rating);

    if (this.variant === 'seller') {
      body.appendChild(this._renderSellerControls());
    }

    card.appendChild(body);

    const footer = this._renderFooter({ hasPrice });
    if (footer.childNodes.length > 0) card.appendChild(footer);

    return card;
  }

  _renderImage() {
    const media = document.createElement('div');
    media.className = 'product-card__media';

    const frame = document.createElement('div');
    frame.className =
      this.variant === 'seller'
        ? 'product-card__image-frame q-seller-products__thumb-wrap'
        : 'product-card__image-frame';

    const imageSource =
      this.product.images?.[0]?.url ||
      this.product.images?.[0]?.image_path ||
      this.product.images?.[0]?.path ||
      this.product.primary_image_path;
    const image = document.createElement('img');
    image.className = imageSource
      ? this.variant === 'seller'
        ? 'product-card__image q-seller-products__thumb'
        : 'product-card__image'
      : this.variant === 'seller'
        ? 'product-card__image product-card__image--placeholder q-seller-products__thumb-placeholder-img'
        : 'product-card__image product-card__image--placeholder';
    image.src = imageSource || PRODUCT_PLACEHOLDER_SRC;
    image.alt = this.product.name || 'Imagen del producto';
    image.loading = 'lazy';
    if (imageSource) {
      image.addEventListener(
        'error',
        () => {
          image.src = PRODUCT_PLACEHOLDER_SRC;
          image.classList.add('product-card__image--placeholder');
        },
        { once: true }
      );
    }
    frame.appendChild(this._wrapWithViewLink(image));
    media.appendChild(frame);

    if (this.variant === 'featured') {
      const badgeLabel = this._getFeaturedBadge();
      if (badgeLabel) {
        const badge = document.createElement('span');
        badge.className = 'product-card__status-pill';
        badge.textContent = badgeLabel;
        media.appendChild(badge);
      }

      const favorite = document.createElement('button');
      favorite.type = 'button';
      favorite.className = 'product-card__favorite';
      favorite.setAttribute('aria-label', `Guardar ${this.product.name || 'producto'}`);
      favorite.setAttribute('aria-pressed', 'false');
      favorite.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
      favorite.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isSaved = favorite.getAttribute('aria-pressed') !== 'true';
        favorite.setAttribute('aria-pressed', String(isSaved));
        favorite.setAttribute(
          'aria-label',
          `${isSaved ? 'Quitar de favoritos' : 'Guardar'} ${this.product.name || 'producto'}`
        );
        favorite.classList.toggle('is-saved', isSaved);
      });
      media.appendChild(favorite);
    } else if (this.product.stock === 0) {
      const badge = document.createElement('span');
      badge.className = 'product-card__stock-badge';
      badge.textContent = 'Agotado';
      media.appendChild(badge);
    }

    return media;
  }

  _renderSellerControls() {
    const controls = document.createElement('div');
    controls.className = 'product-card__seller-controls';

    const stateLabel = STATE_LABELS[this.product.state];
    if (stateLabel) {
      const status = document.createElement('span');
      status.className = 'product-card__status';
      status.textContent = stateLabel;
      controls.appendChild(status);
    }

    return controls;
  }

  _renderFooter({ hasPrice = false } = {}) {
    const footer = document.createElement('footer');
    footer.className = 'product-card__footer';

    if (this.variant === 'featured' && hasPrice) {
      const price = document.createElement('p');
      price.className = 'product-card__price';
      price.textContent = this._formatPrice();
      footer.appendChild(price);
    }

    if (!this.hideAddToCart) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className =
        this.variant === 'featured'
          ? 'product-card__add-button'
          : this.variant === 'default'
            ? 'button is-primary is-fullwidth'
            : this.variant === 'compact'
              ? 'button is-small is-primary'
              : 'button is-small';
      if (this.variant === 'featured') {
        addButton.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>';
      } else {
        addButton.textContent = 'Añadir';
      }
      if (this.variant === 'featured') addButton.classList.add('product-card__cart-action');
      addButton.setAttribute('aria-label', `Añadir ${this.product.name || 'producto'} al carrito`);
      addButton.disabled = this._isUnavailable();
      addButton.addEventListener('click', async () => {
        if (addButton.disabled || typeof this.onAddToCart !== 'function') return;
        addButton.disabled = true;
        addButton.classList.add('is-loading');
        addButton.setAttribute('aria-busy', 'true');
        try {
          const result = await this.onAddToCart(this.product, 1);
          if (result?.status === 'error') this._showAddError(footer, result.error);
        } catch (error) {
          this._showAddError(footer, error);
        } finally {
          addButton.classList.remove('is-loading');
          addButton.removeAttribute('aria-busy');
          addButton.disabled = this._isUnavailable();
        }
      });
      footer.appendChild(addButton);
    }

    if (this.variant === 'seller') {
      const dropdown = document.createElement('div');
      dropdown.className = 'dropdown is-right product-card__dropdown';

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'button is-small';
      trigger.textContent = '…';
      trigger.setAttribute('aria-label', `Acciones de ${this.product.name || 'producto'}`);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', () => {
        const isOpen = dropdown.classList.toggle('is-active');
        trigger.setAttribute('aria-expanded', String(isOpen));
      });

      const menu = document.createElement('div');
      menu.className = 'dropdown-menu';
      menu.setAttribute('role', 'menu');
      const menuContent = document.createElement('div');
      menuContent.className = 'dropdown-content';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'button is-link is-small';
      edit.textContent = 'Editar';
      edit.setAttribute('aria-label', `Editar ${this.product.name || 'producto'}`);
      edit.addEventListener('click', () => this.onEdit?.(this.product));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button is-danger is-light is-small';
      remove.textContent = 'Eliminar';
      remove.setAttribute('aria-label', `Eliminar ${this.product.name || 'producto'}`);
      remove.addEventListener('click', () => this.onDelete?.(this.product));

      menuContent.append(edit, remove);
      menu.appendChild(menuContent);
      dropdown.append(trigger, menu);
      footer.appendChild(dropdown);
    }

    return footer;
  }

  _wrapWithViewLink(content) {
    if (typeof this.onView !== 'function' || !this.product.slug) return content;

    const link = document.createElement('a');
    link.className = 'product-card__view-link';
    link.href = `/products/${encodeURIComponent(this.product.slug)}`;
    link.dataset.route = '';
    link.setAttribute('aria-label', `Ver ${this.product.name || 'producto'}`);
    link.addEventListener('click', () => this.onView(this.product));
    link.appendChild(content);
    return link;
  }

  _formatPrice() {
    return formatPrice(this.product.price, this.product.currency || 'BOB');
  }

  _getSellerLine(categoryName) {
    const seller = this.product.seller || this.product.store || this.product.seller_name;
    if (!seller) return categoryName || '';
    if (typeof seller === 'string') return seller;

    const sellerName = seller.full_name || seller.username || seller.name || seller.store_name;
    const countryValue = seller.country;
    const country =
      seller.country_name ||
      (typeof countryValue === 'string' ? countryValue : countryValue?.name) ||
      seller.countryName ||
      this.product.country_name;
    return [sellerName, country].filter(Boolean).join(' · ') || categoryName || '';
  }

  _getFeaturedBadge() {
    const explicitBadge = this.product.badge || this.product.tag;
    if (['Más vendido', 'Nuevo', 'Últimas unidades', 'Oferta', 'Agotado'].includes(explicitBadge)) {
      return explicitBadge;
    }
    if (this.product.stock === 0) return 'Agotado';
    if (this.product.is_best_seller || this.product.isBestSeller || this.product.best_seller) {
      return 'Más vendido';
    }
    if (
      Number(this.product.discount_price) > 0 ||
      Number(this.product.sale_price) > 0 ||
      Number(this.product.discount_percentage) > 0
    ) {
      return 'Oferta';
    }
    if (this.product.is_new || this.product.isNew) return 'Nuevo';
    if (Number(this.product.stock) > 0 && Number(this.product.stock) <= 5) {
      return 'Últimas unidades';
    }
    return '';
  }

  _showAddError(footer, error) {
    let message = footer.querySelector('.product-card__error');
    if (!message) {
      message = document.createElement('p');
      message.className = 'product-card__error';
      message.setAttribute('role', 'alert');
      footer.appendChild(message);
    }
    message.textContent = error?.message || 'No se pudo añadir';
  }

  _isUnavailable() {
    return (
      this.product.stock === 0 ||
      (this.product.state !== undefined && this.product.state !== 'published')
    );
  }
}
