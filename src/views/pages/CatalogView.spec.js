import { SEARCH_MAX_LENGTH } from '../../models/validation/productSearchFilters.js';
import { authStore as realAuthStore } from '../../store/authStore.js';
import { CatalogViewModel } from '../../viewmodels/pages/CatalogViewModel.js';
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('CatalogView (recovered 1)', () => {
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

    describe('pagination controls (recovered 2)', () => {
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
    });

    it("renders 'Todos los productos' when no search query", () => {
      mockViewModel.filters = { search: '', category: '', minPrice: null, maxPrice: null };

      const view = new CatalogView(mockViewModel);
      view.mount(container);

      expect(container.querySelector('.q-catalog__title').textContent).toBe('Todos los productos');
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
  });

  (() => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    const createMeta = (overrides = {}) => ({
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 0,
      ...overrides,
    });

    const createProduct = (overrides = {}) => ({
      id: 'p1',
      name: 'Producto',
      price: 10,
      currency: 'USD',
      stock: 5,
      state: 'published',
      ...overrides,
    });

    const createMockViewModel = (overrides = {}) => {
      const listeners = new Set();
      const vm = {
        products: [],
        meta: createMeta(),
        isLoading: false,
        errorMessage: '',
        filters: { search: '', category: '', minPrice: null, maxPrice: null },
        filterError: '',
        categories: [],
        noResultsSuggestions: ['Revisa la ortografía.', 'Quita algunos filtros.'],
        hasActiveFilters: false,
        isNoResults: false,
        activeFilterChips: [],
        loadProducts: jasmine.createSpy('loadProducts'),
        loadCategories: jasmine.createSpy('loadCategories'),
        search: jasmine.createSpy('search'),
        applyFilters: jasmine.createSpy('applyFilters'),
        removeFilter: jasmine.createSpy('removeFilter'),
        clearFilters: jasmine.createSpy('clearFilters'),
        nextPage: jasmine.createSpy('nextPage'),
        prevPage: jasmine.createSpy('prevPage'),
        subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
          listeners.add(listener);
          return jasmine.createSpy('unsubscribe').and.callFake(() => listeners.delete(listener));
        }),
        notify() {
          listeners.forEach((listener) => listener(vm));
        },
        _listeners: listeners,
        ...overrides,
      };
      return vm;
    };

    const createAuthStore = ({ user = null } = {}) => {
      const listeners = new Set();
      return {
        getUser: jasmine.createSpy('getUser').and.returnValue(user),
        subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
          listeners.add(listener);
          return jasmine
            .createSpy('authUnsubscribe')
            .and.callFake(() => listeners.delete(listener));
        }),
        notify() {
          listeners.forEach((listener) => listener());
        },
        _listeners: listeners,
      };
    };

    describe('CatalogView additional branches (recovered 3)', () => {
      let container;
      let viewModel;
      let authStore;
      let view = null;

      const mount = ({ vm = viewModel, auth = authStore, options = {} } = {}) => {
        view = new CatalogView(vm, { authStore: auth, ...options });
        view.mount(container);
        return { vm, auth };
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = createMockViewModel();
        authStore = createAuthStore();
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
      });

      it('uses the real view model, auth store and resolving default add-to-cart callback', async () => {
        view = new CatalogView();
        expect(view.viewModel instanceof CatalogViewModel).toBe(true);
        expect(view.authStore).toBe(realAuthStore);
        expect(typeof view.onAddToCart).toBe('function');
        const result = await view.onAddToCart(createProduct(), 1);
        expect(result).toEqual({ status: 'added' });
      });

      it('gives loading priority over an error and loaded products', () => {
        viewModel = createMockViewModel({
          isLoading: true,
          errorMessage: 'Fallo de red',
          products: [createProduct()],
        });
        mount();

        const grid = container.querySelector('#q-catalog-grid');
        expect(grid.children.length).toBe(1);
        expect(grid.firstElementChild.className).toBe(
          'q-catalog__message q-catalog__message--loading'
        );
        expect(grid.firstElementChild.textContent).toBe('Cargando productos...');
        expect(grid.querySelector('.q-catalog__message--error')).toBeNull();
        expect(grid.querySelectorAll('.q-product-card').length).toBe(0);
      });

      it('gives an error priority over loaded products', () => {
        viewModel = createMockViewModel({
          errorMessage: 'Fallo de red',
          products: [createProduct()],
        });
        mount();

        const grid = container.querySelector('#q-catalog-grid');
        expect(grid.children.length).toBe(1);
        expect(grid.firstElementChild.className).toBe(
          'q-catalog__message q-catalog__message--error'
        );
        expect(grid.firstElementChild.getAttribute('role')).toBe('alert');
        expect(grid.firstElementChild.textContent).toBe('Fallo de red');
        expect(grid.querySelectorAll('.q-product-card').length).toBe(0);
      });

      it('gives no-results priority over loaded products', () => {
        viewModel = createMockViewModel({
          isNoResults: true,
          hasActiveFilters: true,
          products: [createProduct()],
        });
        mount();

        const grid = container.querySelector('#q-catalog-grid');
        expect(grid.children.length).toBe(1);
        expect(grid.querySelector('.q-catalog__message--no-results')).not.toBeNull();
        expect(grid.querySelectorAll('.q-product-card').length).toBe(0);
      });

      it('renders the generic empty message when products is null', () => {
        viewModel = createMockViewModel({ products: null });
        mount();

        const grid = container.querySelector('#q-catalog-grid');
        expect(grid.children.length).toBe(1);
        expect(grid.firstElementChild.className).toBe(
          'q-catalog__message q-catalog__message--empty'
        );
        expect(grid.firstElementChild.textContent).toBe('No hay productos disponibles');
        expect(grid.querySelectorAll('.q-product-card').length).toBe(0);
      });

      it('hides loaded products while a new page is loading', () => {
        viewModel = createMockViewModel({
          isLoading: true,
          products: [createProduct({ id: 'loaded', name: 'Cargado' })],
        });
        mount();

        const grid = container.querySelector('#q-catalog-grid');
        expect(grid.querySelector('.q-catalog__message--loading')).not.toBeNull();
        expect(grid.textContent).not.toContain('Cargado');
        expect(grid.querySelectorAll('.q-product-card').length).toBe(0);
      });

      it('marks the no-results message as a status region with its suggestions', () => {
        viewModel = createMockViewModel({
          isNoResults: true,
          hasActiveFilters: true,
          noResultsSuggestions: ['Revisa la ortografía.', 'Quita filtros.'],
        });
        mount();

        const noResults = container.querySelector('.q-catalog__message--no-results');
        expect(noResults.getAttribute('role')).toBe('status');
        expect(noResults.querySelector('.q-catalog__no-results-title').textContent).toBe(
          'No se encontraron resultados'
        );
        expect(noResults.querySelector('.q-catalog__no-results-hint').textContent).toBe(
          'Prueba con estas sugerencias para modificar tu búsqueda:'
        );
        expect(
          [...noResults.querySelectorAll('.q-catalog__no-results-suggestions li')].map(
            (li) => li.textContent
          )
        ).toEqual(['Revisa la ortografía.', 'Quita filtros.']);
        expect(noResults.querySelector('.q-catalog__no-results-clear').textContent).toBe(
          'Ver todos los productos'
        );
        noResults.querySelector('.q-catalog__no-results-clear').click();
        expect(viewModel.clearFilters).toHaveBeenCalledTimes(1);
      });

      it('enables the sort select for an own string value but ignores change events', () => {
        viewModel = createMockViewModel({ sort: 'price_asc' });
        mount();

        const sort = container.querySelector('.q-catalog__sort select');
        expect(sort.disabled).toBe(false);
        expect(sort.hasAttribute('aria-disabled')).toBe(false);
        expect(sort.title).toBe('');
        expect(sort.getAttribute('aria-label')).toBe('Ordenar por');
        expect([...sort.options].map((option) => option.textContent)).toEqual([
          'Recientes',
          'Precio: menor a mayor',
          'Precio: mayor a menor',
          'Mejor valorados',
        ]);

        sort.value = 'Precio: menor a mayor';
        sort.dispatchEvent(new Event('change', { bubbles: true }));
        expect(sort.value).toBe('Precio: menor a mayor');
        expect(viewModel.applyFilters).not.toHaveBeenCalled();
        expect(viewModel.search).not.toHaveBeenCalled();
        expect(viewModel.filters).toEqual({
          search: '',
          category: '',
          minPrice: null,
          maxPrice: null,
        });
      });

      it('enables sorting for an inherited string and disables it when no sort exists', () => {
        const inherited = createMockViewModel();
        Object.setPrototypeOf(inherited, { sort: 'recent' });
        view = new CatalogView(inherited, { authStore });
        view.mount(container);
        expect(container.querySelector('.q-catalog__sort select').disabled).toBe(false);
        view.destroy();
        view = null;

        mount();
        expect(container.querySelector('.q-catalog__sort select').disabled).toBe(true);
      });

      it('configures the search form and prevents native submission', () => {
        mount();

        const form = container.querySelector('.q-catalog__search');
        expect(form.getAttribute('role')).toBe('search');
        expect(form.noValidate).toBe(true);
        const label = form.querySelector('label[for="q-catalog-search-input"]');
        expect(label.className).toBe('q-sr-only');
        expect(label.textContent).toBe('Buscar productos');
        const input = container.querySelector('#q-catalog-search-input');
        expect(input.type).toBe('search');
        expect(input.name).toBe('search');
        expect(input.className).toBe('q-catalog__search-input');
        expect(input.placeholder).toBe('Buscar en Q’atu');
        expect(input.autocomplete).toBe('off');
        expect(input.maxLength).toBe(SEARCH_MAX_LENGTH);
        const button = form.querySelector('button[type="submit"]');
        expect(button.className).toBe('q-btn q-btn--primary q-catalog__search-button');
        expect(button.textContent).toBe('Buscar');

        input.value = 'café';
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(viewModel.search).toHaveBeenCalledWith('café');
        expect(viewModel.search).toHaveBeenCalledTimes(1);
      });

      it('wires the filters toggle, aria-controls and the disabled stock checkbox', () => {
        mount();

        const panel = container.querySelector('.q-catalog__filters');
        const toggle = container.querySelector('.q-catalog__filters-toggle');
        expect(toggle.type).toBe('button');
        expect(toggle.parentElement).toBe(panel);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(toggle.getAttribute('aria-controls')).toBe('q-catalog-filters-body');
        expect(container.querySelector('#q-catalog-filters-body').tagName).toBe('FORM');
        expect(toggle.querySelector('.q-catalog__filters-toggle-label').textContent).toBe(
          'Filtros'
        );

        toggle.click();
        expect(panel.classList.contains('q-catalog__filters--open')).toBe(true);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        toggle.click();
        expect(panel.classList.contains('q-catalog__filters--open')).toBe(false);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        const stock = container.querySelector('.q-catalog__stock-label input[type="checkbox"]');
        expect(stock.disabled).toBe(true);
        expect(stock.getAttribute('aria-disabled')).toBe('true');
        expect(stock.title).toBe('Filtro de stock próximamente');
        expect(stock.parentElement.textContent).toContain('Solo con stock');
        expect(container.querySelector('.q-catalog__filters-form').noValidate).toBe(true);
      });

      it('configures price inputs, the hidden error region and the hidden clear button', () => {
        mount();

        const min = container.querySelector('#q-catalog-filter-min-price');
        const max = container.querySelector('#q-catalog-filter-max-price');
        for (const [input, name] of [
          [min, 'minPrice'],
          [max, 'maxPrice'],
        ]) {
          expect(input.type).toBe('number');
          expect(input.name).toBe(name);
          expect(input.min).toBe('0');
          expect(input.step).toBe('0.01');
          expect(input.inputMode).toBe('decimal');
          expect(input.getAttribute('aria-describedby')).toBe('q-catalog-filters-error');
          expect(input.className).toBe('q-catalog__field-control');
        }
        expect(min.placeholder).toBe('Bs 0');
        expect(max.placeholder).toBe('Bs 2.000');

        const error = container.querySelector('.q-catalog__filters-error');
        expect(error.id).toBe('q-catalog-filters-error');
        expect(error.getAttribute('role')).toBe('alert');
        expect(error.hidden).toBe(true);
        expect(error.textContent).toBe('');
        const clear = container.querySelector('.q-catalog__filters-clear');
        expect(clear.type).toBe('button');
        expect(clear.hidden).toBe(true);

        clear.click();
        expect(viewModel.clearFilters).toHaveBeenCalledTimes(1);
      });

      it('reveals the filter error and clear button from view-model state', () => {
        viewModel = createMockViewModel({
          filterError: 'El precio máximo debe ser mayor o igual al precio mínimo.',
          hasActiveFilters: true,
        });
        mount();

        const error = container.querySelector('.q-catalog__filters-error');
        expect(error.hidden).toBe(false);
        expect(error.textContent).toBe('El precio máximo debe ser mayor o igual al precio mínimo.');
        expect(container.querySelector('.q-catalog__filters-clear').hidden).toBe(false);
      });

      it('prevents the filter form submit and forwards its raw values', () => {
        mount();
        container.querySelector('#q-catalog-filter-min-price').value = '10';
        container.querySelector('#q-catalog-filter-max-price').value = '50';
        const form = container.querySelector('.q-catalog__filters-form');

        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(viewModel.applyFilters).toHaveBeenCalledWith({
          search: '',
          category: '',
          minPrice: '10',
          maxPrice: '50',
        });
      });

      it('uses the singular eyebrow for one result and hides the subtitle on search', () => {
        viewModel = createMockViewModel({
          filters: { search: 'lana', category: '', minPrice: null, maxPrice: null },
          meta: createMeta({ total: 1, total_pages: 1 }),
        });
        mount();

        const eyebrow = container.querySelector('.q-catalog__eyebrow');
        expect(eyebrow.textContent).toBe('1 RESULTADO ENCONTRADO');
        expect(eyebrow.getAttribute('aria-live')).toBe('polite');
        expect(container.querySelector('.q-catalog__title').textContent).toBe(
          'Resultados para «lana»'
        );
        expect(container.querySelector('.q-catalog__subtitle').hidden).toBe(true);

        viewModel.filters = { search: '', category: '', minPrice: null, maxPrice: null };
        viewModel.meta = createMeta({ total: 0, total_pages: 0 });
        viewModel.notify();

        expect(eyebrow.textContent).toBe('0 RESULTADOS ENCONTRADOS');
        expect(container.querySelector('.q-catalog__title').textContent).toBe(
          'Todos los productos'
        );
        expect(container.querySelector('.q-catalog__subtitle').hidden).toBe(false);
      });

      it('rebuilds category options only for a new array and clears an unknown selection', () => {
        const categories = [{ id: 'c1', name: 'Textiles', slug: 'textiles' }];
        viewModel = createMockViewModel({ categories });
        mount();
        const select = container.querySelector('#q-catalog-filter-category');

        expect([...select.options].map((option) => [option.value, option.textContent])).toEqual([
          ['', 'Todas las categorías'],
          ['textiles', 'Textiles'],
        ]);
        expect(view._renderedCategories).toBe(categories);

        categories.push({ id: 'c2', name: 'Café', slug: 'cafe' });
        viewModel.notify();
        expect(select.options.length).toBe(2);

        viewModel.categories = [...categories];
        viewModel.notify();
        expect([...select.options].map((option) => option.value)).toEqual(['', 'textiles', 'cafe']);

        viewModel.filters = { search: '', category: 'desconocida', minPrice: null, maxPrice: null };
        viewModel.notify();
        expect(select.value).toBe('');

        viewModel.categories = [...categories];
        viewModel.filters = { search: '', category: 'cafe', minPrice: null, maxPrice: null };
        viewModel.notify();
        expect(select.value).toBe('cafe');
      });

      it('does not overwrite in-progress filter inputs until the filters object changes', () => {
        mount();
        const search = container.querySelector('#q-catalog-search-input');
        const min = container.querySelector('#q-catalog-filter-min-price');
        const max = container.querySelector('#q-catalog-filter-max-price');
        expect(view._renderedFilters).toBe(viewModel.filters);

        search.value = 'borrador';
        min.value = '12.5';
        viewModel.notify();
        expect(search.value).toBe('borrador');
        expect(min.value).toBe('12.5');

        viewModel.filters = { search: 'lana', category: '', minPrice: 10, maxPrice: 20 };
        viewModel.notify();
        expect(search.value).toBe('lana');
        expect(min.value).toBe('10');
        expect(max.value).toBe('20');

        viewModel.filters = { ...viewModel.filters, minPrice: null, maxPrice: null };
        viewModel.notify();
        expect(min.value).toBe('');
        expect(max.value).toBe('');
      });

      it('filters out search chips, labels the list and removes by filter key', () => {
        viewModel = createMockViewModel({
          hasActiveFilters: true,
          activeFilterChips: [
            { key: 'search', label: '«café»' },
            { key: 'category', label: 'Textiles' },
          ],
        });
        mount();

        const list = container.querySelector('.q-catalog__chips');
        expect(list.getAttribute('aria-label')).toBe('Filtros aplicados');
        expect(list.hidden).toBe(false);
        expect(list.querySelectorAll('.q-catalog__chip').length).toBe(1);
        expect(list.querySelector('.q-catalog__chip').textContent).toContain('Textiles');
        const remove = list.querySelector('.q-catalog__chip-remove');
        expect(remove.getAttribute('aria-label')).toBe('Quitar filtro Textiles');
        expect(remove.dataset.filterKey).toBe('category');
        expect(remove.textContent).toBe('×');
        remove.click();
        expect(viewModel.removeFilter).toHaveBeenCalledWith('category');
      });

      it('hides the chip list when only a search chip exists', () => {
        viewModel = createMockViewModel({
          hasActiveFilters: true,
          activeFilterChips: [{ key: 'search', label: '«café»' }],
        });
        mount();

        const list = container.querySelector('.q-catalog__chips');
        expect(list.hidden).toBe(true);
        expect(list.children.length).toBe(0);
      });

      it('falls back to the category slug, name or an existing category chip', () => {
        viewModel = createMockViewModel({
          categories: [{ id: 'c1', name: 'Textiles', slug: 'textiles' }],
          filters: { search: '', category: 'desconocida', minPrice: null, maxPrice: null },
        });
        mount();
        let chips = container.querySelectorAll('.q-catalog__chip');
        expect(chips.length).toBe(1);
        expect(chips[0].textContent).toContain('desconocida');
        expect(chips[0].querySelector('.q-catalog__chip-remove').dataset.filterKey).toBe(
          'category'
        );
        view.destroy();
        view = null;

        viewModel = createMockViewModel({
          categories: [{ id: 'c1', name: 'Textiles', slug: 'textiles' }],
          filters: { search: '', category: 'textiles', minPrice: null, maxPrice: null },
          activeFilterChips: [{ key: 'category', label: 'Chip previo' }],
        });
        mount();
        chips = container.querySelectorAll('.q-catalog__chip');
        expect(chips.length).toBe(1);
        expect(chips[0].textContent).toContain('Chip previo');
        expect(chips[0].textContent).not.toContain('Textiles');
      });

      it('formats the three price-chip variants and overwrites an existing price chip', () => {
        const cases = [
          { minPrice: 100, maxPrice: 500, label: 'Bs 100.00 — Bs 500.00' },
          { minPrice: 100, maxPrice: null, label: 'Desde Bs 100.00' },
          { minPrice: null, maxPrice: 500, label: 'Hasta Bs 500.00' },
        ];
        cases.forEach(({ minPrice, maxPrice, label }) => {
          const vm = createMockViewModel({
            filters: { search: '', category: '', minPrice, maxPrice },
            activeFilterChips: [{ key: 'price', label: 'Precio anterior' }],
          });
          view = new CatalogView(vm, { authStore });
          view.mount(container);
          const chips = container.querySelectorAll('.q-catalog__chip');
          expect(chips.length).toBe(1);
          expect(chips[0].textContent).toContain(label);
          expect(chips[0].textContent).not.toContain('Precio anterior');
          expect(chips[0].querySelector('.q-catalog__chip-remove').dataset.filterKey).toBe('price');
          view.destroy();
          view = null;
        });
      });

      it('resolves the seller line with documented precedence', () => {
        viewModel = createMockViewModel({
          categories: [{ id: 'c1', name: 'Categoría por id', slug: 'cat' }],
          products: [
            createProduct({
              id: 'p1',
              seller: 'Vendedor cadena',
              store: 'Tienda',
              seller_name: 'Otro',
            }),
            createProduct({
              id: 'p2',
              seller: { full_name: 'Vendedor objeto', store_name: 'Tienda' },
            }),
            createProduct({ id: 'p3', seller: { store_name: 'Solo tienda' } }),
            createProduct({ id: 'p4', seller: { username: 'solo-user' } }),
            createProduct({ id: 'p5', seller: { name: 'solo-name' } }),
            createProduct({
              id: 'p6',
              seller_name: 'Nombre directo',
              store_name: 'Tienda directa',
            }),
            createProduct({ id: 'p7', store_name: 'Tienda fallback' }),
            createProduct({ id: 'p8', category: { name: 'Textiles' } }),
            createProduct({ id: 'p9', category_name: 'Café' }),
            createProduct({ id: 'p10', category_id: 'c1' }),
            createProduct({ id: 'p11' }),
          ],
        });
        mount();

        const sellers = [...container.querySelectorAll('.q-product-card')].map(
          (card) => card.querySelector('.q-product-card-seller')?.textContent ?? null
        );
        expect(sellers).toEqual([
          'Vendedor cadena',
          'Vendedor objeto',
          'Solo tienda',
          'solo-user',
          'solo-name',
          'Nombre directo',
          'Tienda fallback',
          'Textiles',
          'Café',
          'Categoría por id',
          null,
        ]);
      });

      it('applies badge precedence from explicit values through stock, discounts and isNew', () => {
        viewModel = createMockViewModel({
          products: [
            createProduct({ id: 'b1', badge: 'Oferta', stock: 0, is_new: true }),
            createProduct({ id: 'b2', tag: 'Nuevo', is_best_seller: true }),
            createProduct({
              id: 'b3',
              badge: 'Inventado',
              stock: 0,
              is_best_seller: true,
              discount_price: 5,
              is_new: true,
            }),
            createProduct({ id: 'b4', isBestSeller: true, discount_price: 5, is_new: true }),
            createProduct({ id: 'b5', best_seller: true }),
            createProduct({ id: 'b6', discount_price: 0, sale_price: 12 }),
            createProduct({ id: 'b7', discount_percentage: 10 }),
            createProduct({ id: 'b8', isNew: true }),
            createProduct({ id: 'b9' }),
          ],
        });
        mount();

        const badges = [...container.querySelectorAll('.q-product-card')].map(
          (card) => card.querySelector('.q-product-card-new-badge')?.textContent ?? null
        );
        expect(badges).toEqual([
          'Oferta',
          'Nuevo',
          'Agotado',
          'Más vendido',
          'Más vendido',
          'Oferta',
          'Oferta',
          'Nuevo',
          null,
        ]);
      });

      it('formats ratings, accessible stars, detail links, default currency and non-number stock', () => {
        viewModel = createMockViewModel({
          products: [
            createProduct({
              id: 'r1',
              slug: 'manta',
              name: 'Manta',
              price: 40,
              currency: 'USD',
              average_rating: 4.2,
              ratings_count: 3,
            }),
            createProduct({ id: 'r2', name: 'Sin rating', price: 40, currency: undefined }),
            createProduct({ id: 'r3', name: 'Stock texto', price: 40, stock: '0' }),
            createProduct({ id: 'r4', name: 'Stock nulo', price: 40, stock: null }),
          ],
        });
        mount();

        const cards = [...container.querySelectorAll('.q-product-card')];
        const rating = cards[0].querySelector('.q-product-card-rating');
        expect(rating.querySelector('.q-product-card-rating-value').textContent).toBe('4.2 (3)');
        expect(rating.querySelector('.q-sr-only').textContent).toBe(
          'Calificación 4.2 de 5, 3 reseñas'
        );
        expect(rating.querySelector('.q-product-card-stars').getAttribute('aria-hidden')).toBe(
          'true'
        );
        expect(rating.querySelectorAll('.q-product-card-star').length).toBe(5);
        expect(rating.querySelectorAll('.q-product-card-star.is-filled').length).toBe(4);

        expect(cards[0].querySelector('.q-product-card-title-link').getAttribute('href')).toBe(
          '/products/manta'
        );
        expect(cards[0].querySelector('.q-product-card-price').textContent).toBe('US$ 40.00');
        expect(cards[1].querySelector('.q-product-card-rating')).toBeNull();
        expect(cards[1].querySelector('.q-product-card-title-link').getAttribute('href')).toBe(
          '/products/r2'
        );
        expect(cards[1].querySelector('.q-product-card-price').textContent).toBe('Bs 40.00');
        expect(cards[2].querySelector('.q-product-card-action').disabled).toBe(false);
        expect(cards[2].querySelector('.q-product-card-action').textContent).toBe('Añadir');
        expect(cards[3].querySelector('.q-product-card-action').disabled).toBe(false);
      });

      it('hides pagination for no-results while keeping its page info for a single page', () => {
        viewModel = createMockViewModel({
          isNoResults: true,
          hasActiveFilters: true,
          meta: createMeta({ total: 0, total_pages: 1 }),
        });
        mount();

        const pagination = container.querySelector('.q-catalog__pagination');
        expect(pagination.hidden).toBe(true);
        expect(pagination.querySelector('.q-catalog__pagination-info').textContent).toBe(
          'Página 1 de 1'
        );
        expect(pagination.querySelector('.q-catalog__pagination-btn--prev').disabled).toBe(true);
        expect(pagination.querySelector('.q-catalog__pagination-btn--next').disabled).toBe(true);
        expect(container.querySelector('.q-catalog__message--no-results')).not.toBeNull();
      });

      it('treats missing seller ids, missing user ids and empty ids as not own', () => {
        const cases = [
          { user: { id: 'seller-1' }, product: createProduct({ id: 'p1' }) },
          { user: {}, product: createProduct({ id: 'p2', seller_id: 'seller-1' }) },
          { user: { id: '' }, product: createProduct({ id: 'p3', seller_id: 'seller-1' }) },
          { user: { id: 1 }, product: createProduct({ id: 'p4', seller_id: '1' }) },
        ];
        cases.forEach(({ user, product }) => {
          const vm = createMockViewModel({ products: [product], meta: createMeta({ total: 1 }) });
          view = new CatalogView(vm, { authStore: createAuthStore({ user }) });
          view.mount(container);
          expect(container.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();
          view.destroy();
          view = null;
        });
      });

      it('unsubscribes from both stores exactly once, including double destroy', () => {
        const { vm, auth } = mount();
        const vmUnsubscribe = vm.subscribe.calls.mostRecent().returnValue;
        const authUnsubscribe = auth.subscribe.calls.mostRecent().returnValue;

        expect(vm.subscribe).toHaveBeenCalledTimes(1);
        expect(auth.subscribe).toHaveBeenCalledTimes(1);
        expect(vm._listeners.size).toBe(1);
        expect(auth._listeners.size).toBe(1);

        view.destroy();

        expect(vmUnsubscribe).toHaveBeenCalledTimes(1);
        expect(authUnsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(view._authUnsubscribe).toBeNull();
        expect(vm._listeners.size).toBe(0);
        expect(auth._listeners.size).toBe(0);

        view.destroy();
        expect(vmUnsubscribe).toHaveBeenCalledTimes(1);
        expect(authUnsubscribe).toHaveBeenCalledTimes(1);
      });

      it('characterizes _updateChips throwing when the view model has no filters', () => {
        mount();
        expect(() => view._updateChips({ activeFilterChips: [], categories: [] })).toThrowError(
          TypeError
        );
      });

      it('characterizes the mount leak: repeated mounts leave one section and one of each subscription', () => {
        view = new CatalogView(viewModel, { authStore });
        view.mount(container);
        view.mount(container);

        expect(container.querySelectorAll('section.q-catalog').length).toBe(2);
        expect(viewModel.subscribe).toHaveBeenCalledTimes(2);
        expect(authStore.subscribe).toHaveBeenCalledTimes(2);
        expect(viewModel.loadProducts).toHaveBeenCalledTimes(2);
        expect(viewModel.loadCategories).toHaveBeenCalledTimes(2);
        expect(viewModel._listeners.size).toBe(2);
        expect(authStore._listeners.size).toBe(2);

        view.destroy();

        expect(container.querySelectorAll('section.q-catalog').length).toBe(1);
        expect(viewModel._listeners.size).toBe(1);
        expect(authStore._listeners.size).toBe(1);
        viewModel._listeners.clear();
        authStore._listeners.clear();
      });

      it('characterizes the grid child timer leak after a re-render', async () => {
        jasmine.clock().install();
        try {
          const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
          viewModel = createMockViewModel({
            products: [createProduct({ id: 'timer-1', name: 'Temporizador' })],
            meta: createMeta({ total: 1, total_pages: 1 }),
          });
          view = new CatalogView(viewModel, { authStore, onAddToCart });
          view.mount(container);
          container.querySelector('#q-catalog-grid button.q-product-card-action').click();
          await Promise.resolve();
          await Promise.resolve();

          const staleCard = container.querySelector('.q-product-card');
          expect(staleCard.querySelector('.q-product-card-action').textContent).toBe('✓ Añadido');

          viewModel.notify();

          expect(container.contains(staleCard)).toBe(false);
          expect(
            container.querySelector('.q-product-card .q-product-card-action').textContent
          ).toBe('Añadir');
          jasmine.clock().tick(1500);
          expect(staleCard.querySelector('.q-product-card-action').textContent).toBe('Añadir');
        } finally {
          jasmine.clock().uninstall();
        }
      });

      it('settles asynchronous view-model notifications without a backend', async () => {
        viewModel.loadProducts.and.callFake(async (page) => {
          viewModel.isLoading = true;
          viewModel.notify();
          await tick();
          viewModel.isLoading = false;
          viewModel.meta = createMeta({ page, total: 1, total_pages: 1 });
          viewModel.notify();
        });
        mount();
        expect(container.querySelector('.q-catalog__message--loading')).not.toBeNull();

        await tick();

        expect(viewModel.loadProducts).toHaveBeenCalledWith(1);
        expect(container.querySelector('.q-catalog__message--loading')).toBeNull();
        expect(container.querySelector('.q-catalog__pagination-info').textContent).toBe(
          'Página 1 de 1'
        );
      });
    });
  })();
})();
