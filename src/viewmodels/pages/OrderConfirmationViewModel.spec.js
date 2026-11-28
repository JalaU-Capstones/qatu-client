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
      listOrders: jasmine
        .createSpy('listOrders')
        .and.returnValue(Promise.resolve({ data: [order], meta: { total_pages: 1 } })),
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

  it('loads the order by its human-readable number (so it survives a page refresh)', async () => {
    await viewModel.load('ORD-00100042');

    expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(viewModel.order).toEqual(order);
    expect(viewModel.isLoading).toBe(false);
    expect(viewModel.errorMessage).toBe('');
  });

  it('searches additional order pages when resolving an order number', async () => {
    ordersApi.listOrders.and.returnValues(
      Promise.resolve({ data: [], meta: { total_pages: 2 } }),
      Promise.resolve({ data: [order], meta: { total_pages: 2 } })
    );

    await viewModel.load('ORD-00100042');

    expect(ordersApi.listOrders.calls.allArgs()).toEqual([
      [{ page: 1, limit: 100 }],
      [{ page: 2, limit: 100 }],
    ]);
    expect(viewModel.order).toEqual(order);
  });

  it('reports an order number that is not in the buyer order history', async () => {
    await viewModel.load('ORD-UNKNOWN');

    expect(viewModel.order).toBeNull();
    expect(viewModel.errorMessage).toBe('No encontramos este pedido.');
  });

  it('notifies loading and loaded states', async () => {
    const states = [];
    viewModel.subscribe((vm) => states.push(vm.isLoading));

    await viewModel.load('ORD-00100042');

    expect(states).toEqual([true, false]);
  });

  it('exposes the buyer first name for the greeting', () => {
    expect(viewModel.firstName).toBe('Aaron');

    profile = null;
    expect(viewModel.firstName).toBe('');
  });

  it('formats amounts in the order currency without recomputing them', async () => {
    await viewModel.load('ORD-00100042');

    expect(viewModel.formatAmount(44.99)).toBe('US$ 44.99');
  });

  it('asks guests to log in without calling the API', async () => {
    authStore.isAuthenticated = () => false;

    await viewModel.load('ORD-00100042');

    expect(viewModel.requiresAuth).toBe(true);
    expect(ordersApi.listOrders).not.toHaveBeenCalled();
  });

  it('loads by itself once the session resolves after a cold start', async () => {
    authStore.isAuthenticated = () => false;
    await viewModel.load('ORD-00100042');

    authStore.isAuthenticated = () => true;
    authListeners.forEach((listener) => listener());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(viewModel.requiresAuth).toBe(false);
    expect(viewModel.order).toEqual(order);
  });

  it('shows a permission error when the buyer order list is forbidden', async () => {
    ordersApi.listOrders.and.returnValue(Promise.reject(apiError(403, 'FORBIDDEN')));
    await viewModel.load('ORD-00100042');
    expect(viewModel.errorMessage).toBe('No tienes permiso para ver este pedido.');
    expect(viewModel.order).toBeNull();
  });

  it('shows a generic message for other failures and stays silent on SESSION_EXPIRED', async () => {
    ordersApi.listOrders.and.returnValue(Promise.reject(apiError(500)));
    await viewModel.load('ORD-00100042');
    expect(viewModel.errorMessage).toBe(
      'No pudimos cargar tu pedido. Inténtalo de nuevo en unos minutos.'
    );

    ordersApi.listOrders.and.returnValue(Promise.reject(apiError(undefined, 'SESSION_EXPIRED')));
    await viewModel.load('ORD-00100042');
    expect(viewModel.errorMessage).toBe('');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const order = {
    id: 'ord-1',
    order_number: 'ORD-00100042',
    status: 'pending',
    currency: 'USD',
    total: 44.99,
  };
  const apiError = (statusCode, code = 'ERR') =>
    Object.assign(new Error('x'), { statusCode, code });
  const listEnvelope = (data = [order]) => ({ data, meta: { total_pages: 1 } });

  describe('OrderConfirmationViewModel (recovered 1)', () => {
    let ordersApi;
    let authStore;
    let authListeners;
    let profile;
    let viewModel;

    beforeEach(() => {
      ordersApi = { listOrders: jasmine.createSpy('listOrders').and.resolveTo(listEnvelope()) };
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
      await viewModel.load(order.order_number);

      expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
      expect(viewModel.order).toEqual(order);
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.errorMessage).toBe('');
    });

    it('explains 403 (another buyer order) and 404', async () => {
      ordersApi.listOrders.and.rejectWith(apiError(403, 'FORBIDDEN'));
      await viewModel.load('ORD-x');
      expect(viewModel.errorMessage).toBe('No tienes permiso para ver este pedido.');
      expect(viewModel.order).toBeNull();

      ordersApi.listOrders.and.rejectWith(apiError(404, 'NOT_FOUND'));
      await viewModel.load('ORD-y');
      expect(viewModel.errorMessage).toBe('No encontramos este pedido.');
      expect(viewModel.order).toBeNull();
    });
  });
})();

