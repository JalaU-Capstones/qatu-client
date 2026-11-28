import { OrderListComponent } from './OrderListComponent.js';

describe('OrderListComponent', () => {
  it('Scenario: No orders - renders empty state message "Aún no tienes órdenes"', () => {
    const component = new OrderListComponent({ orders: [] });
    const el = component.render();

    const emptyMsg = el.querySelector('.q-orders-empty-message');
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toBe('Aún no tienes órdenes');
    expect(el.querySelector('.q-orders-empty-btn')).not.toBeNull();
  });

  it('Scenario: View own orders - renders each order showing ID, date, status, and total', () => {
    const sampleOrders = [
      {
        id: '9d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
        order_number: 'ORD-00100042',
        status: 'pending',
        currency: 'USD',
        total: 214.99,
        created_at: '2026-10-14T11:00:00.000Z',
        items: [{ id: 'item-1', product_name: 'Test item' }],
      },
    ];

    const component = new OrderListComponent({ orders: sampleOrders });
    const el = component.render();

    const orderCard = el.querySelector('.q-order-card');
    expect(orderCard).not.toBeNull();

    const idEl = el.querySelector('[data-testid="order-id"]');
    expect(idEl).not.toBeNull();
    expect(idEl.textContent).toBe('ORD-00100042');

    const dateEl = el.querySelector('[data-testid="order-date"]');
    expect(dateEl).not.toBeNull();
    expect(dateEl.textContent.trim().length).toBeGreaterThan(0);

    const statusEl = el.querySelector('[data-testid="order-status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.textContent).toBe('Pendiente');

    const totalEl = el.querySelector('[data-testid="order-total"]');
    expect(totalEl).not.toBeNull();
    expect(totalEl.textContent).toContain('214.99');
  });

  it('triggers onOrderClick when order card is clicked', () => {
    const sampleOrder = {
      id: 'ord-123',
      order_number: 'ORD-00100042',
      status: 'confirmed',
      total: 50,
      created_at: '2026-10-14T11:00:00.000Z',
    };
    const clickSpy = jasmine.createSpy('onOrderClick');

    const component = new OrderListComponent({
      orders: [sampleOrder],
      onOrderClick: clickSpy,
    });
    const el = component.render();

    const card = el.querySelector('.q-order-card');
    card.click();

    expect(clickSpy).toHaveBeenCalledWith(sampleOrder);
  });

  it('triggers onOrderClick when "Ver detalle" action button is clicked', () => {
    const sampleOrder = {
      id: 'ord-123',
      order_number: 'ORD-00100042',
      status: 'confirmed',
      total: 50,
      created_at: '2026-10-14T11:00:00.000Z',
    };
    const clickSpy = jasmine.createSpy('onOrderClick');

    const component = new OrderListComponent({
      orders: [sampleOrder],
      onOrderClick: clickSpy,
    });
    const el = component.render();

    const btn = el.querySelector('[data-testid="view-order-details-btn"]');
    expect(btn).not.toBeNull();
    btn.click();

    expect(clickSpy).toHaveBeenCalledWith(sampleOrder);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('OrderListComponent (recovered 1)', () => {
    it('Scenario: No orders - renders empty state message "Aún no tienes órdenes"', () => {
      const component = new OrderListComponent({ orders: [] });
      const el = component.render();

      const emptyMsg = el.querySelector('.q-orders-empty-message');
      expect(emptyMsg).not.toBeNull();
      expect(emptyMsg.textContent).toBe('Aún no tienes órdenes');
      expect(el.querySelector('.q-orders-empty-btn')).not.toBeNull();
    });

    it('triggers onOrderClick when "Ver detalle" action button is clicked', () => {
      const sampleOrder = {
        id: 'ord-123',
        order_number: 'ORD-00100042',
        status: 'confirmed',
        total: 50,
        created_at: '2026-10-14T11:00:00.000Z',
      };
      const clickSpy = jasmine.createSpy('onOrderClick');

      const component = new OrderListComponent({
        orders: [sampleOrder],
        onOrderClick: clickSpy,
      });
      const el = component.render();

      const btn = el.querySelector('[data-testid="view-order-details-btn"]');
      expect(btn).not.toBeNull();
      btn.click();

      expect(clickSpy).toHaveBeenCalledWith(sampleOrder);
    });
  });

  (() => {
    describe('OrderListComponent additional branches (recovered 2)', () => {
      let container;

      const buildOrder = (overrides = {}) => ({
        id: 'ord-1',
        order_number: 'ORD-100',
        status: 'pending',
        currency: 'USD',
        total: 214.99,
        created_at: '2026-10-14T11:00:00.000Z',
        items: [{ id: 'item-1' }],
        ...overrides,
      });

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        container.remove();
      });

      it('normalizes null, string and object orders to an empty list', () => {
        [null, 'abc', {}].forEach((orders) => {
          const component = new OrderListComponent({ orders });

          expect(component.orders).toEqual([]);
          const el = component.render();
          expect(el.querySelector('[data-testid="orders-empty-state"]')).not.toBeNull();
          expect(el.querySelector('.q-order-card')).toBeNull();
        });
      });

      it('defaults to an empty order list when constructed without options', () => {
        const component = new OrderListComponent();

        expect(component.orders).toEqual([]);
        expect(
          component.render().querySelector('[data-testid="orders-empty-state"]')
        ).not.toBeNull();
      });

      it('applies setOrders before the first render without creating an element', () => {
        const component = new OrderListComponent();

        component.setOrders([buildOrder()]);
        expect(component.element).toBeNull();
        expect(component.render().querySelectorAll('.q-order-card').length).toBe(1);
      });

      it('replaces the mounted element in place when setOrders is called', () => {
        const component = new OrderListComponent({ orders: [buildOrder()] });
        const firstEl = component.render();
        container.appendChild(firstEl);
        const sentinel = document.createElement('span');
        container.appendChild(sentinel);

        component.setOrders([buildOrder({ id: 'ord-2', order_number: 'ORD-200' })]);
        expect(component.element).not.toBe(firstEl);
        expect(firstEl.parentNode).toBeNull();
        expect(container.children.length).toBe(2);
        expect(container.firstElementChild).toBe(component.element);
        expect(container.children[1]).toBe(sentinel);
        expect(container.querySelector('[data-testid="order-id"]').textContent).toBe('ORD-200');

        component.setOrders(null);
        expect(container.children.length).toBe(2);
        expect(container.querySelector('[data-testid="orders-empty-state"]')).not.toBeNull();
      });

      it('formats missing dates as N/A', () => {
        const component = new OrderListComponent();

        expect(component._formatDate(null)).toBe('N/A');
        expect(component._formatDate('')).toBe('N/A');
        expect(component._formatDate(undefined)).toBe('N/A');
        expect(component._formatDate('2026-10-14T11:00:00.000Z')).toContain('2026');
      });

      it('formats totals with currency and normalizes malformed values', () => {
        const component = new OrderListComponent();

        expect(component._formatTotal(214.99, 'USD')).toBe('USD 214.99');
        expect(component._formatTotal(214.99)).toBe('214.99');
        expect(component._formatTotal(undefined)).toBe('0.00');
        expect(component._formatTotal(null)).toBe('0.00');
        expect(component._formatTotal('abc')).toBe('0.00');
        expect(component._formatTotal(NaN)).toBe('0.00');
      });

      it('renders the exact empty subtitle and explore link attributes', () => {
        const el = new OrderListComponent().render();

        expect(el.querySelector('.q-orders-empty-subtitle').textContent).toBe(
          'Aún no has realizado ninguna compra. Explora nuestro catálogo y encuentra lo que necesitas.'
        );
        const link = el.querySelector('.q-orders-empty-btn');
        expect(link.getAttribute('href')).toBe('/products');
        expect(link.getAttribute('data-route')).toBe('');
        expect(link.textContent).toBe('Explorar productos');
      });

      it('sets data-order-id and falls back to id and pending status when fields are missing', () => {
        const el = new OrderListComponent({
          orders: [buildOrder({ order_number: '', status: undefined })],
        }).render();
        const card = el.querySelector('.q-order-card');

        expect(card.dataset.orderId).toBe('ord-1');
        expect(el.querySelector('[data-testid="order-id"]').textContent).toBe('ord-1');
        const badge = el.querySelector('[data-testid="order-status"]');
        expect(badge.className).toBe('q-order-status q-order-status--pending');
        expect(badge.textContent).toBe('Pendiente');
      });

      it('renders singular and plural item previews and omits it when items are absent', () => {
        const one = new OrderListComponent({
          orders: [buildOrder({ items: [{ id: 'a' }] })],
        }).render();
        expect(one.querySelector('.q-order-card__items').textContent).toBe('1 producto');

        const two = new OrderListComponent({
          orders: [buildOrder({ items: [{ id: 'a' }, { id: 'b' }] })],
        }).render();
        expect(two.querySelector('.q-order-card__items').textContent).toBe('2 productos');

        [null, [], undefined].forEach((items) => {
          const el = new OrderListComponent({ orders: [buildOrder({ items })] }).render();
          expect(el.querySelector('.q-order-card__items')).toBeNull();
        });
      });

      it('calls onOrderClick exactly once for the detail button and stops propagation', () => {
        const order = buildOrder();
        const clickSpy = jasmine.createSpy('onOrderClick');
        const containerClickSpy = jasmine.createSpy('containerClick');
        container.addEventListener('click', containerClickSpy);
        const el = new OrderListComponent({ orders: [order], onOrderClick: clickSpy }).render();
        container.appendChild(el);
        const card = el.querySelector('.q-order-card');

        expect(card.style.cursor).toBe('pointer');

        el.querySelector('[data-testid="view-order-details-btn"]').dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledWith(order);
        expect(containerClickSpy).not.toHaveBeenCalled();

        card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clickSpy).toHaveBeenCalledTimes(2);
        expect(containerClickSpy).toHaveBeenCalledTimes(1);
      });

      it('does not throw when no click callback is provided', () => {
        const el = new OrderListComponent({ orders: [buildOrder()] }).render();
        const card = el.querySelector('.q-order-card');
        const button = el.querySelector('[data-testid="view-order-details-btn"]');

        expect(card.style.cursor).toBe('');
        expect(() => {
          card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }).not.toThrow();
      });
    });
  })();
})();
