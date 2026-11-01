/**
 * Compact product card used by the "Productos similares" section of the
 * product detail page. It always links to the recommended product's detail.
 */
export class RecommendationCardView {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} data.name
   * @param {string} data.priceLabel
   * @param {string} [data.sellerLine]
   * @param {string} [data.ratingLabel]
   * @param {string|null} [data.imageUrl]
   * @param {string} [data.detailHref]
   */
  constructor(data = {}) {
    this.data = data;
    this.element = null;
  }

  render() {
    if (this.element) return this.element;

    const card = document.createElement('li');
    card.className = 'q-recommendation-card';
    card.dataset.productId = this.data.id;

    const media = document.createElement('div');
    media.className = 'q-recommendation-card__media';
    media.appendChild(this._renderImage());

    const info = document.createElement('div');
    info.className = 'q-recommendation-card__info';

    if (this.data.sellerLine) {
      const seller = document.createElement('p');
      seller.className = 'q-recommendation-card__seller';
      seller.textContent = this.data.sellerLine;
      info.appendChild(seller);
    }

    const title = document.createElement('h3');
    title.className = 'q-recommendation-card__title';

    const titleLink = document.createElement('a');
    titleLink.className = 'q-recommendation-card__title-link';
    titleLink.href = this.data.detailHref || `/products/${this.data.id}`;
    titleLink.dataset.route = '';
    titleLink.textContent = this.data.name || '';
    title.appendChild(titleLink);
    info.appendChild(title);

    if (this.data.ratingLabel) {
      const rating = document.createElement('p');
      rating.className = 'q-recommendation-card__rating';
      rating.textContent = this.data.ratingLabel;
      info.appendChild(rating);
    }

    const price = document.createElement('p');
    price.className = 'q-recommendation-card__price';
    price.textContent = this.data.priceLabel || '';
    info.appendChild(price);

    const link = document.createElement('a');
    link.className = 'q-recommendation-card__link';
    link.href = this.data.detailHref || `/products/${this.data.id}`;
    link.dataset.route = '';
    link.textContent = 'Ver detalle';
    link.setAttribute('aria-label', `Ver detalle de ${this.data.name || 'producto'}`);
    info.appendChild(link);

    card.appendChild(media);
    card.appendChild(info);

    this.element = card;
    return card;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderImage() {
    const image = document.createElement('div');
    image.className = 'q-recommendation-card__image';

    const showPlaceholder = () => {
      image.innerHTML = '';
      const mark = document.createElement('span');
      mark.className = 'q-recommendation-card__mark';

      const markImg = document.createElement('img');
      markImg.src = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url).href;
      markImg.alt = '';
      markImg.setAttribute('width', '24');
      markImg.setAttribute('height', '24');
      mark.appendChild(markImg);

      const label = document.createElement('p');
      label.className = 'q-recommendation-card__image-label';
      label.textContent = 'Imagen del producto';

      image.appendChild(mark);
      image.appendChild(label);
    };

    if (!this.data.imageUrl) {
      showPlaceholder();
      return image;
    }

    const photo = document.createElement('img');
    photo.className = 'q-recommendation-card__photo';
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
