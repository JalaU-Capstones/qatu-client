import { CatalogView } from './CatalogView.js';

describe('CatalogView', () => {
  let container;
  let mockViewModel;
  let listeners;

  const createMockViewModel = (initialState = {}) => {
    listeners = new Set();
    return {
      products: initialState.products || [],
      meta: initialState.meta || { page: 1, per_page: 20, total: 0, total_pages: 0 },
      isLoading: initialState.isLoading || false,
      errorMessage: initialState.errorMessage || '',
      filters: { search: '', category: '', minPrice: null, maxPrice: null },
      filterError: '',
      categories: [],
      noResultsSuggestions: ['Revisa la ortografía.', 'Quita algunos filtros.'],
      hasActiveFilters: false,
      isNoResults: false,
      activeFilterChips: [],
      title: 'Catálogo',
      resultsLabel: '0 resultados encontrados',
      loadProducts: jasmine.createSpy('loadProducts'),
      loadCategories: jasmine.createSpy('loadCategories'),
      search: jasmine.createSpy('search'),
      applyFilters: jasmine.createSpy('applyFilters'),
      removeFilter: jasmine.createSpy('removeFilter'),
      clearFilters: jasmine.createSpy('clearFilters'),
      nextPage: jasmine.createSpy('nextPage'),
      prevPage: jasmine.createSpy('prevPage'),
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      notify() {
        listeners.forEach((fn) => fn(this));
      },
    };
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockViewModel = createMockViewModel();
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should mount only a catalog section (no header, footer, or nested main) into the container', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    // Content-only: no shell elements
    expect(container.querySelector('header, .q-header')).toBeNull();
    expect(container.querySelector('footer, .q-footer')).toBeNull();
    expect(container.querySelector('main')).toBeNull();

    // Catalog content is present
    expect(container.querySelector('section.q-catalog')).not.toBeNull();

    const title = container.querySelector('.q-catalog__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Catálogo');

    const subtitle = container.querySelector('.q-catalog__subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toContain('productos disponibles');

    expect(container.querySelector('#q-catalog-grid')).not.toBeNull();
    expect(container.querySelector('.q-catalog__pagination')).not.toBeNull();

    expect(mockViewModel.loadProducts).toHaveBeenCalledWith(1);
    expect(mockViewModel.loadCategories).toHaveBeenCalled();
    expect(container.querySelector('.q-catalog__search')).not.toBeNull();
    expect(container.querySelector('.q-catalog__filters')).not.toBeNull();
    view.destroy();
  });

  it('should not mutate container.className', () => {
    container.className = 'original-class';
    const view = new CatalogView(mockViewModel);
    view.mount(container);
    expect(container.className).toBe('original-class');
    view.destroy();
  });

  it('should render loading state when isLoading is true', () => {
    mockViewModel.isLoading = true;
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const grid = container.querySelector('#q-catalog-grid');
    const loadingEl = grid.querySelector('.q-catalog__message--loading');
    expect(loadingEl).not.toBeNull();
    expect(loadingEl.textContent).toContain('Cargando productos...');
    expect(grid.querySelectorAll('.q-product-card').length).toBe(0);

    view.destroy();
  });

  it('should render error message when errorMessage is present', () => {
    mockViewModel.errorMessage = 'Error al conectar con el servidor';
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const grid = container.querySelector('#q-catalog-grid');
    const errorEl = grid.querySelector('.q-catalog__message--error');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toBe('Error al conectar con el servidor');
    expect(errorEl.getAttribute('role')).toBe('alert');

    view.destroy();
  });

  it('should render empty state message when products array is empty and not loading', () => {
    mockViewModel.products = [];
    mockViewModel.isLoading = false;
    mockViewModel.errorMessage = '';
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const grid = container.querySelector('#q-catalog-grid');
    const emptyEl = grid.querySelector('.q-catalog__message--empty');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl.textContent).toBe('No hay productos disponibles');
    expect(grid.querySelectorAll('.q-product-card').length).toBe(0);

    view.destroy();
  });

  it('should render correct number of ProductCardView elements when products are loaded', () => {
    mockViewModel.products = [
      { id: '1', name: 'Aguayo', price: 40, currency: 'USD' },
      { id: '2', name: 'Café', price: 14, currency: 'USD' },
      { id: '3', name: 'Chocolate', price: 6, currency: 'USD' },
    ];
    mockViewModel.meta = { page: 1, per_page: 20, total: 3, total_pages: 1 };

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const cards = container.querySelectorAll('#q-catalog-grid .q-product-card');
    expect(cards.length).toBe(3);

    const titles = Array.from(cards).map(
      (card) => card.querySelector('.q-product-card-title').textContent
    );
    expect(titles).toEqual(['Aguayo', 'Café', 'Chocolate']);

    const buttons = container.querySelectorAll(
      '#q-catalog-grid .q-product-card button.q-product-card-action'
    );
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Añadir');

    view.destroy();
  });

  it('should update the product grid reactively when ViewModel changes', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelectorAll('#q-catalog-grid .q-product-card').length).toBe(0);

    mockViewModel.products = [
      { id: 'p1', name: 'Producto A', price: 25, currency: 'USD' },
      { id: 'p2', name: 'Producto B', price: 50, currency: 'USD' },
    ];
    mockViewModel.notify();

    expect(container.querySelectorAll('#q-catalog-grid .q-product-card').length).toBe(2);

    view.destroy();
  });

  describe('pagination controls', () => {
    it('should display page info and disable "Anterior" on first page', () => {
      mockViewModel.meta = { page: 1, per_page: 20, total: 40, total_pages: 2 };
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const pageInfo = container.querySelector('.q-catalog__pagination-info');
      expect(pageInfo.textContent).toBe('Página 1 de 2');

      const prevBtn = container.querySelector('.q-catalog__pagination-btn--prev');
      const nextBtn = container.querySelector('.q-catalog__pagination-btn--next');

      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(false);

      nextBtn.click();
      expect(mockViewModel.nextPage).toHaveBeenCalled();

      view.destroy();
    });

    it('should enable "Anterior" and disable "Siguiente" on last page', () => {
      mockViewModel.meta = { page: 3, per_page: 20, total: 60, total_pages: 3 };
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const pageInfo = container.querySelector('.q-catalog__pagination-info');
      expect(pageInfo.textContent).toBe('Página 3 de 3');

      const prevBtn = container.querySelector('.q-catalog__pagination-btn--prev');
      const nextBtn = container.querySelector('.q-catalog__pagination-btn--next');

      expect(prevBtn.disabled).toBe(false);
      expect(nextBtn.disabled).toBe(true);

      prevBtn.click();
      expect(mockViewModel.prevPage).toHaveBeenCalled();

      view.destroy();
    });

    it('should disable both buttons when total_pages is 0 or 1', () => {
      mockViewModel.meta = { page: 1, per_page: 20, total: 0, total_pages: 0 };
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const prevBtn = container.querySelector('.q-catalog__pagination-btn--prev');
      const nextBtn = container.querySelector('.q-catalog__pagination-btn--next');

      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(true);

      view.destroy();
    });
  });

  it('should remove the catalog section from DOM and clean up subscriptions on destroy', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelector('section.q-catalog')).not.toBeNull();
    expect(listeners.size).toBe(1);

    view.destroy();

    expect(container.querySelector('section.q-catalog')).toBeNull();
    expect(listeners.size).toBe(0);
  });

  it('cards receive stock and state from the API product', () => {
    mockViewModel.products = [
      { id: 'p1', name: 'Aguayo', price: 40, currency: 'USD', stock: 0, state: 'published' },
      { id: 'p2', name: 'Café', price: 14, currency: 'USD', stock: 5, state: 'draft' },
    ];
    mockViewModel.meta = { page: 1, per_page: 20, total: 2, total_pages: 1 };

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const buttons = container.querySelectorAll(
      '#q-catalog-grid .q-product-card button.q-product-card-action'
    );
    expect(buttons[0].textContent).toBe('Sin stock');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].textContent).toBe('No disponible');
    expect(buttons[1].disabled).toBe(true);

    view.destroy();
  });

  it('constructor accepts onAddToCart and forwards it to each ProductCardView', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    mockViewModel.products = [{ id: 'p-cart-1', name: 'Aguayo', price: 40, currency: 'USD' }];
    mockViewModel.meta = { page: 1, per_page: 20, total: 1, total_pages: 1 };

    const view = new CatalogView(mockViewModel, { onAddToCart });
    view.mount(container);

    const btn = container.querySelector(
      '#q-catalog-grid .q-product-card button.q-product-card-action'
    );
    btn.click();

    expect(onAddToCart).toHaveBeenCalledWith('p-cart-1');
    view.destroy();
  });

  describe('search and filters (US-06)', () => {
    it('should submit the search form with the current input value', () => {
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const input = container.querySelector('#q-catalog-search-input');
      const form = container.querySelector('.q-catalog__search');
      input.value = 'phone';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockViewModel.search).toHaveBeenCalledWith('phone');
      view.destroy();
    });

    it('should apply category and price filters from the panel', () => {
      mockViewModel.categories = [{ id: 'c1', name: 'Electronics', slug: 'electronics' }];
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const category = container.querySelector('#q-catalog-filter-category');
      const minPrice = container.querySelector('#q-catalog-filter-min-price');
      const maxPrice = container.querySelector('#q-catalog-filter-max-price');
      category.value = 'electronics';
      minPrice.value = '100';
      maxPrice.value = '500';

      container
        .querySelector('.q-catalog__filters-form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockViewModel.applyFilters).toHaveBeenCalledWith({
        search: '',
        category: 'electronics',
        minPrice: '100',
        maxPrice: '500',
      });
      view.destroy();
    });

    it('should show a filter validation error', () => {
      mockViewModel.filterError = 'El precio máximo debe ser mayor o igual al precio mínimo.';
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const error = container.querySelector('.q-catalog__filters-error');
      expect(error.hidden).toBe(false);
      expect(error.textContent).toContain('precio máximo');
      view.destroy();
    });

    it('should render removable chips for active filters', () => {
      mockViewModel.hasActiveFilters = true;
      mockViewModel.activeFilterChips = [
        { key: 'search', label: '«phone»' },
        { key: 'category', label: 'Electronics' },
      ];
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const chips = container.querySelectorAll('.q-catalog__chip');
      expect(chips.length).toBe(2);

      chips[0].querySelector('.q-catalog__chip-remove').click();
      expect(mockViewModel.removeFilter).toHaveBeenCalledWith('search');
      view.destroy();
    });

    it('should render no-results message, suggestions, and a clear action', () => {
      mockViewModel.hasActiveFilters = true;
      mockViewModel.isNoResults = true;
      mockViewModel.title = 'Resultados para «zzzzzz»';
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const empty = container.querySelector('.q-catalog__message--no-results');
      expect(empty).not.toBeNull();
      expect(empty.textContent).toContain('No se encontraron resultados');
      expect(container.querySelectorAll('.q-catalog__no-results-suggestions li').length).toBe(2);

      container.querySelector('.q-catalog__no-results-clear').click();
      expect(mockViewModel.clearFilters).toHaveBeenCalled();
      view.destroy();
    });

    it('should update the heading when a search is applied', () => {
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      mockViewModel.filters = { ...mockViewModel.filters, search: 'phone' };
      mockViewModel.hasActiveFilters = true;
      mockViewModel.title = 'Resultados para «phone»';
      mockViewModel.resultsLabel = '3 resultados encontrados';
      mockViewModel.notify();

      expect(container.querySelector('.q-catalog__title').textContent).toBe(
        'Resultados para «phone»'
      );
      expect(container.querySelector('.q-catalog__eyebrow').textContent).toBe(
        '3 resultados encontrados'
      );
      view.destroy();
    });
  });
});
