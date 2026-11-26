import { CartStore } from '../../store/cartStore.js';
import { CheckoutViewModel } from '../../viewmodels/pages/CheckoutViewModel.js';
import { CheckoutView } from './CheckoutView.js';

const apiError = (code, statusCode, message, details) =>
  Object.assign(new Error(message), { code, statusCode, details });

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const cells = (el) => [...el.children].map((child) => child.textContent).join(' ');

describe('CheckoutView', () => {
  let container;
  let cartStore;
  let cartService;
  let ordersApi;
  let view;
  let onOrderPlaced;
  let onLogin;

  const mountView = async ({
    authenticated = true,
    profile = { full_name: 'Aaron Florez' },
  } = {}) => {
    const authStore = {
      isAuthenticated: () => authenticated,
      getProfile: () => profile,
      subscribe: () => () => {},
    };
    cartService.loadCart.and.returnValue(
      Promise.resolve({ status: authenticated ? 'loaded' : 'auth-required' })
    );
    const viewModel = new CheckoutViewModel({ ordersApi, cartService, cartStore, authStore });
    view = new CheckoutView({ viewModel, onOrderPlaced, onLogin });
    view.mount(container);
    await tick();
    return viewModel;
  };

  const type = (selector, value) => {
    const input = container.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  };

  const choose = (selector, value) => {
    const select = container.querySelector(selector);
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fillValidForm = () => {
    type('#q-checkout-phone', '71234567');
    type('#q-checkout-street', 'Av. Arce #123');
    type('#q-checkout-city', 'La Paz');
    choose('#q-checkout-country', 'BO');
  };

  const submit = async () => {
    container.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    cartStore = new CartStore();
    cartStore.addItem({ id: 'p-1', name: 'Clean Code', price: 20, currency: 'USD' }, 2);
    cartService = { loadCart: jasmine.createSpy('loadCart') };
    ordersApi = {
      createOrder: jasmine
        .createSpy('createOrder')
        .and.returnValue(Promise.resolve({ data: { id: 'ord-1', order_number: 'ORD-00100042' } })),
    };
    onOrderPlaced = jasmine.createSpy('onOrderPlaced');
    onLogin = jasmine.createSpy('onLogin');
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  describe('layout (mockup SC-08)', () => {
    it('shows the heading with the eyebrow and a link back to the cart', async () => {
      await mountView();

      expect(container.querySelector('.q-checkout__eyebrow').textContent).toBe('Envío y pago');
      expect(container.querySelector('h1').textContent).toBe('Finalizar compra');
      const back = container.querySelector('.q-checkout__back');
      expect(back.getAttribute('href')).toBe('/cart');
      expect(back.textContent).toContain('Volver al carrito');
    });

    it('shows the current checkout step before the shipping details', async () => {
      await mountView();

      const steps = [...container.querySelectorAll('.q-checkout__step')];
      expect(steps.map((step) => step.textContent)).toEqual([
        'PASO 1 DE 3 · ENVÍO',
        '2 · PAGO',
        '3 · REVISIÓN',
      ]);
      expect(steps[0].getAttribute('aria-current')).toBe('step');
      expect(
        steps[0].parentElement.nextElementSibling.classList.contains('q-checkout__panel')
      ).toBe(true);
    });

    it('has the "Datos de envío" card with the six mockup fields', async () => {
      await mountView();

      const panels = [...container.querySelectorAll('.q-checkout__panel-title')].map(
        (title) => title.textContent
      );
      expect(panels).toEqual(['Datos de envío', 'Forma de pago', 'Resumen']);
      const labels = [...container.querySelectorAll('.q-checkout__grid .q-checkout__label')].map(
        (label) => label.textContent
      );
      expect(labels).toEqual([
        'Nombre completo',
        'Teléfono',
        'Dirección',
        'Ciudad',
        'País',
        'Departamento / Estado / Provincia',
        'Código postal (opcional)',
      ]);
      expect(container.querySelector('#q-checkout-street').placeholder).toBe('Av. Arce #123');
    });

    it('prefills the name and asks to select a country', async () => {
      await mountView();

      expect(container.querySelector('#q-checkout-fullName').value).toBe('Aaron Florez');
      const country = container.querySelector('#q-checkout-country');
      expect(country.options[0].textContent).toBe('Selecciona un país');
      expect(country.value).toBe('');
    });

    it('offers card (simulated) and cash on delivery, with the demo disclaimer', async () => {
      await mountView();

      const rows = [...container.querySelectorAll('.q-checkout__payment')].map((row) =>
        [...row.querySelectorAll('.q-checkout__payment-label, .q-checkout__payment-hint')]
          .map((part) => part.textContent)
          .join(' ')
      );
      expect(rows).toEqual(['Tarjeta Pago simulado', 'Contra entrega']);
      const radios = container.querySelectorAll('input[name="paymentMethod"]');
      expect(radios[0].checked).toBe(true);
      expect(radios[1].checked).toBe(false);
      expect(container.querySelector('.q-checkout__note').textContent).toBe(
        'No se realizará ningún cobro real en esta demostración.'
      );
    });

    it('shows the summary with a thumbnail, subtotal, "Envío estándar" and total', async () => {
      await mountView();

      expect(container.querySelector('.q-checkout__thumb')).not.toBeNull();
      expect(container.querySelector('.q-checkout__item-name').textContent).toBe('Clean Code');
      expect(container.querySelector('.q-checkout__item-qty').textContent).toBe('× 2');
      const rows = [...container.querySelectorAll('.q-checkout__row')].map(cells);
      expect(rows).toEqual(['Subtotal US$ 40.00', 'Envío estándar US$ 4.99', 'Total US$ 44.99']);
      const confirm = container.querySelector('button[type="submit"]');
      expect(confirm.textContent).toBe('Confirmar pedido');
      expect(confirm.getAttribute('form')).toBe(container.querySelector('form').id);
    });

    it('uses glass cards like the rest of the app', async () => {
      await mountView();

      expect(container.querySelectorAll('.q-glass-panel').length).toBe(3);
    });

    it('marks free shipping in the summary', async () => {
      cartStore.updateQuantity('p-1', 3);
      await mountView();

      const shipping = container.querySelectorAll('.q-checkout__row-value')[1];
      expect(shipping.textContent).toBe('Gratis');
      expect(shipping.classList.contains('is-free')).toBe(true);
    });
  });

  describe('Scenario: empty cart', () => {
    it('says "Tu carrito está vacío" and offers no way to proceed', async () => {
      cartStore.clear();
      await mountView();

      expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
        'Tu carrito está vacío'
      );
      expect(container.querySelector('form')).toBeNull();
      expect(container.querySelector('button[type="submit"]')).toBeNull();
      expect(container.querySelector('a[href="/products"]')).not.toBeNull();
    });
  });

  it('does not claim the cart is empty while it is still loading', () => {
    cartStore.clear();
    cartService.loadCart.and.returnValue(new Promise(() => {}));
    const authStore = {
      isAuthenticated: () => true,
      getProfile: () => null,
      subscribe: () => () => {},
    };
    view = new CheckoutView({
      viewModel: new CheckoutViewModel({ ordersApi, cartService, cartStore, authStore }),
    });
    view.mount(container);

    expect(container.textContent).toContain('Cargando tu pedido…');
    expect(container.textContent).not.toContain('Tu carrito está vacío');
  });

  describe('guests', () => {
    it('asks to log in and calls onLogin', async () => {
      cartStore.clear();
      await mountView({ authenticated: false });

      expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
        'Inicia sesión para continuar'
      );
      container.querySelector('.q-cart__empty button').click();

      expect(onLogin).toHaveBeenCalled();
      expect(container.querySelector('form')).toBeNull();
    });
  });

  describe('typing', () => {
    it('does not re-render the form, so the input keeps focus and value', async () => {
      await mountView();
      const input = container.querySelector('#q-checkout-street');
      input.focus();

      type('#q-checkout-street', 'Av. 6 de Agosto');

      expect(container.querySelector('#q-checkout-street')).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('Av. 6 de Agosto');
    });

    it('keeps what was typed (and the payment method) when the page re-renders', async () => {
      await mountView();
      type('#q-checkout-city', 'La Paz');
      container.querySelectorAll('input[name="paymentMethod"]')[1].click();

      await submit();

      expect(container.querySelector('#q-checkout-city').value).toBe('La Paz');
      expect(container.querySelectorAll('input[name="paymentMethod"]')[1].checked).toBe(true);
    });
  });

  describe('validation', () => {
    it('shows field errors, flags them for assistive tech and focuses the first one', async () => {
      await mountView({ profile: null });

      await submit();

      const name = container.querySelector('#q-checkout-fullName');
      expect(name.getAttribute('aria-invalid')).toBe('true');
      expect(name.getAttribute('aria-describedby')).toBe('q-checkout-fullName-error');
      expect(container.querySelector('#q-checkout-fullName-error').textContent).toBe(
        'Ingresa tu nombre completo.'
      );
      ['phone', 'street', 'city', 'country'].forEach((field) => {
        expect(container.querySelector(`#q-checkout-${field}-error`)).not.toBeNull();
      });
      expect(document.activeElement).toBe(name);
      expect(ordersApi.createOrder).not.toHaveBeenCalled();
      expect(onOrderPlaced).not.toHaveBeenCalled();
    });

    it('clears a field error as soon as the user fixes it, keeping focus', async () => {
      await mountView();
      await submit();

      const city = container.querySelector('#q-checkout-city');
      city.focus();
      type('#q-checkout-city', 'La Paz');
      choose('#q-checkout-country', 'BO');

      expect(container.querySelector('#q-checkout-city')).toBe(city);
      expect(city.classList.contains('is-invalid')).toBe(false);
      expect(city.hasAttribute('aria-invalid')).toBe(false);
      expect(container.querySelector('#q-checkout-city-error')).toBeNull();
      expect(container.querySelector('#q-checkout-country-error')).toBeNull();
      expect(container.querySelector('#q-checkout-phone-error')).not.toBeNull();
      expect(document.activeElement).toBe(city);
    });
  });

  describe('Scenario: successful checkout', () => {
    it('places the order and hands it to the shell for the confirmation redirect', async () => {
      await mountView();
      fillValidForm();
      container.querySelectorAll('input[name="paymentMethod"]')[1].click();

      await submit();

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
      expect(onOrderPlaced).toHaveBeenCalledWith({ id: 'ord-1', order_number: 'ORD-00100042' });
      expect(cartStore.getCount()).toBe(0);
      expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
        '¡Pedido realizado!'
      );
    });

    it('disables the button and says "Procesando…" while the request is in flight', async () => {
      await mountView();
      fillValidForm();
      let resolveOrder;
      ordersApi.createOrder.and.returnValue(
        new Promise((resolve) => {
          resolveOrder = resolve;
        })
      );

      await submit();
      const button = container.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('Procesando…');

      resolveOrder({ data: { id: 'ord-1', order_number: 'ORD-1' } });
      await tick();
    });
  });

  describe('Scenario: insufficient stock during checkout', () => {
    it('shows the product in the error, links to the cart and does NOT clear it', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(
          apiError('INSUFFICIENT_STOCK', 422, 'Insufficient stock for Clean Code', [
            { field: 'items.p-1', message: 'Insufficient stock for Clean Code' },
          ])
        )
      );
      await mountView();
      fillValidForm();

      await submit();

      const alert = container.querySelector('[role="alert"]');
      expect(alert.textContent).toContain('No hay stock suficiente de "Clean Code"');
      expect(alert.querySelector('a[href="/cart"]').textContent).toBe('Revisar carrito');
      expect(container.querySelector('.q-checkout__item.is-problem')).not.toBeNull();
      expect(cartStore.getCount()).toBe(2);
      expect(onOrderPlaced).not.toHaveBeenCalled();
      expect(container.querySelector('#q-checkout-street').value).toBe('Av. Arce #123');
      expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
    });
  });

  describe('Scenario: transaction failure', () => {
    it('shows a generic message without internals and keeps the cart', async () => {
      ordersApi.createOrder.and.returnValue(
        Promise.reject(apiError('INTERNAL_SERVER_ERROR', 500, 'deadlock detected on public.orders'))
      );
      await mountView();
      fillValidForm();

      await submit();

      const alert = container.querySelector('[role="alert"]');
      expect(alert.textContent).toBe(
        'No pudimos procesar tu pedido. Inténtalo de nuevo en unos minutos.'
      );
      expect(alert.textContent).not.toContain('deadlock');
      expect(alert.querySelector('a')).toBeNull();
      expect(cartStore.getCount()).toBe(2);
    });
  });

  it('escapes product names coming from the server (no HTML injection)', async () => {
    cartStore.clear();
    cartStore.addItem({
      id: 'p-2',
      name: '<img src=x onerror=alert(1)>',
      price: 5,
      currency: 'USD',
    });
    await mountView();

    expect(container.querySelector('.q-checkout__item-name').textContent).toBe(
      '<img src=x onerror=alert(1)>'
    );
    expect(container.querySelector('.q-checkout__item-name img')).toBeNull();
  });

  it('stops listening to the store after destroy', async () => {
    const viewModel = await mountView();
    view.destroy();
    view = null;

    cartStore.clear();

    expect(viewModel._listeners.size).toBe(0);
  });

  it('renders fallback placeholder inside thumbnail when item has no imageUrl', async () => {
    cartStore.clear();
    cartStore.addItem({
      id: 'p-no-img',
      name: 'Product without image',
      price: 10,
      currency: 'USD',
      imageUrl: null,
    });
    await mountView();

    const placeholder = container.querySelector('.q-checkout__thumb-placeholder');
    expect(placeholder).not.toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const cells = (el) => [...el.children].map((child) => child.textContent).join(' ');

  describe('CheckoutView (recovered 1)', () => {
    let container;
    let cartStore;
    let cartService;
    let ordersApi;
    let view;
    let onOrderPlaced;
    let onLogin;

    const mountView = async ({
      authenticated = true,
      profile = { full_name: 'Aaron Florez' },
    } = {}) => {
      const authStore = {
        isAuthenticated: () => authenticated,
        getProfile: () => profile,
        subscribe: () => () => {},
      };
      cartService.loadCart.and.returnValue(
        Promise.resolve({ status: authenticated ? 'loaded' : 'auth-required' })
      );
      const viewModel = new CheckoutViewModel({ ordersApi, cartService, cartStore, authStore });
      view = new CheckoutView({ viewModel, onOrderPlaced, onLogin });
      view.mount(container);
      await tick();
      return viewModel;
    };

    const type = (selector, value) => {
      const input = container.querySelector(selector);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return input;
    };

    const choose = (selector, value) => {
      const select = container.querySelector(selector);
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const fillValidForm = () => {
      type('#q-checkout-phone', '71234567');
      type('#q-checkout-street', 'Av. Arce #123');
      type('#q-checkout-city', 'La Paz');
      choose('#q-checkout-country', 'BO');
    };

    const submit = async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
      await tick();
    };

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);

      cartStore = new CartStore();
      cartStore.addItem({ id: 'p-1', name: 'Clean Code', price: 20, currency: 'USD' }, 2);
      cartService = { loadCart: jasmine.createSpy('loadCart') };
      ordersApi = {
        createOrder: jasmine
          .createSpy('createOrder')
          .and.returnValue(
            Promise.resolve({ data: { id: 'ord-1', order_number: 'ORD-00100042' } })
          ),
      };
      onOrderPlaced = jasmine.createSpy('onOrderPlaced');
      onLogin = jasmine.createSpy('onLogin');
    });

    afterEach(() => {
      view?.destroy();
      view = null;
      container.remove();
    });

    describe('layout (mockup SC-08) (recovered 2)', () => {
      it('has the "Datos de envío" card with the six mockup fields', async () => {
        await mountView();

        const panels = [...container.querySelectorAll('.q-checkout__panel-title')].map(
          (title) => title.textContent
        );
        expect(panels).toEqual(['Datos de envío', 'Forma de pago', 'Resumen']);
        const labels = [...container.querySelectorAll('.q-checkout__grid .q-checkout__label')].map(
          (label) => label.textContent
        );
        expect(labels).toEqual([
          'Nombre completo',
          'Teléfono',
          'Dirección',
          'Ciudad',
          'País',
          'Departamento / Estado / Provincia',
          'Código postal (opcional)',
        ]);
        expect(container.querySelector('#q-checkout-street').placeholder).toBe('Av. Arce #123');
      });

      it('shows the summary with a thumbnail, subtotal, "Envío estándar" and total', async () => {
        await mountView();

        expect(container.querySelector('.q-checkout__thumb')).not.toBeNull();
        expect(container.querySelector('.q-checkout__item-name').textContent).toBe('Clean Code');
        expect(container.querySelector('.q-checkout__item-qty').textContent).toBe('× 2');
        const rows = [...container.querySelectorAll('.q-checkout__row')].map(cells);
        expect(rows).toEqual(['Subtotal US$ 40.00', 'Envío estándar US$ 4.99', 'Total US$ 44.99']);
        const confirm = container.querySelector('button[type="submit"]');
        expect(confirm.textContent).toBe('Confirmar pedido');
        expect(confirm.getAttribute('form')).toBe(container.querySelector('form').id);
      });
    });

    describe('Scenario: empty cart (recovered 3)', () => {
      it('says "Tu carrito está vacío" and offers no way to proceed', async () => {
        cartStore.clear();
        await mountView();

        expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
          'Tu carrito está vacío'
        );
        expect(container.querySelector('form')).toBeNull();
        expect(container.querySelector('button[type="submit"]')).toBeNull();
        expect(container.querySelector('a[href="/products"]')).not.toBeNull();
      });
    });

    describe('Scenario: successful checkout (recovered 4)', () => {
      it('disables the button and says "Procesando…" while the request is in flight', async () => {
        await mountView();
        fillValidForm();
        let resolveOrder;
        ordersApi.createOrder.and.returnValue(
          new Promise((resolve) => {
            resolveOrder = resolve;
          })
        );

        await submit();
        const button = container.querySelector('button[type="submit"]');
        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe('Procesando…');

        resolveOrder({ data: { id: 'ord-1', order_number: 'ORD-1' } });
        await tick();
      });
    });
  });

  (() => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    const apiError = (code, statusCode, message, details) =>
      Object.assign(new Error(message), { code, statusCode, details });

    const createItem = (overrides = {}) => ({
      productId: 'p-1',
      name: 'Clean Code',
      price: 20,
      currency: 'USD',
      quantity: 2,
      imageUrl: null,
      ...overrides,
    });

    const createViewModel = (overrides = {}) => {
      const listeners = new Set();
      const vm = {
        items: [createItem()],
        isEmpty: false,
        isLoading: false,
        isPlaced: false,
        requiresAuth: false,
        isSubmitting: false,
        loadError: '',
        submitError: '',
        errorAction: null,
        problemProductId: null,
        focusField: null,
        form: {
          fullName: 'Aaron Florez',
          phone: '',
          street: '',
          city: '',
          country: '',
          state: '',
          postalCode: '',
          paymentMethod: 'simulated',
        },
        errors: {},
        shipping: 4.99,
        load: jasmine.createSpy('load').and.resolveTo(),
        submit: jasmine
          .createSpy('submit')
          .and.resolveTo({ status: 'success', order: { id: 'ord-1' } }),
        setField: jasmine.createSpy('setField'),
        getSubtotalLabel: () => 'US$ 40.00',
        getShippingLabel: () => 'US$ 4.99',
        getTotalLabel: () => 'US$ 44.99',
        destroy: jasmine.createSpy('destroy'),
        _listeners: listeners,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        notify() {
          [...listeners].forEach((listener) => listener(vm));
        },
        ...overrides,
      };
      return vm;
    };

    describe('CheckoutView additional branches (recovered 5)', () => {
      let container;
      let view;

      const type = (selector, value) => {
        const input = container.querySelector(selector);
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return input;
      };

      const submitForm = async () => {
        container
          .querySelector('form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await tick();
      };

      const mountRealCheckout = ({ error = null } = {}) => {
        const cartStore = new CartStore();
        cartStore.addItem(createItem(), 2);
        const cartService = {
          loadCart: jasmine.createSpy('loadCart').and.resolveTo({ status: 'loaded' }),
        };
        const ordersApi = {
          createOrder: jasmine
            .createSpy('createOrder')
            .and.callFake(() =>
              error ? Promise.reject(error) : Promise.resolve({ data: { id: 'ord-1' } })
            ),
        };
        const authStore = {
          isAuthenticated: () => true,
          getProfile: () => ({ full_name: 'Aaron Florez' }),
          subscribe: () => () => {},
        };
        const viewModel = new CheckoutViewModel({ cartStore, cartService, ordersApi, authStore });
        const onOrderPlaced = jasmine.createSpy('onOrderPlaced');
        view = new CheckoutView({ viewModel, onOrderPlaced });
        view.mount(container);
        viewModel.setField('phone', '71234567');
        viewModel.setField('street', 'Av. Arce #123');
        viewModel.setField('city', 'La Paz');
        viewModel.setField('country', 'BO');
        return { viewModel, cartStore, cartService, ordersApi, onOrderPlaced };
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
      });

      it('defaults to a real CheckoutViewModel and null callbacks', () => {
        view = new CheckoutView();

        expect(view.viewModel instanceof CheckoutViewModel).toBe(true);
        expect(view.onOrderPlaced).toBeNull();
        expect(view.onLogin).toBeNull();
        expect(view.element).toBeNull();
        expect(view._unsubscribe).toBeNull();
      });

      it('caches render() and reuses that node on mount while calling load once with no arguments', async () => {
        const viewModel = createViewModel();
        view = new CheckoutView({ viewModel });
        const first = view.render();

        expect(view.render()).toBe(first);

        view.mount(container);

        expect(container.firstElementChild).toBe(first);
        expect(viewModel.load).toHaveBeenCalledTimes(1);
        expect(viewModel.load).toHaveBeenCalledWith();
        await tick();
      });

      it('characterizes the repeated-mount leak: the first subscription is never disposed', () => {
        const viewModel = createViewModel();
        view = new CheckoutView({ viewModel });
        view.mount(container);
        view.mount(container);

        expect(viewModel.load).toHaveBeenCalledTimes(2);
        expect(viewModel._listeners.size).toBe(2);

        view.destroy();

        expect(viewModel._listeners.size).toBe(1);
        expect(view.element).toBeNull();
        expect(() => viewModel.notify()).not.toThrow();
      });

      it('tears down listeners, element and view model on destroy and survives a second destroy', () => {
        const viewModel = createViewModel();
        view = new CheckoutView({ viewModel });
        view.mount(container);

        view.destroy();

        expect(viewModel._listeners.size).toBe(0);
        expect(viewModel.destroy).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.q-checkout')).toBeNull();
        expect(view.element).toBeNull();
        expect(view._unsubscribe).toBeNull();

        expect(() => view.destroy()).not.toThrow();
        expect(viewModel.destroy).toHaveBeenCalledTimes(2);
      });

      it('destroy() without a mount still tears down the injected view model', () => {
        const viewModel = createViewModel();
        view = new CheckoutView({ viewModel });

        expect(() => view.destroy()).not.toThrow();
        expect(viewModel.destroy).toHaveBeenCalledTimes(1);
        expect(viewModel._listeners.size).toBe(0);
      });

      it('characterizes destroy() throwing when the injected view model has no destroy method', () => {
        const viewModel = createViewModel();
        delete viewModel.destroy;
        const localView = new CheckoutView({ viewModel });

        expect(() => localView.destroy()).toThrowError(TypeError);
      });

      it('characterizes an unhandled load rejection: mount returns and no error UI appears', async () => {
        const viewModel = createViewModel({ isLoading: true, isEmpty: true, items: [] });
        let rejectLoad;
        const pending = new Promise((_, reject) => {
          rejectLoad = reject;
        });
        viewModel.load.and.returnValue(pending);
        view = new CheckoutView({ viewModel });

        expect(() => view.mount(container)).not.toThrow();
        expect(viewModel.load).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[role="status"] .q-cart__empty-title').textContent).toBe(
          'Cargando tu pedido…'
        );

        pending.catch(() => {});
        rejectLoad(new Error('load failed'));
        await tick();

        expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(container.querySelector('form')).toBeNull();
      });

      it('renders the form and summary while loading when the cart already has items', () => {
        const viewModel = createViewModel({ isLoading: true });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        expect(container.querySelector('form#q-checkout-form')).not.toBeNull();
        expect(container.querySelector('.q-checkout__summary')).not.toBeNull();
        expect(container.textContent).not.toContain('Cargando tu pedido…');
      });

      it('loads exactly once through the injected cart service on a real mount', async () => {
        const { cartService } = mountRealCheckout();
        await tick();

        expect(cartService.loadCart).toHaveBeenCalledTimes(1);
      });

      it('applies focus only to a known field and always clears focusField', () => {
        const viewModel = createViewModel({ focusField: 'city' });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        // _applyFocus runs inside render(), before mount attaches the element, so mount-time focus is lost.
        expect(document.activeElement).toBe(document.body);
        expect(viewModel.focusField).toBeNull();

        viewModel.focusField = 'does-not-exist';
        expect(() => view._applyFocus()).not.toThrow();
        expect(viewModel.focusField).toBeNull();

        viewModel.focusField = null;
        expect(() => view._applyFocus()).not.toThrow();
        expect(viewModel.focusField).toBeNull();
      });

      it('renders status boxes with role=status and exact copy, plus route links', () => {
        const viewModel = createViewModel({ isLoading: true, isEmpty: true, items: [] });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        let status = container.querySelector('[role="status"]');
        expect(status.className).toBe('q-cart__empty');
        expect(status.querySelector('.q-cart__empty-title').textContent).toBe(
          'Cargando tu pedido…'
        );
        const back = container.querySelector('.q-checkout__back');
        expect(back.dataset.route).toBe('');
        expect(back.getAttribute('href')).toBe('/cart');
        expect(back.querySelector('svg').getAttribute('aria-hidden')).toBe('true');

        viewModel.isLoading = false;
        viewModel.notify();
        status = container.querySelector('[role="status"]');
        expect(status.querySelector('.q-cart__empty-title').textContent).toBe(
          'Tu carrito está vacío'
        );
        expect(status.querySelector('.q-cart__empty-message').textContent).toBe(
          'Añade productos a tu carrito para poder finalizar tu compra.'
        );
        const explore = container.querySelector('a[href="/products"]');
        expect(explore.dataset.route).toBe('');
        expect(explore.textContent).toBe('Explorar productos');

        viewModel.requiresAuth = true;
        viewModel.notify();
        expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
          'Inicia sesión para continuar'
        );
        expect(container.querySelector('.q-cart__empty-message').textContent).toBe(
          'Necesitas una cuenta para finalizar tu compra. Tu carrito se guarda en tu cuenta.'
        );

        viewModel.requiresAuth = false;
        viewModel.isPlaced = true;
        viewModel.notify();
        expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
          '¡Pedido realizado!'
        );
        expect(container.querySelector('.q-cart__empty-message').textContent).toBe(
          'Estamos preparando tu confirmación…'
        );
      });

      it('renders field types, names, autocomplete, maxLength, wide classes and the optional label', () => {
        view = new CheckoutView({ viewModel: createViewModel() });
        view.mount(container);

        const cases = [
          ['fullName', 'fullName', 'text', 'name', 100, 'Nombre y apellido', false],
          ['phone', 'phone', 'tel', 'tel', 20, '71234567', false],
          ['street', 'street', 'text', 'address-line1', 200, 'Av. Arce #123', false],
          ['city', 'city', 'text', 'address-level2', 100, 'La Paz', false],
          ['state', 'state', 'text', 'address-level1', 100, 'La Paz', true],
          ['postalCode', 'postal_code', 'text', 'postal-code', 20, 'Ej. 760001', true],
        ];
        for (const [id, name, type, autocomplete, maxLength, placeholder, wide] of cases) {
          const input = container.querySelector(`#q-checkout-${id}`);
          expect(input.name).toBe(name);
          expect(input.type).toBe(type);
          expect(input.autocomplete).toBe(autocomplete);
          expect(input.maxLength).toBe(maxLength);
          expect(input.placeholder).toBe(placeholder);
          expect(
            input.closest('.q-checkout__field').classList.contains('q-checkout__field--wide')
          ).toBe(wide);
        }
        expect(container.querySelector('#q-checkout-postalCode').dataset.field).toBe('postal_code');
        expect(container.querySelector('#q-checkout-fullName').dataset.field).toBeUndefined();
        const country = container.querySelector('#q-checkout-country');
        expect(country.name).toBe('country');
        expect(country.autocomplete).toBe('country');
        expect(
          country.closest('.q-checkout__field').classList.contains('q-checkout__field--wide')
        ).toBe(true);
        expect(
          container.querySelector('label[for="q-checkout-postalCode"] .q-form-optional').textContent
        ).toBe(' (opcional)');
      });

      it('treats a clean _clearFieldError as a no-op and clears a real inline error in place', () => {
        const viewModel = createViewModel();
        view = new CheckoutView({ viewModel });
        view.mount(container);

        const clean = document.createElement('input');
        expect(() => view._clearFieldError(clean)).not.toThrow();
        expect(clean.classList.contains('is-invalid')).toBe(false);
        expect(clean.hasAttribute('aria-invalid')).toBe(false);

        viewModel.errors = { city: 'Ingresa tu ciudad.' };
        viewModel.notify();
        const city = container.querySelector('#q-checkout-city');
        expect(city.classList.contains('is-invalid')).toBe(true);
        city.focus();

        view._clearFieldError(city);

        expect(city.classList.contains('is-invalid')).toBe(false);
        expect(city.hasAttribute('aria-invalid')).toBe(false);
        expect(city.hasAttribute('aria-describedby')).toBe(false);
        expect(container.querySelector('#q-checkout-city-error')).toBeNull();
        expect(container.querySelector('#q-checkout-city')).toBe(city);
        expect(document.activeElement).toBe(city);
      });

      it('renders the exact inline validation messages and focuses the configured first field', () => {
        const errors = {
          fullName: 'Ingresa tu nombre completo.',
          phone: 'Ingresa un teléfono válido (solo números, +, - y paréntesis).',
          street: 'Ingresa tu dirección (mínimo 3 caracteres).',
          city: 'Ingresa tu ciudad.',
          country: 'Selecciona un país.',
          state: 'No puede superar 100 caracteres.',
          postalCode: 'Ingresa un código postal válido.',
        };
        const viewModel = createViewModel({ errors, focusField: 'phone' });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        for (const [id, message] of Object.entries(errors)) {
          const error = container.querySelector(`#q-checkout-${id}-error`);
          expect(error.textContent).toBe(message);
          expect(error.className).toBe('q-checkout__error');
          expect(container.querySelector(`#q-checkout-${id}`).getAttribute('aria-invalid')).toBe(
            'true'
          );
          expect(
            container.querySelector(`#q-checkout-${id}`).getAttribute('aria-describedby')
          ).toBe(`q-checkout-${id}-error`);
        }
        // Same mount-timing limitation: focusField is consumed while the section is still detached.
        expect(document.activeElement).toBe(document.body);
        expect(viewModel.focusField).toBeNull();
        expect(viewModel.errors.phone).toBe(errors.phone);
      });

      it('exposes the payment radiogroup, card svg and forwards radio changes to setField', () => {
        const viewModel = createViewModel();
        view = new CheckoutView({ viewModel });
        view.mount(container);

        const group = container.querySelector('[role="radiogroup"]');
        expect(group.getAttribute('aria-labelledby')).toBe('q-checkout-payment-title');
        expect(container.querySelector('#q-checkout-payment-title').textContent).toBe(
          'Forma de pago'
        );
        const radios = [...group.querySelectorAll('input[type="radio"]')];
        expect(radios.map((radio) => radio.value)).toEqual(['simulated', 'cash_on_delivery']);
        expect(radios.map((radio) => radio.name)).toEqual(['paymentMethod', 'paymentMethod']);
        expect(radios[0].checked).toBe(true);
        const icon = group.querySelector('.q-checkout__payment-icon svg');
        expect(icon).not.toBeNull();
        expect(icon.getAttribute('aria-hidden')).toBe('true');

        radios[1].checked = true;
        radios[1].dispatchEvent(new Event('change', { bubbles: true }));

        expect(viewModel.setField).toHaveBeenCalledWith('paymentMethod', 'cash_on_delivery');
      });

      it('renders multiple items with product ids, quantities, subtotals and the problem marker', () => {
        const viewModel = createViewModel({
          items: [
            createItem({ productId: 'p-1', quantity: 2, subtotalLabel: 'US$ 40.00' }),
            createItem({
              productId: 'p-2',
              name: 'Pattern Design',
              quantity: 1,
              subtotalLabel: 'Bs 55.00',
            }),
          ],
          problemProductId: 'p-2',
          getSubtotalLabel: () => 'US$ 95.00',
          getTotalLabel: () => 'Bs 100.00',
        });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        const items = [...container.querySelectorAll('.q-checkout__item')];
        expect(items.length).toBe(2);
        expect(items.map((item) => item.dataset.productId)).toEqual(['p-1', 'p-2']);
        expect(items[0].querySelector('.q-checkout__item-qty').textContent).toBe('× 2');
        expect(items[0].querySelector('.q-checkout__item-subtotal').textContent).toBe('US$ 40.00');
        expect(items[1].querySelector('.q-checkout__item-name').textContent).toBe('Pattern Design');
        expect(items[1].querySelector('.q-checkout__item-qty').textContent).toBe('× 1');
        expect(items[1].querySelector('.q-checkout__item-subtotal').textContent).toBe('Bs 55.00');
        expect(items[1].classList.contains('is-problem')).toBe(true);
        expect(items[0].classList.contains('is-problem')).toBe(false);
      });

      it('shows the load error alert with the exact copy and no cart link', () => {
        const viewModel = createViewModel({
          loadError: 'No pudimos cargar tu carrito. Inténtalo de nuevo.',
        });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        const alert = container.querySelector('[data-testid="checkout-error"]');
        expect(alert.getAttribute('role')).toBe('alert');
        expect(alert.textContent).toBe('No pudimos cargar tu carrito. Inténtalo de nuevo.');
        expect(alert.querySelector('a')).toBeNull();
      });

      it('reflects isSubmitting in the submit button and resets aria-busy', () => {
        const viewModel = createViewModel({ isSubmitting: true });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        let submit = container.querySelector('button[type="submit"]');
        expect(submit.disabled).toBe(true);
        expect(submit.textContent).toBe('Procesando…');
        expect(submit.getAttribute('aria-busy')).toBe('true');
        expect(submit.getAttribute('form')).toBe('q-checkout-form');

        viewModel.isSubmitting = false;
        viewModel.notify();
        submit = container.querySelector('button[type="submit"]');
        expect(submit.disabled).toBe(false);
        expect(submit.textContent).toBe('Confirmar pedido');
        expect(submit.getAttribute('aria-busy')).toBe('false');
      });

      it('renders PRODUCT_UNAVAILABLE and MIXED_CURRENCIES messages with the cart link', async () => {
        const first = mountRealCheckout({
          error: apiError('PRODUCT_UNAVAILABLE', 409, 'Clean Code is no longer available', [
            { field: 'items.p-1', message: 'gone' },
          ]),
        });
        await first.viewModel.submit();

        let alert = container.querySelector('[data-testid="checkout-error"]');
        expect(alert.textContent).toContain(
          '"Clean Code" ya no está disponible. Quítalo de tu carrito para continuar.'
        );
        expect(alert.querySelector('a[href="/cart"]').textContent).toBe('Revisar carrito');
        expect(first.onOrderPlaced).not.toHaveBeenCalled();

        view.destroy();
        const second = mountRealCheckout({ error: apiError('MIXED_CURRENCIES', 409, 'mixed') });
        await second.viewModel.submit();

        alert = container.querySelector('[data-testid="checkout-error"]');
        expect(alert.querySelector('span').textContent).toBe(
          'Tu carrito mezcla productos con monedas distintas. Compra cada moneda por separado.'
        );
        expect(alert.querySelector('a')).not.toBeNull();
        expect(second.onOrderPlaced).not.toHaveBeenCalled();
      });

      it('renders the INVALID_CSRF_TOKEN message without a cart link', async () => {
        const { viewModel, onOrderPlaced } = mountRealCheckout({
          error: apiError('INVALID_CSRF_TOKEN', 403, 'bad csrf'),
        });
        await viewModel.submit();

        const alert = container.querySelector('[data-testid="checkout-error"]');
        expect(alert.textContent).toBe(
          'No pudimos validar tu sesión. Recarga la página e inténtalo de nuevo.'
        );
        expect(alert.querySelector('a')).toBeNull();
        expect(onOrderPlaced).not.toHaveBeenCalled();
      });

      it('stays silent on SESSION_EXPIRED and never notifies onOrderPlaced', async () => {
        const { viewModel, cartStore, onOrderPlaced } = mountRealCheckout({
          error: apiError('SESSION_EXPIRED', 401, 'expired'),
        });

        const result = await viewModel.submit();

        expect(result).toEqual({ status: 'auth-expired' });
        expect(container.querySelector('[data-testid="checkout-error"]')).toBeNull();
        expect(cartStore.getCount()).toBe(2);
        expect(onOrderPlaced).not.toHaveBeenCalled();
      });

      it('maps 400 details to inline field errors and focuses the first one', async () => {
        const { viewModel, onOrderPlaced } = mountRealCheckout({
          error: apiError('VALIDATION_ERROR', 400, 'Invalid address', [
            { field: 'shipping_address.city', message: 'Ciudad inválida' },
            { field: 'shipping_address.street', message: 'Calle inválida' },
          ]),
        });
        await viewModel.submit();

        expect(container.querySelector('#q-checkout-city-error').textContent).toBe(
          'Ciudad inválida'
        );
        expect(container.querySelector('#q-checkout-street-error').textContent).toBe(
          'Calle inválida'
        );
        expect(document.activeElement.id).toBe('q-checkout-street');
        expect(container.querySelector('[data-testid="checkout-error"]')).toBeNull();
        expect(onOrderPlaced).not.toHaveBeenCalled();
      });

      it('does not call onOrderPlaced for non-success results and tolerates a null callback', async () => {
        const viewModel = createViewModel();
        viewModel.submit.and.resolveTo({ status: 'error' });
        const onOrderPlaced = jasmine.createSpy('onOrderPlaced');
        view = new CheckoutView({ viewModel, onOrderPlaced });
        view.mount(container);

        await submitForm();
        expect(onOrderPlaced).not.toHaveBeenCalled();

        viewModel.submit.and.resolveTo({ status: 'empty' });
        await submitForm();
        expect(onOrderPlaced).not.toHaveBeenCalled();

        view.onOrderPlaced = null;
        viewModel.submit.and.resolveTo({ status: 'success', order: { id: 'ord-2' } });
        await expectAsync(view._submit()).toBeResolved();
      });

      it('characterizes the stale form during hydration: re-render replaces the input and drops focus', () => {
        const viewModel = createViewModel({ isLoading: true });
        viewModel.setField.and.callFake((name, value) => {
          viewModel.form[name] = value;
        });
        view = new CheckoutView({ viewModel });
        view.mount(container);

        const street = container.querySelector('#q-checkout-street');
        street.focus();
        type('#q-checkout-street', 'Av. 6 de Agosto');
        expect(viewModel.setField).toHaveBeenCalledWith('street', 'Av. 6 de Agosto');

        viewModel.isLoading = false;
        viewModel.notify();

        const fresh = container.querySelector('#q-checkout-street');
        expect(fresh).not.toBe(street);
        expect(fresh.value).toBe('Av. 6 de Agosto');
        expect(document.activeElement).not.toBe(street);
      });
    });
  })();
})();
