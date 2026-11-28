import { SEARCH_MAX_LENGTH } from '../../models/validation/productSearchFilters.js';
import { CatalogViewModel } from './CatalogViewModel.js';

describe('CatalogViewModel', () => {
  let viewModel;
  let productsApi;
  let categoriesApi;

  const categories = [
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    { id: 'cat-textiles', name: 'Textiles', slug: 'textiles' },
  ];

  const makeMeta = (overrides = {}) => ({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
    ...overrides,
  });

  const makeProduct = (id) => ({
    id,
    name: `Product ${id}`,
    price: 10,
    currency: 'USD',
    primary_image_path: null,
    seller_id: 'seller-1',
  });

  beforeEach(() => {
    productsApi = {
      getProducts: jasmine.createSpy('getProducts'),
    };
    categoriesApi = {
      getCategories: jasmine
        .createSpy('getCategories')
        .and.resolveTo({ data: categories, meta: makeMeta({ total: 2, total_pages: 1 }) }),
    };
    viewModel = new CatalogViewModel({ productsApi, categoriesApi });
  });

  // ─── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should start with an empty products array', () => {
      expect(viewModel.products).toEqual([]);
    });

    it('should start with default meta values', () => {
      expect(viewModel.meta.page).toBe(1);
      expect(viewModel.meta.per_page).toBe(20);
      expect(viewModel.meta.total).toBe(0);
      expect(viewModel.meta.total_pages).toBe(0);
    });

    it('should start with isLoading false', () => {
      expect(viewModel.isLoading).toBe(false);
    });

    it('should start with an empty errorMessage', () => {
      expect(viewModel.errorMessage).toBe('');
    });
  });

  // ─── loadProducts ───────────────────────────────────────────────────────────

  describe('loadProducts', () => {
    it('should set isLoading to true during the request and false afterwards', async () => {
      const loadingStates = [];
      productsApi.getProducts.and.callFake(() => {
        loadingStates.push(viewModel.isLoading);
        return Promise.resolve({ data: [], meta: makeMeta() });
      });

      await viewModel.loadProducts();

      expect(loadingStates[0]).toBe(true);
      expect(viewModel.isLoading).toBe(false);
    });

    it('should clear errorMessage before each request', async () => {
      productsApi.getProducts.and.rejectWith(new Error('first error'));
      await viewModel.loadProducts();
      expect(viewModel.errorMessage).not.toBe('');

      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });
      await viewModel.loadProducts();
      expect(viewModel.errorMessage).toBe('');
    });

    it('should update products and meta on a successful response', async () => {
      const products = [makeProduct('p1'), makeProduct('p2')];
      const meta = makeMeta({ page: 2, per_page: 20, total: 42, total_pages: 3 });
      productsApi.getProducts.and.resolveTo({ data: products, meta });

      await viewModel.loadProducts(2);

      expect(viewModel.products).toEqual(products);
      expect(viewModel.meta.page).toBe(2);
      expect(viewModel.meta.total).toBe(42);
      expect(viewModel.meta.total_pages).toBe(3);
    });

    it('should call getProducts with the correct page parameter', async () => {
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta({ page: 3 }) });

      await viewModel.loadProducts(3);

      expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 3, limit: 20 });
    });

    it('should default to page 1 when no argument is passed', async () => {
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });

      await viewModel.loadProducts();

      expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should set errorMessage and keep products empty on API failure', async () => {
      productsApi.getProducts.and.rejectWith(new Error('Server error'));

      await viewModel.loadProducts();

      expect(viewModel.products).toEqual([]);
      expect(viewModel.errorMessage).toContain('Server error');
      expect(viewModel.isLoading).toBe(false);
    });

    it('should set a fallback errorMessage when the rejection is not an Error instance', async () => {
      productsApi.getProducts.and.rejectWith('string rejection');

      await viewModel.loadProducts();

      expect(viewModel.errorMessage).toBeTruthy();
      expect(viewModel.isLoading).toBe(false);
    });

    it('should notify subscribers when loading starts and when it completes', async () => {
      const listener = jasmine.createSpy('listener');
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });
      viewModel.subscribe(listener);

      await viewModel.loadProducts();

      // Called once at isLoading=true, once at isLoading=false
      expect(listener.calls.count()).toBe(2);
    });

    it('should notify subscribers even when the request fails', async () => {
      const listener = jasmine.createSpy('listener');
      productsApi.getProducts.and.rejectWith(new Error('fail'));
      viewModel.subscribe(listener);

      await viewModel.loadProducts();

      expect(listener.calls.count()).toBe(2);
    });

    it('should fall back to empty array when data is not an array', async () => {
      productsApi.getProducts.and.resolveTo({ data: null, meta: makeMeta() });

      await viewModel.loadProducts();

      expect(viewModel.products).toEqual([]);
    });
  });

  // ─── nextPage ───────────────────────────────────────────────────────────────

  describe('nextPage', () => {
    it('should load page + 1 when there are more pages', async () => {
      viewModel.meta = makeMeta({ page: 1, total_pages: 3 });
      productsApi.getProducts.and.resolveTo({
        data: [],
        meta: makeMeta({ page: 2, total_pages: 3 }),
      });

      await viewModel.nextPage();

      expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    it('should NOT call the API when already on the last page', async () => {
      viewModel.meta = makeMeta({ page: 3, total_pages: 3 });

      await viewModel.nextPage();

      expect(productsApi.getProducts).not.toHaveBeenCalled();
    });

    it('should NOT call the API when total_pages is 0', async () => {
      viewModel.meta = makeMeta({ page: 1, total_pages: 0 });

      await viewModel.nextPage();

      expect(productsApi.getProducts).not.toHaveBeenCalled();
    });
  });

  // ─── prevPage ───────────────────────────────────────────────────────────────

  describe('prevPage', () => {
    it('should load page - 1 when not on the first page', async () => {
      viewModel.meta = makeMeta({ page: 3, total_pages: 5 });
      productsApi.getProducts.and.resolveTo({
        data: [],
        meta: makeMeta({ page: 2, total_pages: 5 }),
      });

      await viewModel.prevPage();

      expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    it('should NOT call the API when already on page 1', async () => {
      viewModel.meta = makeMeta({ page: 1, total_pages: 5 });

      await viewModel.prevPage();

      expect(productsApi.getProducts).not.toHaveBeenCalled();
    });
  });

  // ─── Search and filters (US-06) ─────────────────────────────────────────────

  describe('search and filters', () => {
    beforeEach(() => {
      productsApi.getProducts.and.resolveTo({
        data: [makeProduct('p1')],
        meta: makeMeta({ total: 1, total_pages: 1 }),
      });
    });

    it('should start without active filters and with the default title', () => {
      expect(viewModel.hasActiveFilters).toBe(false);
      expect(viewModel.title).toBe('Catálogo');
      expect(viewModel.activeFilterChips).toEqual([]);
      expect(viewModel.filterError).toBe('');
    });

    it('should search by keyword and reload page 1', async () => {
      viewModel.meta = makeMeta({ page: 3, total_pages: 5 });

      const applied = await viewModel.search('  phone ');

      expect(applied).toBe(true);
      expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'phone' });
      expect(viewModel.title).toBe('Resultados para «phone»');
    });

    it('should resolve the category slug to its id before filtering', async () => {
      await viewModel.applyFilters({ category: 'electronics' });

      expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        categoryId: 'cat-electronics',
      });
    });

    it('should filter by price range', async () => {
      await viewModel.applyFilters({ minPrice: '100', maxPrice: '500' });

      expect(productsApi.getProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        minPrice: 100,
        maxPrice: 500,
      });
    });

    it('should combine search, category, and price range in one request', async () => {
      await viewModel.applyFilters({
        search: 'phone',
        category: 'electronics',
        minPrice: '100',
        maxPrice: '500',
      });

      expect(productsApi.getProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'phone',
        categoryId: 'cat-electronics',
        minPrice: 100,
        maxPrice: 500,
      });
    });

    it('should keep the other filters when searching a new keyword', async () => {
      await viewModel.applyFilters({ category: 'electronics', maxPrice: '500' });
      await viewModel.search('headphones');

      expect(productsApi.getProducts.calls.mostRecent().args[0]).toEqual({
        page: 1,
        limit: 20,
        search: 'headphones',
        categoryId: 'cat-electronics',
        maxPrice: 500,
      });
    });

    it('should not call the API and should set filterError on an inverted price range', async () => {
      const listener = jasmine.createSpy('listener');
      viewModel.subscribe(listener);

      const applied = await viewModel.applyFilters({ minPrice: '500', maxPrice: '100' });

      expect(applied).toBe(false);
      expect(productsApi.getProducts).not.toHaveBeenCalled();
      expect(viewModel.filterError).toBe(
        'El precio máximo debe ser mayor o igual al precio mínimo.'
      );
      expect(viewModel.filters.minPrice).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should clear filterError after a valid submission', async () => {
      await viewModel.applyFilters({ minPrice: '-5' });
      expect(viewModel.filterError).not.toBe('');

      await viewModel.applyFilters({ minPrice: '5' });
      expect(viewModel.filterError).toBe('');
    });

    it('should report the page query string through onFiltersChange', async () => {
      const onFiltersChange = jasmine.createSpy('onFiltersChange');
      viewModel.onFiltersChange = onFiltersChange;

      await viewModel.applyFilters({ search: 'café de altura', category: 'textiles' });

      expect(onFiltersChange).toHaveBeenCalledWith('?q=caf%C3%A9+de+altura&category=textiles');
    });

    it('should drop a category slug that does not exist', async () => {
      await viewModel.applyFilters({ category: 'unknown-category' });

      expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(viewModel.filters.category).toBe('');
    });

    it('should show no results only when filters are active and nothing matched', async () => {
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });

      await viewModel.loadProducts();
      expect(viewModel.isNoResults).toBe(false);

      await viewModel.search('zzzzzz');
      expect(viewModel.isNoResults).toBe(true);
      expect(viewModel.noResultsSuggestions.length).toBeGreaterThan(0);
    });

    it('should not report no results while loading or after an error', async () => {
      viewModel.filters = { ...viewModel.filters, search: 'phone' };
      viewModel.isLoading = true;
      expect(viewModel.isNoResults).toBe(false);

      viewModel.isLoading = false;
      viewModel.errorMessage = 'Server error';
      expect(viewModel.isNoResults).toBe(false);
    });

    it('should format the results label in singular and plural', () => {
      viewModel.meta = makeMeta({ total: 1 });
      expect(viewModel.resultsLabel).toBe('1 resultado encontrado');

      viewModel.meta = makeMeta({ total: 48 });
      expect(viewModel.resultsLabel).toBe('48 resultados encontrados');
    });

    it('should build one chip per applied filter using the category name', async () => {
      await viewModel.applyFilters({
        search: 'phone',
        category: 'electronics',
        minPrice: '100',
        maxPrice: '500',
      });

      expect(viewModel.activeFilterChips).toEqual([
        { key: 'search', label: '«phone»' },
        { key: 'category', label: 'Electronics' },
        { key: 'price', label: 'USD 100.00 — USD 500.00' },
      ]);
    });

    it('should label one-sided price ranges', async () => {
      await viewModel.applyFilters({ minPrice: '100' });
      expect(viewModel.activeFilterChips).toEqual([{ key: 'price', label: 'Desde USD 100.00' }]);

      await viewModel.applyFilters({ minPrice: '', maxPrice: '500' });
      expect(viewModel.activeFilterChips).toEqual([{ key: 'price', label: 'Hasta USD 500.00' }]);
    });

    it('should remove a single filter and reload', async () => {
      await viewModel.applyFilters({ search: 'phone', minPrice: '100', maxPrice: '500' });

      await viewModel.removeFilter('price');

      expect(viewModel.filters).toEqual({
        search: 'phone',
        category: '',
        minPrice: null,
        maxPrice: null,
      });
      expect(productsApi.getProducts.calls.mostRecent().args[0]).toEqual({
        page: 1,
        limit: 20,
        search: 'phone',
      });
    });

    it('should clear every filter and report an empty query string', async () => {
      const onFiltersChange = jasmine.createSpy('onFiltersChange');
      viewModel.onFiltersChange = onFiltersChange;
      await viewModel.applyFilters({ search: 'phone', category: 'electronics' });

      await viewModel.clearFilters();

      expect(viewModel.hasActiveFilters).toBe(false);
      expect(onFiltersChange.calls.mostRecent().args[0]).toBe('');
      expect(productsApi.getProducts.calls.mostRecent().args[0]).toEqual({ page: 1, limit: 20 });
    });

    it('should keep the filters when paginating', async () => {
      productsApi.getProducts.and.resolveTo({
        data: [makeProduct('p1')],
        meta: makeMeta({ page: 1, total: 40, total_pages: 2 }),
      });
      await viewModel.search('phone');

      await viewModel.nextPage();

      expect(productsApi.getProducts.calls.mostRecent().args[0]).toEqual({
        page: 2,
        limit: 20,
        search: 'phone',
      });
    });

    it('should ignore a response that arrives after a newer request', async () => {
      let resolveFirst;
      productsApi.getProducts.and.returnValues(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
        Promise.resolve({ data: [makeProduct('new')], meta: makeMeta({ total: 1 }) })
      );

      const first = viewModel.search('old');
      await viewModel.search('new');
      resolveFirst({ data: [makeProduct('old')], meta: makeMeta({ total: 1 }) });
      await first;

      expect(viewModel.products.map((product) => product.id)).toEqual(['new']);
      expect(viewModel.isLoading).toBe(false);
    });
  });

  // ─── URL sync ───────────────────────────────────────────────────────────────

  describe('setFiltersFromQuery / toQueryString', () => {
    it('should restore filters from the page query string', () => {
      viewModel.setFiltersFromQuery('?q=phone&category=electronics&min_price=100&max_price=500');

      expect(viewModel.filters).toEqual({
        search: 'phone',
        category: 'electronics',
        minPrice: 100,
        maxPrice: 500,
      });
      expect(viewModel.toQueryString()).toBe(
        '?q=phone&category=electronics&min_price=100&max_price=500'
      );
    });

    it('should ignore an invalid price range from the URL', () => {
      viewModel.setFiltersFromQuery('?q=phone&min_price=500&max_price=100');

      expect(viewModel.filters.search).toBe('phone');
      expect(viewModel.filters.minPrice).toBeNull();
      expect(viewModel.filters.maxPrice).toBeNull();
    });

    it('should ignore a search longer than the API limit', () => {
      viewModel.setFiltersFromQuery(`?q=${'a'.repeat(201)}`);

      expect(viewModel.filters.search).toBe('');
    });

    it('should return an empty string when there are no filters', () => {
      viewModel.setFiltersFromQuery('');

      expect(viewModel.hasActiveFilters).toBe(false);
      expect(viewModel.toQueryString()).toBe('');
    });
  });

  // ─── loadCategories ─────────────────────────────────────────────────────────

  describe('loadCategories', () => {
    it('should load categories once and notify subscribers', async () => {
      const listener = jasmine.createSpy('listener');
      viewModel.subscribe(listener);

      await Promise.all([viewModel.loadCategories(), viewModel.loadCategories()]);

      expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
      expect(viewModel.categories).toEqual(categories);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should keep an empty list when the request fails', async () => {
      categoriesApi.getCategories.and.rejectWith(new Error('fail'));

      await viewModel.loadCategories();

      expect(viewModel.categories).toEqual([]);
    });
  });

  // ─── subscribe / unsubscribe ─────────────────────────────────────────────────

  describe('subscribe', () => {
    it('should call the listener on each state change', async () => {
      const listener = jasmine.createSpy('listener');
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });
      viewModel.subscribe(listener);

      await viewModel.loadProducts();

      expect(listener).toHaveBeenCalled();
      listener.calls.all().forEach((call) => {
        expect(call.args[0]).toBe(viewModel);
      });
    });

    it('should allow unsubscribing', async () => {
      const listener = jasmine.createSpy('listener');
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });
      const unsubscribe = viewModel.subscribe(listener);

      unsubscribe();
      await viewModel.loadProducts();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple simultaneous subscribers', async () => {
      const listenerA = jasmine.createSpy('listenerA');
      const listenerB = jasmine.createSpy('listenerB');
      productsApi.getProducts.and.resolveTo({ data: [], meta: makeMeta() });
      viewModel.subscribe(listenerA);
      viewModel.subscribe(listenerB);

      await viewModel.loadProducts();

      expect(listenerA).toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalled();
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const categories = [
      { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
      { id: 'cat-textiles', name: 'Textiles', slug: 'textiles' },
    ];

    const makeMeta = (overrides = {}) => ({
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 0,
      ...overrides,
    });

    const makeProduct = (id) => ({ id, name: `Product ${id}` });

    describe('CatalogViewModel additional branches (recovered 1)', () => {
      let productsApi;
      let categoriesApi;
      let viewModels;
      let unsubscribes;

      beforeEach(() => {
        productsApi = {
          getProducts: jasmine
            .createSpy('getProducts')
            .and.resolveTo({ data: [], meta: makeMeta() }),
        };
        categoriesApi = {
          getCategories: jasmine.createSpy('getCategories').and.resolveTo({ data: categories }),
        };
        viewModels = [];
        unsubscribes = [];
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
        unsubscribes = [];
        viewModels = [];
      });

      const createViewModel = (options = {}) => {
        const vm = new CatalogViewModel({ productsApi, categoriesApi, ...options });
        viewModels.push(vm);
        return vm;
      };

      const subscribe = (vm, listener) => {
        const unsubscribe = vm.subscribe(listener);
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      };

      it('uses the slug itself as the category chip label when no category matches', () => {
        const vm = createViewModel();
        vm.filters = { search: '', category: 'unknown', minPrice: null, maxPrice: null };

        expect(vm.activeFilterChips).toEqual([{ key: 'category', label: 'unknown' }]);
      });

      it('serializes single category, minimum price and maximum price filters', () => {
        const vm = createViewModel();

        vm.filters = { search: '', category: 'textiles', minPrice: null, maxPrice: null };
        expect(vm.toQueryString()).toBe('?category=textiles');

        vm.filters = { search: '', category: '', minPrice: 10, maxPrice: null };
        expect(vm.toQueryString()).toBe('?min_price=10');

        vm.filters = { search: '', category: '', minPrice: null, maxPrice: 20 };
        expect(vm.toQueryString()).toBe('?max_price=20');
      });

      it('trims q/category and discards non-numeric prices from the query string', () => {
        const vm = createViewModel();
        const query = new URLSearchParams({
          q: '  café  ',
          category: '  textiles  ',
          min_price: 'abc',
          max_price: 'xyz',
        }).toString();

        vm.setFiltersFromQuery(query);

        expect(vm.filters).toEqual({
          search: 'café',
          category: 'textiles',
          minPrice: null,
          maxPrice: null,
        });
      });

      it('accepts null and non-string query strings without throwing', () => {
        const vm = createViewModel();

        expect(() => vm.setFiltersFromQuery(null)).not.toThrow();
        expect(vm.filters).toEqual({ search: '', category: '', minPrice: null, maxPrice: null });

        expect(() => vm.setFiltersFromQuery(42)).not.toThrow();
        expect(vm.filters).toEqual({ search: '', category: '', minPrice: null, maxPrice: null });
      });

      it('rejects searches longer than the API limit with the exact validation message', async () => {
        const vm = createViewModel();
        const listener = jasmine.createSpy('listener');
        subscribe(vm, listener);

        const applied = await vm.applyFilters({ search: 'a'.repeat(SEARCH_MAX_LENGTH + 1) });

        expect(applied).toBe(false);
        expect(vm.filterError).toBe(
          `La búsqueda puede tener como máximo ${SEARCH_MAX_LENGTH} caracteres.`
        );
        expect(productsApi.getProducts).not.toHaveBeenCalled();
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('rejects non-numeric minimum and maximum prices', async () => {
        const vm = createViewModel();

        await expectAsync(vm.applyFilters({ minPrice: 'abc' })).toBeResolvedTo(false);
        expect(vm.filterError).toBe('El precio mínimo debe ser un número mayor o igual a 0.');

        await expectAsync(vm.applyFilters({ minPrice: '', maxPrice: 'xyz' })).toBeResolvedTo(false);
        expect(vm.filterError).toBe('El precio máximo debe ser un número mayor o igual a 0.');
        expect(productsApi.getProducts).not.toHaveBeenCalled();
      });

      it('uses request defaults when the API response has no meta object', async () => {
        const vm = createViewModel();
        productsApi.getProducts.and.resolveTo({ data: [makeProduct('p1')] });

        await vm.loadProducts(3);

        expect(vm.products).toEqual([makeProduct('p1')]);
        expect(vm.meta).toEqual({ page: 3, per_page: 20, total: 0, total_pages: 0 });
      });

      it('maps a non-Error rejection to the exact generic catalog message', async () => {
        const vm = createViewModel();
        productsApi.getProducts.and.rejectWith('string rejection');

        await vm.loadProducts();

        expect(vm.errorMessage).toBe('No pudimos cargar el catálogo de productos.');
        expect(vm.isLoading).toBe(false);
      });

      it('discards a stale failure so it cannot overwrite newer results', async () => {
        const vm = createViewModel();
        let rejectFirst;
        productsApi.getProducts.and.returnValues(
          new Promise((resolve, reject) => {
            rejectFirst = reject;
          }),
          Promise.resolve({ data: [makeProduct('new')], meta: makeMeta() })
        );

        const first = vm.loadProducts();
        await vm.loadProducts();
        rejectFirst(new Error('stale error'));
        await first;

        expect(vm.products.map((product) => product.id)).toEqual(['new']);
        expect(vm.errorMessage).toBe('');
        expect(vm.isLoading).toBe(false);
      });

      it('removes search and category filters, reporting each query change', async () => {
        const onFiltersChange = jasmine.createSpy('onFiltersChange');
        const vm = createViewModel({ onFiltersChange });

        await vm.applyFilters({ search: 'cafe', category: 'textiles' });
        onFiltersChange.calls.reset();

        await vm.removeFilter('search');
        expect(vm.filters.search).toBe('');
        expect(vm.filters.category).toBe('textiles');
        expect(onFiltersChange).toHaveBeenCalledWith('?category=textiles');

        await vm.removeFilter('category');
        expect(vm.filters.category).toBe('');
        expect(onFiltersChange).toHaveBeenCalledWith('');
      });

      it('treats an unknown filter key as a no-op that still commits the query', async () => {
        const onFiltersChange = jasmine.createSpy('onFiltersChange');
        const vm = createViewModel({ onFiltersChange });
        vm.filters = { search: 'cafe', category: '', minPrice: null, maxPrice: null };
        onFiltersChange.calls.reset();

        await vm.removeFilter('unknown');

        expect(vm.filters).toEqual({
          search: 'cafe',
          category: '',
          minPrice: null,
          maxPrice: null,
        });
        expect(onFiltersChange).toHaveBeenCalledWith('?q=cafe');
        expect(productsApi.getProducts).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: 'cafe',
        });
      });

      it('falls back to an empty category list when API data is not an array', async () => {
        const vm = createViewModel();
        categoriesApi.getCategories.and.resolveTo({ data: 'not-an-array' });

        await vm.loadCategories();

        expect(vm.categories).toEqual([]);
      });

      it('notifies a snapshot so a listener can unsubscribe and resubscribe during a change', async () => {
        const vm = createViewModel();
        const listenerA = jasmine.createSpy('listenerA');
        const listenerB = jasmine.createSpy('listenerB');
        const unsubscribeA = subscribe(vm, () => {
          listenerA();
          unsubscribeA();
          subscribe(vm, listenerB);
        });

        await vm.loadProducts();

        expect(listenerA).toHaveBeenCalledTimes(1);
        expect(listenerB).toHaveBeenCalledTimes(1);
      });

      it('characterizes that an unknown category is dropped without syncing the URL', async () => {
        const onFiltersChange = jasmine.createSpy('onFiltersChange');
        const vm = createViewModel({ onFiltersChange });
        vm.filters = { search: '', category: 'ghost', minPrice: null, maxPrice: null };

        await vm.loadProducts();

        expect(vm.filters.category).toBe('');
        expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 1, limit: 20 });
        expect(onFiltersChange).not.toHaveBeenCalled();
      });

      it('characterizes that setFiltersFromQuery does not clear a previous filterError', () => {
        const vm = createViewModel();
        vm.filterError = 'error anterior';

        vm.setFiltersFromQuery('?q=cafe');

        expect(vm.filters.search).toBe('cafe');
        expect(vm.filterError).toBe('error anterior');
      });
    });
  })();
})();
