import { OrdersViewModel } from './OrdersViewModel.js';

describe('OrdersViewModel', () => {
  let mockApi;
  let viewModel;

  beforeEach(() => {
    mockApi = {
      listOrders: jasmine.createSpy('listOrders').and.returnValue(
        Promise.resolve({
          data: [
            {
              id: 'ord-1',
              order_number: 'ORD-00100042',
              status: 'pending',
              total: 100,
              created_at: '2026-10-14T11:00:00.000Z',
            },
          ],
          meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
        })
      ),
      getOrderById: jasmine.createSpy('getOrderById').and.returnValue(
        Promise.resolve({
          data: {
            id: 'ord-1',
            order_number: 'ORD-00100042',
            total: 100,
          },
        })
      ),
    };
    viewModel = new OrdersViewModel({ ordersApi: mockApi });
  });

  it('initializes with default empty state', () => {
    expect(viewModel.orders).toEqual([]);
    expect(viewModel.meta).toEqual({ page: 1, per_page: 10, total: 0, total_pages: 0 });
    expect(viewModel.isLoading).toBeFalse();
    expect(viewModel.errorMessage).toBe('');
    expect(viewModel.forbiddenError).toBeFalse();
    expect(viewModel.selectedOrder).toBeNull();
  });

  it('loadOrders fetches orders and populates orders and meta', async () => {
    const notifySpy = jasmine.createSpy('notify');
    viewModel.subscribe(notifySpy);

    await viewModel.loadOrders(1);

    expect(mockApi.listOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: undefined,
    });
    expect(viewModel.orders.length).toBe(1);
    expect(viewModel.orders[0].order_number).toBe('ORD-00100042');
    expect(viewModel.meta.total).toBe(1);
    expect(viewModel.isLoading).toBeFalse();
    expect(notifySpy).toHaveBeenCalled();
  });

  it('loadOrders handles empty state properly', async () => {
    mockApi.listOrders.and.returnValue(
      Promise.resolve({
        data: [],
        meta: { page: 1, per_page: 10, total: 0, total_pages: 0 },
      })
    );

    await viewModel.loadOrders(1);

    expect(viewModel.orders).toEqual([]);
    expect(viewModel.meta.total).toBe(0);
    expect(viewModel.meta.total_pages).toBe(0);
  });

  it('loadOrders sets forbiddenError when receiving 403 Forbidden', async () => {
    const error = new Error('You do not have permission to access this resource');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    mockApi.listOrders.and.returnValue(Promise.reject(error));

    await viewModel.loadOrders(1);

    expect(viewModel.forbiddenError).toBeTrue();
    expect(viewModel.errorMessage).toBe('You do not have permission to access this resource');
    expect(viewModel.orders).toEqual([]);
  });

  it('loadOrderById loads selected order on success', async () => {
    await viewModel.loadOrderById('ord-1');

    expect(mockApi.getOrderById).toHaveBeenCalledWith('ord-1');
    expect(viewModel.selectedOrder).not.toBeNull();
    expect(viewModel.selectedOrder.id).toBe('ord-1');
  });

  it('loadOrderByNumber searches the buyer order pages and selects the matching order', async () => {
    mockApi.listOrders.and.returnValues(
      Promise.resolve({ data: [], meta: { page: 1, total_pages: 2 } }),
      Promise.resolve({
        data: [{ id: 'ord-2', order_number: 'ORD-00100042', items: [{ product_id: 'p1' }] }],
        meta: { page: 2, total_pages: 2 },
      })
    );

    await viewModel.loadOrderByNumber('ORD-00100042');

    expect(mockApi.listOrders.calls.argsFor(0)).toEqual([{ page: 1, limit: 100 }]);
    expect(mockApi.listOrders.calls.argsFor(1)).toEqual([{ page: 2, limit: 100 }]);
    expect(viewModel.selectedOrder).toEqual({
      id: 'ord-2',
      order_number: 'ORD-00100042',
      items: [{ product_id: 'p1' }],
    });
    expect(viewModel.errorMessage).toBe('');
    expect(viewModel.isLoading).toBeFalse();
  });

  it('clearSelectedOrder clears selectedOrder and notifies listeners', () => {
    viewModel.selectedOrder = { id: 'ord-1' };
    const notifySpy = jasmine.createSpy('notify');
    viewModel.subscribe(notifySpy);

    viewModel.clearSelectedOrder();

    expect(viewModel.selectedOrder).toBeNull();
    expect(notifySpy).toHaveBeenCalled();
  });

  it('loadOrderById sets forbiddenError on 403 Forbidden', async () => {
    const error = new Error('You do not have permission to access this order');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    mockApi.getOrderById.and.returnValue(Promise.reject(error));

    await viewModel.loadOrderById('foreign-order');

    expect(viewModel.forbiddenError).toBeTrue();
    expect(viewModel.errorMessage).toBe('You do not have permission to access this order');
    expect(viewModel.selectedOrder).toBeNull();
  });

  it('nextPage and prevPage navigate when pages exist', async () => {
    viewModel.meta = { page: 1, per_page: 10, total: 20, total_pages: 2 };
    await viewModel.nextPage();
    expect(mockApi.listOrders).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      status: undefined,
    });

    viewModel.meta = { page: 2, per_page: 10, total: 20, total_pages: 2 };
    await viewModel.prevPage();
    expect(mockApi.listOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: undefined,
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const order = (id) => ({ id, order_number: `ORD-${id}`, status: 'pending', total: 10 });

    describe('OrdersViewModel additional branches (recovered 1)', () => {
      let ordersApi;
      let vm;

      beforeEach(() => {
        ordersApi = {
          listOrders: jasmine.createSpy('listOrders').and.resolveTo({
            data: [order('1')],
            meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
          }),
          getOrderById: jasmine.createSpy('getOrderById').and.resolveTo({ data: order('1') }),
        };
        vm = new OrdersViewModel({ ordersApi });
      });

      it('setStatusFilter forwards the exact page-1 request and can clear the filter', async () => {
        await vm.setStatusFilter('shipped');

        expect(vm.statusFilter).toBe('shipped');
        expect(ordersApi.listOrders).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          status: 'shipped',
        });

        await vm.setStatusFilter('');

        expect(vm.statusFilter).toBe('');
        expect(ordersApi.listOrders).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          status: undefined,
        });
      });

      it('loadOrders coerces non-array data to an empty list', async () => {
        for (const data of [null, { rows: [order('1')] }, 42, 'nope']) {
          ordersApi.listOrders.and.resolveTo({ data });

          await vm.loadOrders();

          expect(vm.orders).toEqual([]);
          expect(vm.meta.total_pages).toBe(0);
        }

        ordersApi.listOrders.and.resolveTo({ data: undefined });
        await vm.loadOrders();
        expect(vm.orders).toEqual([]);
      });

      it('loadOrders derives meta fallbacks when meta is absent', async () => {
        ordersApi.listOrders.and.resolveTo({ data: [] });
        await vm.loadOrders(3);
        expect(vm.meta).toEqual({ page: 3, per_page: 10, total: 0, total_pages: 0 });

        ordersApi.listOrders.and.resolveTo({ data: [order('1'), order('2')] });
        await vm.loadOrders(4);
        expect(vm.meta).toEqual({ page: 4, per_page: 10, total: 0, total_pages: 1 });
      });

      it('loadOrders keeps supplied meta values and fills only the missing ones', async () => {
        ordersApi.listOrders.and.resolveTo({ data: [order('1')], meta: { page: 2, total: 25 } });

        await vm.loadOrders();

        expect(vm.meta).toEqual({ page: 2, per_page: 10, total: 25, total_pages: 1 });
      });

      it('loadOrders sets forbiddenError for a 403 statusCode without a code', async () => {
        const error = new Error('Status forbidden');
        error.statusCode = 403;
        ordersApi.listOrders.and.rejectWith(error);

        await vm.loadOrders();

        expect(vm.forbiddenError).toBeTrue();
        expect(vm.errorMessage).toBe('Status forbidden');
        expect(vm.orders).toEqual([]);
        expect(vm.isLoading).toBeFalse();
      });

      it('loadOrders sets forbiddenError for a FORBIDDEN code without a statusCode', async () => {
        const error = new Error('Code forbidden');
        error.code = 'FORBIDDEN';
        ordersApi.listOrders.and.rejectWith(error);

        await vm.loadOrders();

        expect(vm.forbiddenError).toBeTrue();
        expect(vm.errorMessage).toBe('Code forbidden');
      });

      it('loadOrders accepts either forbidden marker independently of the status', async () => {
        const error = new Error('Server exploded');
        error.statusCode = 500;
        error.code = 'FORBIDDEN';
        ordersApi.listOrders.and.rejectWith(error);

        await vm.loadOrders();

        expect(vm.forbiddenError).toBeTrue();
      });

      it('loadOrders uses the fallback message for errors without one and clears orders', async () => {
        await vm.loadOrders();
        expect(vm.orders.length).toBe(1);

        ordersApi.listOrders.and.rejectWith(new Error(''));
        await vm.loadOrders();

        expect(vm.forbiddenError).toBeFalse();
        expect(vm.errorMessage).toBe('Failed to load orders');
        expect(vm.orders).toEqual([]);

        ordersApi.listOrders.and.rejectWith(null);
        await vm.loadOrders();
        expect(vm.errorMessage).toBe('Failed to load orders');
      });

      it('loadOrders currently leaves stale meta after a failed reload', async () => {
        ordersApi.listOrders.and.resolveTo({
          data: [order('1')],
          meta: { page: 2, per_page: 5, total: 9, total_pages: 3 },
        });
        await vm.loadOrders();

        ordersApi.listOrders.and.rejectWith(new Error('down'));
        await vm.loadOrders();

        expect(vm.orders).toEqual([]);
        expect(vm.meta).toEqual({ page: 2, per_page: 5, total: 9, total_pages: 3 });
      });

      it('loadOrders resets error flags on a later successful load', async () => {
        const error = new Error('nope');
        error.statusCode = 403;
        ordersApi.listOrders.and.rejectWith(error);
        await vm.loadOrders();
        expect(vm.forbiddenError).toBeTrue();

        ordersApi.listOrders.and.resolveTo({
          data: [order('2')],
          meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
        });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        await vm.loadOrders();

        expect(vm.forbiddenError).toBeFalse();
        expect(vm.errorMessage).toBe('');
        expect(vm.orders[0].id).toBe('2');
        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('loadOrders notifies while loading and again when the request settles', async () => {
        let resolveRequest;
        ordersApi.listOrders.and.returnValue(
          new Promise((resolve) => {
            resolveRequest = resolve;
          })
        );
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        const pending = vm.loadOrders(2);
        expect(vm.isLoading).toBeTrue();
        expect(listener).toHaveBeenCalledTimes(1);

        resolveRequest({
          data: [order('1')],
          meta: { page: 2, per_page: 10, total: 1, total_pages: 1 },
        });
        await pending;

        expect(vm.isLoading).toBeFalse();
        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('loadOrderById maps falsy response data to null', async () => {
        await vm.loadOrderById('ord-1');
        expect(vm.selectedOrder).not.toBeNull();

        for (const data of [undefined, null, 0, '']) {
          ordersApi.getOrderById.and.resolveTo({ data });

          await vm.loadOrderById('missing');

          expect(ordersApi.getOrderById).toHaveBeenCalledWith('missing');
          expect(vm.selectedOrder).toBeNull();
        }
      });

      it('loadOrderById uses the detail fallback message and clears the selection', async () => {
        await vm.loadOrderById('ord-1');

        ordersApi.getOrderById.and.rejectWith(new Error(''));
        await vm.loadOrderById('bad');

        expect(vm.forbiddenError).toBeFalse();
        expect(vm.errorMessage).toBe('Failed to load order details');
        expect(vm.selectedOrder).toBeNull();

        ordersApi.getOrderById.and.rejectWith(undefined);
        await vm.loadOrderById('bad');
        expect(vm.errorMessage).toBe('Failed to load order details');
      });

      it('loadOrderById detects forbidden responses through either marker', async () => {
        const byStatus = new Error('Detail forbidden');
        byStatus.statusCode = 403;
        ordersApi.getOrderById.and.rejectWith(byStatus);
        await vm.loadOrderById('foreign');
        expect(vm.forbiddenError).toBeTrue();
        expect(vm.errorMessage).toBe('Detail forbidden');

        const byCode = new Error('Detail code forbidden');
        byCode.code = 'FORBIDDEN';
        ordersApi.getOrderById.and.rejectWith(byCode);
        await vm.loadOrderById('foreign');
        expect(vm.forbiddenError).toBeTrue();
        expect(vm.errorMessage).toBe('Detail code forbidden');
      });

      it('loadOrderById clears previous errors on the next successful load', async () => {
        const error = new Error('forbidden');
        error.code = 'FORBIDDEN';
        ordersApi.getOrderById.and.rejectWith(error);
        await vm.loadOrderById('foreign');

        ordersApi.getOrderById.and.resolveTo({ data: order('ok') });
        await vm.loadOrderById('ok');

        expect(vm.forbiddenError).toBeFalse();
        expect(vm.errorMessage).toBe('');
        expect(vm.selectedOrder.id).toBe('ok');
        expect(vm.isLoading).toBeFalse();
      });

      it('clearSelectedOrder clears error flags and notifies listeners', () => {
        vm.selectedOrder = order('1');
        vm.errorMessage = 'previous error';
        vm.forbiddenError = true;
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        vm.clearSelectedOrder();

        expect(vm.selectedOrder).toBeNull();
        expect(vm.errorMessage).toBe('');
        expect(vm.forbiddenError).toBeFalse();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('nextPage does not reload on the last page or while loading', async () => {
        vm.meta = { page: 1, per_page: 10, total: 1, total_pages: 1 };
        await vm.nextPage();
        expect(ordersApi.listOrders).not.toHaveBeenCalled();

        vm.meta = { page: 1, per_page: 10, total: 5, total_pages: 3 };
        vm.isLoading = true;
        await vm.nextPage();
        expect(ordersApi.listOrders).not.toHaveBeenCalled();
        expect(vm.isLoading).toBeTrue();
      });

      it('prevPage does not reload on the first page or while loading', async () => {
        vm.meta = { page: 1, per_page: 10, total: 5, total_pages: 3 };
        await vm.prevPage();
        expect(ordersApi.listOrders).not.toHaveBeenCalled();

        vm.meta.page = 3;
        vm.isLoading = true;
        await vm.prevPage();
        expect(ordersApi.listOrders).not.toHaveBeenCalled();

        vm.isLoading = false;
        await vm.prevPage();
        expect(ordersApi.listOrders).toHaveBeenCalledWith({
          page: 2,
          limit: 10,
          status: undefined,
        });
      });

      it('subscribe returns an unsubscribe function that stops notifications', async () => {
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);

        await vm.loadOrders();
        const callsBefore = listener.calls.count();
        expect(callsBefore).toBeGreaterThan(0);

        unsubscribe();
        await vm.loadOrders();
        vm.clearSelectedOrder();

        expect(listener.calls.count()).toBe(callsBefore);
      });
    });
  })();
})();
