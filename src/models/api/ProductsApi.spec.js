import { ProductsApi } from './ProductsApi.js';

describe('ProductsApi', () => {
  let api;

  beforeEach(() => {
    api = new ProductsApi();
  });

  // ─── getFeaturedProducts ────────────────────────────────────────────────────

  it('should return the 8 featured products from the design with unique ids', async () => {
    const products = await api.getFeaturedProducts();

    expect(products.length).toBe(8);
    expect(new Set(products.map((product) => product.id)).size).toBe(8);
    expect(products[0].name).toBe('Aguayo tradicional de Tarabuco');
    expect(products[7].name).toBe('Huipil bordado guatemalteco');
  });

  it('should return products with every field the section needs', async () => {
    const products = await api.getFeaturedProducts();

    products.forEach((product) => {
      expect(typeof product.id).toBe('string');
      expect(typeof product.name).toBe('string');
      expect(typeof product.seller).toBe('string');
      expect(typeof product.country).toBe('string');
      expect(typeof product.rating).toBe('number');
      expect(typeof product.ratingsCount).toBe('number');
      expect(typeof product.price).toBe('number');
      expect(product.currency).toBe('USD');
      expect(product.imageUrl).toBeNull();
    });
  });

  it('should not share objects between calls', async () => {
    const first = await api.getFeaturedProducts();
    first[0].name = 'Changed';

    const second = await api.getFeaturedProducts();
    expect(second[0].name).toBe('Aguayo tradicional de Tarabuco');
  });

  // ─── getProducts ────────────────────────────────────────────────────────────

  describe('getProducts', () => {
    const mockMeta = { page: 1, per_page: 20, total: 2, total_pages: 1 };
    const mockProducts = [
      {
        id: 'p1',
        name: 'Producto Uno',
        price: 10,
        currency: 'USD',
        primary_image_path: null,
        seller_id: 's1',
      },
      {
        id: 'p2',
        name: 'Producto Dos',
        price: 20,
        currency: 'USD',
        primary_image_path: null,
        seller_id: 's2',
      },
    ];

    let originalFetch;

    beforeEach(() => {
      originalFetch = window.fetch;
    });

    afterEach(() => {
      window.fetch = originalFetch;
    });

    it('should call fetch with the correct URL using default page and limit', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ data: mockProducts, meta: mockMeta }),
      });

      await api.getProducts();

      expect(window.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = window.fetch.calls.first().args[0];
      expect(calledUrl).toContain('/products');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=20');
    });

    it('should call fetch with the specified page and limit', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { page: 3, per_page: 10, total: 25, total_pages: 3 },
          }),
      });

      await api.getProducts({ page: 3, limit: 10 });

      const calledUrl = window.fetch.calls.first().args[0];
      expect(calledUrl).toContain('page=3');
      expect(calledUrl).toContain('limit=10');
    });

    it('should return parsed data and meta on a successful response', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ data: mockProducts, meta: mockMeta }),
      });

      const result = await api.getProducts({ page: 1 });

      expect(result.data).toEqual(mockProducts);
      expect(result.meta).toEqual(mockMeta);
    });

    it('should return an empty data array when the API returns no products', async () => {
      const emptyMeta = { page: 1, per_page: 20, total: 0, total_pages: 0 };
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: emptyMeta }),
      });

      const result = await api.getProducts();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should throw an Error when response.ok is false (e.g. 404)', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expectAsync(api.getProducts()).toBeRejectedWithError(/404/);
    });

    it('should throw an Error when response.ok is false (e.g. 500)', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expectAsync(api.getProducts()).toBeRejectedWithError(/500/);
    });

    it('should propagate a network-level error when fetch rejects', async () => {
      const networkError = new Error('Network failure');
      window.fetch = jasmine.createSpy('fetch').and.rejectWith(networkError);

      await expectAsync(api.getProducts()).toBeRejectedWith(networkError);
    });
  });
});