(() => {
  const order = {
    id: 'ord-1',
    order_number: 'ORD-00100042',
    status: 'pending',
    currency: 'USD',
    total: 44.99,
  };

  const apiError = (statusCode, code) => Object.assign(new Error('x'), { statusCode, code });
  const listEnvelope = (data = [order]) => ({ data, meta: { total_pages: 1 } });

  const createOrdersApi = () => ({
    listOrders: jasmine.createSpy('listOrders').and.resolveTo(listEnvelope()),
  });

  const createAuthStore = ({
    authenticated = true,
    profile = { full_name: 'Aaron Florez' },
    withProfile = true,
  } = {}) => {
    const listeners = new Set();
    const store = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(authenticated),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      _notify: () => [...listeners].forEach((listener) => listener()),
    };
    if (withProfile) store.getProfile = jasmine.createSpy('getProfile').and.returnValue(profile);
    return store;
  };

  describe('OrderConfirmationViewModel additional branches (recovered 2)', () => {
    let ordersApi;
    let viewModels;
    let unsubscribes;

    beforeEach(() => {
      ordersApi = createOrdersApi();
      viewModels = [];
      unsubscribes = [];
    });

    afterEach(() => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      unsubscribes = [];
      viewModels.forEach((vm) => vm.destroy());
      viewModels = [];
    });

    const createViewModel = ({ authStore } = {}) => {
      const vm = new OrderConfirmationViewModel({
        ordersApi,
        authStore: authStore ?? createAuthStore(),
      });
      viewModels.push(vm);
      return vm;
    };

    const subscribe = (vm, listener) => {
      const unsubscribe = vm.subscribe(listener);
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    };

    it('derives firstName from single or multiply spaced full names', () => {
      const authStore = createAuthStore({ profile: { full_name: '  Aaron   Florez  ' } });
      const vm = createViewModel({ authStore });

      expect(vm.firstName).toBe('Aaron');

      authStore.getProfile.and.returnValue({ full_name: 'Aaron' });
      expect(vm.firstName).toBe('Aaron');

      authStore.getProfile.and.returnValue({ full_name: '   ' });
      expect(vm.firstName).toBe('');
    });

    it('falls back to an empty firstName without getProfile', () => {
      const vm = createViewModel({ authStore: createAuthStore({ withProfile: false }) });

      expect(vm.firstName).toBe('');
    });

    it('replaces a previously loaded order and clears its error on a new load', async () => {
      const vm = createViewModel();
      vm.order = { id: 'old' };
      vm.errorMessage = 'old error';

      await vm.load('ORD-00100042');

      expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
      expect(vm.order).toEqual(order);
      expect(vm.errorMessage).toBe('');
      expect(vm.isLoading).toBe(false);
    });

    it('notifies the guest early return and resets the order', async () => {
      const vm = createViewModel({ authStore: createAuthStore({ authenticated: false }) });
      const listener = jasmine.createSpy('listener');
      subscribe(vm, listener);
      vm.order = { id: 'old' };
      vm.errorMessage = 'old error';
      vm.isLoading = true;

      await vm.load('ORD-00100042');

      expect(vm.requiresAuth).toBe(true);
      expect(vm.order).toBeNull();
      expect(vm.errorMessage).toBe('');
      expect(ordersApi.listOrders).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(vm);
      // Current behavior: the early return does not reset a previously set isLoading flag.
      expect(vm.isLoading).toBe(true);
    });

    it('reports a missing order when the response has no data', async () => {
      const vm = createViewModel();
      ordersApi.listOrders.and.resolveTo(listEnvelope([]));

      await vm.load('ORD-00100042');

      expect(vm.order).toBeNull();
      expect(vm.errorMessage).toBe('No encontramos este pedido.');
      expect(vm.isLoading).toBe(false);
    });

    it('guards the auth listener until an order number exists and the session is active', async () => {
      const authStore = createAuthStore({ authenticated: false });
      const vm = createViewModel({ authStore });
      vm.requiresAuth = true;

      authStore._notify();
      expect(ordersApi.listOrders).not.toHaveBeenCalled();

      vm._orderNumber = 'ORD-00100042';
      authStore._notify();
      expect(ordersApi.listOrders).not.toHaveBeenCalled();

      authStore.isAuthenticated.and.returnValue(true);
      authStore._notify();
      await Promise.resolve();

      expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
    });

    it('formats amounts before load using the default USD symbol', () => {
      const vm = createViewModel();

      expect(vm.formatAmount(44.99)).toBe('US$ 44.99');
      expect(vm.order).toBeNull();
    });

    it('passes an undefined order number straight through to the lookup', async () => {
      const vm = createViewModel();

      await vm.load(undefined);

      expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
      expect(vm.order).toBeNull();
      expect(vm.errorMessage).toBe('No encontramos este pedido.');
      expect(vm.isLoading).toBe(false);
    });

    it('subscribe() returns a working unsubscribe function', async () => {
      const vm = createViewModel();
      const listener = jasmine.createSpy('listener');

      subscribe(vm, listener)();
      await vm.load('ORD-00100042');

      expect(listener).not.toHaveBeenCalled();
    });

    it('destroy() cancels the auth listener and clears view listeners', async () => {
      const authStore = createAuthStore({ authenticated: false });
      const vm = createViewModel({ authStore });
      const listener = jasmine.createSpy('listener');
      subscribe(vm, listener);
      vm.requiresAuth = true;
      vm._orderNumber = 'ORD-00100042';

      vm.destroy();
      expect(vm._authUnsubscribe).toBeNull();

      authStore.isAuthenticated.and.returnValue(true);
      authStore._notify();
      await Promise.resolve();
      expect(ordersApi.listOrders).not.toHaveBeenCalled();

      await vm.load('ORD-00100042');
      expect(listener).not.toHaveBeenCalled();
    });

    it('clears isLoading after a 404 error', async () => {
      const vm = createViewModel();
      ordersApi.listOrders.and.rejectWith(apiError(404, 'NOT_FOUND'));

      await vm.load('ORD-x');

      expect(vm.errorMessage).toBe('No encontramos este pedido.');
      expect(vm.order).toBeNull();
      expect(vm.isLoading).toBe(false);
    });

    it('maps a non-Error rejection to the generic order message', async () => {
      const vm = createViewModel();
      ordersApi.listOrders.and.rejectWith('boom');

      await vm.load('ORD-00100042');

      expect(vm.errorMessage).toBe(
        'No pudimos cargar tu pedido. Inténtalo de nuevo en unos minutos.'
      );
      expect(vm.isLoading).toBe(false);
    });
  });
})();
