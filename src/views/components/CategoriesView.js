import { CategoriesViewModel } from '../../viewmodels/components/CategoriesViewModel.js';

const svg = (paths) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none">${paths}</svg>`;

const YARN_BALL = svg(
  '<circle cx="12" cy="12" r="9"/><path d="M12 3c-2.5 3-2.5 15 0 18M12 3c2.5 3 2.5 15 0 18M3.5 9c3 2 14 2 17 0M3.5 15c3-2 14-2 17 0"/>'
);
const HANDBAG = svg(
  '<path d="M5 10h14l-1.2 9.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 10z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>'
);
const PALETTE = svg(
  '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"/><path d="M15 15a2 2 0 1 1 4 0v2a2 2 0 0 1-2 2h-1"/>'
);
const LAPTOP = svg(
  '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20l-1.5-3h-17z"/>'
);
const HOUSE = svg('<path d="M3 11l9-7 9 7v8a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-8z"/>');
const BALL = svg(
  '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6c4 4 8 4 12 0M6 18c4-4 8-4 12 0"/>'
);
const DEFAULT_ICON = svg('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>');

const CATEGORY_ICONS = {
  'textiles-y-moda': YARN_BALL,
  textiles: YARN_BALL,
  'accesorios-y-bolsos': HANDBAG,
  accesorios: HANDBAG,
  artesanias: PALETTE,
  electronica: LAPTOP,
  'hogar-y-decoracion': HOUSE,
  hogar: HOUSE,
  deportes: BALL,
};

function categoryIconSvg(category) {
  const slug =
    category.iconSlug ||
    category.slug ||
    category.id ||
    category.name
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  return Object.hasOwn(CATEGORY_ICONS, slug) ? CATEGORY_ICONS[slug] : DEFAULT_ICON;
}

/**
 * View component for the Categories section.
 * Renders category cards in a responsive grid.
 */
export class CategoriesView {
  /**
   * @param {CategoriesViewModel} [viewModel]
   */
  constructor(viewModel = new CategoriesViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._unsubscribe = null;
    this._gridElement = null;
  }

  /**
   * Builds and returns the DOM element for the categories section.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const section = document.createElement('section');
    section.className = 'q-categories';
    section.setAttribute('aria-labelledby', 'q-categories-title');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    // Header container
    const header = document.createElement('div');
    header.className = 'q-categories__header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'q-categories__title-group';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-categories__eyebrow';
    eyebrow.textContent = this.viewModel.eyebrow;

    const title = document.createElement('h2');
    title.id = 'q-categories-title';
    title.className = 'q-categories__title';
    title.textContent = this.viewModel.title;

    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(title);

    if (this.viewModel.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'q-categories__subtitle';
      subtitle.textContent = this.viewModel.subtitle;
      titleGroup.appendChild(subtitle);
    }

    const seeAll = document.createElement('a');
    seeAll.className = 'q-categories__see-all';
    seeAll.href = this.viewModel.seeAllHref;
    seeAll.textContent = `${this.viewModel.seeAllLabel} →`;
    seeAll.addEventListener('click', (e) => {
      e.preventDefault();
    });

    header.appendChild(titleGroup);
    header.appendChild(seeAll);

    // Cards Grid
    const grid = document.createElement('ul');
    grid.className = 'q-categories__grid';
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
   * Renders the category cards into the given grid element.
   * @param {HTMLElement} grid
   * @private
   */
  _renderCards(grid) {
    grid.innerHTML = '';

    this.viewModel.categories.forEach((category) => {
      const item = document.createElement('li');
      item.className = 'q-categories__item';

      const card = document.createElement('a');
      card.className = `q-category-card q-category-card--${category.style?.color || 'pink'}`;
      card.href = category.href;

      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'q-category-card__icon';
      iconWrapper.setAttribute('aria-hidden', 'true');
      iconWrapper.innerHTML = categoryIconSvg(category);

      const name = document.createElement('h3');
      name.className = 'q-category-card__name';
      name.textContent = category.name;

      const count = document.createElement('p');
      count.className = 'q-category-card__count';
      count.textContent = `${category.productCount} productos`;

      card.appendChild(iconWrapper);
      card.appendChild(name);
      card.appendChild(count);

      card.addEventListener('click', (e) => {
        e.preventDefault();
      });

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
