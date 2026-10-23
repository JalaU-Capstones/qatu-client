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
      loadProducts: jasmine.createSpy('loadProducts'),
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

  it('should mount header, section, title, grid, pagination, and footer', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelector('.q-header')).not.toBeNull();
    expect(container.querySelector('main.q-main')).not.toBeNull();
    expect(container.querySelector('section.q-catalog')).not.toBeNull();

    const title = container.querySelector('.q-catalog__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Catálogo');

    const subtitle = container.querySelector('.q-catalog__subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toContain('productos disponibles');

    expect(container.querySelector('#q-catalog-grid')).not.toBeNull();
    expect(container.querySelector('.q-catalog__pagination')).not.toBeNull();
    expect(container.querySelector('.q-footer')).not.toBeNull();

    expect(mockViewModel.loadProducts).toHaveBeenCalledWith(1);
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
      (card) => card.querySelector('.q-product-card__title').textContent
    );
    expect(titles).toEqual(['Aguayo', 'Café', 'Chocolate']);

    const buttons = container.querySelectorAll(
      '#q-catalog-grid .q-product-card button.q-product-card__action'
    );
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Agregar al carrito');

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

  it('should clean up subscriptions and elements on destroy', () => {
    const view = new CatalogView(mockViewModel);
    view.mount(container);

    expect(container.querySelector('section.q-catalog')).not.toBeNull();
    expect(listeners.size).toBe(1);

    view.destroy();

    expect(container.querySelector('section.q-catalog')).toBeNull();
    expect(listeners.size).toBe(0);
  });
});
