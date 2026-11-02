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
