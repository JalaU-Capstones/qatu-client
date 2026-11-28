import { CategoriesViewModel } from '../../viewmodels/pages/categories.js';
import { CategoryIcon } from '../components/CategoryIcon.js';

export class CategoriesPageView {
  constructor({ viewModel = new CategoriesViewModel(), onNavigate = null } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.element = null;
    this._unsubscribe = null;
  }

  mount(container) {
    this.element = this.render();
    container.appendChild(this.element);
    this._unsubscribe = this.viewModel.subscribe(() => this._update());
    void this.viewModel.loadCategories();
    return this.element;
  }

  render() {
    const section = document.createElement('section');
    section.className = 'q-categories-page';

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const header = document.createElement('header');
    header.className = 'q-catalog__header';
    const heading = document.createElement('div');
    heading.className = 'q-catalog__heading';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-catalog__eyebrow';
    eyebrow.textContent = 'Encuentra tu próximo favorito';
    const title = document.createElement('h1');
    title.className = 'q-catalog__title';
    title.textContent = 'Todas las categorías';
    const subtitle = document.createElement('p');
    subtitle.className = 'q-catalog__subtitle';
    subtitle.textContent = 'Explora productos por categoría';
    heading.append(eyebrow, title, subtitle);
    header.appendChild(heading);

    const grid = document.createElement('ul');
    grid.className = 'q-categories-page__grid';
    grid.setAttribute('aria-live', 'polite');
    this._grid = grid;

    container.append(header, grid);
    section.appendChild(container);
    this.element = section;
    this._update();
    return section;
  }

  _update() {
    if (!this._grid) return;
    this._grid.replaceChildren();

    if (this.viewModel.isLoading) {
      for (let index = 0; index < 8; index += 1) {
        const card = document.createElement('li');
        card.className = 'q-categories-page__card q-categories-page__card--loading';
        card.setAttribute('aria-hidden', 'true');
        this._grid.appendChild(card);
      }
      return;
    }

    if (this.viewModel.errorMessage) {
      const item = document.createElement('li');
      item.className = 'q-categories-page__message';
      item.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = 'No se pudieron cargar las categorías.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'q-btn q-btn--primary';
      retry.textContent = 'Reintentar';
      retry.addEventListener('click', () => void this.viewModel.loadCategories());
      item.append(message, retry);
      this._grid.appendChild(item);
      return;
    }

    if (this.viewModel.categories.length === 0) {
      const item = document.createElement('li');
      item.className = 'q-categories-page__message';
      item.textContent = 'No hay categorías disponibles.';
      this._grid.appendChild(item);
      return;
    }

    this.viewModel.categories.forEach((category) => {
      const item = document.createElement('li');
      item.className = 'q-categories-page__item';
      const card = document.createElement('a');
      card.className = 'q-categories-page__card';
      card.href = `/products?category=${encodeURIComponent(category.slug || category.id)}`;
      card.dataset.route = '';

      const icon = new CategoryIcon({
        name: category.name,
        key: category.slug || category.id,
        size: 32,
      }).render();
      const name = document.createElement('h2');
      name.className = 'q-categories-page__name';
      name.textContent = category.name;

      const description = document.createElement('p');
      description.className = 'q-categories-page__description';
      description.textContent =
        (typeof category.description === 'string' && category.description.trim()) ||
        'Explora esta categoría';

      const count = document.createElement('p');
      count.className = 'q-categories-page__count';
      count.textContent = `${category.product_count} productos`;

      card.append(icon, name, description, count);

      item.appendChild(card);
      this._grid.appendChild(item);
    });
  }

  destroy() {
    this._unsubscribe?.();
    this.element?.remove();
    this.element = null;
  }
}
