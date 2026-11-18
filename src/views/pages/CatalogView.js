import { SEARCH_MAX_LENGTH } from '../../models/validation/productSearchFilters.js';
import { authStore as realAuthStore } from '../../store/authStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';
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
   * @param {Object} [options.authStore] Injectable for testing; defaults to the real singleton.
   */
  constructor(
    viewModel = new CatalogViewModel(),
    { onAddToCart = () => Promise.resolve({ status: 'added' }), authStore = realAuthStore } = {}
  ) {
    this.viewModel = viewModel;
    this.onAddToCart = onAddToCart;
    this.authStore = authStore;
    this._section = null;
    this._grid = null;
    this._pagination = null;
    this._refs = {};
    this._renderedCategories = null;
    this._renderedFilters = null;
    this._unsubscribe = null;
    this._authUnsubscribe = null;
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

    const layout = document.createElement('div');
    layout.className = 'q-catalog__layout';
    layout.appendChild(this._createFiltersPanel());

    const results = document.createElement('div');
    results.className = 'q-catalog__results';

    const grid = document.createElement('ul');
    grid.className = 'q-catalog__grid';
    grid.id = 'q-catalog-grid';
    grid.setAttribute('role', 'list');
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

    this._authUnsubscribe = this.authStore.subscribe(() => {
      this._update(this.viewModel);
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
    const headerDiv = document.createElement('header');
    headerDiv.className = 'q-catalog__header';

    const backLink = document.createElement('a');
    backLink.className = 'q-catalog__back';
    backLink.href = '/';
    backLink.setAttribute('data-route', '');
    backLink.textContent = 'Volver al inicio →';

    const titleRow = document.createElement('div');
    titleRow.className = 'q-catalog__header-row';

    const heading = document.createElement('div');
    heading.className = 'q-catalog__heading';

    const eyebrowRow = document.createElement('div');
    eyebrowRow.className = 'q-catalog__eyebrow-row';

    const eyebrowDot = document.createElement('span');
    eyebrowDot.className = 'q-catalog__eyebrow-dot';
    eyebrowDot.setAttribute('aria-hidden', 'true');

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-catalog__eyebrow';
    eyebrow.setAttribute('aria-live', 'polite');
    this._refs.eyebrow = eyebrow;
    eyebrowRow.appendChild(eyebrowDot);
    eyebrowRow.appendChild(eyebrow);

    const title = document.createElement('h1');
    title.className = 'q-catalog__title';
    this._refs.title = title;

    const subtitle = document.createElement('p');
    subtitle.className = 'q-catalog__subtitle';
    subtitle.textContent = 'Explora todos nuestros productos disponibles';
    this._refs.subtitle = subtitle;

    heading.appendChild(eyebrowRow);
    heading.appendChild(title);
    heading.appendChild(subtitle);

    const chips = document.createElement('ul');
    chips.className = 'q-catalog__chips q-catalog__active-filters';
    chips.setAttribute('aria-label', 'Filtros aplicados');
    this._refs.chips = chips;
    heading.appendChild(chips);

    const sortLabel = document.createElement('label');
    sortLabel.className = 'q-catalog__sort';
    const srOnly = document.createElement('span');
    srOnly.className = 'q-sr-only';
    srOnly.textContent = 'Ordenar por';
    const sortSelect = document.createElement('select');
    sortSelect.setAttribute('aria-label', 'Ordenar por');
    ['Recientes', 'Precio: menor a mayor', 'Precio: mayor a menor', 'Mejor valorados'].forEach(
      (labelText) => {
        const option = document.createElement('option');
        option.textContent = labelText;
        sortSelect.appendChild(option);
      }
    );
    if (
      !Object.prototype.hasOwnProperty.call(this.viewModel, 'sort') &&
      typeof this.viewModel.sort !== 'string'
    ) {
      sortSelect.disabled = true;
      sortSelect.setAttribute('aria-disabled', 'true');
      sortSelect.title = 'Ordenamiento próximamente';
    }
    this._refs.sortSelect = sortSelect;
    sortLabel.appendChild(srOnly);
    sortLabel.appendChild(sortSelect);

    titleRow.appendChild(heading);
    titleRow.appendChild(sortLabel);

    headerDiv.appendChild(backLink);
    headerDiv.appendChild(titleRow);
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
    button.className = 'q-btn q-btn--primary q-catalog__search-button';
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

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'q-catalog__filters-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'q-catalog-filters-body');
    toggle.textContent = 'Filtros';
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('q-catalog__filters--open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    this._refs.filtersToggle = toggle;
    panel.appendChild(toggle);

    const heading = document.createElement('h2');
    heading.className = 'q-catalog__filters-title';
    heading.id = 'q-catalog-filters-title';
    heading.innerHTML = `${ICONS.filter}<span>Filtros</span>`;

    const form = document.createElement('form');
    form.className = 'q-catalog__filters-form';
    form.id = 'q-catalog-filters-body';
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
    fields.appendChild(this._createField('Precio mínimo', minPriceInput));

    const maxField = this._createField('Precio máximo', maxPriceInput);
    const maxHint = document.createElement('span');
    maxHint.className = 'q-catalog__filters-hint';
    maxHint.textContent = 'Bs 2.000';
    maxHint.hidden = false;
    maxField.appendChild(maxHint);
    maxPriceInput.addEventListener('input', () => {
      maxHint.hidden = Boolean(maxPriceInput.value);
    });
    fields.appendChild(maxField);

    const stockLabel = document.createElement('label');
    stockLabel.className = 'q-catalog__stock-label';
    const stockInput = document.createElement('input');
    stockInput.type = 'checkbox';
    stockInput.disabled = true;
    stockInput.setAttribute('aria-disabled', 'true');
    stockInput.title = 'Filtro de stock próximamente';
    stockLabel.appendChild(stockInput);
    stockLabel.appendChild(document.createTextNode(' Solo con stock'));
    fields.appendChild(stockLabel);

    const error = document.createElement('p');
    error.className = 'q-catalog__filters-error';
    error.id = 'q-catalog-filters-error';
    error.setAttribute('role', 'alert');
    this._refs.filterError = error;

    const actions = document.createElement('div');
    actions.className = 'q-catalog__filters-actions';

    const applyButton = document.createElement('button');
    applyButton.type = 'submit';
    applyButton.className = 'q-btn q-btn--primary q-btn--block q-catalog__filters-apply';
    applyButton.textContent = 'Aplicar filtros';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'q-btn q-btn--ghost q-btn--sm q-btn--block q-catalog__filters-clear';
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
      const user = this.authStore.getUser();
      vm.products.forEach((product) => {
        const isOwn = Boolean(
          user && user.id && product.seller_id && user.id === product.seller_id
        );
        const rating = Number(product.average_rating || 0);
        const cardView = new ProductCardView(
          {
            id: product.id,
            name: product.name,
            sellerLine: product.seller?.full_name || product.seller || '',
            priceLabel: formatPrice(product.price, product.currency || 'BOB'),
            ratingLabel: product.average_rating
              ? `${rating.toFixed(1)} (${product.ratings_count || 0})`
              : undefined,
            ratingAccessible: product.average_rating
              ? `Calificación ${rating.toFixed(1)} de 5, ${product.ratings_count || 0} reseñas`
              : undefined,
            starsFilled: Array.from(
              { length: 5 },
              (_, i) => Number(product.average_rating || 0) >= i + 0.5
            ),
            imageUrl: product.primary_image_path || null,
            isNew: false,
            stock: typeof product.stock === 'number' ? product.stock : null,
            state: product.state || 'published',
          },
          {
            variant: 'default',
            onAddToCart: () => this.onAddToCart(product, 1),
            detailHref: `/products/${product.slug || product.id}`,
            hideCartButton: isOwn,
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
    title.textContent = vm.filters.search
      ? `Resultados para «${vm.filters.search}»`
      : 'Todos los productos';
    subtitle.hidden = Boolean(vm.filters.search);
    const total = vm.meta?.total || 0;
    eyebrow.textContent =
      total === 1 ? '1 RESULTADO ENCONTRADO' : `${total} RESULTADOS ENCONTRADOS`;
    eyebrow.hidden = false;
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
    const chips = (vm.activeFilterChips || [])
      .filter((chip) => chip.key !== 'search')
      .map((chip) => ({ ...chip }));
    if (vm.filters?.category && !chips.some((chip) => chip.key === 'category')) {
      const category = (vm.categories || []).find((item) => item.slug === vm.filters.category);
      chips.push({
        key: 'category',
        label: category?.name || vm.filters.category,
      });
    }
    if (vm.filters?.minPrice !== null || vm.filters?.maxPrice !== null) {
      const min = vm.filters.minPrice;
      const max = vm.filters.maxPrice;
      const priceLabel =
        min !== null && max !== null
          ? `${formatPrice(min, 'BOB')} — ${formatPrice(max, 'BOB')}`
          : min !== null
            ? `Desde ${formatPrice(min, 'BOB')}`
            : `Hasta ${formatPrice(max, 'BOB')}`;
      const existingPrice = chips.find((chip) => chip.key === 'price');
      if (existingPrice) {
        existingPrice.label = priceLabel;
      } else {
        chips.push({ key: 'price', label: priceLabel });
      }
    }
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
      remove.innerHTML = '×';
      remove.setAttribute('aria-hidden', 'false');
      remove.addEventListener('click', () => this.viewModel.removeFilter(chip.key));

      item.appendChild(label);
      item.appendChild(remove);
      list.appendChild(item);
    });
  }

  /**
   * @param {CatalogViewModel} vm
   * @returns {HTMLElement}
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
    clearButton.className = 'q-btn q-btn--primary q-catalog__no-results-clear';
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
    prevBtn.className =
      'q-btn q-btn--neutral q-btn--sm q-catalog__pagination-btn q-catalog__pagination-btn--prev';
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
    nextBtn.className =
      'q-btn q-btn--neutral q-btn--sm q-catalog__pagination-btn q-catalog__pagination-btn--next';
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
    this._authUnsubscribe?.();
    this._authUnsubscribe = null;
    if (this._section && this._section.parentNode) {
      this._section.parentNode.removeChild(this._section);
      this._section = null;
    }
    this._grid = null;
    this._pagination = null;
    this._refs = {};
  }
}
