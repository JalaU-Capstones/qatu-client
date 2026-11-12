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
    view = new OrderConfirmationView({ orderId: 'ord-1', viewModel, onNavigate, onLogin });
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

      expect(ordersApi.getOrderById).toHaveBeenCalledWith('ord-1');
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
      ordersApi.getOrderById.and.returnValue(
        Promise.resolve({ data: { ...order, status: 'shipped' }, meta: {} })
      );

      await mountView();

      const reached = [...container.querySelectorAll('.q-order-confirmation__step')].map((step) =>
        step.classList.contains('is-reached')
      );
      expect(reached).toEqual([true, true, true, false]);
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
      ordersApi.getOrderById.and.returnValue(
        Promise.resolve({ data: { ...order, tax: 5.2, total: 50.19 }, meta: {} })
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
      ordersApi.getOrderById.and.returnValue(
        Promise.resolve({ data: { ...order, shipping_address: null }, meta: {} })
      );

      await mountView();

      expect(container.querySelector('[data-testid="receipt-address"]')).toBeNull();
    });
  });

  it('shows a loading state before the order arrives', () => {
    ordersApi.getOrderById.and.returnValue(new Promise(() => {}));
    const authStore = {
      isAuthenticated: () => true,
      getProfile: () => profile,
      subscribe: () => () => {},
    };
    view = new OrderConfirmationView({
      orderId: 'ord-1',
      viewModel: new OrderConfirmationViewModel({ ordersApi, authStore }),
    });
    view.mount(container);

    expect(container.textContent).toContain('Cargando tu pedido…');
  });

  it('explains when the order belongs to someone else (403)', async () => {
    ordersApi.getOrderById.and.returnValue(
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
    expect(ordersApi.getOrderById).not.toHaveBeenCalled();
  });
});
