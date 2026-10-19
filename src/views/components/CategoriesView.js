import { CategoriesViewModel } from '../../viewmodels/components/CategoriesViewModel.js';

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

    // Header container
    const header = document.createElement('div');
    header.className = 'q-categories__header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'q-categories__title-group';

    const title = document.createElement('h2');
    title.id = 'q-categories-title';
    title.className = 'q-categories__title';
    title.textContent = this.viewModel.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'q-categories__subtitle';
    subtitle.textContent = this.viewModel.subtitle;

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);

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

    section.appendChild(header);
    section.appendChild(grid);

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
      card.className = 'q-category-card';
      card.href = category.href;

      const placeholder = document.createElement('div');
      placeholder.className = 'q-category-card__image-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '✕';

      const name = document.createElement('h3');
      name.className = 'q-category-card__name';
      name.textContent = category.name;

      const count = document.createElement('p');
      count.className = 'q-category-card__count';
      count.textContent = `${category.productCount} productos`;

      card.appendChild(placeholder);
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
