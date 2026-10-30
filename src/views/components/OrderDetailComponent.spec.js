import { OrderDetailComponent } from './OrderDetailComponent.js';

describe('OrderDetailComponent', () => {
  const sampleOrder = {
    id: 'ord-abc-123',
    order_number: 'ORD-00100042',
    status: 'confirmed',
    currency: 'USD',
    subtotal: 100,
    shipping_cost: 15,
    tax: 5,
    total: 120,
    created_at: '2026-10-14T11:00:00.000Z',
    shipping_address: 'Av. Siempre Viva 742, Springfield',
    notes: 'Dejar en la puerta principal',
    items: [
      {
        id: 'item-1',
        product_name: 'Wireless Mouse',
        quantity: 2,
        unit_price: 25,
        subtotal: 50,
      },
      {
        id: 'item-2',
        product_name: 'Mechanical Keyboard',
        quantity: 1,
        unit_price: 50,
        subtotal: 50,
      },
    ],
  };

  it('renders order details with ID, date, status, items and summary', () => {
    const component = new OrderDetailComponent({ order: sampleOrder });
    const el = component.render();

    const titleEl = el.querySelector('[data-testid="order-detail-title"]');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('Orden #ORD-00100042');

    const statusEl = el.querySelector('[data-testid="order-detail-status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.textContent).toBe('confirmed');

    const items = el.querySelectorAll('[data-testid="order-detail-item"]');
    expect(items.length).toBe(2);

    const firstItemName = el.querySelector('[data-testid="order-item-name"]');
    expect(firstItemName.textContent).toBe('Wireless Mouse');

    const totalEl = el.querySelector('[data-testid="order-detail-total"]');
    expect(totalEl.textContent).toContain('120.00');

    const shippingCard = el.querySelector('[data-testid="order-shipping-card"]');
    expect(shippingCard).not.toBeNull();
    expect(shippingCard.textContent).toContain('Av. Siempre Viva 742');
  });

  it('renders status progress tracker with current step', () => {
    const component = new OrderDetailComponent({ order: sampleOrder });
    const el = component.render();

    const tracker = el.querySelector('[data-testid="order-tracker"]');
    expect(tracker).not.toBeNull();

    const currentStep = el.querySelector('.q-order-tracker__step--current');
    expect(currentStep).not.toBeNull();
    expect(currentStep.textContent).toContain('Confirmada');

    const completedStep = el.querySelector('.q-order-tracker__step--completed');
    expect(completedStep).not.toBeNull();
    expect(completedStep.textContent).toContain('Pendiente');
  });

  it('renders cancelled notice when order is cancelled', () => {
    const cancelledOrder = { ...sampleOrder, status: 'cancelled' };
    const component = new OrderDetailComponent({ order: cancelledOrder });
    const el = component.render();

    const notice = el.querySelector('[data-testid="order-cancelled-notice"]');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('Orden Cancelada');
  });

  it('invokes onBack callback when back button is clicked', () => {
    const backSpy = jasmine.createSpy('onBack');
    const component = new OrderDetailComponent({ order: sampleOrder, onBack: backSpy });
    const el = component.render();

    const backBtn = el.querySelector('[data-testid="order-detail-back-btn"]');
    expect(backBtn).not.toBeNull();

    backBtn.click();
    expect(backSpy).toHaveBeenCalled();
  });
});
