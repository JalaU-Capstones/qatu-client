import { OrderListComponent } from './OrderListComponent.js';

describe('OrderListComponent', () => {
  it('Scenario: No orders - renders empty state message "No orders yet"', () => {
    const component = new OrderListComponent({ orders: [] });
    const el = component.render();

    const emptyMsg = el.querySelector('.q-orders-empty-message');
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toBe('No orders yet');
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
    expect(statusEl.textContent).toBe('pending');

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
