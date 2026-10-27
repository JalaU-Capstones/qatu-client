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
});
