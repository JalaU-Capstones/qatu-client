import { FeaturedStoresViewModel } from '../../viewmodels/components/FeaturedStoresViewModel.js';

/**
 * View component for the Featured Stores section.
 * Renders store cards in a responsive grid.
 */
export class FeaturedStoresView {
  /**
   * @param {FeaturedStoresViewModel} [viewModel]
   */
  constructor(viewModel = new FeaturedStoresViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._unsubscribe = null;
    this._gridElement = null;
  }

  /**
   * Builds and returns the DOM element for the featured stores section.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const section = document.createElement('section');
    section.className = 'q-featured-stores';
    section.setAttribute('aria-labelledby', 'q-featured-stores-title');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    // Header container
    const header = document.createElement('div');
    header.className = 'q-featured-stores__header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'q-featured-stores__title-group';

    const title = document.createElement('h2');
    title.id = 'q-featured-stores-title';
    title.className = 'q-featured-stores__title';
    title.textContent = this.viewModel.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'q-featured-stores__subtitle';
    subtitle.textContent = this.viewModel.subtitle;

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);

    const seeAll = document.createElement('a');
    seeAll.className = 'q-featured-stores__see-all';
    seeAll.href = this.viewModel.seeAllHref;
    seeAll.textContent = `${this.viewModel.seeAllLabel} →`;
    seeAll.addEventListener('click', (e) => {
      e.preventDefault();
    });

    header.appendChild(titleGroup);
    header.appendChild(seeAll);

    // Grid container
    const grid = document.createElement('ul');
    grid.className = 'q-featured-stores__grid';
    this._renderCards(grid);

    container.appendChild(header);
    container.appendChild(grid);
    section.appendChild(container);

    this.element = section;
    this._gridElement = grid;

    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    return this.element;
  }

  /**
   * Renders store cards into the given grid element.
   * @param {HTMLElement} grid
   * @private
   */
  _renderCards(grid) {
    grid.innerHTML = '';

    this.viewModel.stores.forEach((store) => {
      const item = document.createElement('li');
      item.className = 'q-featured-stores__item';

      const card = document.createElement('div');
      card.className = 'q-store-card';

      const avatar = document.createElement('div');
      avatar.className = 'q-store-card__avatar';
      avatar.setAttribute('aria-hidden', 'true');

      const img = document.createElement('img');
      img.src = 'https://placehold.co/100x100/F9FAFB/9CA3AF?text=Tienda';
      img.alt = '';
      img.loading = 'lazy';
      avatar.appendChild(img);

      const name = document.createElement('h3');
      name.className = 'q-store-card__name';
      name.textContent = store.name;

      const category = document.createElement('p');
      category.className = 'q-store-card__category';
      category.textContent = store.category;

      const rating = document.createElement('div');
      rating.className = 'q-store-card__rating';

      const star = document.createElement('span');
      star.className = 'q-store-card__star';
      star.setAttribute('aria-hidden', 'true');
      star.textContent = '★';

      rating.appendChild(star);
      rating.appendChild(
        document.createTextNode(` ${store.rating} · ${store.reviewCount} reseñas`)
      );

      const cta = document.createElement('a');
      cta.className = 'q-store-card__cta';
      cta.href = store.href;
      cta.textContent = 'Visit store';
      cta.addEventListener('click', (e) => {
        e.preventDefault();
      });

      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(category);
      card.appendChild(rating);
      card.appendChild(cta);

      item.appendChild(card);
      grid.appendChild(item);
    });
  }

  /**
   * Mounts the section to a parent container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Updates only the grid when the ViewModel changes.
   * @private
   */
  _update() {
    if (!this.element || !this._gridElement) return;
    this._renderCards(this._gridElement);
  }

  /**
   * Cleans up subscriptions and removes element from DOM.
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
    this._gridElement = null;
  }
}
