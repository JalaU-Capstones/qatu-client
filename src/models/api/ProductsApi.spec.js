import { apiFetch } from './client.js';
import { ProductsApi } from './ProductsApi.js';

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
      const missItems = [{ id: 'p9', slug: 'otro-producto' }];
      const meta = { page: 1, per_page: 100, total: 101, total_pages: 2 };

      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        Promise.resolve(listResponse(missItems, meta)), // attempt 1: raw search miss
        Promise.resolve(listResponse(missItems, meta)), // attempt 2: spaced search miss
        Promise.resolve(listResponse(missItems, meta)), // attempt 3: full catalog page 1 miss
        Promise.resolve(
          listResponse([match], { page: 2, per_page: 100, total: 101, total_pages: 2 })
        ), // attempt 3: full catalog page 2 hit
        Promise.resolve(detailResponse(match))
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductBySlug('aguayo-tradicional');

      expect(product.id).toBe('p2');
      expect(fetchSpy).toHaveBeenCalledTimes(5);
      expect(fetchSpy.calls.first().args[0]).toContain('search=aguayo-tradicional');
      expect(fetchSpy.calls.all()[1].args[0]).toContain('search=aguayo+tradicional');
      expect(fetchSpy.calls.all()[2].args[0]).toBe('/products?page=1&limit=100');
      expect(fetchSpy.calls.all()[3].args[0]).toBe('/products?page=2&limit=100');
      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/products/p2');
    });

    it('should return null when the slug does not match any product', async () => {
      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValue(
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
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('retries with spaces when the raw slug search returns zero results (root-cause regression)', async () => {
      // Reproduces the exact bug: /products/stainless-steel-kitchen-knife-set
      // failed because the backend does not index hyphenated slugs.
      const slug = 'stainless-steel-kitchen-knife-set';
      const productId = '9e2b7c3a-5f4d-4c1e-8b2a-1f2e3d4c5b6a';

      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        // Attempt 1: raw slug → empty
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [],
              meta: { page: 1, per_page: 100, total: 0, total_pages: 0 },
            }),
            { status: 200 }
          )
        ),
        // Attempt 2: spaces → match
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: productId,
                  name: 'Stainless Steel Kitchen Knife Set',
                  slug: 'stainless-steel-kitchen-knife-set',
                },
              ],
              meta: { page: 1, per_page: 100, total: 1, total_pages: 1 },
            }),
            { status: 200 }
          )
        ),
        // Detail fetch
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: { id: productId, slug: 'stainless-steel-kitchen-knife-set' },
              meta: { timestamp: '2026-11-01T12:00:00Z' },
            }),
            { status: 200 }
          )
        )
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductBySlug(slug);

      expect(product).toEqual(
        jasmine.objectContaining({ id: productId, slug: 'stainless-steel-kitchen-knife-set' })
      );
      // Three calls: raw search, spaced search, detail
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.calls.argsFor(0)[0]).toContain('search=stainless-steel-kitchen-knife-set');
      expect(fetchSpy.calls.argsFor(1)[0]).toContain('search=stainless+steel+kitchen+knife+set');
      expect(fetchSpy.calls.argsFor(2)[0]).toBe(`/products/${productId}`);
    });

    it('paginates the FULL catalog (no search filter) when both searches miss', async () => {
      const slug = 'some-unique-slug';
      const productId = 'p-on-page-2';

      fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValues(
        // Attempt 1: empty
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [],
              meta: { page: 1, per_page: 100, total: 0, total_pages: 0 },
            }),
            { status: 200 }
          )
        ),
        // Attempt 2: empty
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [],
              meta: { page: 1, per_page: 100, total: 0, total_pages: 0 },
            }),
            { status: 200 }
          )
        ),
        // Attempt 3 page 1: miss
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: 'p-other', slug: 'other' }],
              meta: { page: 1, per_page: 100, total: 101, total_pages: 2 },
            }),
            { status: 200 }
          )
        ),
        // Attempt 3 page 2: hit
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: productId, slug }],
              meta: { page: 2, per_page: 100, total: 101, total_pages: 2 },
            }),
            { status: 200 }
          )
        ),
        // Detail fetch
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: { id: productId, slug },
              meta: { timestamp: '2026-11-01T12:00:00Z' },
            }),
            { status: 200 }
          )
        )
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductBySlug(slug);

      expect(product).toEqual(jasmine.objectContaining({ id: productId, slug }));
      // Page 2 of the fallback MUST NOT carry a `search` param.
      const page2Call = fetchSpy.calls.argsFor(3)[0];
      expect(page2Call).toBe('/products?page=2&limit=100');
      expect(page2Call).not.toContain('search=');
    });

    it('returns null only after exhausting all three attempts', async () => {
      fetchSpy = jasmine.createSpy('apiFetchFn').and.callFake(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: [],
              meta: { page: 1, per_page: 100, total: 0, total_pages: 0 },
            }),
            { status: 200 }
          )
        )
      );
      api = new ProductsApi({ apiFetchFn: fetchSpy });

      const product = await api.getProductBySlug('does-not-exist');

      expect(product).toBeNull();
      // Raw search, spaced search (spaces differ from raw), full-catalog page 1.
      expect(fetchSpy).toHaveBeenCalledTimes(3);
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

  // ─── Seller Products & Images (US-16) ──────────────────────────────────────

  describe('seller products and images', () => {
    afterEach(() => {
      document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    it('getSellerProducts calls apiFetch with /seller/products and withAuth: true', async () => {
      const mockProducts = [{ id: 'sp1', name: 'Seller Prod' }];
      fetchSpy.and.returnValue(Promise.resolve(listResponse(mockProducts)));

      const result = await api.getSellerProducts();

      expect(fetchSpy).toHaveBeenCalledWith('/seller/products', {
        method: 'GET',
        withAuth: true,
      });
      expect(result.data).toEqual(mockProducts);
      expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1, total_pages: 1 });
    });

    it('getSellerProducts appends page, limit, and status query parameters', async () => {
      await api.getSellerProducts({ page: 2, limit: 10, status: 'draft' });

      expect(fetchSpy).toHaveBeenCalledWith('/seller/products?page=2&limit=10&status=draft', {
        method: 'GET',
        withAuth: true,
      });
    });

    it('createProduct sends POST with JSON body and CSRF header via apiFetch', async () => {
      document.cookie = 'csrf_token=test-csrf-token; path=/';
      const windowFetchSpy = spyOn(window, 'fetch').and.resolveTo(
        detailResponse({ id: 'new-prod', name: 'New Product' })
      );
      const realApi = new ProductsApi();
      const payload = {
        name: 'New Product',
        price: 15.5,
        category_id: 'cat-123',
        slug: 'new-product',
      };

      const result = await realApi.createProduct(payload);

      expect(windowFetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/products$/),
        jasmine.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token',
          }),
        })
      );
      expect(result.data).toEqual(
        jasmine.objectContaining({ id: 'new-prod', name: 'New Product' })
      );
    });

    it('createProduct propagates SLUG_ALREADY_EXISTS as err.code and err.statusCode', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'SLUG_ALREADY_EXISTS',
                message: 'A product with this slug already exists',
                details: [{ field: 'slug', message: 'Slug already taken' }],
              },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.createProduct({ name: 'Dup', price: 10, category_id: 'c1' });
        fail('Expected createProduct to throw');
      } catch (err) {
        expect(err.code).toBe('SLUG_ALREADY_EXISTS');
        expect(err.statusCode).toBe(409);
        expect(err.message).toBe('A product with this slug already exists');
        expect(err.details).toEqual([{ field: 'slug', message: 'Slug already taken' }]);
      }
    });

    it('publishProduct sends PATCH to /products/:id/publish with no body', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(detailResponse({ id: 'prod-1', status: 'published' }))
      );

      const result = await api.publishProduct('prod-1');

      expect(fetchSpy).toHaveBeenCalledWith('/products/prod-1/publish', {
        method: 'PATCH',
        withAuth: true,
      });
      expect(result.data).toEqual(jasmine.objectContaining({ id: 'prod-1', status: 'published' }));
    });

    it('publishProduct propagates IMAGE_REQUIRED (422) error', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'IMAGE_REQUIRED',
                message: 'At least one product image is required to publish',
              },
            }),
            { status: 422, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.publishProduct('prod-no-image');
        fail('Expected publishProduct to throw');
      } catch (err) {
        expect(err.code).toBe('IMAGE_REQUIRED');
        expect(err.statusCode).toBe(422);
        expect(err.message).toBe('At least one product image is required to publish');
      }
    });

    it('uploadProductImage sends POST with FormData body and no explicit Content-Type', async () => {
      const windowFetchSpy = spyOn(window, 'fetch').and.resolveTo(
        detailResponse({ id: 'img-1', path: 'product-images/p1/img-1.png' })
      );
      const realApi = new ProductsApi();
      const file = new File(['dummy-content'], 'test.png', { type: 'image/png' });

      const result = await realApi.uploadProductImage('prod-1', file);

      const [, init] = windowFetchSpy.calls.first().args;
      expect(init.method).toBe('POST');
      expect(init.body instanceof FormData).toBe(true);
      expect(init.body.has('image')).toBe(true);
      expect(init.headers['Content-Type']).toBeUndefined();
      expect(result.data).toEqual(jasmine.objectContaining({ id: 'img-1' }));
    });

    it('uploadProductImage appends alt_text and position to FormData when provided', async () => {
      let capturedBody;
      fetchSpy.and.callFake((path, opts) => {
        capturedBody = opts.body;
        return Promise.resolve(detailResponse({ id: 'img-1' }));
      });
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

      await api.uploadProductImage('prod-1', file, { alt_text: 'front', position: 0 });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/products/prod-1/images',
        jasmine.objectContaining({
          method: 'POST',
          withAuth: true,
        })
      );
      expect(capturedBody instanceof FormData).toBe(true);
      expect(capturedBody.get('alt_text')).toBe('front');
      expect(capturedBody.get('position')).toBe('0');
      expect(capturedBody.get('image')).toBeTruthy();
    });

    it('uploadProductImage throws VALIDATION_ERROR when file is null or undefined', async () => {
      try {
        await api.uploadProductImage('prod-1', null);
        fail('Expected uploadProductImage to throw');
      } catch (err) {
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.message).toBe('File is required');
      }
    });

    it('listProductImages sends GET to /products/:id/images and returns data and meta', async () => {
      const mockImages = [
        { id: 'img-1', path: 'product-images/p1/img-1.png', is_primary: true },
        { id: 'img-2', path: 'product-images/p1/img-2.png', is_primary: false },
      ];
      fetchSpy.and.returnValue(Promise.resolve(listResponse(mockImages)));

      const result = await api.listProductImages('prod-1');

      expect(fetchSpy).toHaveBeenCalledWith('/products/prod-1/images', {
        method: 'GET',
      });
      expect(result.data).toEqual(mockImages);
      expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1, total_pages: 1 });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Sprint 7 (C1): unpublishProduct, updateProduct, deleteProduct,
  //                deleteProductImage
  // ─────────────────────────────────────────────────────────────

  describe('unpublishProduct', () => {
    it('sends PATCH to /products/:id/unpublish with withAuth and no body', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(detailResponse({ id: 'prod-1', state: 'unpublished' }))
      );

      await api.unpublishProduct('prod-1');

      expect(fetchSpy).toHaveBeenCalledWith('/products/prod-1/unpublish', {
        method: 'PATCH',
        withAuth: true,
      });
    });

    it('passes withAuth: true', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(detailResponse({ id: 'prod-1', state: 'unpublished' }))
      );

      await api.unpublishProduct('prod-1');

      const opts = fetchSpy.calls.mostRecent().args[1];
      expect(opts.withAuth).toBe(true);
    });

    it('returns the parsed { data, meta } envelope on 200', async () => {
      const mockProduct = { id: 'prod-1', state: 'unpublished', name: 'Poncho' };
      fetchSpy.and.returnValue(Promise.resolve(detailResponse(mockProduct)));

      const result = await api.unpublishProduct('prod-1');

      expect(result.data).toEqual(jasmine.objectContaining({ id: 'prod-1', state: 'unpublished' }));
      expect(result.meta).toBeDefined();
    });

    it('URL-encodes the productId', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(detailResponse({ id: 'prod/with/slashes', state: 'unpublished' }))
      );

      await api.unpublishProduct('prod/with/slashes');

      const url = fetchSpy.calls.mostRecent().args[0];
      expect(url).toBe('/products/prod%2Fwith%2Fslashes/unpublish');
    });

    it('throws with correct code and statusCode on 409 INVALID_STATE_TRANSITION', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: 'Cannot unpublish a product in its current state',
              },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.unpublishProduct('prod-1');
        fail('Expected unpublishProduct to throw');
      } catch (err) {
        expect(err.code).toBe('INVALID_STATE_TRANSITION');
        expect(err.statusCode).toBe(409);
        expect(err.message).toContain('Cannot unpublish');
      }
    });

    it('throws with code FORBIDDEN on 403', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Access denied' } }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      try {
        await api.unpublishProduct('prod-other');
        fail('Expected to throw');
      } catch (err) {
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
      }
    });
  });

  describe('updateProduct', () => {
    it('sends PATCH to /products/:id with the fields payload and Content-Type header', async () => {
      const fields = { name: 'Updated Name', price: 59.99 };
      fetchSpy.and.returnValue(
        Promise.resolve(detailResponse({ id: 'prod-1', name: 'Updated Name', price: 59.99 }))
      );

      await api.updateProduct('prod-1', fields);

      const [url, opts] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('/products/prod-1');
      expect(opts.method).toBe('PATCH');
      expect(opts.withAuth).toBe(true);
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.body).toBe(JSON.stringify(fields));
    });

    it('passes withAuth: true', async () => {
      fetchSpy.and.returnValue(Promise.resolve(detailResponse({ id: 'prod-1', name: 'X' })));

      await api.updateProduct('prod-1', { name: 'X' });

      expect(fetchSpy.calls.mostRecent().args[1].withAuth).toBe(true);
    });

    it('JSON-stringifies the fields in the request body', async () => {
      const fields = { name: 'Aguayo', price: 29, stock: 5 };
      fetchSpy.and.returnValue(Promise.resolve(detailResponse({ id: 'prod-1' })));

      await api.updateProduct('prod-1', fields);

      expect(fetchSpy.calls.mostRecent().args[1].body).toBe(JSON.stringify(fields));
    });

    it('returns the parsed { data, meta } envelope on 200', async () => {
      const mockProduct = { id: 'prod-1', name: 'New Name', price: 99 };
      fetchSpy.and.returnValue(Promise.resolve(detailResponse(mockProduct)));

      const result = await api.updateProduct('prod-1', { name: 'New Name', price: 99 });

      expect(result.data).toEqual(jasmine.objectContaining({ id: 'prod-1', name: 'New Name' }));
      expect(result.meta).toBeDefined();
    });

    it('throws VALIDATION_ERROR (400) without calling _fetch when fields is empty {}', async () => {
      try {
        await api.updateProduct('prod-1', {});
        fail('Expected updateProduct to throw');
      } catch (err) {
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('At least one field is required');
        expect(fetchSpy.calls.count()).toBe(0);
      }
    });

    it('throws VALIDATION_ERROR without calling _fetch when fields is null', async () => {
      try {
        await api.updateProduct('prod-1', null);
        fail('Expected updateProduct to throw');
      } catch (err) {
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(fetchSpy.calls.count()).toBe(0);
      }
    });

    it('throws with correct code and statusCode on 400 from backend', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: 'VALIDATION_ERROR', message: 'Invalid field: slug' },
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.updateProduct('prod-1', { name: 'X', slug: 'bad-field' });
        fail('Expected updateProduct to throw');
      } catch (err) {
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.statusCode).toBe(400);
      }
    });

    it('URL-encodes the productId', async () => {
      fetchSpy.and.returnValue(Promise.resolve(detailResponse({ id: 'prod/1' })));

      await api.updateProduct('prod/1', { name: 'X' });

      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/products/prod%2F1');
    });
  });

  describe('deleteProduct', () => {
    it('sends DELETE to /products/:id with withAuth', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

      await api.deleteProduct('prod-1');

      expect(fetchSpy).toHaveBeenCalledWith('/products/prod-1', {
        method: 'DELETE',
        withAuth: true,
      });
    });

    it('passes withAuth: true', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

      await api.deleteProduct('prod-1');

      expect(fetchSpy.calls.mostRecent().args[1].withAuth).toBe(true);
    });

    it('returns undefined on 204 No Content without attempting to parse body', async () => {
      // The body stream is null/empty; if _handleJson tried res.json() it would throw
      const jsonSpy = jasmine.createSpy('json').and.rejectWith(new SyntaxError('no body'));
      fetchSpy.and.returnValue(Promise.resolve({ ok: true, status: 204, json: jsonSpy }));

      const result = await api.deleteProduct('prod-1');

      expect(result).toBeUndefined();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('URL-encodes the productId', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

      await api.deleteProduct('prod/1');

      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/products/prod%2F1');
    });

    it('throws with correct code and statusCode on 404', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.deleteProduct('prod-missing');
        fail('Expected deleteProduct to throw');
      } catch (err) {
        expect(err.code).toBe('PRODUCT_NOT_FOUND');
        expect(err.statusCode).toBe(404);
      }
    });

    it('throws with code FORBIDDEN on 403', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Not your product' } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.deleteProduct('prod-other');
        fail('Expected to throw');
      } catch (err) {
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
      }
    });
  });

  describe('deleteProductImage', () => {
    it('sends DELETE to /products/:id/images/:imageId with withAuth', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

      await api.deleteProductImage('prod-1', 'img-1');

      expect(fetchSpy).toHaveBeenCalledWith('/products/prod-1/images/img-1', {
        method: 'DELETE',
        withAuth: true,
      });
    });

    it('passes withAuth: true', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

      await api.deleteProductImage('prod-1', 'img-1');

      expect(fetchSpy.calls.mostRecent().args[1].withAuth).toBe(true);
    });

    it('returns undefined on 204 No Content without attempting to parse body', async () => {
      const jsonSpy = jasmine.createSpy('json').and.rejectWith(new SyntaxError('no body'));
      fetchSpy.and.returnValue(Promise.resolve({ ok: true, status: 204, json: jsonSpy }));

      const result = await api.deleteProductImage('prod-1', 'img-1');

      expect(result).toBeUndefined();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('URL-encodes both productId and imageId', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

      await api.deleteProductImage('prod/1', 'img/2');

      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/products/prod%2F1/images/img%2F2');
    });

    it('throws with correct code and statusCode on 409 INVALID_STATE_TRANSITION', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: 'Cannot delete image of a published product',
              },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.deleteProductImage('prod-1', 'img-1');
        fail('Expected deleteProductImage to throw');
      } catch (err) {
        expect(err.code).toBe('INVALID_STATE_TRANSITION');
        expect(err.statusCode).toBe(409);
      }
    });

    it('throws with code FORBIDDEN on 403', async () => {
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Not your image' } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      try {
        await api.deleteProductImage('prod-other', 'img-other');
        fail('Expected to throw');
      } catch (err) {
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
      }
    });
  });
});
