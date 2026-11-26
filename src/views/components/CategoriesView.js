import { authStore } from '../../store/authStore.js';
import { CategoriesViewModel } from '../../viewmodels/components/CategoriesViewModel.js';
import { getCategoriesIndexPath } from '../utils/categoriesIndexPath.js';
import { CategoryIcon } from './CategoryIcon.js';

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
    this._authUnsubscribe = null;
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
    seeAll.href = getCategoriesIndexPath(this._getRole());
    seeAll.dataset.route = '';
    seeAll.textContent = `${this.viewModel.seeAllLabel} →`;
    this._seeAllElement = seeAll;

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
    this._authUnsubscribe = authStore.subscribe(() => {
      if (this._seeAllElement) {
        this._seeAllElement.href = getCategoriesIndexPath(this._getRole());
      }
    });

    return this.element;
  }

  _getRole() {
    return authStore.isAdmin() ? 'admin' : 'user';
  }

  /**
   * Renders the category cards into the given grid element.
   * @param {HTMLElement} grid
   * @private
   */
  _renderCards(grid) {
    grid.innerHTML = '';

    if (this.viewModel.isLoading) {
      for (let index = 0; index < 6; index += 1) {
        const item = document.createElement('li');
        item.className = 'q-categories__item';
        item.innerHTML =
          '<article class="q-category-card" aria-hidden="true"><span class="q-category-card__icon"></span><h3 class="q-category-card__name">&nbsp;</h3></article>';
        grid.appendChild(item);
      }
      return;
    }

    this.viewModel.categories.forEach((category) => {
      const item = document.createElement('li');
      item.className = 'q-categories__item';

      const card = document.createElement('a');
      card.className = `q-category-card q-category-card--${category.style?.color || 'pink'}`;
      card.href = `/products?category=${encodeURIComponent(category.slug || category.id)}`;
      card.dataset.route = '';

      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'q-category-card__icon';
      iconWrapper.setAttribute('aria-hidden', 'true');
      iconWrapper.appendChild(
        new CategoryIcon({
          name: category.name,
          key: category.iconSlug || category.slug || category.id,
          size: 22,
        }).render()
      );

      const name = document.createElement('h3');
      name.className = 'q-category-card__name';
      name.textContent = category.name;

      card.appendChild(iconWrapper);
      card.appendChild(name);

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
    void this.viewModel.loadCategories();
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
    if (typeof this._authUnsubscribe === 'function') {
      this._authUnsubscribe();
      this._authUnsubscribe = null;
    }
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
