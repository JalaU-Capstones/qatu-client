import { CategoriesApi } from './CategoriesApi.js';

describe('CategoriesApi', () => {
  let api;
  let originalFetch;

  const categories = [
    { id: 'c1', name: 'Electronics', slug: 'electronics', position: 1, is_active: true },
    { id: 'c2', name: 'Textiles', slug: 'textiles', position: 2, is_active: true },
  ];
  const meta = { page: 1, per_page: 100, total: 2, total_pages: 1 };

  beforeEach(() => {
    api = new CategoriesApi();
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it('should request the categories endpoint with page 1 and the maximum limit by default', async () => {
    window.fetch = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      json: () => Promise.resolve({ data: categories, meta }),
    });

    await api.getCategories();

    const calledUrl = window.fetch.calls.first().args[0];
    expect(calledUrl).toContain('/categories?');
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('limit=100');
  });

  it('should return parsed data and meta on a successful response', async () => {
    window.fetch = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      json: () => Promise.resolve({ data: categories, meta }),
    });

    const result = await api.getCategories();

    expect(result.data).toEqual(categories);
    expect(result.meta).toEqual(meta);
  });

  it('should throw an Error when the response is not ok', async () => {
    window.fetch = jasmine.createSpy('fetch').and.resolveTo({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expectAsync(api.getCategories()).toBeRejectedWithError(/500/);
  });
});
