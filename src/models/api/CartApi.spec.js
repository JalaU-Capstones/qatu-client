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

  it('addItem calls apiFetch with POST /cart/items', async () => {
    await api.addItem({ productId: 'p1', quantity: 2 });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/cart/items',
      jasmine.objectContaining({
        method: 'POST',
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

  describe('getCart', () => {
    it('sends ?include=product when include=[product] is passed', async () => {
      const spy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValue(
          Promise.resolve(
            new Response(
              JSON.stringify({ data: [], meta: { timestamp: '2026-11-01T12:00:00Z' } }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          )
        );
      const localApi = new CartApi({ apiFetchFn: spy });
      await localApi.getCart({ include: ['product'] });
      expect(spy).toHaveBeenCalledWith('/cart?include=product');
    });

    it('omits the query string when include is empty or contains unsupported values', async () => {
      const spy = jasmine
        .createSpy('apiFetchFn')
        .and.returnValue(
          Promise.resolve(
            new Response(
              JSON.stringify({ data: [], meta: { timestamp: '2026-11-01T12:00:00Z' } }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          )
        );
      const localApi = new CartApi({ apiFetchFn: spy });

      await localApi.getCart();
      expect(spy.calls.argsFor(0)[0]).toBe('/cart');

      await localApi.getCart({ include: ['not-supported'] });
      expect(spy.calls.argsFor(1)[0]).toBe('/cart');
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('CartApi (recovered 1)', () => {
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
  });

  (() => {
    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    describe('CartApi additional branches (recovered 2)', () => {
      let fetchFn;
      let api;

      beforeEach(() => {
        fetchFn = jasmine.createSpy('apiFetchFn');
        api = new CartApi({ apiFetchFn: fetchFn });
      });

      describe('updateItem (recovered 3)', () => {
        it('rejects missing, empty and non-string cart item ids before calling the API', async () => {
          for (const cartItemId of [undefined, null, '', 42, {}]) {
            let error;
            try {
              await api.updateItem({ cartItemId, quantity: 2 });
            } catch (caught) {
              error = caught;
            }
            expect(error.message).toBe('cartItemId is required');
            expect(error.code).toBe('INVALID_REQUEST');
            expect(error.statusCode).toBe(400);
          }
          expect(fetchFn).not.toHaveBeenCalled();
        });

        it('PATCHes the item with the requested quantity and returns the envelope', async () => {
          const body = { data: { id: 'ci-1', quantity: 3 }, meta: {} };
          fetchFn.and.resolveTo(jsonResponse(body, 200));

          await expectAsync(api.updateItem({ cartItemId: 'ci-1', quantity: 3 })).toBeResolvedTo(
            body
          );
          expect(fetchFn).toHaveBeenCalledWith('/cart/items/ci-1', {
            method: 'PATCH',
            body: JSON.stringify({ quantity: 3 }),
          });
        });

        it('supports quantity zero and an omitted quantity', async () => {
          fetchFn.and.resolveTo(jsonResponse({ data: null }));

          const result = await api.updateItem({ cartItemId: 'ci-1', quantity: 0 });
          expect(fetchFn.calls.first().args[1].body).toBe('{"quantity":0}');
          expect(result.data).toBeNull();

          await api.updateItem({ cartItemId: 'ci-1' });
          expect(fetchFn.calls.mostRecent().args[1].body).toBe('{}');
        });

        it('maps error bodies and falls back when the body cannot be parsed', async () => {
          fetchFn.and.resolveTo(
            jsonResponse(
              {
                error: {
                  message: 'Sin stock',
                  code: 'OUT_OF_STOCK',
                  details: [{ field: 'quantity' }],
                },
              },
              422
            )
          );
          let error;
          try {
            await api.updateItem({ cartItemId: 'ci-1', quantity: 9 });
          } catch (caught) {
            error = caught;
          }
          expect(error).toEqual(
            jasmine.objectContaining({
              message: 'Sin stock',
              code: 'OUT_OF_STOCK',
              statusCode: 422,
            })
          );
          expect(error.details).toEqual([{ field: 'quantity' }]);

          fetchFn.and.resolveTo(new Response('', { status: 500 }));
          await expectAsync(
            api.updateItem({ cartItemId: 'ci-1', quantity: 1 })
          ).toBeRejectedWithError('Failed to update cart item (500)');
        });
      });

      describe('removeItem (recovered 4)', () => {
        it('rejects invalid ids before calling the API', async () => {
          for (const cartItemId of [undefined, '', 7, null]) {
            await expectAsync(api.removeItem({ cartItemId })).toBeRejectedWithError(
              'cartItemId is required'
            );
          }
          expect(fetchFn).not.toHaveBeenCalled();
        });

        it('returns an empty object for a 204 response', async () => {
          fetchFn.and.resolveTo(new Response(null, { status: 204 }));

          await expectAsync(api.removeItem({ cartItemId: 'ci-1' })).toBeResolvedTo({});
          expect(fetchFn).toHaveBeenCalledWith('/cart/items/ci-1', { method: 'DELETE' });
        });

        it('throws for a non-204 response even when ok is true', async () => {
          fetchFn.and.resolveTo(
            jsonResponse({ error: { message: 'No eliminado', code: 'CONFLICT' } }, 200)
          );

          let error;
          try {
            await api.removeItem({ cartItemId: 'ci-1' });
          } catch (caught) {
            error = caught;
          }
          expect(error.message).toBe('No eliminado');
          expect(error.code).toBe('CONFLICT');
          expect(error.statusCode).toBe(200);
        });

        it('falls back when the error body is not JSON', async () => {
          fetchFn.and.resolveTo(new Response('not-json', { status: 404 }));
          await expectAsync(api.removeItem({ cartItemId: 'ci-1' })).toBeRejectedWithError(
            'Failed to remove cart item (404)'
          );
        });
      });

      describe('clear (recovered 5)', () => {
        it('deletes the cart and returns an empty object on 204', async () => {
          fetchFn.and.resolveTo(new Response(null, { status: 204 }));

          await expectAsync(api.clear()).toBeResolvedTo({});
          expect(fetchFn).toHaveBeenCalledWith('/cart', { method: 'DELETE' });
        });

        it('maps error details and uses UNKNOWN_ERROR when no code is provided', async () => {
          fetchFn.and.resolveTo(
            jsonResponse({ error: { message: 'No se pudo vaciar', details: ['x'] } }, 500)
          );

          let error;
          try {
            await api.clear();
          } catch (caught) {
            error = caught;
          }
          expect(error.message).toBe('No se pudo vaciar');
          expect(error.code).toBe('UNKNOWN_ERROR');
          expect(error.statusCode).toBe(500);
          expect(error.details).toEqual(['x']);
        });
      });

      describe('getCart include filtering (recovered 6)', () => {
        it('keeps only product includes even when combined with unsupported values', async () => {
          fetchFn.and.resolveTo(jsonResponse({ data: [], meta: {} }));

          await api.getCart({ include: ['product', 'orders', 'product'] });
          expect(fetchFn).toHaveBeenCalledWith('/cart?include=product%2Cproduct');
        });

        it('ignores a non-array include value', async () => {
          fetchFn.and.resolveTo(jsonResponse({ data: [] }));

          await api.getCart({ include: 'product' });
          await api.getCart({ include: null });
          expect(fetchFn.calls.first().args[0]).toBe('/cart');
          expect(fetchFn.calls.mostRecent().args[0]).toBe('/cart');
        });

        it('propagates API failures', async () => {
          fetchFn.and.resolveTo(new Response('', { status: 500 }));
          await expectAsync(api.getCart()).toBeRejectedWithError('Failed to get cart (500)');

          fetchFn.and.rejectWith(new Error('offline'));
          await expectAsync(api.getCart()).toBeRejectedWithError('offline');
        });
      });

      it('validates addItem for an empty argument list', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));
        await expectAsync(api.addItem()).toBeRejectedWithError('productId is required');
        await expectAsync(api.addItem({ productId: '   ' })).toBeResolved();
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
