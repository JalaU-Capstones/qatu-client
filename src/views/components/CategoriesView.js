import { CategoriesViewModel } from '../../viewmodels/components/CategoriesViewModel.js';

/**
 * Inline SVG icon factory for category cards.
 * Returns an SVG string ready for innerHTML.
 * @param {string} name
 * @returns {string}
 */
function categoryIconSvg(name) {
  const icons = {
    laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>`,
    coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8z"/><path d="M17 10h2a2 2 0 1 1 0 4h-2"/><line x1="5" y1="2" x2="5" y2="5"/><line x1="10" y1="2" x2="10" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/></svg>`,
    vase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l-1 5c2 2 3 4 3 7a6 6 0 0 1-6 6 6 6 0 0 1-6-6c0-3 1-5 3-7L8 3z"/></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>`,
    ball: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>`,
    headphones: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14a8 8 0 0 1 16 0"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></svg>`,
  };
  return icons[name] || icons.home;
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

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'q-category-card__icon';
      iconWrapper.setAttribute('aria-hidden', 'true');
      iconWrapper.innerHTML = categoryIconSvg(category.style?.icon);

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
