import { StoresViewModel } from '../../viewmodels/pages/StoresViewModel.js';
import { renderStoreCard } from '../components/storeCard.js';

const SEARCH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>';

export class StoresView {
  constructor({ viewModel = null, onNavigate = null } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this._section = null;
    this._grid = null;
    this._pagination = null;
    this._searchInput = null;
    this._toolbarLabel = null;
    this._unsubscribe = null;
  }

  _ensureViewModel() {
    if (this.viewModel) return;
    const params = new URLSearchParams(window.location.search);
    this.viewModel = new StoresViewModel({
      onNavigate: this.onNavigate,
      initialQuery: params.get('q') || '',
      initialPage: Number(params.get('page')) || 1,
    });
  }

  render() {
    this._ensureViewModel();
    if (this._section) return this._section;

    const section = document.createElement('section');
    section.className = 'q-stores';
    section.setAttribute('aria-labelledby', 'q-stores-title');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const header = document.createElement('header');
    header.className = 'q-stores__header';
    const row = document.createElement('div');
    row.className = 'q-stores__header-row';
    const heading = document.createElement('div');
    heading.className = 'q-stores__heading';
    const eyebrowRow = document.createElement('div');
    eyebrowRow.className = 'q-stores__eyebrow-row';
    const dot = document.createElement('span');
    dot.className = 'q-stores__eyebrow-dot';
    dot.setAttribute('aria-hidden', 'true');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-stores__eyebrow';
    eyebrow.textContent = 'COMUNIDAD LOCAL';
    eyebrowRow.append(dot, eyebrow);

    const title = document.createElement('h1');
    title.id = 'q-stores-title';
    title.className = 'q-stores__title';
    title.textContent = "Tiendas de Q'atu";
    const subtitle = document.createElement('p');
    subtitle.className = 'q-stores__subtitle';
    subtitle.textContent = 'Descubre a los vendedores que dan vida al mercado';
    heading.append(eyebrowRow, title, subtitle);

    const back = document.createElement('a');
    back.className = 'q-stores__back';
    back.href = '/';
    back.dataset.route = '';
    back.textContent = 'Volver al inicio →';
    if (this.onNavigate) {
      back.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onNavigate('/');
      });
    }
    row.append(heading, back);
    header.appendChild(row);

    const form = document.createElement('form');
    form.className = 'q-stores__search';
    form.setAttribute('role', 'search');
    const label = document.createElement('label');
    label.className = 'q-sr-only';
    label.htmlFor = 'q-stores-search-input';
    label.textContent = 'Buscar tiendas';

    const field = document.createElement('div');
    field.className = 'q-stores__search-field';
    const icon = document.createElement('span');
    icon.className = 'q-stores__search-icon';
    icon.innerHTML = SEARCH_ICON;
    const input = document.createElement('input');
    input.id = 'q-stores-search-input';
    input.type = 'search';
    input.className = 'q-stores__search-input';
    input.placeholder = 'Buscar tiendas por nombre o usuario';
    input.autocomplete = 'off';
    this._searchInput = input;
    field.append(icon, input);

    const searchButton = document.createElement('button');
    searchButton.type = 'submit';
    searchButton.className = 'q-btn q-btn--primary q-stores__search-button';
    searchButton.textContent = 'Buscar';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.viewModel.search(input.value);
    });
    form.append(label, field, searchButton);

    const toolbar = document.createElement('div');
    toolbar.className = 'q-stores__toolbar';
    const toolbarLabel = document.createElement('p');
    toolbarLabel.className = 'q-stores__toolbar-label';
    toolbarLabel.setAttribute('aria-live', 'polite');
    this._toolbarLabel = toolbarLabel;
    toolbar.appendChild(toolbarLabel);

    const grid = document.createElement('ul');
    grid.className = 'q-stores__grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-live', 'polite');
    this._grid = grid;

    const pagination = document.createElement('div');
    pagination.className = 'q-stores__pagination';
    this._pagination = pagination;

    container.append(header, form, toolbar, grid, pagination);
    section.appendChild(container);
    this._section = section;
    this._unsubscribe = this.viewModel.subscribe((vm) => this._update(vm));
    this._update(this.viewModel);
    return section;
  }

  mount(container) {
    const section = this.render();
    container.appendChild(section);
    void this.viewModel.load();
    return section;
  }

  _update(vm) {
    if (!this._grid || !this._pagination || !this._toolbarLabel) return;
    this._searchInput.value = vm.query;
    this._toolbarLabel.textContent =
      vm.sellers.length === 1 ? '1 TIENDA ENCONTRADA' : `${vm.sellers.length} TIENDAS ENCONTRADAS`;
    this._grid.replaceChildren();
    this._pagination.replaceChildren();

    if (vm.isLoading && vm.sellers.length === 0) {
      for (let index = 0; index < 6; index += 1) {
        const item = document.createElement('li');
        item.className = 'q-store-card-item';
        const skeleton = document.createElement('article');
        skeleton.className = 'q-store-card q-store-card--skeleton';
        skeleton.setAttribute('aria-hidden', 'true');
        item.appendChild(skeleton);
        this._grid.appendChild(item);
      }
      return;
    }

    if (vm.errorMessage) {
      const item = document.createElement('li');
      item.className = 'q-stores__message q-stores__message--error';
      item.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = vm.errorMessage;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'q-btn q-btn--neutral';
      retry.textContent = 'Reintentar';
      retry.addEventListener('click', () => void vm.load());
      item.append(message, retry);
      this._grid.appendChild(item);
      return;
    }

    if (vm.sellers.length === 0) {
      const message = document.createElement('li');
      message.className = 'q-stores__message';
      message.textContent = 'No hay tiendas disponibles.';
      this._grid.appendChild(message);
      return;
    }

    vm.paginatedSellers.forEach((seller) => this._grid.appendChild(renderStoreCard(seller)));
    if (vm.totalPages > 1) this._renderPagination(vm);
  }

  _renderPagination(vm) {
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'q-btn q-btn--neutral q-btn--sm q-stores__pagination-btn';
    previous.textContent = 'Anterior';
    previous.disabled = vm.page <= 1;
    previous.addEventListener('click', () => vm.setPage(vm.page - 1));

    const info = document.createElement('span');
    info.className = 'q-stores__pagination-info';
    info.textContent = `Página ${vm.page} de ${vm.totalPages}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'q-btn q-btn--neutral q-btn--sm q-stores__pagination-btn';
    next.textContent = 'Siguiente';
    next.disabled = vm.page >= vm.totalPages;
    next.addEventListener('click', () => vm.setPage(vm.page + 1));

    this._pagination.append(previous, info, next);
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._section?.remove();
    this._section = null;
    this._grid = null;
    this._pagination = null;
  }
}
