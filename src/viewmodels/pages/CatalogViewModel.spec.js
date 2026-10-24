import { CatalogViewModel } from './CatalogViewModel.js';

describe('CatalogViewModel', () => {
  let viewModel;
  let productsApi;

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
    viewModel = new CatalogViewModel({ productsApi });
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
