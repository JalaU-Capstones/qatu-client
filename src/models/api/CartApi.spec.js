import { CartApi } from './CartApi.js';
import { apiFetch } from './client.js';

describe('CartApi', () => {
  let fetchSpy;
  let api;

  beforeEach(() => {
    fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: { id: 'c1', product_id: 'p1', quantity: 1 },
            meta: { timestamp: '2026-10-26T12:00:00Z' },
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );
    api = new CartApi({ apiFetchFn: fetchSpy });
  });

  it('constructor requires no arguments and defaults apiFetchFn to the real apiFetch', () => {
    const defaultApi = new CartApi();
    expect(defaultApi._fetch).toBe(apiFetch);
  });

  it('constructor accepts an injected apiFetchFn', () => {
    const customFetch = () => {};
    const customApi = new CartApi({ apiFetchFn: customFetch });
    expect(customApi._fetch).toBe(customFetch);
  });

  it('addItem throws INVALID_REQUEST (statusCode 400) when productId is empty', async () => {
    try {
      await api.addItem({ productId: '' });
      fail('Expected addItem to throw');
    } catch (err) {
      expect(err.message).toBe('productId is required');
      expect(err.code).toBe('INVALID_REQUEST');
      expect(err.statusCode).toBe(400);
    }
  });

  it('addItem throws INVALID_REQUEST when productId is not a string', async () => {
    try {
      await api.addItem({ productId: 123 });
      fail('Expected addItem to throw');
    } catch (err) {
      expect(err.message).toBe('productId is required');
      expect(err.code).toBe('INVALID_REQUEST');
      expect(err.statusCode).toBe(400);
    }
  });

  it('addItem calls apiFetch with POST /cart/items and { withAuth: true }', async () => {
    await api.addItem({ productId: 'p1', quantity: 2 });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/cart/items',
      jasmine.objectContaining({
        method: 'POST',
        withAuth: true,
      })
    );
  });

  it('addItem sends body as JSON { product_id, quantity: 1 } when quantity omitted', async () => {
    await api.addItem({ productId: 'p1' });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/cart/items',
      jasmine.objectContaining({
        body: JSON.stringify({ product_id: 'p1', quantity: 1 }),
      })
    );
  });

  it('addItem sends body { product_id, quantity: 3 } when quantity provided', async () => {
    await api.addItem({ productId: 'p1', quantity: 3 });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/cart/items',
      jasmine.objectContaining({
        body: JSON.stringify({ product_id: 'p1', quantity: 3 }),
      })
    );
  });

  it('addItem returns the parsed body { data, meta } on 201', async () => {
    const result = await api.addItem({ productId: 'p1', quantity: 1 });
    expect(result).toEqual({
      data: { id: 'c1', product_id: 'p1', quantity: 1 },
      meta: { timestamp: '2026-10-26T12:00:00Z' },
    });
  });

  it('addItem throws an error with .code, .statusCode, .details on 404 PRODUCT_NOT_FOUND', async () => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Product not found',
              details: [{ field: 'productId', message: 'Does not exist' }],
            },
          }),
          { status: 404 }
        )
      )
    );

    try {
      await api.addItem({ productId: 'missing-p' });
      fail('Expected addItem to throw');
    } catch (err) {
      expect(err.message).toBe('Product not found');
      expect(err.code).toBe('PRODUCT_NOT_FOUND');
      expect(err.statusCode).toBe(404);
      expect(err.details).toEqual([{ field: 'productId', message: 'Does not exist' }]);
    }
  });

  it('addItem throws an error with .code = "PRODUCT_OUT_OF_STOCK" on 422', async () => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'PRODUCT_OUT_OF_STOCK',
              message: 'Insufficient stock',
            },
          }),
          { status: 422 }
        )
      )
    );

    try {
      await api.addItem({ productId: 'p1', quantity: 999 });
      fail('Expected addItem to throw');
    } catch (err) {
      expect(err.message).toBe('Insufficient stock');
      expect(err.code).toBe('PRODUCT_OUT_OF_STOCK');
      expect(err.statusCode).toBe(422);
    }
  });

  it('addItem propagates SESSION_EXPIRED errors from apiFetch unchanged (does not catch 401)', async () => {
    const sessionExpiredErr = new Error('SESSION_EXPIRED');
    sessionExpiredErr.code = 'SESSION_EXPIRED';
    sessionExpiredErr.status = 401;
    fetchSpy.and.returnValue(Promise.reject(sessionExpiredErr));

    try {
      await api.addItem({ productId: 'p1' });
      fail('Expected addItem to throw');
    } catch (err) {
      expect(err).toBe(sessionExpiredErr);
    }
  });
});
