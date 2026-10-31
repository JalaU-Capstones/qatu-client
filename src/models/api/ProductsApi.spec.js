import { ProductsApi } from './ProductsApi.js';
import { apiFetch } from './client.js';

describe('ProductsApi', () => {
  let fetchSpy;
  let api;

  /** Response helpers (list envelope, detail envelope, OpenAPI error). */
  const listResponse = (data, meta = { page: 1, per_page: 20, total: 1, total_pages: 1 }) =>
    new Response(JSON.stringify({ data, meta }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  const detailResponse = (product) =>
    new Response(JSON.stringify({ data: product, meta: { timestamp: '2026-10-26T12:00:00Z' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  const errorResponse = (status, code, message) =>
    new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  beforeEach(() => {
    fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValue(Promise.resolve(listResponse([])));
    api = new ProductsApi({ apiFetchFn: fetchSpy });
  });

  describe('getProducts', () => {
    it('constructor requires no arguments and defaults apiFetchFn to the real apiFetch', () => {
      const injected = new ProductsApi({ apiFetchFn: () => {} });
      expect(injected._fetch).not.toBe(apiFetch);
      const defaultApi = new ProductsApi();
      expect(defaultApi._fetch).toBe(apiFetch);
    });

    it('should call fetch with the correct URL using default page and limit', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      await api.getProducts();

      expect(fetchSpy).toHaveBeenCalledWith('/products?page=1&limit=20');
    });

    it('should call fetch with the specified page and limit', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      await api.getProducts({ page: 3, limit: 10 });

      expect(fetchSpy).toHaveBeenCalledWith('/products?page=3&limit=10');
    });

    it('should send search and filters with the API parameter names', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      await api.getProducts({
        page: 1,
        search: 'term',
        categoryId: 'cat',
        minPrice: 5,
        maxPrice: 10,
      });

      const url = new URL(fetchSpy.calls.first().args[0], 'http://x');
      expect(url.searchParams.get('search')).toBe('term');
      expect(url.searchParams.get('category_id')).toBe('cat');
      expect(url.searchParams.get('min_price')).toBe('5');
      expect(url.searchParams.get('max_price')).toBe('10');
    });

    it('should keep a price of 0 and leave empty filters out of the URL', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      await api.getProducts({ search: '', categoryId: '', minPrice: 0, maxPrice: null });

      const url = new URL(fetchSpy.calls.first().args[0], 'http://x');
      expect(url.searchParams.get('min_price')).toBe('0');
      expect(url.searchParams.has('search')).toBe(false);
      expect(url.searchParams.has('category_id')).toBe(false);
      expect(url.searchParams.has('max_price')).toBe(false);
    });

    it('should encode special characters in the search term', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      await api.getProducts({ search: '100% café & té' });

      const url = new URL(fetchSpy.calls.first().args[0], 'http://x');
      expect(url.searchParams.get('search')).toBe('100% café & té');
    });

    it('should return the parsed data and meta on a successful response', async () => {
      const mockProducts = [{ id: 'p1', name: 'Aguayo', slug: 'aguayo' }];
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse(mockProducts)));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const result = await api.getProducts({ page: 1 });

      expect(result.data).toEqual(mockProducts);
      expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1, total_pages: 1 });
    });

    it('should return an empty data array when the API returns no products', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const result = await api.getProducts();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw an Error carrying code and statusCode when response.ok is false (e.g. 500)', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(errorResponse(500, 'INTERNAL_ERROR', 'Boom')));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      try {
        await api.getProducts();
        fail('Expected getProducts to throw');
      } catch (err) {
        expect(err.message).toBe('Boom');
        expect(err.code).toBe('INTERNAL_ERROR');
        expect(err.statusCode).toBe(500);
      }
    });

    it('should propagate a network-level error when fetch rejects', async () => {
      const networkError = new Error('network down');
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValue(Promise.reject(networkError));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      await expectAsync(api.getProducts()).toBeRejectedWith(networkError);
    });
  });

  // ─── getFeaturedProducts ────────────────────────────────────────────────────

  describe('getFeaturedProducts', () => {
    it('should call GET /products with a small page and return the data list', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Aguayo', slug: 'aguayo' },
        { id: 'p2', name: 'Café', slug: 'cafe' },
      ];
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse(mockProducts)));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const products = await api.getFeaturedProducts();

      expect(fetchSpy).toHaveBeenCalledWith('/products?page=1&limit=8');
      expect(products).toEqual(mockProducts);
    });
  });

  // ─── getProductById ─────────────────────────────────────────────────────────

  describe('getProductById', () => {
    const mockDetail = {
      id: 'p1',
      name: 'Aguayo tradicional',
      slug: 'aguayo-tradicional',
      stock: 10,
      average_rating: 4.8,
      ratings_count: 24,
    };

    it('should fetch GET /products/{id} and return the parsed product detail', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(detailResponse(mockDetail)));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductById('p1');

      expect(fetchSpy).toHaveBeenCalledWith('/products/p1');
      expect(product).toEqual(mockDetail);
    });

    it('should throw an error with statusCode 404 when the product does not exist', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(
          Promise.resolve(errorResponse(404, 'PRODUCT_NOT_FOUND', 'Product not found'))
        );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      try {
        await api.getProductById('missing');
        fail('Expected getProductById to throw');
      } catch (err) {
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('PRODUCT_NOT_FOUND');
      }
    });
  });

  // ─── getProductBySlug ──────────────────────────────────────────────────────

  describe('getProductBySlug', () => {
    it('should return null for an empty slug without calling the API', async () => {
      fetchSpy = jasmine.createSpy('apiFetchFn');
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const result = await api.getProductBySlug('   ');

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should find the product on the first page via search and fetch its detail', async () => {
      const searchResult = [{ id: 'p1', slug: 'aguayo-tradicional' }];
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        Promise.resolve(listResponse(searchResult)), // search page
        Promise.resolve(detailResponse({ id: 'p1', slug: 'aguayo-tradicional' })) // detail
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductBySlug('aguayo-tradicional');

      expect(product.slug).toBe('aguayo-tradicional');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.calls.first().args[0]).toContain('search=');
      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/products/p1');
    });

    it('should scan further pages when the exact slug is not on page 1', async () => {
      const match = { id: 'p2', slug: 'aguayo-tradicional' };
      const searchPage = new Response(
        JSON.stringify({
          data: [{ id: 'p9', slug: 'otro-producto' }],
          meta: { page: 1, per_page: 100, total: 101, total_pages: 2 },
        }),
        { status: 200 }
      );
      const secondPage = new Response(
        JSON.stringify({
          data: [match],
          meta: { page: 2, per_page: 100, total: 101, total_pages: 2 },
        }),
        { status: 200 }
      );
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        Promise.resolve(searchPage), // search page 1 miss
        Promise.resolve(secondPage), // scan page 2 hit
        Promise.resolve(detailResponse(match))
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductBySlug('aguayo-tradicional');

      expect(product.id).toBe('p2');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.calls.first().args[0]).toContain('search=');
      expect(fetchSpy.calls.all()[1].args[0]).toBe('/products?page=2&limit=100');
      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/products/p2');
    });

    it('should return null when the slug does not match any product', async () => {
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: 'p9', slug: 'other-slug' }],
              meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
            }),
            { status: 200 }
          )
        )
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const result = await api.getProductBySlug('does-not-exist');

      expect(result).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return null when the detail quietly 404s (unpublished between list and detail)', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(
          Promise.resolve(listResponse([{ id: 'p1', slug: 'aguayo-tradicional' }])),
          Promise.resolve(errorResponse(404, 'PRODUCT_NOT_FOUND', 'Product not found'))
        );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const result = await api.getProductBySlug('aguayo-tradicional');

      expect(result).toBeNull();
    });
  });

  // ─── getSimilarProducts ────────────────────────────────────────────────────

  describe('getSimilarProducts', () => {
    it('should return three recommendations by default, excluding the current product', async () => {
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        Promise.resolve(
          listResponse([
            { id: 'p1', name: 'Uno', price: 10, stock: 1 },
            { id: 'p2', name: 'Dos', price: 20, stock: 2 },
            { id: 'p3', name: 'Tres', price: 30, stock: 3 },
            { id: 'p4', name: 'Cuatro', price: 40, stock: 4 },
            { id: 'p5', name: 'Cinco', price: 50, stock: 5 },
          ])
        )
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const similar = await api.getSimilarProducts('p1');

      expect(similar.length).toBe(3);
      expect(similar.some((product) => product.id === 'p1')).toBe(false);
      similar.forEach((product) => {
        expect(typeof product.id).toBe('string');
        expect(typeof product.name).toBe('string');
        expect(typeof product.price).toBe('number');
      });
    });

    it('should respect the requested limit', async () => {
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        Promise.resolve(
          listResponse([
            { id: 'p1', name: 'Uno' },
            { id: 'p2', name: 'Dos' },
            { id: 'p3', name: 'Tres' },
            { id: 'p4', name: 'Cuatro' },
            { id: 'p5', name: 'Cinco' },
          ])
        )
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const similar = await api.getSimilarProducts('p1', 2);

      expect(similar.length).toBe(2);
      expect(similar.map((product) => product.id)).toEqual(['p2', 'p3']);
    });

    it('should return an empty array when the response has no products', async () => {
      fetchSpy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValues(Promise.resolve(listResponse([])));
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const similar = await api.getSimilarProducts('p1');

      expect(similar).toEqual([]);
    });
  });
});
