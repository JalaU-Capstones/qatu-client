import { SEARCH_MAX_LENGTH } from '../../models/validation/productSearchFilters.js';
import { CatalogViewModel } from '../../viewmodels/pages/CatalogViewModel.js';
import { ProductCardView } from '../components/ProductCardView.js';

const ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
  filter:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
  arrowRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>',
};

/**
 * Catalog page content view. Mounts INSIDE the persistent <main class="q-main">.
 * Header, footer, and the <main> wrapper are owned by the app shell (main.js).
 * Renders the search bar, active filter chips, filter panel, and results grid (US-06).
 */
export class CatalogView {
  /**
   * @param {CatalogViewModel} [viewModel]
   * @param {Object} [options]
   * @param {Function} [options.onAddToCart]
   */
  constructor(
    viewModel = new CatalogViewModel(),
    { onAddToCart = () => Promise.resolve({ status: 'added' }) } = {}
  ) {
    this.viewModel = viewModel;
    this.onAddToCart = onAddToCart;
    this._section = null;
    this._grid = null;
    this._pagination = null;
    this._refs = {};
    this._renderedCategories = null;
    this._renderedFilters = null;
    this._unsubscribe = null;
  }

  /**
   * Mounts the catalog section into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    const section = document.createElement('section');
    section.className = 'q-catalog';
    section.setAttribute('aria-label', 'Catálogo de productos');

    const inner = document.createElement('div');
    inner.className = 'q-section-container';

    inner.appendChild(this._createHeader());
    inner.appendChild(this._createSearchForm());

    const chips = document.createElement('ul');
    chips.className = 'q-catalog__chips';
    chips.setAttribute('aria-label', 'Filtros aplicados');
    this._refs.chips = chips;
    inner.appendChild(chips);

    const layout = document.createElement('div');
    layout.className = 'q-catalog__layout';
    layout.appendChild(this._createFiltersPanel());

    const results = document.createElement('div');
    results.className = 'q-catalog__results';

    // Product grid container — must be <ul> because ProductCardView renders <li> cards
    const grid = document.createElement('ul');
    grid.className = 'q-catalog__grid';
    grid.id = 'q-catalog-grid';
    this._grid = grid;
    results.appendChild(grid);

    const pagination = document.createElement('div');
    pagination.className = 'q-catalog__pagination';
    this._pagination = pagination;
    results.appendChild(pagination);

    layout.appendChild(results);
    inner.appendChild(layout);
    section.appendChild(inner);
    this._section = section;
    container.appendChild(section);

    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    this._update(this.viewModel);

    this.viewModel.loadCategories();
    this.viewModel.loadProducts(1);
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _createHeader() {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'q-catalog__header';

    const heading = document.createElement('div');
    heading.className = 'q-catalog__heading';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-catalog__eyebrow';
    eyebrow.setAttribute('aria-live', 'polite');
    this._refs.eyebrow = eyebrow;

    const title = document.createElement('h1');
    title.className = 'q-catalog__title';
    this._refs.title = title;

    const subtitle = document.createElement('p');
    subtitle.className = 'q-catalog__subtitle';
    subtitle.textContent = 'Explora todos nuestros productos disponibles';
    this._refs.subtitle = subtitle;

    heading.appendChild(eyebrow);
    heading.appendChild(title);
    heading.appendChild(subtitle);

    const backLink = document.createElement('a');
    backLink.className = 'q-catalog__back';
    backLink.href = '/';
    backLink.setAttribute('data-route', '');
    backLink.innerHTML = `<span>Volver al inicio</span>${ICONS.arrowRight}`;

    headerDiv.appendChild(heading);
    headerDiv.appendChild(backLink);
    return headerDiv;
  }

  /**
   * @returns {HTMLFormElement}
   * @private
   */
  _createSearchForm() {
    const form = document.createElement('form');
    form.className = 'q-catalog__search';
    form.setAttribute('role', 'search');
    form.noValidate = true;

    const label = document.createElement('label');
    label.htmlFor = 'q-catalog-search-input';
    label.className = 'q-sr-only';
    label.textContent = 'Buscar productos';

    const field = document.createElement('div');
    field.className = 'q-catalog__search-field';

    const icon = document.createElement('span');
    icon.className = 'q-catalog__search-icon';
    icon.innerHTML = ICONS.search;

    const input = document.createElement('input');
    input.id = 'q-catalog-search-input';
    input.type = 'search';
    input.name = 'search';
    input.className = 'q-catalog__search-input';
    input.placeholder = 'Buscar en Q’atu';
    input.autocomplete = 'off';
    input.maxLength = SEARCH_MAX_LENGTH;
    this._refs.searchInput = input;

    field.appendChild(icon);
    field.appendChild(input);

    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'q-catalog__search-button';
    button.textContent = 'Buscar';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.viewModel.search(input.value);
    });

    form.appendChild(label);
    form.appendChild(field);
    form.appendChild(button);
    return form;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _createFiltersPanel() {
    const panel = document.createElement('aside');
    panel.className = 'q-catalog__filters';
    panel.setAttribute('aria-labelledby', 'q-catalog-filters-title');

    const heading = document.createElement('h2');
    heading.className = 'q-catalog__filters-title';
    heading.id = 'q-catalog-filters-title';
    heading.innerHTML = `${ICONS.filter}<span>Filtros</span>`;

    const form = document.createElement('form');
    form.className = 'q-catalog__filters-form';
    form.noValidate = true;

    const categorySelect = document.createElement('select');
    categorySelect.id = 'q-catalog-filter-category';
    categorySelect.name = 'category';
    categorySelect.className = 'q-catalog__field-control';
    this._refs.categorySelect = categorySelect;

    const minPriceInput = this._createPriceInput('q-catalog-filter-min-price', 'minPrice', '0');
    const maxPriceInput = this._createPriceInput('q-catalog-filter-max-price', 'maxPrice', '2000');
    this._refs.minPriceInput = minPriceInput;
    this._refs.maxPriceInput = maxPriceInput;

    const fields = document.createElement('div');
    fields.className = 'q-catalog__filters-fields';
    fields.appendChild(this._createField('Categoría', categorySelect));
    fields.appendChild(this._createField('Precio mínimo (USD)', minPriceInput));
    fields.appendChild(this._createField('Precio máximo (USD)', maxPriceInput));

    const error = document.createElement('p');
    error.className = 'q-catalog__filters-error';
    error.id = 'q-catalog-filters-error';
    error.setAttribute('role', 'alert');
    this._refs.filterError = error;

    const actions = document.createElement('div');
    actions.className = 'q-catalog__filters-actions';

    const applyButton = document.createElement('button');
    applyButton.type = 'submit';
    applyButton.className = 'q-catalog__filters-apply';
    applyButton.textContent = 'Aplicar filtros';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'q-catalog__filters-clear';
    clearButton.textContent = 'Limpiar filtros';
    clearButton.addEventListener('click', () => this.viewModel.clearFilters());
    this._refs.clearButton = clearButton;

    actions.appendChild(applyButton);
    actions.appendChild(clearButton);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.viewModel.applyFilters({
        search: this._refs.searchInput.value,
        category: categorySelect.value,
        minPrice: minPriceInput.value,
        maxPrice: maxPriceInput.value,
      });
    });

    form.appendChild(fields);
    form.appendChild(error);
    form.appendChild(actions);

    panel.appendChild(heading);
    panel.appendChild(form);
    return panel;
  }

  /**
   * @param {string} id
   * @param {string} name
   * @param {string} placeholder
   * @returns {HTMLInputElement}
   * @private
   */
  _createPriceInput(id, name, placeholder) {
    const input = document.createElement('input');
    input.id = id;
    input.name = name;
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.inputMode = 'decimal';
    input.placeholder = placeholder;
    input.className = 'q-catalog__field-control';
    input.setAttribute('aria-describedby', 'q-catalog-filters-error');
    return input;
  }

  /**
   * @param {string} labelText
   * @param {HTMLElement} control
   * @returns {HTMLElement}
   * @private
   */
  _createField(labelText, control) {
    const field = document.createElement('div');
    field.className = 'q-catalog__field';

    const label = document.createElement('label');
    label.className = 'q-catalog__field-label';
    label.htmlFor = control.id;
    label.textContent = labelText;

    field.appendChild(label);
    field.appendChild(control);
    return field;
  }

  /**
   * Updates the UI based on ViewModel state.
   * @param {CatalogViewModel} vm
   * @private
   */
  _update(vm) {
    if (!this._grid || !this._pagination) {
      return;
    }

    this._updateHeader(vm);
    this._updateCategoryOptions(vm);
    this._updateFilterInputs(vm);
    this._updateChips(vm);

    this._refs.filterError.textContent = vm.filterError;
    this._refs.filterError.hidden = !vm.filterError;
    this._refs.clearButton.hidden = !vm.hasActiveFilters;

    this._grid.innerHTML = '';

    if (vm.isLoading) {
      const loading = document.createElement('li');
      loading.className = 'q-catalog__message q-catalog__message--loading';
      loading.setAttribute('role', 'status');
      loading.textContent = 'Cargando productos...';
      this._grid.appendChild(loading);
    } else if (vm.errorMessage) {
      const error = document.createElement('li');
      error.className = 'q-catalog__message q-catalog__message--error';
      error.setAttribute('role', 'alert');
      error.textContent = vm.errorMessage;
      this._grid.appendChild(error);
    } else if (vm.isNoResults) {
      this._grid.appendChild(this._createNoResults(vm));
    } else if (!vm.products || vm.products.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'q-catalog__message q-catalog__message--empty';
      empty.textContent = 'No hay productos disponibles';
      this._grid.appendChild(empty);
    } else {
      vm.products.forEach((product) => {
        const cardView = new ProductCardView(
          {
            id: product.id,
            name: product.name,
            sellerLine: product.seller || '', // Catalog may not have seller — leave empty
            priceLabel: `${product.currency || 'USD'} ${Number(product.price || 0).toFixed(2)}`,
            ratingLabel: product.average_rating
              ? `${Number(product.average_rating).toFixed(1)} (${product.ratings_count || 0})`
              : 'Sin reseñas',
            ratingAccessible: product.average_rating
              ? `Calificación ${Number(product.average_rating).toFixed(1)} de 5, ${product.ratings_count || 0} reseñas`
              : 'Sin reseñas',
            starsFilled: Array.from(
              { length: 5 },
              (_, i) => Number(product.average_rating) >= i + 0.5
            ),
            imageUrl: product.primary_image_path || null,
            isNew: false,
            stock: typeof product.stock === 'number' ? product.stock : null,
            state: product.state || 'published',
          },
          {
            variant: 'default',
            onAddToCart: (id) => this.onAddToCart(id),
          }
        );
        this._grid.appendChild(cardView.render());
      });
    }

    this._updatePagination(vm);
  }

  /**
   * @param {CatalogViewModel} vm
   * @private
   */
  _updateHeader(vm) {
    const { eyebrow, title, subtitle } = this._refs;
    title.textContent = vm.title;
    subtitle.hidden = Boolean(vm.filters.search);

    const showCount = vm.hasActiveFilters && !vm.isLoading && !vm.errorMessage;
    eyebrow.textContent = showCount ? vm.resultsLabel : '';
    eyebrow.hidden = !showCount;
  }

  /**
   * Rebuilds the category options only when the category list changes.
   * @param {CatalogViewModel} vm
   * @private
   */
  _updateCategoryOptions(vm) {
    if (this._renderedCategories === vm.categories) return;
    this._renderedCategories = vm.categories;

    const select = this._refs.categorySelect;
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Todas las categorías';
    select.appendChild(allOption);

    vm.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.slug;
      option.textContent = category.name;
      select.appendChild(option);
    });

    if ([...select.options].some((option) => option.value === vm.filters.category)) {
      select.value = vm.filters.category;
    }
  }

  /**
   * Writes the applied filters into the form only when they change, so a
   * re-render never overwrites what the user is typing.
   * @param {CatalogViewModel} vm
   * @private
   */
  _updateFilterInputs(vm) {
    if (this._renderedFilters === vm.filters) return;
    this._renderedFilters = vm.filters;

    const { searchInput, categorySelect, minPriceInput, maxPriceInput } = this._refs;
    const { search, category, minPrice, maxPrice } = vm.filters;
    searchInput.value = search;
    categorySelect.value = category;
    minPriceInput.value = minPrice === null ? '' : String(minPrice);
    maxPriceInput.value = maxPrice === null ? '' : String(maxPrice);
  }

  /**
   * @param {CatalogViewModel} vm
   * @private
   */
  _updateChips(vm) {
    const list = this._refs.chips;
    list.innerHTML = '';
    const chips = vm.activeFilterChips;
    list.hidden = chips.length === 0;

    chips.forEach((chip) => {
      const item = document.createElement('li');
      item.className = 'q-catalog__chip';

      const label = document.createElement('span');
      label.textContent = chip.label;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'q-catalog__chip-remove';
      remove.setAttribute('aria-label', `Quitar filtro ${chip.label}`);
      remove.dataset.filterKey = chip.key;
      remove.innerHTML = ICONS.close;
      remove.addEventListener('click', () => this.viewModel.removeFilter(chip.key));

      item.appendChild(label);
      item.appendChild(remove);
      list.appendChild(item);
    });
  }

  /**
   * @param {CatalogViewModel} vm
   * @returns {HTMLLIElement}
   * @private
   */
  _createNoResults(vm) {
    const item = document.createElement('li');
    item.className = 'q-catalog__message q-catalog__message--no-results';
    item.setAttribute('role', 'status');

    const title = document.createElement('p');
    title.className = 'q-catalog__no-results-title';
    title.textContent = 'No se encontraron resultados';

    const hint = document.createElement('p');
    hint.className = 'q-catalog__no-results-hint';
    hint.textContent = 'Prueba con estas sugerencias para modificar tu búsqueda:';

    const suggestions = document.createElement('ul');
    suggestions.className = 'q-catalog__no-results-suggestions';
    vm.noResultsSuggestions.forEach((text) => {
      const suggestion = document.createElement('li');
      suggestion.textContent = text;
      suggestions.appendChild(suggestion);
    });

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'q-catalog__no-results-clear';
    clearButton.textContent = 'Ver todos los productos';
    clearButton.addEventListener('click', () => this.viewModel.clearFilters());

    item.appendChild(title);
    item.appendChild(hint);
    item.appendChild(suggestions);
    item.appendChild(clearButton);
    return item;
  }

  /**
   * Updates pagination controls based on ViewModel pagination metadata.
   * @param {CatalogViewModel} vm
   * @private
   */
  _updatePagination(vm) {
    if (!this._pagination) {
      return;
    }

    this._pagination.innerHTML = '';
    this._pagination.hidden = vm.isNoResults;

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'q-catalog__pagination-btn q-catalog__pagination-btn--prev';
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = vm.meta.page <= 1;
    prevBtn.addEventListener('click', () => {
      this.viewModel.prevPage();
    });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'q-catalog__pagination-info';
    pageInfo.textContent = `Página ${vm.meta.page} de ${vm.meta.total_pages}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'q-catalog__pagination-btn q-catalog__pagination-btn--next';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = vm.meta.page >= vm.meta.total_pages || vm.meta.total_pages === 0;
    nextBtn.addEventListener('click', () => {
      this.viewModel.nextPage();
    });

    this._pagination.appendChild(prevBtn);
    this._pagination.appendChild(pageInfo);
    this._pagination.appendChild(nextBtn);
  }

  /**
   * Destroys the catalog section and cleans up event listeners and subscriptions.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._section && this._section.parentNode) {
      this._section.parentNode.removeChild(this._section);
      this._section = null;
    }
    this._grid = null;
    this._pagination = null;
    this._refs = {};
  }
}
