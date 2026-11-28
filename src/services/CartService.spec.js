import { CartService } from './CartService.js';

describe('CartService', () => {
  let cartApi;
  let cartStore;
  let authStore;
  let pendingStore;
  let service;

  beforeEach(() => {
    cartApi = { addItem: jasmine.createSpy('addItem') };
    cartStore = {
      setFromAddResponse: jasmine.createSpy('setFromAddResponse'),
      getCount: () => 0,
    };
    authStore = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
    };
    pendingStore = {
      set: jasmine.createSpy('set'),
      get: jasmine.createSpy('get').and.returnValue(null),
      clear: jasmine.createSpy('clear'),
    };
    service = new CartService({
      cartApi,
      cartStore,
      authStore,
      pendingCartActionStore: pendingStore,
    });
  });

  describe('Construction', () => {
    it('constructor throws when cartApi is missing', () => {
      expect(
        () =>
          new CartService({
            cartStore,
            authStore,
            pendingCartActionStore: pendingStore,
          })
      ).toThrowError('cartApi is required');
    });

    it('constructor throws when cartStore is missing', () => {
      expect(
        () =>
          new CartService({
            cartApi,
            authStore,
            pendingCartActionStore: pendingStore,
          })
      ).toThrowError('cartStore is required');
    });

    it('constructor throws when authStore is missing', () => {
      expect(
        () =>
          new CartService({
            cartApi,
            cartStore,
            pendingCartActionStore: pendingStore,
          })
      ).toThrowError('authStore is required');
    });

    it('constructor throws when pendingCartActionStore is missing', () => {
      expect(
        () =>
          new CartService({
            cartApi,
            cartStore,
            authStore,
          })
      ).toThrowError('pendingCartActionStore is required');
    });
  });

  describe('addToCart — unauthenticated', () => {
    it('addToCart queues pending and returns { status: "auth-required" } when unauthenticated', async () => {
      authStore.isAuthenticated.and.returnValue(false);
      const res = await service.addToCart('p1', 2);
      expect(pendingStore.set).toHaveBeenCalledWith({ productId: 'p1', quantity: 2 });
      expect(res).toEqual({ status: 'auth-required' });
    });

    it('addToCart with skipPendingWrite: true does NOT queue pending on auth-required', async () => {
      authStore.isAuthenticated.and.returnValue(false);
      const res = await service.addToCart('p1', 2, { skipPendingWrite: true });
      expect(pendingStore.set).not.toHaveBeenCalled();
      expect(res).toEqual({ status: 'auth-required' });
    });

    it('addToCart does NOT call cartApi.addItem when unauthenticated', async () => {
      authStore.isAuthenticated.and.returnValue(false);
      await service.addToCart('p1', 2);
      expect(cartApi.addItem).not.toHaveBeenCalled();
    });
  });

  describe('addToCart — authenticated happy path', () => {
    it('addToCart calls cartApi.addItem with { productId, quantity }', async () => {
      cartApi.addItem.and.returnValue(
        Promise.resolve({ data: { id: 'c1', product_id: 'p1', quantity: 3 } })
      );
      await service.addToCart('p1', 3);
      expect(cartApi.addItem).toHaveBeenCalledWith({ productId: 'p1', quantity: 3 });
    });

    it('addToCart calls cartStore.setFromAddResponse with the response .data on success', async () => {
      const item = { id: 'c1', product_id: 'p1', quantity: 3 };
      cartApi.addItem.and.returnValue(Promise.resolve({ data: item }));
      await service.addToCart('p1', 3);
      expect(cartStore.setFromAddResponse).toHaveBeenCalledWith(item);
    });

    it('addToCart returns { status: "added", item } on success', async () => {
      const item = { id: 'c1', product_id: 'p1', quantity: 3 };
      cartApi.addItem.and.returnValue(Promise.resolve({ data: item }));
      const res = await service.addToCart('p1', 3);
      expect(res).toEqual({ status: 'added', item });
    });
  });

  describe('addToCart — authenticated error path', () => {
    it('addToCart returns { status: "error", error, statusCode: 422 } when API throws PRODUCT_OUT_OF_STOCK', async () => {
      const error = new Error('Out of stock');
      error.code = 'PRODUCT_OUT_OF_STOCK';
      error.statusCode = 422;
      cartApi.addItem.and.returnValue(Promise.reject(error));
      const res = await service.addToCart('p1', 1);
      expect(res).toEqual({ status: 'error', error, statusCode: 422 });
    });

    it('addToCart returns { status: "error", statusCode: 0 } when API throws a network error (no statusCode)', async () => {
      const netError = new Error('Network failure');
      cartApi.addItem.and.returnValue(Promise.reject(netError));
      const res = await service.addToCart('p1', 1);
      expect(res).toEqual({ status: 'error', error: netError, statusCode: 0 });
    });

    it('addToCart does NOT call cartStore.setFromAddResponse when API throws', async () => {
      cartApi.addItem.and.returnValue(Promise.reject(new Error('Network error')));
      await service.addToCart('p1', 1);
      expect(cartStore.setFromAddResponse).not.toHaveBeenCalled();
    });
  });

  describe('processPending', () => {
    it('processPending returns null when no pending action', async () => {
      pendingStore.get.and.returnValue(null);
      const res = await service.processPending();
      expect(res).toBeNull();
    });

    it('processPending calls addToCart with the pending { productId, quantity } and skipPendingWrite: true', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 4 });
      spyOn(service, 'addToCart').and.returnValue(Promise.resolve({ status: 'added', item: {} }));
      await service.processPending();
      expect(service.addToCart).toHaveBeenCalledWith('p1', 4, { skipPendingWrite: true });
    });

    it('processPending clears pending on success (status: "added")', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      cartApi.addItem.and.returnValue(Promise.resolve({ data: { product_id: 'p1', quantity: 2 } }));
      const res = await service.processPending();
      expect(res.status).toBe('added');
      expect(pendingStore.clear).toHaveBeenCalled();
    });

    it('processPending clears pending on terminal 422 error', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      const err = new Error('Out of stock');
      err.code = 'PRODUCT_OUT_OF_STOCK';
      err.statusCode = 422;
      cartApi.addItem.and.returnValue(Promise.reject(err));
      await service.processPending();
      expect(pendingStore.clear).toHaveBeenCalled();
    });

    it('processPending clears pending on terminal 404 error', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      const err = new Error('Not found');
      err.code = 'PRODUCT_NOT_FOUND';
      err.statusCode = 404;
      cartApi.addItem.and.returnValue(Promise.reject(err));
      await service.processPending();
      expect(pendingStore.clear).toHaveBeenCalled();
    });

    it('processPending KEEPS pending on 5xx error (retryable)', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      const err = new Error('Server error');
      err.statusCode = 500;
      cartApi.addItem.and.returnValue(Promise.reject(err));
      await service.processPending();
      expect(pendingStore.clear).not.toHaveBeenCalled();
    });

    it('processPending KEEPS pending on SESSION_EXPIRED error', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      const err = new Error('SESSION_EXPIRED');
      err.code = 'SESSION_EXPIRED';
      err.statusCode = 401;
      cartApi.addItem.and.returnValue(Promise.reject(err));
      await service.processPending();
      expect(pendingStore.clear).not.toHaveBeenCalled();
    });

    it('processPending KEEPS pending on network error (no statusCode)', async () => {
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      const err = new Error('Failed to fetch');
      cartApi.addItem.and.returnValue(Promise.reject(err));
      await service.processPending();
      expect(pendingStore.clear).not.toHaveBeenCalled();
    });

    it('processPending returns the addToCart result', async () => {
      const expectedItem = { product_id: 'p1', quantity: 2 };
      pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
      cartApi.addItem.and.returnValue(Promise.resolve({ data: expectedItem }));
      const result = await service.processPending();
      expect(result).toEqual({ status: 'added', item: expectedItem });
    });
  });

  describe('loadCart / addToCart with ?include=product', () => {
    it('loadCart requests { include: [product] } so cart items render with full details', async () => {
      const items = [
        {
          id: 'ci1',
          product_id: 'p1',
          quantity: 2,
          product: { id: 'p1', name: 'Café', price: 14, slug: 'cafe-cusco' },
        },
      ];
      const getCartSpy = jasmine
        .createSpy('getCart')
        .and.returnValue(
          Promise.resolve({ data: items, meta: { timestamp: '2026-11-01T12:00:00Z' } })
        );
      const localCartStore = {
        setFromGet: jasmine.createSpy('setFromGet'),
        getItems: jasmine.createSpy('getItems').and.returnValue([]),
        getCount: () => 0,
      };
      const localService = new CartService({
        cartApi: { addItem: jasmine.createSpy('addItem'), getCart: getCartSpy },
        cartStore: localCartStore,
        authStore: { isAuthenticated: () => true },
        pendingCartActionStore: pendingStore,
      });

      await localService.loadCart();

      expect(getCartSpy).toHaveBeenCalledWith({ include: ['product'] });
    });

    it('addToCart triggers a follow-up loadCart to enrich the store with product details', async () => {
      const addItemSpy = jasmine
        .createSpy('addItem')
        .and.returnValue(Promise.resolve({ data: { id: 'ci1', product_id: 'p1', quantity: 1 } }));
      const getCartSpy = jasmine.createSpy('getCart').and.returnValue(
        Promise.resolve({
          data: [
            {
              id: 'ci1',
              product_id: 'p1',
              quantity: 1,
              product: { id: 'p1', name: 'Café', price: 14 },
            },
          ],
          meta: { timestamp: '2026-11-01T12:00:00Z' },
        })
      );
      const localCartStore = {
        setFromAddResponse: jasmine.createSpy('setFromAddResponse'),
        setFromGet: jasmine.createSpy('setFromGet'),
        getItems: jasmine.createSpy('getItems').and.returnValue([]),
        getCount: () => 0,
      };
      const localService = new CartService({
        cartApi: { addItem: addItemSpy, getCart: getCartSpy },
        cartStore: localCartStore,
        authStore: { isAuthenticated: () => true },
        pendingCartActionStore: pendingStore,
      });

      await localService.addToCart('p1', 1);

      // Fire-and-forget: flush microtask queue
      await Promise.resolve();
      await Promise.resolve();

      expect(getCartSpy).toHaveBeenCalledWith({ include: ['product'] });
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('CartService (recovered 1)', () => {
    let cartApi;
    let cartStore;
    let authStore;
    let pendingStore;
    let service;

    beforeEach(() => {
      cartApi = { addItem: jasmine.createSpy('addItem') };
      cartStore = {
        setFromAddResponse: jasmine.createSpy('setFromAddResponse'),
        getCount: () => 0,
      };
      authStore = {
        isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      };
      pendingStore = {
        set: jasmine.createSpy('set'),
        get: jasmine.createSpy('get').and.returnValue(null),
        clear: jasmine.createSpy('clear'),
      };
      service = new CartService({
        cartApi,
        cartStore,
        authStore,
        pendingCartActionStore: pendingStore,
      });
    });

    describe('addToCart — unauthenticated (recovered 2)', () => {
      it('addToCart queues pending and returns { status: "auth-required" } when unauthenticated', async () => {
        authStore.isAuthenticated.and.returnValue(false);
        const res = await service.addToCart('p1', 2);
        expect(pendingStore.set).toHaveBeenCalledWith({ productId: 'p1', quantity: 2 });
        expect(res).toEqual({ status: 'auth-required' });
      });
    });

    describe('addToCart — authenticated happy path (recovered 3)', () => {
      it('addToCart returns { status: "added", item } on success', async () => {
        const item = { id: 'c1', product_id: 'p1', quantity: 3 };
        cartApi.addItem.and.returnValue(Promise.resolve({ data: item }));
        const res = await service.addToCart('p1', 3);
        expect(res).toEqual({ status: 'added', item });
      });
    });

    describe('addToCart — authenticated error path (recovered 4)', () => {
      it('addToCart returns { status: "error", error, statusCode: 422 } when API throws PRODUCT_OUT_OF_STOCK', async () => {
        const error = new Error('Out of stock');
        error.code = 'PRODUCT_OUT_OF_STOCK';
        error.statusCode = 422;
        cartApi.addItem.and.returnValue(Promise.reject(error));
        const res = await service.addToCart('p1', 1);
        expect(res).toEqual({ status: 'error', error, statusCode: 422 });
      });

      it('addToCart returns { status: "error", statusCode: 0 } when API throws a network error (no statusCode)', async () => {
        const netError = new Error('Network failure');
        cartApi.addItem.and.returnValue(Promise.reject(netError));
        const res = await service.addToCart('p1', 1);
        expect(res).toEqual({ status: 'error', error: netError, statusCode: 0 });
      });
    });

    describe('processPending (recovered 5)', () => {
      it('processPending clears pending on success (status: "added")', async () => {
        pendingStore.get.and.returnValue({ productId: 'p1', quantity: 2 });
        cartApi.addItem.and.returnValue(
          Promise.resolve({ data: { product_id: 'p1', quantity: 2 } })
        );
        const res = await service.processPending();
        expect(res.status).toBe('added');
        expect(pendingStore.clear).toHaveBeenCalled();
      });
    });
  });

  (() => {
    describe('CartService additional branches (recovered 6)', () => {
      let deps;
      let service;

      beforeEach(() => {
        deps = {
          cartApi: {
            addItem: jasmine.createSpy('addItem'),
            getCart: jasmine.createSpy('getCart'),
            updateItem: jasmine.createSpy('updateItem'),
            removeItem: jasmine.createSpy('removeItem'),
            clear: jasmine.createSpy('clear'),
          },
          cartStore: {
            getItem: jasmine.createSpy('getItem').and.returnValue({ itemId: 'ci-1' }),
            setFromAddResponse: jasmine.createSpy('setFromAddResponse'),
            setFromGet: jasmine.createSpy('setFromGet'),
            removeItem: jasmine.createSpy('removeItem'),
            clear: jasmine.createSpy('clear'),
            getCount: jasmine.createSpy('getCount').and.returnValue(2),
          },
          authStore: {
            isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
          },
          pendingCartActionStore: {
            set: jasmine.createSpy('set'),
            get: jasmine.createSpy('get').and.returnValue(null),
            clear: jasmine.createSpy('clear'),
          },
        };
        service = new CartService(deps);
      });

      describe('updateItem (recovered 7)', () => {
        it('rejects a missing productId before touching the store', async () => {
          const result = await service.updateItem('', 2);

          expect(result.status).toBe('error');
          expect(result.statusCode).toBe(400);
          expect(result.error.code).toBe('INVALID_REQUEST');
          expect(deps.cartStore.getItem).not.toHaveBeenCalled();
          expect(deps.cartApi.updateItem).not.toHaveBeenCalled();
        });

        it('rejects a product without a server-side item id', async () => {
          deps.cartStore.getItem.and.returnValue(null);

          const result = await service.updateItem('p1', 2);

          expect(result.status).toBe('error');
          expect(result.statusCode).toBe(400);
          expect(result.error.message).toBe('No se encontró el item del carrito en el servidor.');
        });

        it('updates the API item and syncs the store', async () => {
          const item = { product_id: 'p1', quantity: 3 };
          deps.cartApi.updateItem.and.resolveTo({ data: item });

          await expectAsync(service.updateItem('p1', 3)).toBeResolvedTo({
            status: 'updated',
            item,
            productId: 'p1',
            quantity: 3,
          });
          expect(deps.cartApi.updateItem).toHaveBeenCalledWith({ cartItemId: 'ci-1', quantity: 3 });
          expect(deps.cartStore.setFromAddResponse).toHaveBeenCalledWith(item);
        });

        it('does not write to the store when the API returns no data or fails', async () => {
          deps.cartApi.updateItem.and.resolveTo({});
          await expectAsync(service.updateItem('p1', 0)).toBeResolvedTo({
            status: 'updated',
            item: undefined,
            productId: 'p1',
            quantity: 0,
          });
          expect(deps.cartStore.setFromAddResponse).not.toHaveBeenCalled();

          const error = new Error('failed');
          error.statusCode = 422;
          deps.cartApi.updateItem.and.rejectWith(error);
          const result = await service.updateItem('p1', 2);
          expect(result).toEqual({ status: 'error', error, statusCode: 422 });
        });
      });

      describe('removeItem (recovered 8)', () => {
        it('rejects missing ids and items without a server id', async () => {
          const missing = await service.removeItem('');
          expect(missing.statusCode).toBe(400);
          expect(deps.cartApi.removeItem).not.toHaveBeenCalled();

          deps.cartStore.getItem.and.returnValue(undefined);
          const unknown = await service.removeItem('p1');
          expect(unknown.statusCode).toBe(400);
          expect(unknown.error.code).toBe('INVALID_REQUEST');
        });

        it('removes from the API first and then from the store', async () => {
          deps.cartApi.removeItem.and.resolveTo({});

          await expectAsync(service.removeItem('p1')).toBeResolvedTo({
            status: 'removed',
            productId: 'p1',
          });
          expect(deps.cartApi.removeItem).toHaveBeenCalledWith({ cartItemId: 'ci-1' });
          expect(deps.cartStore.removeItem).toHaveBeenCalledWith('p1');
        });

        it('keeps the local snapshot when the API rejects', async () => {
          deps.cartApi.removeItem.and.rejectWith(new Error('offline'));

          const result = await service.removeItem('p1');
          expect(result.status).toBe('error');
          expect(result.statusCode).toBe(0);
          expect(deps.cartStore.removeItem).not.toHaveBeenCalled();
        });
      });

      describe('clear (recovered 9)', () => {
        it('does nothing for guests', async () => {
          deps.authStore.isAuthenticated.and.returnValue(false);

          await expectAsync(service.clear()).toBeResolvedTo({ status: 'auth-required' });
          expect(deps.cartApi.clear).not.toHaveBeenCalled();
          expect(deps.cartStore.clear).not.toHaveBeenCalled();
        });

        it('clears the store only after the API confirms', async () => {
          deps.cartApi.clear.and.resolveTo({});

          await expectAsync(service.clear()).toBeResolvedTo({ status: 'cleared' });
          expect(deps.cartStore.clear).toHaveBeenCalled();
        });

        it('maps API errors without clearing the store', async () => {
          const error = new Error('failed');
          error.statusCode = 503;
          deps.cartApi.clear.and.rejectWith(error);

          await expectAsync(service.clear()).toBeResolvedTo({
            status: 'error',
            error,
            statusCode: 503,
          });
          expect(deps.cartStore.clear).not.toHaveBeenCalled();
        });
      });

      describe('loadCart (recovered 10)', () => {
        it('does not call the API for guests', async () => {
          deps.authStore.isAuthenticated.and.returnValue(false);

          await expectAsync(service.loadCart()).toBeResolvedTo({ status: 'auth-required' });
          expect(deps.cartApi.getCart).not.toHaveBeenCalled();
        });

        it('normalizes a non-array response and returns the full result shape', async () => {
          deps.cartApi.getCart.and.resolveTo({ data: null });

          await expectAsync(service.loadCart()).toBeResolvedTo({
            status: 'loaded',
            items: [],
            itemCount: 2,
          });
          expect(deps.cartApi.getCart).toHaveBeenCalledWith({ include: ['product'] });
          expect(deps.cartStore.setFromGet).toHaveBeenCalledWith([]);
        });

        it('maps API errors to the error union', async () => {
          deps.cartApi.getCart.and.rejectWith(new Error('offline'));

          const result = await service.loadCart();
          expect(result.status).toBe('error');
          expect(result.statusCode).toBe(0);
          expect(deps.cartStore.setFromGet).not.toHaveBeenCalled();
        });
      });

      describe('addToCart and processPending edges (recovered 11)', () => {
        it('defaults quantity to 1 and does not write when the API returns no item', async () => {
          deps.cartApi.addItem.and.resolveTo({});

          await expectAsync(service.addToCart('p1')).toBeResolvedTo({
            status: 'added',
            item: undefined,
          });
          expect(deps.cartApi.addItem).toHaveBeenCalledWith({ productId: 'p1', quantity: 1 });
          expect(deps.cartStore.setFromAddResponse).not.toHaveBeenCalled();
        });

        it('triggers a non-fatal post-add refresh and enriches the store', async () => {
          deps.cartApi.addItem.and.resolveTo({ data: { product_id: 'p1' } });
          deps.cartApi.getCart.and.resolveTo({ data: [] });

          const result = await service.addToCart('p1', 2);

          expect(result).toEqual({ status: 'added', item: { product_id: 'p1' } });
          expect(deps.cartApi.getCart).toHaveBeenCalledWith({ include: ['product'] });
          expect(deps.cartStore.setFromGet).toHaveBeenCalledWith([]);
        });

        it('clears pending when the retried add ends up unauthenticated', async () => {
          deps.authStore.isAuthenticated.and.returnValue(false);
          deps.pendingCartActionStore.get.and.returnValue({ productId: 'p1', quantity: 2 });

          await expectAsync(service.processPending()).toBeResolvedTo({ status: 'auth-required' });
          expect(deps.pendingCartActionStore.set).not.toHaveBeenCalled();
          expect(deps.pendingCartActionStore.clear).toHaveBeenCalled();
        });
      });
    });
  })();
})();
