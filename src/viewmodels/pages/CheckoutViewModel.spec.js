import { CartStore } from '../../store/cartStore.js';
import { CheckoutViewModel } from './CheckoutViewModel.js';

const apiError = (code, statusCode, message, details) =>
  Object.assign(new Error(message), { code, statusCode, details });

describe('CheckoutViewModel', () => {
  let cartStore;
  let cartService;
  let ordersApi;
  let authStore;
  let authListeners;
  let profile;
  let viewModel;

  const fillValidForm = (vm = viewModel) => {
    vm.setField('fullName', 'Aaron Florez');
    vm.setField('phone', '71234567');
    vm.setField('street', 'Av. Arce #123');
    vm.setField('city', 'La Paz');
    vm.setField('country', 'BO');
  };

  beforeEach(() => {
    cartStore = new CartStore();
    cartStore.addItem({ id: 'p-1', name: 'Clean Code', price: 20, currency: 'USD' }, 2);

    cartService = {
      loadCart: jasmine
        .createSpy('loadCart')
        .and.returnValue(Promise.resolve({ status: 'loaded' })),
    };
    ordersApi = {
      createOrder: jasmine
        .createSpy('createOrder')
        .and.returnValue(
          Promise.resolve({ data: { id: 'ord-1', order_number: 'ORD-00100042', total: 44.99 } })
        ),
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

    viewModel = new CheckoutViewModel({ ordersApi, cartService, cartStore, authStore });
  });

  afterEach(() => viewModel.destroy());

  describe('summary', () => {
    it('mirrors the cart with the same totals rule as the server (flat fee below US$ 50)', () => {
      expect(viewModel.isEmpty).toBe(false);
      expect(viewModel.itemCount).toBe(2);
      expect(viewModel.subtotal).toBe(40);
      expect(viewModel.shipping).toBe(4.99);
      expect(viewModel.total).toBe(44.99);
      expect(viewModel.getSubtotalLabel()).toBe('US$ 40.00');
      expect(viewModel.getShippingLabel()).toBe('US$ 4.99');
      expect(viewModel.getTotalLabel()).toBe('US$ 44.99');
      expect(viewModel.items[0].subtotalLabel).toBe('US$ 40.00');
    });

    it('shows free shipping from US$ 50', () => {
      cartStore.updateQuantity('p-1', 3);

      expect(viewModel.shipping).toBe(0);
      expect(viewModel.getShippingLabel()).toBe('Gratis');
      expect(viewModel.total).toBe(60);
    });

    it('follows cart changes and notifies subscribers', () => {
      const listener = jasmine.createSpy('listener');
      viewModel.subscribe(listener);

      cartStore.removeItem('p-1');

      expect(viewModel.isEmpty).toBe(true);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('form defaults', () => {
    it('prefills the name from the profile and starts with the simulated card payment', () => {
      expect(viewModel.form.fullName).toBe('Aaron Florez');
      expect(viewModel.form.paymentMethod).toBe('simulated');
      expect(viewModel.form.country).toBe('');
    });

    it('fills the name once the profile arrives after a cold start', async () => {
      profile = null;
      viewModel.destroy();
      viewModel = new CheckoutViewModel({ ordersApi, cartService, cartStore, authStore });
      expect(viewModel.form.fullName).toBe('');

      profile = { full_name: 'Aaron Florez' };
      await viewModel.load();

      expect(viewModel.form.fullName).toBe('Aaron Florez');
    });

    it('does not overwrite a name the buyer already typed', async () => {
      viewModel.setField('fullName', 'Otra Persona');

      await viewModel.load();

      expect(viewModel.form.fullName).toBe('Otra Persona');
    });
  });

  describe('load', () => {
    it('hydrates the cart from the API and clears the loading flag', async () => {
      await viewModel.load();

      expect(cartService.loadCart).toHaveBeenCalled();
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.requiresAuth).toBe(false);
    });

    it('flags guests so the view can ask them to log in', async () => {
      cartService.loadCart.and.returnValue(Promise.resolve({ status: 'auth-required' }));

      await viewModel.load();

      expect(viewModel.requiresAuth).toBe(true);
    });

    it('reports a load error', async () => {
      cartService.loadCart.and.returnValue(Promise.resolve({ status: 'error' }));

      await viewModel.load();

      expect(viewModel.loadError).toBe('No pudimos cargar tu carrito. Inténtalo de nuevo.');
    });

    it('reloads by itself when the session resolves after a cold start (GET /auth/me)', async () => {
      cartService.loadCart.and.returnValue(Promise.resolve({ status: 'auth-required' }));
      authStore.isAuthenticated = () => false;
      await viewModel.load();
      expect(viewModel.requiresAuth).toBe(true);

      cartService.loadCart.and.returnValue(Promise.resolve({ status: 'loaded' }));
      authStore.isAuthenticated = () => true;
      authListeners.forEach((listener) => listener());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(cartService.loadCart).toHaveBeenCalledTimes(2);
      expect(viewModel.requiresAuth).toBe(false);
    });
  });

  describe('setField', () => {
    it('stores the value WITHOUT notifying (typing must not re-render and steal focus)', () => {
      const listener = jasmine.createSpy('listener');
      viewModel.subscribe(listener);

      viewModel.setField('street', 'Calle 1');

      expect(viewModel.form.street).toBe('Calle 1');
      expect(listener).not.toHaveBeenCalled();
    });

    it('ignores unknown fields and clears the stale error of the edited field', () => {
      viewModel.errors = { street: 'mal', city: 'mal' };

      viewModel.setField('nope', 'x');
      viewModel.setField('street', 'Calle 1');

      expect(viewModel.form.nope).toBeUndefined();
      expect(viewModel.errors).toEqual({ city: 'mal' });
    });
  });

  describe('Scenario: successful checkout', () => {
    it('creates the order with the shipping data and payment method, then clears the local cart', async () => {
      fillValidForm();
      viewModel.setField('paymentMethod', 'cash_on_delivery');

      const result = await viewModel.submit();

      expect(ordersApi.createOrder).toHaveBeenCalledWith({
        shippingAddress: {
          full_name: 'Aaron Florez',
          phone: '71234567',
          street: 'Av. Arce #123',
          city: 'La Paz',
          country: 'BO',
        },
        paymentMethod: 'cash_on_delivery',
      });
      expect(result.status).toBe('success');
      expect(result.order.order_number).toBe('ORD-00100042');
      expect(viewModel.isPlaced).toBe(true);
      expect(viewModel.isSubmitting).toBe(false);
      expect(cartStore.getCount()).toBe(0);
      expect(viewModel.submitError).toBe('');
    });

    it('reports isSubmitting while the request is in flight and ignores a double click', async () => {
      fillValidForm();
      let resolveOrder;
      ordersApi.createOrder.and.returnValue(
        new Promise((resolve) => {
          resolveOrder = resolve;
        })
      );

      const first = viewModel.submit();
      expect(viewModel.isSubmitting).toBe(true);
      const second = await viewModel.submit();
      resolveOrder({ data: { id: 'ord-1', order_number: 'ORD-1' } });
      await first;

      expect(second.status).toBe('busy');
      expect(ordersApi.createOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation', () => {
    it('does not call the API with an invalid form and points to the first invalid field', async () => {
      viewModel.setField('phone', '71234567');
      viewModel.setField('city', 'La Paz');

      const result = await viewModel.submit();

      expect(result.status).toBe('invalid');
      expect(ordersApi.createOrder).not.toHaveBeenCalled();
      expect(viewModel.errors.street).toBeDefined();
      expect(viewModel.errors.country).toBeDefined();
      expect(viewModel.focusField).toBe('street');
      expect(cartStore.getCount()).toBe(2);
    });
  });

  describe('Scenario: empty cart', () => {
    it('cannot proceed', async () => {
      cartStore.clear();
      fillValidForm();

      const result = await viewModel.submit();

      expect(viewModel.isEmpty).toBe(true);
      expect(result.status).toBe('empty');
      expect(ordersApi.createOrder).not.toHaveBeenCalled();
    });

    it('re-syncs when the server says the cart is empty (e.g. bought in another tab)', async () => {
      fillValidForm();
      ordersApi.createOrder.and.returnValue(
        Promise.reject(apiError('EMPTY_CART', 422, 'Your cart is empty'))
      );

      const result = await viewModel.submit();

      expect(result.status).toBe('empty');
      expect(viewModel.isEmpty).toBe(true);
    });
  });

  describe('Scenario: insufficient stock during checkout', () => {
    beforeEach(() => {
      fillValidForm();
      ordersApi.createOrder.and.returnValue(
        Promise.reject(
          apiError('INSUFFICIENT_STOCK', 422, 'Insufficient stock for Clean Code', [
            { field: 'items.p-1', message: 'Insufficient stock for Clean Code' },
          ])
        )
      );
    });

    it('explains which product has no stock and does NOT clear the cart', async () => {
      const result = await viewModel.submit();

      expect(result.status).toBe('error');
      expect(viewModel.submitError).toContain('No hay stock suficiente de "Clean Code"');
      expect(viewModel.errorAction).toBe('cart');
      expect(viewModel.problemProductId).toBe('p-1');
      expect(cartStore.getCount()).toBe(2);
      expect(viewModel.isPlaced).toBe(false);
      expect(viewModel.isSubmitting).toBe(false);
    });

    it('lets the buyer retry after fixing the cart', async () => {
      await viewModel.submit();
      ordersApi.createOrder.and.returnValue(
        Promise.resolve({ data: { id: 'ord-2', order_number: 'ORD-2' } })
      );

      const retry = await viewModel.submit();

      expect(retry.status).toBe('success');
      expect(viewModel.submitError).toBe('');
    });

    it('falls back to the API message when the product is not in the local cart', async () => {
      cartStore.clear();
      cartStore.addItem({ id: 'p-9', name: 'Other', price: 5, currency: 'USD' }, 1);

      await viewModel.submit();

      expect(viewModel.submitError).toContain('"Clean Code"');
    });
  });

  describe('other business failures', () => {
    beforeEach(() => fillValidForm());

    it('PRODUCT_UNAVAILABLE asks to remove the product', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(
          apiError('PRODUCT_UNAVAILABLE', 422, 'Clean Code is no longer available', [
            { field: 'items.p-1', message: 'Clean Code is no longer available' },
          ])
        )
      );

      await viewModel.submit();

      expect(viewModel.submitError).toBe(
        '"Clean Code" ya no está disponible. Quítalo de tu carrito para continuar.'
      );
      expect(viewModel.errorAction).toBe('cart');
      expect(cartStore.getCount()).toBe(2);
    });

    it('MIXED_CURRENCIES explains the limitation', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(apiError('MIXED_CURRENCIES', 422, 'same currency'))
      );

      await viewModel.submit();

      expect(viewModel.submitError).toContain('monedas distintas');
    });

    it('maps server validation errors back to the form fields', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(
          apiError('VALIDATION_ERROR', 400, 'Invalid input data', [
            { field: 'shipping_address.phone', message: 'teléfono inválido' },
          ])
        )
      );

      const result = await viewModel.submit();

      expect(result.status).toBe('invalid');
      expect(viewModel.errors.phone).toBe('teléfono inválido');
      expect(viewModel.focusField).toBe('phone');
      expect(cartStore.getCount()).toBe(2);
    });

    it('INVALID_CSRF_TOKEN asks to reload', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(apiError('INVALID_CSRF_TOKEN', 403, 'CSRF token missing or invalid'))
      );

      await viewModel.submit();

      expect(viewModel.submitError).toContain('Recarga la página');
    });

    it('an expired session is handled by the shell (no banner)', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(apiError('SESSION_EXPIRED', undefined, 'SESSION_EXPIRED'))
      );

      const result = await viewModel.submit();

      expect(result.status).toBe('auth-expired');
      expect(viewModel.submitError).toBe('');
    });
  });

  describe('Scenario: transaction failure', () => {
    it('shows a generic message, never the server internals, and keeps the cart', async () => {
      fillValidForm();
      ordersApi.createOrder.and.returnValue(
        Promise.reject(
          apiError('INTERNAL_SERVER_ERROR', 500, 'An unexpected server error occurred')
        )
      );

      const result = await viewModel.submit();

      expect(result.status).toBe('error');
      expect(viewModel.submitError).toBe(
        'No pudimos procesar tu pedido. Inténtalo de nuevo en unos minutos.'
      );
      expect(viewModel.errorAction).toBeNull();
      expect(cartStore.getCount()).toBe(2);
      expect(viewModel.isPlaced).toBe(false);
    });

    it('treats a network failure the same way', async () => {
      fillValidForm();
      ordersApi.createOrder.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));

      await viewModel.submit();

      expect(viewModel.submitError).toContain('No pudimos procesar tu pedido');
      expect(cartStore.getCount()).toBe(2);
    });

    it('clears the previous error when the buyer tries again', async () => {
      fillValidForm();
      ordersApi.createOrder.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
      await viewModel.submit();
      expect(viewModel.submitError).not.toBe('');

      ordersApi.createOrder.and.returnValue(
        Promise.resolve({ data: { id: 'ord-3', order_number: 'ORD-3' } })
      );
      await viewModel.submit();

      expect(viewModel.submitError).toBe('');
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const GENERIC_ERROR = 'No pudimos procesar tu pedido. Inténtalo de nuevo en unos minutos.';

    const apiError = (code, statusCode, message, details) =>
      Object.assign(new Error(message), { code, statusCode, details });

    const createItem = (overrides = {}) => ({
      id: 'p-1',
      productId: 'p-1',
      name: 'Clean Code',
      price: 20,
      currency: 'USD',
      quantity: 2,
      ...overrides,
    });

    const createCartStore = ({ items = [] } = {}) => {
      const listeners = new Set();
      const store = {
        items: items.map((item) => ({ ...item })),
        getItems: jasmine
          .createSpy('getItems')
          .and.callFake(() => store.items.map((item) => ({ ...item }))),
        getSubtotal: jasmine.createSpy('getSubtotal').and.returnValue(0),
        getShipping: jasmine.createSpy('getShipping').and.returnValue(0),
        getTotal: jasmine.createSpy('getTotal').and.returnValue(0),
        getCount: jasmine.createSpy('getCount').and.returnValue(0),
        clear: jasmine.createSpy('clear').and.callFake(() => {
          store.items = [];
          store._notify();
        }),
        getItem: jasmine
          .createSpy('getItem')
          .and.callFake(
            (id) => store.items.find((item) => item.id === id || item.productId === id) ?? null
          ),
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        _notify: () => [...listeners].forEach((listener) => listener()),
      };
      return store;
    };

    const createCartService = (status = 'loaded') => ({
      loadCart: jasmine.createSpy('loadCart').and.resolveTo({ status }),
    });

    const createOrdersApi = () => ({
      createOrder: jasmine
        .createSpy('createOrder')
        .and.resolveTo({ data: { id: 'ord-1', order_number: 'ORD-1' } }),
    });

    const createAuthStore = ({
      withProfile = true,
      profile = { full_name: 'Aaron Florez' },
    } = {}) => {
      const listeners = new Set();
      const store = {
        isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        _notify: () => [...listeners].forEach((listener) => listener()),
      };
      if (withProfile) store.getProfile = jasmine.createSpy('getProfile').and.returnValue(profile);
      return store;
    };

    describe('CheckoutViewModel additional branches (recovered 1)', () => {
      let viewModels;

      beforeEach(() => {
        viewModels = [];
      });

      afterEach(() => {
        viewModels.forEach((vm) => vm.destroy());
        viewModels = [];
      });

      const createViewModel = ({ cartStore, cartService, ordersApi, authStore } = {}) => {
        const vm = new CheckoutViewModel({
          cartStore: cartStore ?? createCartStore(),
          cartService: cartService ?? createCartService(),
          ordersApi: ordersApi ?? createOrdersApi(),
          authStore: authStore ?? createAuthStore(),
        });
        viewModels.push(vm);
        return vm;
      };

      const fillValidForm = (vm) => {
        vm.setField('fullName', 'Aaron Florez');
        vm.setField('phone', '71234567');
        vm.setField('street', 'Av. Arce #123');
        vm.setField('city', 'La Paz');
        vm.setField('country', 'BO');
      };

      it('destroy() cancels both the cart and auth subscriptions', async () => {
        const cartStore = createCartStore({ items: [createItem()] });
        const authStore = createAuthStore();
        const cartService = createCartService('auth-required');
        const vm = createViewModel({ cartStore, cartService, authStore });
        vm.requiresAuth = true;
        const refreshSpy = spyOn(vm, 'refresh').and.callThrough();
        const loadSpy = spyOn(vm, 'load').and.resolveTo();

        vm.destroy();
        cartStore.items.push(createItem({ id: 'p-2' }));
        cartStore._notify();
        authStore.isAuthenticated.and.returnValue(true);
        authStore._notify();
        await Promise.resolve();

        expect(vm._storeUnsubscribe).toBeNull();
        expect(vm._authUnsubscribe).toBeNull();
        expect(refreshSpy).not.toHaveBeenCalled();
        expect(loadSpy).not.toHaveBeenCalled();
      });

      it('maps the postal_code alias to postalCode and clears errors from both names', () => {
        const vm = createViewModel();
        vm.errors = { postalCode: 'inválido', postal_code: 'inválido' };

        vm.setField('postal_code', '1234');

        expect(vm.form.postalCode).toBe('1234');
        expect(vm.form.postal_code).toBeUndefined();
        expect(vm.errors).toEqual({});
      });

      it('maps postalCode back to postal_code when the form uses the legacy name', () => {
        const vm = createViewModel();
        vm.form.postal_code = '';
        delete vm.form.postalCode;
        vm.errors = { postal_code: 'inválido' };

        vm.setField('postalCode', '9876');

        expect(vm.form.postal_code).toBe('9876');
        expect(vm.errors).toEqual({});
        expect(() => vm.setField(null, 'x')).not.toThrow();
        expect(vm.form.null).toBeUndefined();
      });

      it('notifies loading true and false around load()', async () => {
        const vm = createViewModel();
        const states = [];
        vm.subscribe((instance) => states.push(instance.isLoading));

        await vm.load();

        expect(states).toEqual([true, false]);
      });

      it('uses USD labels for an empty cart', () => {
        const vm = createViewModel({ cartStore: createCartStore() });

        expect(vm.getCurrency()).toBe('USD');
        expect(vm.getSubtotalLabel()).toBe('US$ 0.00');
        expect(vm.getShippingLabel()).toBe('Gratis');
        expect(vm.getTotalLabel()).toBe('US$ 0.00');
      });

      it('tolerates an auth store without getProfile', () => {
        const vm = createViewModel({ authStore: createAuthStore({ withProfile: false }) });

        expect(vm._profileName()).toBe('');
        expect(vm.form.fullName).toBe('');
      });

      it('maps a 400 with no usable details to the generic message', async () => {
        const vm = createViewModel();

        const empty = vm._handleFailure(apiError('VALIDATION_ERROR', 400, 'Invalid', []));
        expect(empty).toEqual({ status: 'error' });
        expect(vm.submitError).toBe(GENERIC_ERROR);

        const unmappable = vm._handleFailure(
          apiError('VALIDATION_ERROR', 400, 'Invalid', [
            { field: 'unknown.field', message: 'nope' },
          ])
        );
        expect(unmappable).toEqual({ status: 'error' });
        expect(vm.submitError).toBe(GENERIC_ERROR);
      });

      it('keeps the first message for a duplicated 400 field error', () => {
        const vm = createViewModel();

        const result = vm._handleFailure(
          apiError('VALIDATION_ERROR', 400, 'Invalid', [
            { field: 'shipping_address.city', message: 'primero' },
            { field: 'shipping_address.city', message: 'segundo' },
          ])
        );

        expect(result).toEqual({ status: 'invalid' });
        expect(vm.errors).toEqual({ city: 'primero' });
        expect(vm.focusField).toBe('city');
      });

      it('extracts the insufficient-stock product name from the API message', async () => {
        const vm = createViewModel({ cartStore: createCartStore({ items: [createItem()] }) });
        fillValidForm(vm);
        vm.ordersApi.createOrder.and.rejectWith(
          apiError('INSUFFICIENT_STOCK', 422, 'Insufficient stock for Café Cusco', [
            { field: 'other', message: 'n/a' },
          ])
        );

        const result = await vm.submit();

        expect(result.status).toBe('error');
        expect(vm.submitError).toBe(
          'No hay stock suficiente de "Café Cusco". Revisa tu carrito para ajustar la cantidad o quitarlo.'
        );
        expect(vm.problemProductId).toBeNull();
        expect(vm.errorAction).toBe('cart');
      });

      it('falls back to "un producto de tu carrito" when no name can be resolved', async () => {
        const vm = createViewModel({
          cartStore: createCartStore({ items: [createItem({ id: 'p-2', productId: 'p-2' })] }),
        });
        fillValidForm(vm);
        vm.ordersApi.createOrder.and.rejectWith(
          apiError('INSUFFICIENT_STOCK', 409, 'conflict', [
            { field: 'items.p-1', message: 'conflict' },
          ])
        );

        await vm.submit();

        expect(vm.problemProductId).toBe('p-1');
        expect(vm.submitError).toBe(
          'No hay stock suficiente de "un producto de tu carrito". Revisa tu carrito para ajustar la cantidad o quitarlo.'
        );
      });

      it('shows the generic message for a 401 failure', async () => {
        const cartStore = createCartStore({ items: [createItem()] });
        const vm = createViewModel({ cartStore });
        fillValidForm(vm);
        vm.ordersApi.createOrder.and.rejectWith(apiError('UNAUTHORIZED', 401, 'Unauthorized'));

        const result = await vm.submit();

        expect(result).toEqual({ status: 'error' });
        expect(vm.submitError).toBe(GENERIC_ERROR);
        expect(vm.errorAction).toBeNull();
        expect(cartStore.getCount).toHaveBeenCalled();
        expect(cartStore.items.length).toBe(1);
      });

      it('characterizes that a successful submit clears errors but leaves focusField stale', async () => {
        const vm = createViewModel({ cartStore: createCartStore({ items: [createItem()] }) });
        fillValidForm(vm);
        vm.errors = { street: 'error viejo' };
        vm.focusField = 'street';

        const result = await vm.submit();

        expect(result.status).toBe('success');
        // submit() always assigns the fresh validation result, so errors are cleared;
        // focusField is only set on the invalid path and therefore remains stale.
        expect(vm.errors).toEqual({});
        expect(vm.focusField).toBe('street');
      });

      it('characterizes success with a null response body as not placed', async () => {
        const cartStore = createCartStore({ items: [createItem()] });
        const vm = createViewModel({ cartStore });
        fillValidForm(vm);
        vm.ordersApi.createOrder.and.resolveTo({ data: null });

        const result = await vm.submit();

        expect(result).toEqual({ status: 'success', order: null });
        expect(vm.order).toBeNull();
        expect(vm.isPlaced).toBe(false);
        expect(cartStore.clear).toHaveBeenCalled();
        expect(vm.isEmpty).toBe(true);
      });
    });
  })();
})();
