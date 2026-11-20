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
    expect(container.querySelector('.q-header')).toBeNull();
    expect(container.querySelector('footer, .q-footer')).toBeNull();
    expect(container.querySelector('main')).toBeNull();

    // Catalog content is present
    expect(container.querySelector('section.q-catalog')).not.toBeNull();

    const title = container.querySelector('.q-catalog__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Todos los productos');

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

  it('should render a card for every product when products are loaded', () => {
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

    const titles = Array.from(cards).map((card) => card.querySelector('h3').textContent);
    expect(titles).toEqual(['Aguayo', 'Café', 'Chocolate']);

    const buttons = container.querySelectorAll('#q-catalog-grid button[aria-label^="Añadir"]');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Añadir');

    view.destroy();
  });

  it('uses the primary relative image path before gallery images in Catalog cards', () => {
    mockViewModel.products = [
      {
        id: 'primary-image',
        name: 'Primary image',
        primary_image_path: 'product-images/primary.jpg',
        images: [{ url: 'https://cdn.example.test/gallery.jpg' }],
      },
    ];
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const image = container.querySelector('.q-product-card-photo');
    expect(image.src).toContain('/product-images/primary.jpg');
    expect(image.src).not.toContain('gallery.jpg');

    view.destroy();
  });

  it('falls back to gallery image paths in Catalog cards when primary image is empty', () => {
    mockViewModel.products = [
      {
        id: 'gallery-image',
        name: 'Gallery image',
        primary_image_path: '',
        images: [{ url: ' ', image_path: 'product-images/gallery.jpg' }],
      },
    ];
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const image = container.querySelector('.q-product-card-photo');
    expect(image.src).toContain('/product-images/gallery.jpg');

    view.destroy();
  });

  it('catalog cards render as ProductCardView instances', () => {
    mockViewModel.products = [
      { id: '1', name: 'Aguayo', price: 40, currency: 'BOB' },
      { id: '2', name: 'Café', price: 14, currency: 'BOB' },
    ];

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelectorAll('.q-product-card').length).toBe(2);
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

    const buttons = container.querySelectorAll('#q-catalog-grid button.q-product-card-action');
    expect(container.textContent).toContain('Sin stock');
    expect(buttons[0].textContent).toBe('Sin stock');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].textContent).toBe('No disponible');
    expect(buttons[1].disabled).toBe(true);

    view.destroy();
  });

  it('forwards add-to-cart to the configured callback', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    mockViewModel.products = [{ id: 'p-cart-1', name: 'Aguayo', price: 40, currency: 'USD' }];
    mockViewModel.meta = { page: 1, per_page: 20, total: 1, total_pages: 1 };

    const view = new CatalogView(mockViewModel, { onAddToCart });
    view.mount(container);

    const btn = container.querySelector('#q-catalog-grid button[aria-label^="Añadir"]');
    btn.click();

    expect(onAddToCart).toHaveBeenCalledWith(mockViewModel.products[0], 1);
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
      mockViewModel.activeFilterChips = [{ key: 'category', label: 'Electronics' }];
      const view = new CatalogView(mockViewModel);
      view.mount(container);

      const chips = container.querySelectorAll('.q-catalog__chip');
      expect(chips.length).toBe(1);

      chips[0].querySelector('.q-catalog__chip-remove').click();
      expect(mockViewModel.removeFilter).toHaveBeenCalledWith('category');
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
      mockViewModel.meta = { page: 1, per_page: 20, total: 3, total_pages: 1 };
      mockViewModel.notify();

      expect(container.querySelector('.q-catalog__title').textContent).toBe(
        'Resultados para «phone»'
      );
      expect(container.querySelector('.q-catalog__eyebrow').textContent).toBe(
        '3 RESULTADOS ENCONTRADOS'
      );
      view.destroy();
    });
  });

  it('renders the eyebrow count and title for a search query', () => {
    mockViewModel.filters = { ...mockViewModel.filters, search: 'chompa' };
    mockViewModel.meta = { page: 1, per_page: 20, total: 48, total_pages: 3 };

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelector('.q-catalog__eyebrow').textContent).toBe(
      '48 RESULTADOS ENCONTRADOS'
    );
    expect(container.querySelector('.q-catalog__title').textContent).toBe(
      'Resultados para «chompa»'
    );
    view.destroy();
  });

  it('keeps the return link in the title row and places sorting above the product grid', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const headerRow = container.querySelector('.q-catalog__header-row');
    const toolbar = container.querySelector('.q-catalog__toolbar');
    expect(headerRow.contains(container.querySelector('.q-catalog__back'))).toBe(true);
    expect(headerRow.querySelector('.q-catalog__sort')).toBeNull();
    expect(toolbar.querySelector('.q-catalog__sort')).not.toBeNull();
    expect(toolbar.nextElementSibling).toBe(container.querySelector('.q-catalog__grid'));
    expect(container.querySelector('.q-catalog__chips').parentElement).toBe(
      container.querySelector('.q-catalog__header')
    );

    view.destroy();
  });

  it('provides filter-toggle icon, centered price placeholders, and no redundant max-price hint', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const toggle = container.querySelector('.q-catalog__filters-toggle');
    expect(toggle.querySelector('.q-catalog__filters-toggle-icon svg')).not.toBeNull();
    expect(toggle.querySelector('.q-catalog__filters-chevron svg')).not.toBeNull();
    expect(container.querySelector('#q-catalog-filter-min-price').placeholder).toBe('Bs 0');
    expect(container.querySelector('#q-catalog-filter-max-price').placeholder).toBe('Bs 2.000');
    expect(container.querySelector('.q-catalog__filters-hint')).toBeNull();
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.parentElement.classList.contains('q-catalog__filters--open')).toBe(true);

    view.destroy();
  });

  it('renders catalog card badge and favorite action when the product has matching metadata', () => {
    mockViewModel.products = [
      {
        id: 'p-new',
        name: 'Producto nuevo',
        price: 20,
        currency: 'BOB',
        is_new: true,
        stock: 5,
      },
    ];
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const card = container.querySelector('.q-product-card');
    expect(card.querySelector('.q-product-card-new-badge').textContent).toBe('Nuevo');
    const favorite = card.querySelector('.q-product-card-heart-btn');
    expect(favorite).not.toBeNull();
    favorite.click();
    expect(favorite.getAttribute('aria-pressed')).toBe('true');

    view.destroy();
  });

  it('uses the product category as subtitle when no seller name is available and omits empty ratings', () => {
    mockViewModel.categories = [{ id: 'cat-textiles', name: 'Textiles', slug: 'textiles' }];
    mockViewModel.products = [
      {
        id: 'p-textile',
        name: 'Manta andina',
        price: 20,
        category_id: 'cat-textiles',
      },
    ];

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const card = container.querySelector('.q-product-card');
    expect(card.querySelector('.q-product-card-seller').textContent).toBe('Textiles');
    expect(card.querySelector('.q-product-card-rating')).toBeNull();

    view.destroy();
  });

  it("renders 'Todos los productos' when no search query", () => {
    mockViewModel.filters = { search: '', category: '', minPrice: null, maxPrice: null };

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelector('.q-catalog__title').textContent).toBe('Todos los productos');
    view.destroy();
  });

  it('renders active-filter chips and removes one on click', () => {
    mockViewModel.filters = {
      search: '',
      category: 'textiles',
      minPrice: 200,
      maxPrice: 700,
    };
    mockViewModel.hasActiveFilters = true;
    mockViewModel.categories = [{ id: 'c1', name: 'Textiles', slug: 'textiles' }];
    mockViewModel.activeFilterChips = [
      { key: 'category', label: 'Textiles' },
      { key: 'price', label: 'USD 200.00 — USD 700.00' },
    ];

    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const chips = container.querySelectorAll('.q-catalog__chip');
    expect(chips.length).toBe(2);
    chips[0].querySelector('.q-catalog__chip-remove').click();
    expect(mockViewModel.removeFilter).toHaveBeenCalledWith('category');
    view.destroy();
  });

  it('renders the sort select disabled when sort is not supported', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const sort = container.querySelector('.q-catalog__sort select');
    expect(sort.disabled).toBe(true);
    expect(sort.getAttribute('aria-disabled')).toBe('true');
    expect(sort.title).toBe('Ordenamiento próximamente');
    view.destroy();
  });

  it('renders the back link to / and uses the catalog grid class', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    const back = container.querySelector('.q-catalog__back');
    expect(back.getAttribute('href')).toBe('/');
    expect(container.querySelector('#q-catalog-grid').classList.contains('q-catalog__grid')).toBe(
      true
    );
    view.destroy();
  });

  it('filters panel still calls the same apply method as before refactor', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    container
      .querySelector('.q-catalog__filters-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(mockViewModel.applyFilters).toHaveBeenCalled();
    view.destroy();
  });

  // ─── authStore / own product (C5) ────────────────────────────────────────

  function makeAuthStore(user = null) {
    const authListeners = new Set();
    return {
      getUser: () => user,
      subscribe: jasmine.createSpy('subscribe').and.callFake((fn) => {
        authListeners.add(fn);
        return () => authListeners.delete(fn);
      }),
      _fire() {
        authListeners.forEach((fn) => fn());
      },
    };
  }

  it('C5-1: guest (getUser → null) → card shows "Añadir" button regardless of seller_id', () => {
    const authStore = makeAuthStore(null);
    mockViewModel.products = [
      { id: 'p1', name: 'Prod', price: 10, currency: 'USD', seller_id: 'seller-1' },
    ];
    const view = new CatalogView(mockViewModel, { authStore });
    view.mount(container);

    expect(container.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();
    view.destroy();
  });

  it('C5-2: logged-in seller viewing own product → no "Añadir" button', () => {
    const authStore = makeAuthStore({ id: 'seller-1', username: 'tester' });
    mockViewModel.products = [
      { id: 'p1', name: 'Mi Prod', price: 10, currency: 'USD', seller_id: 'seller-1' },
    ];
    const view = new CatalogView(mockViewModel, { authStore });
    view.mount(container);

    expect(container.querySelector('button[aria-label^="Añadir"]')).toBeNull();
    view.destroy();
  });

  it('C5-3: logged-in seller viewing another seller\'s product → "Añadir" button present', () => {
    const authStore = makeAuthStore({ id: 'seller-1', username: 'tester' });
    mockViewModel.products = [
      { id: 'p2', name: 'Otra Prod', price: 20, currency: 'USD', seller_id: 'seller-2' },
    ];
    const view = new CatalogView(mockViewModel, { authStore });
    view.mount(container);

    expect(container.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();
    view.destroy();
  });

  it('C5-4: authStore change fires re-render (login as own seller hides button)', () => {
    let currentUser = null;
    const authListeners = new Set();
    const authStore = {
      getUser: () => currentUser,
      subscribe: (fn) => {
        authListeners.add(fn);
        return () => authListeners.delete(fn);
      },
    };
    mockViewModel.products = [
      { id: 'p1', name: 'Prod', price: 10, currency: 'USD', seller_id: 'seller-1' },
    ];
    const view = new CatalogView(mockViewModel, { authStore });
    view.mount(container);

    // Initially guest → button shows
    expect(container.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();

    // Login as the product's seller
    currentUser = { id: 'seller-1', username: 'tester' };
    authListeners.forEach((fn) => fn());

    // Button should be gone
    expect(container.querySelector('button[aria-label^="Añadir"]')).toBeNull();
    view.destroy();
  });

  it('C5-5: destroy() unsubscribes from authStore', () => {
    const authStore = makeAuthStore(null);
    const view = new CatalogView(mockViewModel, { authStore });
    view.mount(container);

    expect(authStore.subscribe).toHaveBeenCalled();
    const unsubSpy = jasmine.createSpy('unsub');
    // Replace stored unsub with spy
    view._authUnsubscribe = unsubSpy;
    view.destroy();

    expect(unsubSpy).toHaveBeenCalled();
  });
});
