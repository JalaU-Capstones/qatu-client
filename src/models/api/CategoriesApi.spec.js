import { CategoriesApi } from './CategoriesApi.js';

describe('CategoriesApi', () => {
  let api;
  let fetchSpy;
  let originalFetch;

  const categories = [
    { id: 'c1', name: 'Electronics', slug: 'electronics', position: 1, is_active: true },
    { id: 'c2', name: 'Textiles', slug: 'textiles', position: 2, is_active: true },
  ];
  const meta = { page: 1, per_page: 100, total: 2, total_pages: 1 };

  const jsonResponse = (body, { status = 200, ok = true } = {}) => ({
    ok,
    status,
    json: () => Promise.resolve(body),
  });

  const errorResponse = (status, code, message) =>
    jsonResponse({ error: { code, message } }, { status, ok: false });

  beforeEach(() => {
    fetchSpy = jasmine.createSpy('apiFetchFn');
    api = new CategoriesApi({ apiFetchFn: fetchSpy });
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('defaults apiFetchFn to the shared apiFetch implementation', () => {
      const defaultApi = new CategoriesApi();

      expect(typeof defaultApi._fetch).toBe('function');
      expect(defaultApi._fetch).not.toBe(fetchSpy);
    });
  });

  describe('getCategories', () => {
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

    it('should forward custom pagination parameters', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: { page: 2, per_page: 20, total: 0 } }),
      });

      await api.getCategories({ page: 2, limit: 20 });

      const calledUrl = window.fetch.calls.first().args[0];
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=20');
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

    it('should reject when the server answers 403 Forbidden', async () => {
      window.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expectAsync(api.getCategories()).toBeRejectedWithError(/403/);
    });
  });

  describe('createCategory', () => {
    it('sends a POST to /admin/categories with auth and a trimmed, serialized body', async () => {
      fetchSpy.and.resolveTo(
        jsonResponse({ data: { id: 'c3', name: 'Electrónica' }, meta: { timestamp: 'now' } })
      );

      await api.createCategory({
        name: '  Electrónica  ',
        slug: '  ELECTRONICA ',
        description: '  Dispositivos y gadgets  ',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [path, options] = fetchSpy.calls.mostRecent().args;
      expect(path).toBe('/admin/categories');
      expect(options.method).toBe('POST');
      expect(options.withAuth).toBe(true);
      expect(JSON.parse(options.body)).toEqual({
        name: 'Electrónica',
        slug: 'electronica',
        description: 'Dispositivos y gadgets',
      });
    });

    it('serializes an empty description as null and omits an empty slug', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: { id: 'c4' }, meta: {} }));

      await api.createCategory({ name: ' Ropa ', slug: '   ', description: '   ' });

      const options = fetchSpy.calls.mostRecent().args[1];
      expect(JSON.parse(options.body)).toEqual({
        name: 'Ropa',
        description: null,
      });
    });

    it('returns the parsed data and meta from the API', async () => {
      const created = { id: 'c5', name: 'Alimentos', slug: 'alimentos' };
      fetchSpy.and.resolveTo(jsonResponse({ data: created, meta: { timestamp: 'now' } }));

      const result = await api.createCategory({ name: 'Alimentos' });

      expect(result.data).toEqual(created);
      expect(result.meta).toEqual({ timestamp: 'now' });
    });

    it('throws an Error with statusCode and code when the backend answers 409', async () => {
      fetchSpy.and.resolveTo(
        errorResponse(409, 'CONFLICT', 'A category with this name already exists')
      );

      try {
        await api.createCategory({ name: 'Electrónica' });
        fail('Expected createCategory to throw');
      } catch (err) {
        expect(err.message).toBe('A category with this name already exists');
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('CONFLICT');
      }
    });

    it('throws an Error with statusCode 403 when the admin is forbidden', async () => {
      fetchSpy.and.resolveTo(errorResponse(403, 'FORBIDDEN', 'Forbidden'));

      try {
        await api.createCategory({ name: 'Electrónica' });
        fail('Expected createCategory to throw');
      } catch (err) {
        expect(err.message).toBe('Forbidden');
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('updateCategory', () => {
    it('sends a PATCH to the encoded category URL with auth and a trimmed body', async () => {
      fetchSpy.and.resolveTo(
        jsonResponse({ data: { id: 'cat 1/2', name: 'Hogar' }, meta: { timestamp: 'now' } })
      );

      await api.updateCategory('cat 1/2', {
        name: '  Hogar  ',
        slug: '  HOGAR ',
        description: '  Artículos para el hogar  ',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [path, options] = fetchSpy.calls.mostRecent().args;
      expect(path).toBe('/admin/categories/cat%201%2F2');
      expect(options.method).toBe('PATCH');
      expect(options.withAuth).toBe(true);
      expect(JSON.parse(options.body)).toEqual({
        name: 'Hogar',
        slug: 'hogar',
        description: 'Artículos para el hogar',
      });
    });

    it('only serializes the fields present in the payload', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: { id: 'c1' }, meta: {} }));

      await api.updateCategory('c1', { name: 'Nuevo nombre' });

      const options = fetchSpy.calls.mostRecent().args[1];
      expect(JSON.parse(options.body)).toEqual({ name: 'Nuevo nombre' });
    });

    it('returns the parsed data and meta from the API', async () => {
      const updated = { id: 'c1', name: 'Tecnología', slug: 'tecnologia' };
      fetchSpy.and.resolveTo(jsonResponse({ data: updated, meta: { timestamp: 'now' } }));

      const result = await api.updateCategory('c1', { name: 'Tecnología' });

      expect(result.data).toEqual(updated);
      expect(result.meta).toEqual({ timestamp: 'now' });
    });

    it('throws an Error with statusCode 403 when the admin is forbidden', async () => {
      fetchSpy.and.resolveTo(errorResponse(403, 'FORBIDDEN', 'Forbidden'));

      try {
        await api.updateCategory('c1', { name: 'Tecnología' });
        fail('Expected updateCategory to throw');
      } catch (err) {
        expect(err.message).toBe('Forbidden');
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('deleteCategory', () => {
    it('sends a DELETE to the encoded category URL with auth and no body', async () => {
      fetchSpy.and.resolveTo({ ok: true, status: 204 });

      await api.deleteCategory('cat 1/2');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('/admin/categories/cat%201%2F2', {
        method: 'DELETE',
        withAuth: true,
      });
    });

    it('resolves with undefined for a 204 No Content response without parsing a body', async () => {
      const jsonSpy = jasmine.createSpy('json');
      fetchSpy.and.resolveTo({ ok: true, status: 204, json: jsonSpy });

      const result = await api.deleteCategory('c1');

      expect(result).toBeUndefined();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('throws statusCode 409 and message "Category in use" when the backend rejects the delete', async () => {
      fetchSpy.and.resolveTo(errorResponse(409, 'CONFLICT', 'Category in use'));

      try {
        await api.deleteCategory('c1');
        fail('Expected deleteCategory to throw');
      } catch (err) {
        expect(err.message).toBe('Category in use');
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('CONFLICT');
      }
    });

    it('throws an Error with statusCode 403 when the admin is forbidden', async () => {
      fetchSpy.and.resolveTo(errorResponse(403, 'FORBIDDEN', 'Forbidden'));

      try {
        await api.deleteCategory('c1');
        fail('Expected deleteCategory to throw');
      } catch (err) {
        expect(err.message).toBe('Forbidden');
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
      }
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('CategoriesApi (recovered 1)', () => {
    let api;
    let fetchSpy;
    let originalFetch;

    const jsonResponse = (body, { status = 200, ok = true } = {}) => ({
      ok,
      status,
      json: () => Promise.resolve(body),
    });

    const errorResponse = (status, code, message) =>
      jsonResponse({ error: { code, message } }, { status, ok: false });

    beforeEach(() => {
      fetchSpy = jasmine.createSpy('apiFetchFn');
      api = new CategoriesApi({ apiFetchFn: fetchSpy });
      originalFetch = window.fetch;
    });

    afterEach(() => {
      window.fetch = originalFetch;
    });

    describe('deleteCategory (recovered 2)', () => {
      it('throws statusCode 409 and message "Category in use" when the backend rejects the delete', async () => {
        fetchSpy.and.resolveTo(errorResponse(409, 'CONFLICT', 'Category in use'));

        try {
          await api.deleteCategory('c1');
          fail('Expected deleteCategory to throw');
        } catch (err) {
          expect(err.message).toBe('Category in use');
          expect(err.statusCode).toBe(409);
          expect(err.code).toBe('CONFLICT');
        }
      });
    });
  });

  (() => {
    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    describe('CategoriesApi additional branches (recovered 3)', () => {
      let fetchFn;
      let api;

      beforeEach(() => {
        fetchFn = jasmine.createSpy('apiFetchFn');
        api = new CategoriesApi({ apiFetchFn: fetchFn });
      });

      it('normalizes optional create fields, including parent_id', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: { id: 'c1' } }));

        await api.createCategory({
          name: '  joyería  ',
          slug: '  Joyeria  ',
          description: null,
          parent_id: 'root',
        });

        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({
          name: 'joyería',
          slug: 'joyeria',
          description: null,
          parent_id: 'root',
        });
      });

      it('omits non-string slugs and coerces empty parent_id to null on create', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));

        await api.createCategory({
          name: 42,
          slug: 123,
          description: 7,
          parent_id: '',
        });

        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({
          name: '',
          description: null,
          parent_id: null,
        });
      });

      it('applies distinct update payload rules for slug, description and parent_id', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));

        await api.updateCategory('cat%20/1', {
          name: null,
          slug: null,
          description: '  ',
          parent_id: 0,
        });

        expect(fetchFn.calls.first().args[0]).toBe('/admin/categories/cat%2520%2F1');
        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({
          name: '',
          slug: 'null',
          description: null,
          parent_id: null,
        });
      });

      it('includes whitespace-only slugs on update but omits an empty string', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));

        await api.updateCategory('c1', { slug: '  ' });
        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({ slug: '' });

        await api.updateCategory('c1', { slug: '' });
        expect(JSON.parse(fetchFn.calls.mostRecent().args[1].body)).toEqual({});
      });

      it('validates a non-204 delete response and resolves without a value', async () => {
        const body = { data: { deleted: true }, meta: {} };
        fetchFn.and.resolveTo(jsonResponse(body, 200));

        await expectAsync(api.deleteCategory('c1')).toBeResolved();
      });

      it('maps status codes when the error body has no code', async () => {
        const cases = [
          [400, 'VALIDATION_ERROR'],
          [401, 'UNAUTHORIZED'],
          [404, 'NOT_FOUND'],
          [422, 'UNPROCESSABLE_ENTITY'],
          [500, 'UNKNOWN_ERROR'],
        ];
        for (const [status, code] of cases) {
          fetchFn.and.resolveTo(new Response('', { status }));
          let error;
          try {
            await api.createCategory({ name: 'x' });
          } catch (caught) {
            error = caught;
          }
          expect(error.code).toBe(code);
          expect(error.statusCode).toBe(status);
          expect(error.message).toBe(`Failed to create category (${status})`);
        }
      });

      it('propagates backend details and falls back when JSON parsing fails', async () => {
        fetchFn.and.resolveTo(
          jsonResponse({ error: { code: 'CONFLICT', details: [{ field: 'slug' }] } }, 409)
        );
        let error;
        try {
          await api.updateCategory('c1', { name: 'x' });
        } catch (caught) {
          error = caught;
        }
        expect(error.code).toBe('CONFLICT');
        expect(error.details).toEqual([{ field: 'slug' }]);
        expect(error.message).toBe('Failed to update category (409)');

        fetchFn.and.resolveTo(new Response('not-json', { status: 500 }));
        await expectAsync(api.deleteCategory('c1')).toBeRejectedWithError(
          'Failed to delete category (500)'
        );
      });

      it('uses window.fetch for getCategories, ignoring the injected fetch function', async () => {
        const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
          jsonResponse({ data: [], meta: {} }, 200)
        );

        const result = await api.getCategories({ page: 2, limit: 50 });

        expect(result.data).toEqual([]);
        expect(fetchFn).not.toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/categories\?page=2&limit=50$/)
        );
      });

      it('throws on a failed getCategories response with the exact message', async () => {
        spyOn(window, 'fetch').and.resolveTo(
          new Response('', { status: 503, statusText: 'Unavailable' })
        );

        await expectAsync(api.getCategories()).toBeRejectedWithError(
          'Failed to fetch categories: 503 Unavailable'
        );
      });
    });
  })();
})();
