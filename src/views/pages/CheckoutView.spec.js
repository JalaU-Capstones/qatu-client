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
});
