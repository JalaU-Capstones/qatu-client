import { OrderConfirmationViewModel } from './OrderConfirmationViewModel.js';

const order = {
  id: 'ord-1',
  order_number: 'ORD-00100042',
  status: 'pending',
  currency: 'USD',
  total: 44.99,
};
const apiError = (statusCode, code = 'ERR') => Object.assign(new Error('x'), { statusCode, code });

describe('OrderConfirmationViewModel', () => {
  let ordersApi;
  let authStore;
  let authListeners;
  let profile;
  let viewModel;

  beforeEach(() => {
    ordersApi = {
      getOrderById: jasmine
        .createSpy('getOrderById')
        .and.returnValue(Promise.resolve({ data: order, meta: {} })),
    };
    authListeners = new Set();
    profile = { full_name: 'Aaron Florez' };
    authStore = {
      isAuthenticated: () => true,
      getProfile: () => profile,
      subscribe: (listener) => {
        authListeners.add(listener);
        return () => authListeners.delete(listener);
      },
    };
    viewModel = new OrderConfirmationViewModel({ ordersApi, authStore });
  });

  afterEach(() => viewModel.destroy());

  it('loads the order from the API by id (so it survives a page refresh)', async () => {
    await viewModel.load('ord-1');

    expect(ordersApi.getOrderById).toHaveBeenCalledWith('ord-1');
    expect(viewModel.order).toEqual(order);
    expect(viewModel.isLoading).toBe(false);
    expect(viewModel.errorMessage).toBe('');
  });

  it('notifies loading and loaded states', async () => {
    const states = [];
    viewModel.subscribe((vm) => states.push(vm.isLoading));

    await viewModel.load('ord-1');

    expect(states).toEqual([true, false]);
  });

  it('exposes the buyer first name for the greeting', () => {
    expect(viewModel.firstName).toBe('Aaron');

    profile = null;
    expect(viewModel.firstName).toBe('');
  });

  it('formats amounts in the order currency without recomputing them', async () => {
    await viewModel.load('ord-1');

    expect(viewModel.formatAmount(44.99)).toBe('US$ 44.99');
  });

  it('asks guests to log in without calling the API', async () => {
    authStore.isAuthenticated = () => false;

    await viewModel.load('ord-1');

    expect(viewModel.requiresAuth).toBe(true);
    expect(ordersApi.getOrderById).not.toHaveBeenCalled();
  });

  it('loads by itself once the session resolves after a cold start', async () => {
    authStore.isAuthenticated = () => false;
    await viewModel.load('ord-1');

    authStore.isAuthenticated = () => true;
    authListeners.forEach((listener) => listener());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(viewModel.requiresAuth).toBe(false);
    expect(viewModel.order).toEqual(order);
  });

  it('explains 403 (another buyer order) and 404', async () => {
    ordersApi.getOrderById.and.returnValue(Promise.reject(apiError(403, 'FORBIDDEN')));
    await viewModel.load('ord-x');
    expect(viewModel.errorMessage).toBe('No tienes permiso para ver este pedido.');
    expect(viewModel.order).toBeNull();

    ordersApi.getOrderById.and.returnValue(Promise.reject(apiError(404, 'NOT_FOUND')));
    await viewModel.load('ord-y');
    expect(viewModel.errorMessage).toBe('No encontramos este pedido.');
  });

  it('shows a generic message for other failures and stays silent on SESSION_EXPIRED', async () => {
    ordersApi.getOrderById.and.returnValue(Promise.reject(apiError(500)));
    await viewModel.load('ord-1');
    expect(viewModel.errorMessage).toBe(
      'No pudimos cargar tu pedido. Inténtalo de nuevo en unos minutos.'
    );

    ordersApi.getOrderById.and.returnValue(Promise.reject(apiError(undefined, 'SESSION_EXPIRED')));
    await viewModel.load('ord-1');
    expect(viewModel.errorMessage).toBe('');
  });
});
