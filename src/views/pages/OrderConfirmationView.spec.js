import { OrderConfirmationViewModel } from '../../viewmodels/pages/OrderConfirmationViewModel.js';
import { OrderConfirmationView } from './OrderConfirmationView.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const cells = (el) => [...el.children].map((child) => child.textContent).join(' ');

const order = {
  id: 'ord-1',
  order_number: 'ORD-00100042',
  status: 'pending',
  currency: 'USD',
  subtotal: 40,
  shipping_cost: 4.99,
  tax: 0,
  total: 44.99,
  shipping_address: {
    full_name: 'Aaron Florez',
    phone: '71234567',
    street: 'Av. Arce #123',
    city: 'La Paz',
    state: 'La Paz',
    country: 'BO',
  },
  items: [{ id: 'oi-1', product_name: 'Clean Code', quantity: 2, unit_price: 20, subtotal: 40 }],
};

describe('OrderConfirmationView', () => {
  let container;
  let ordersApi;
  let authenticated;
  let profile;
  let view;
  let onNavigate;
  let onLogin;

  const mountView = async () => {
    const authStore = {
      isAuthenticated: () => authenticated,
      getProfile: () => profile,
      subscribe: () => () => {},
    };
    const viewModel = new OrderConfirmationViewModel({ ordersApi, authStore });
    view = new OrderConfirmationView({
      orderNumber: 'ORD-00100042',
      viewModel,
      onNavigate,
      onLogin,
    });
    view.mount(container);
    await tick();
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    authenticated = true;
    profile = { full_name: 'Valeria Quispe' };
    ordersApi = {
      listOrders: jasmine
        .createSpy('listOrders')
        .and.returnValue(Promise.resolve({ data: [order], meta: { total_pages: 1 } })),
    };
    onNavigate = jasmine.createSpy('onNavigate');
    onLogin = jasmine.createSpy('onLogin');
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  describe('layout (mockup SC-09)', () => {
    it('greets the buyer by first name under the "Pedido confirmado" eyebrow', async () => {
      await mountView();

      expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
      expect(container.querySelector('.q-checkout__eyebrow').textContent).toBe('Pedido confirmado');
      expect(container.querySelector('h1').textContent).toBe('¡Gracias por tu compra, Valeria!');
      const back = container.querySelector('.q-checkout__back');
      expect(back.getAttribute('href')).toBe('/');
      expect(back.textContent).toContain('Volver al inicio');
    });

    it('drops the name from the greeting when the profile has none', async () => {
      profile = null;

      await mountView();

      expect(container.querySelector('h1').textContent).toBe('¡Gracias por tu compra!');
    });

    it('shows the confirmation card with the order number and the call to action', async () => {
      await mountView();

      const card = container.querySelector('[data-testid="order-confirmation"]');
      expect(card.classList.contains('q-glass-panel')).toBe(true);
      expect(card.querySelector('h2').textContent).toBe('Tu pedido está confirmado');
      expect(card.querySelector('[data-testid="order-confirmation-number"]').textContent).toBe(
        'Número de pedido: #ORD-00100042'
      );
      const cta = card.querySelector('a.q-btn--primary');
      expect(cta.textContent).toBe('Ver mis pedidos');
      expect(cta.getAttribute('href')).toBe('/orders');
      expect(cta.classList.contains('q-btn--block')).toBe(true);
    });

    it('marks only the "Pendiente" step as reached for a new order', async () => {
      await mountView();

      const steps = [...container.querySelectorAll('.q-order-confirmation__step')];
      expect(steps.map((step) => step.textContent.trim())).toEqual([
        'Pendiente',
        'Confirmado',
        'Enviado',
        'Entregado',
      ]);
      expect(steps.map((step) => step.classList.contains('is-reached'))).toEqual([
        true,
        false,
        false,
        false,
      ]);
      expect(steps[0].getAttribute('aria-current')).toBe('step');
    });

    it('advances the timeline when the order has progressed', async () => {
      ordersApi.listOrders.and.returnValue(
        Promise.resolve({ data: [{ ...order, status: 'shipped' }], meta: { total_pages: 1 } })
      );

      await mountView();

      const reached = [...container.querySelectorAll('.q-order-confirmation__step')].map((step) =>
        step.classList.contains('is-reached')
      );
      expect(reached).toEqual([true, true, true, false]);
    });

    it('shows "Cancelado" instead of the timeline for a cancelled order', async () => {
      ordersApi.listOrders.and.returnValue(
        Promise.resolve({
          data: [{ ...order, status: 'cancelled' }],
          meta: { total_pages: 1 },
        })
      );

      await mountView();

      expect(container.querySelector('[data-testid="order-timeline"]')).toBeNull();
      expect(container.querySelector('.q-order-confirmation__cancelled').textContent).toBe(
        'Cancelado'
      );
    });
  });

  describe('receipt', () => {
    it('lists the items and the totals exactly as the API returned them', async () => {
      await mountView();

      const item = container.querySelector('[data-testid="receipt-item"]');
      expect(cells(item)).toBe('Clean Code × 2 US$ 40.00');
      const rows = [
        ...container.querySelectorAll('.q-order-confirmation__receipt .q-checkout__row'),
      ].map(cells);
      expect(rows).toEqual(['Subtotal US$ 40.00', 'Envío estándar US$ 4.99', 'Total US$ 44.99']);
      expect(container.querySelector('[data-testid="receipt-total"]').textContent).toBe(
        'US$ 44.99'
      );
    });

    it('shows taxes only when there are some', async () => {
      ordersApi.listOrders.and.returnValue(
        Promise.resolve({
          data: [{ ...order, tax: 5.2, total: 50.19 }],
          meta: { total_pages: 1 },
        })
      );

      await mountView();

      expect(container.textContent).toContain('Impuestos');
      expect(container.textContent).toContain('US$ 5.20');
    });

    it('shows where the order is shipped to', async () => {
      await mountView();

      const lines = [...container.querySelectorAll('[data-testid="receipt-address"] p')].map(
        (line) => line.textContent
      );
      expect(lines).toEqual(['Aaron Florez', '71234567', 'Av. Arce #123', 'La Paz, La Paz', 'BO']);
    });

    it('omits the address block when the order has none', async () => {
      ordersApi.listOrders.and.returnValue(
        Promise.resolve({
          data: [{ ...order, shipping_address: null }],
          meta: { total_pages: 1 },
        })
      );

      await mountView();

      expect(container.querySelector('[data-testid="receipt-address"]')).toBeNull();
    });
  });

  it('shows a loading state before the order arrives', () => {
    ordersApi.listOrders.and.returnValue(new Promise(() => {}));
    const authStore = {
      isAuthenticated: () => true,
      getProfile: () => profile,
      subscribe: () => () => {},
    };
    view = new OrderConfirmationView({
      orderNumber: 'ORD-00100042',
      viewModel: new OrderConfirmationViewModel({ ordersApi, authStore }),
    });
    view.mount(container);

    expect(container.textContent).toContain('Cargando tu pedido…');
  });

  it('explains when the order belongs to someone else (403)', async () => {
    ordersApi.listOrders.and.returnValue(
      Promise.reject(Object.assign(new Error('x'), { statusCode: 403, code: 'FORBIDDEN' }))
    );

    await mountView();

    expect(container.textContent).toContain('No tienes permiso para ver este pedido.');
    expect(container.querySelector('[data-testid="order-confirmation"]')).toBeNull();
    container.querySelector('button').click();
    expect(onNavigate).toHaveBeenCalledWith('/orders');
  });

  it('asks guests to log in', async () => {
    authenticated = false;

    await mountView();

    expect(container.querySelector('h1').textContent).toBe('Inicia sesión para ver tu pedido');
    container.querySelector('button').click();
    expect(onLogin).toHaveBeenCalled();
    expect(ordersApi.listOrders).not.toHaveBeenCalled();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const order = {
    id: 'ord-1',
    order_number: 'ORD-00100042',
    status: 'pending',
    currency: 'USD',
    subtotal: 40,
    shipping_cost: 4.99,
    tax: 0,
    total: 44.99,
    shipping_address: {
      full_name: 'Aaron Florez',
      phone: '71234567',
      street: 'Av. Arce #123',
      city: 'La Paz',
      state: 'La Paz',
      country: 'BO',
    },
    items: [{ id: 'oi-1', product_name: 'Clean Code', quantity: 2, unit_price: 20, subtotal: 40 }],
  };

  describe('OrderConfirmationView (recovered 1)', () => {
    let container;
    let ordersApi;
    let authenticated;
    let profile;
    let view;
    let onNavigate;
    let onLogin;

    const mountView = async () => {
      const authStore = {
        isAuthenticated: () => authenticated,
        getProfile: () => profile,
        subscribe: () => () => {},
      };
      const viewModel = new OrderConfirmationViewModel({ ordersApi, authStore });
      view = new OrderConfirmationView({
        orderNumber: 'ORD-00100042',
        viewModel,
        onNavigate,
        onLogin,
      });
      view.mount(container);
      await tick();
    };

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      authenticated = true;
      profile = { full_name: 'Valeria Quispe' };
      ordersApi = {
        getOrderById: jasmine
          .createSpy('getOrderById')
          .and.returnValue(Promise.resolve({ data: order, meta: {} })),
        listOrders: jasmine.createSpy('listOrders').and.callFake(async () => {
          const response = await ordersApi.getOrderById('ord-1');
          return { data: [response.data], meta: { total_pages: 1 } };
        }),
      };
      onNavigate = jasmine.createSpy('onNavigate');
      onLogin = jasmine.createSpy('onLogin');
    });

    afterEach(() => {
      view?.destroy();
      view = null;
      container.remove();
    });

    describe('layout (mockup SC-09) (recovered 2)', () => {
      it('greets the buyer by first name under the "Pedido confirmado" eyebrow', async () => {
        await mountView();

        expect(ordersApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
        expect(container.querySelector('.q-checkout__eyebrow').textContent).toBe(
          'Pedido confirmado'
        );
        expect(container.querySelector('h1').textContent).toBe('¡Gracias por tu compra, Valeria!');
        const back = container.querySelector('.q-checkout__back');
        expect(back.getAttribute('href')).toBe('/');
        expect(back.textContent).toContain('Volver al inicio');
      });

      it('marks only the "Pendiente" step as reached for a new order', async () => {
        await mountView();

        const steps = [...container.querySelectorAll('.q-order-confirmation__step')];
        expect(steps.map((step) => step.textContent.trim())).toEqual([
          'Pendiente',
          'Confirmado',
          'Enviado',
          'Entregado',
        ]);
        expect(steps.map((step) => step.classList.contains('is-reached'))).toEqual([
          true,
          false,
          false,
          false,
        ]);
        expect(steps[0].getAttribute('aria-current')).toBe('step');
      });

      it('shows "Cancelado" instead of the timeline for a cancelled order', async () => {
        ordersApi.getOrderById.and.returnValue(
          Promise.resolve({ data: { ...order, status: 'cancelled' }, meta: {} })
        );

        await mountView();

        expect(container.querySelector('[data-testid="order-timeline"]')).toBeNull();
        expect(container.querySelector('.q-order-confirmation__cancelled').textContent).toBe(
          'Cancelado'
        );
      });
    });
  });

  (() => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    const cells = (el) => [...el.children].map((child) => child.textContent).join(' ');

    const createOrder = (overrides = {}) => ({
      id: 'ord-1',
      order_number: 'ORD-00100042',
      status: 'pending',
      currency: 'USD',
      subtotal: 40,
      shipping_cost: 4.99,
      tax: 0,
      total: 44.99,
      shipping_address: {
        full_name: 'Aaron Florez',
        phone: '71234567',
        street: 'Av. Arce #123',
        city: 'La Paz',
        state: 'La Paz',
        country: 'BO',
      },
      items: [
        { id: 'oi-1', product_name: 'Clean Code', quantity: 2, unit_price: 20, subtotal: 40 },
      ],
      ...overrides,
    });

    const createAuthStore = ({
      authenticated = true,
      profile = { full_name: 'Valeria Quispe' },
    } = {}) => {
      const listeners = new Set();
      return {
        isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(authenticated),
        getProfile: jasmine.createSpy('getProfile').and.returnValue(profile),
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        _listeners: listeners,
        _notify: () => [...listeners].forEach((listener) => listener()),
      };
    };

    const createMockViewModel = ({
      order = createOrder(),
      errorMessage = '',
      requiresAuth = false,
      isLoading = false,
    } = {}) => {
      const listeners = new Set();
      return {
        order,
        errorMessage,
        requiresAuth,
        isLoading,
        load: jasmine.createSpy('load').and.resolveTo(),
        formatAmount: (amount) => `US$ ${(Number(amount) || 0).toFixed(2)}`,
        destroy: jasmine.createSpy('destroy'),
        _listeners: listeners,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        _notify: () => [...listeners].forEach((listener) => listener()),
      };
    };

    describe('OrderConfirmationView additional branches (recovered 3)', () => {
      let container;
      let views;
      let ordersApi;
      let authStore;
      let onNavigate;
      let onLogin;

      const makeView = (options = {}) => {
        const view = new OrderConfirmationView(options);
        views.push(view);
        return view;
      };

      const makeViewModel = () => new OrderConfirmationViewModel({ ordersApi, authStore });

      const mountView = async ({
        orderNumber = 'ORD-00100042',
        navigate = onNavigate,
        login = onLogin,
        viewModel,
      } = {}) => {
        const vm = viewModel ?? makeViewModel();
        const view = makeView({ orderNumber, viewModel: vm, onNavigate: navigate, onLogin: login });
        view.mount(container);
        await tick();
        return { view, vm };
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        views = [];
        ordersApi = {
          getOrderById: jasmine
            .createSpy('getOrderById')
            .and.resolveTo({ data: createOrder(), meta: {} }),
          listOrders: jasmine.createSpy('listOrders').and.callFake(async () => {
            const response = await ordersApi.getOrderById('ord-1');
            return { data: [response.data], meta: { total_pages: 1 } };
          }),
        };
        authStore = createAuthStore();
        onNavigate = jasmine.createSpy('onNavigate');
        onLogin = jasmine.createSpy('onLogin');
      });

      afterEach(() => {
        views.forEach((view) => view.destroy());
        views = [];
        container.remove();
      });

      it('uses the documented defaults when constructed with no options', () => {
        const view = makeView();

        expect(view.orderNumber).toBeUndefined();
        expect(view.viewModel).toBeInstanceOf(OrderConfirmationViewModel);
        expect(view.onNavigate).toBeNull();
        expect(view.onLogin).toBeNull();
        expect(view.element).toBeNull();
        expect(view._unsubscribe).toBeNull();

        const element = view.render();
        expect(element.className).toBe('q-order-confirmation');
        expect(element.getAttribute('aria-label')).toBe('Confirmación de pedido');
      });

      it('caches its section and skips re-rendering on later render calls', () => {
        const vm = makeViewModel();
        const view = makeView({ viewModel: vm });
        const first = view.render();
        const renderContent = spyOn(view, '_renderContent');

        expect(view.render()).toBe(first);
        expect(view.render()).toBe(first);
        expect(renderContent).not.toHaveBeenCalled();
        expect(vm._listeners.size).toBe(0);
        expect(container.contains(first)).toBe(false);
      });

      it('leaks the first subscription when mounted twice', () => {
        const vm = createMockViewModel();
        const view = makeView({ viewModel: vm });
        const first = view.mount(container);

        expect(vm._listeners.size).toBe(1);
        expect(view.mount(container)).toBe(first);
        expect(container.children.length).toBe(1);
        expect(container.querySelectorAll('.q-order-confirmation').length).toBe(1);
        expect(vm._listeners.size).toBe(2);
        expect(vm.load).toHaveBeenCalledTimes(2);

        view.destroy();
        expect(view._unsubscribe).toBeNull();
        expect(vm._listeners.size).toBe(1);
        expect(() => vm._notify()).not.toThrow();
        expect(container.querySelector('.q-order-confirmation')).toBeNull();
      });

      it('unsubscribes, destroys the VM, detaches the DOM and tolerates a second destroy', async () => {
        const { view, vm } = await mountView();
        const element = view.element;

        expect(vm._listeners.size).toBe(1);
        expect(authStore._listeners.size).toBe(1);

        view.destroy();

        expect(vm._listeners.size).toBe(0);
        expect(authStore._listeners.size).toBe(0);
        expect(vm._authUnsubscribe).toBeNull();
        expect(view._unsubscribe).toBeNull();
        expect(view.element).toBeNull();
        expect(document.body.contains(element)).toBe(false);
        expect(container.querySelector('.q-order-confirmation')).toBeNull();
        expect(() => view.destroy()).not.toThrow();
        expect(vm._listeners.size).toBe(0);
      });

      it('shows the exact 404 notice with a role=status container', async () => {
        ordersApi.getOrderById.and.rejectWith(Object.assign(new Error('x'), { statusCode: 404 }));
        await mountView();

        const notice = container.querySelector('.q-cart__empty');
        expect(notice.getAttribute('role')).toBe('status');
        expect(notice.querySelector('h1').textContent).toBe('No pudimos mostrar tu pedido');
        expect(notice.querySelector('.q-cart__empty-message').textContent).toBe(
          'No encontramos este pedido.'
        );
        const button = notice.querySelector('button');
        expect(button.textContent).toBe('Ver mis pedidos');
        button.click();
        expect(onNavigate).toHaveBeenCalledWith('/orders');
      });

      it('shows the exact generic error message with a role=status container', async () => {
        ordersApi.getOrderById.and.rejectWith(new Error('boom'));
        await mountView();

        const notice = container.querySelector('.q-cart__empty');
        expect(notice.getAttribute('role')).toBe('status');
        expect(notice.querySelector('.q-cart__empty-message').textContent).toBe(
          'No pudimos cargar tu pedido. Inténtalo de nuevo en unos minutos.'
        );
        expect(container.querySelector('[data-testid="order-confirmation"]')).toBeNull();
      });

      it('keeps both notice actions safe when their callbacks are null', async () => {
        const { view } = await mountView({
          navigate: null,
          login: null,
          viewModel: createMockViewModel({ errorMessage: 'Fallo' }),
        });

        expect(() => container.querySelector('.q-cart__empty button').click()).not.toThrow();

        view.destroy();
        container.innerHTML = '';
        const guestView = makeView({
          viewModel: createMockViewModel({ requiresAuth: true, order: null }),
          onNavigate: null,
          onLogin: null,
        });
        guestView.mount(container);

        expect(() => container.querySelector('.q-cart__empty button').click()).not.toThrow();
      });

      it('renders the loading notice with role=status and no message or action', () => {
        ordersApi.getOrderById.and.returnValue(new Promise(() => {}));
        makeView({ viewModel: makeViewModel() }).mount(container);

        const notice = container.querySelector('.q-cart__empty');
        expect(notice.getAttribute('role')).toBe('status');
        expect(notice.querySelector('h1').textContent).toBe('Cargando tu pedido…');
        expect(notice.querySelector('p')).toBeNull();
        expect(notice.querySelector('button')).toBeNull();
      });

      it('stays permanently on the loading notice for SESSION_EXPIRED (characterized)', async () => {
        ordersApi.getOrderById.and.rejectWith(
          Object.assign(new Error('x'), { code: 'SESSION_EXPIRED' })
        );
        const { vm } = await mountView();

        expect(vm.isLoading).toBe(false);
        expect(vm.errorMessage).toBe('');
        const notice = container.querySelector('.q-cart__empty');
        expect(notice.getAttribute('role')).toBe('status');
        expect(notice.querySelector('h1').textContent).toBe('Cargando tu pedido…');
        expect(notice.querySelector('.q-cart__empty-message')).toBeNull();
        expect(notice.querySelector('button')).toBeNull();
        expect(container.querySelector('[data-testid="order-confirmation"]')).toBeNull();
      });

      it('marks confirmed as the current step and adds icons only to reached steps', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ status: 'confirmed' }),
          meta: {},
        });
        await mountView();

        const steps = [...container.querySelectorAll('.q-order-confirmation__step')];
        expect(steps.map((step) => step.classList.contains('is-reached'))).toEqual([
          true,
          true,
          false,
          false,
        ]);
        expect(steps.map((step) => step.getAttribute('aria-current'))).toEqual([
          null,
          'step',
          null,
          null,
        ]);
        expect(
          steps.map((step) => Boolean(step.querySelector('.q-order-confirmation__step-icon')))
        ).toEqual([true, true, false, false]);
        expect(container.querySelectorAll('.q-order-confirmation__step-icon').length).toBe(2);
      });

      it('marks every step reached for a delivered order', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ status: 'delivered' }),
          meta: {},
        });
        await mountView();

        const steps = [...container.querySelectorAll('.q-order-confirmation__step')];
        expect(steps.map((step) => step.classList.contains('is-reached'))).toEqual([
          true,
          true,
          true,
          true,
        ]);
        expect(steps.map((step) => step.getAttribute('aria-current'))).toEqual([
          null,
          null,
          null,
          'step',
        ]);
        expect(container.querySelectorAll('.q-order-confirmation__step-icon').length).toBe(4);
      });

      it('treats an unknown status as the first step', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ status: 'processing' }),
          meta: {},
        });
        await mountView();

        const steps = [...container.querySelectorAll('.q-order-confirmation__step')];
        expect(steps.map((step) => step.classList.contains('is-reached'))).toEqual([
          true,
          false,
          false,
          false,
        ]);
        expect(steps.map((step) => step.getAttribute('aria-current'))).toEqual([
          'step',
          null,
          null,
          null,
        ]);
        expect(container.querySelectorAll('.q-order-confirmation__step-icon').length).toBe(1);
      });

      it('renders no receipt items when items is null or undefined', async () => {
        for (const items of [null, undefined]) {
          ordersApi.getOrderById.and.resolveTo({ data: createOrder({ items }), meta: {} });
          const { view } = await mountView();

          expect(container.querySelectorAll('[data-testid="receipt-item"]').length).toBe(0);
          expect(container.querySelector('.q-checkout__items').children.length).toBe(0);

          view.destroy();
          container.innerHTML = '';
        }
      });

      it('renders a blank missing name, stringifies the quantity and falls back to a zero amount', async () => {
        ordersApi.getOrderById.and.resolveTo({ data: createOrder({ items: [{}] }), meta: {} });
        await mountView();

        const item = container.querySelector('[data-testid="receipt-item"]');
        // textContent = undefined yields '' in this DOM; the template string keeps literal 'undefined'.
        expect(cells(item)).toBe(' × undefined US$ 0.00');
      });

      it('joins a city-only address without a dangling comma', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ shipping_address: { city: 'La Paz' } }),
          meta: {},
        });
        await mountView();

        const lines = [...container.querySelectorAll('[data-testid="receipt-address"] p')].map(
          (line) => line.textContent
        );
        expect(lines).toEqual(['La Paz']);
      });

      it('joins a state-only address without a dangling comma', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ shipping_address: { state: 'Santa Cruz' } }),
          meta: {},
        });
        await mountView();

        const lines = [...container.querySelectorAll('[data-testid="receipt-address"] p')].map(
          (line) => line.textContent
        );
        expect(lines).toEqual(['Santa Cruz']);
      });

      it('renders only the heading for an empty address object', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ shipping_address: {} }),
          meta: {},
        });
        await mountView();

        const address = container.querySelector('[data-testid="receipt-address"]');
        expect(address.querySelector('h3').textContent).toBe('Enviamos a');
        expect(address.querySelectorAll('p').length).toBe(0);
      });

      it('keeps a whitespace-only full_name as an address line (characterized)', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ shipping_address: { full_name: '   ' } }),
          meta: {},
        });
        await mountView();

        const lines = [...container.querySelectorAll('[data-testid="receipt-address"] p')].map(
          (line) => line.textContent
        );
        expect(lines).toEqual(['   ']);
      });

      it('falls back to the US$ symbol when the order has no currency', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ currency: undefined }),
          meta: {},
        });
        await mountView();

        expect(container.querySelector('[data-testid="receipt-total"]').textContent).toBe(
          'US$ 44.99'
        );
        expect(container.textContent).toContain('US$ 40.00');
        expect(container.textContent).not.toContain('undefined');
      });

      it('formats a string tax of 5.2 as a US$ tax row', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ tax: '5.2', total: 50.19 }),
          meta: {},
        });
        await mountView();

        const rows = [
          ...container.querySelectorAll('.q-order-confirmation__receipt .q-checkout__row'),
        ];
        expect(rows.map(cells)).toContain('Impuestos US$ 5.20');
        expect(container.querySelector('[data-testid="receipt-total"]').textContent).toBe(
          'US$ 50.19'
        );
      });

      it('adds a receipt data-testid only to the total value', async () => {
        await mountView();

        const values = [...container.querySelectorAll('.q-checkout__row-value')];
        expect(values.map((value) => value.dataset.testid ?? null)).toEqual([
          null,
          null,
          'receipt-total',
        ]);
        expect(values.filter((value) => value.hasAttribute('data-testid')).length).toBe(1);
      });

      it('marks both navigation anchors as client-side routes', async () => {
        await mountView();

        const back = container.querySelector('.q-checkout__back');
        const cta = container.querySelector('.q-order-confirmation__card a.q-btn');
        expect(back.getAttribute('href')).toBe('/');
        expect(back.getAttribute('data-route')).toBe('');
        expect(cta.getAttribute('href')).toBe('/orders');
        expect(cta.getAttribute('data-route')).toBe('');
      });

      it('stringifies an undefined order number into the confirmation number', async () => {
        ordersApi.getOrderById.and.resolveTo({
          data: createOrder({ order_number: undefined }),
          meta: {},
        });
        const vm = makeViewModel();
        const view = makeView({ orderNumber: undefined, viewModel: vm });
        view.mount(container);
        await tick();

        expect(
          container.querySelector('[data-testid="order-confirmation-number"]').textContent
        ).toBe('Número de pedido: #undefined');
      });
    });
  })();
})();
