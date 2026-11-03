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
