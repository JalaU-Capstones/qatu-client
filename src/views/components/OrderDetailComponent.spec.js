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
        product_id: 'c1111111-1111-4111-8111-111111111111',
        product_name: 'Wireless Mouse',
        quantity: 2,
        unit_price: 25,
        subtotal: 50,
      },
      {
        id: 'item-2',
        product_id: 'c2222222-2222-4222-8222-222222222222',
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
    expect(statusEl.textContent).toBe('Confirmada');

    const items = el.querySelectorAll('[data-testid="order-detail-item"]');
    expect(items.length).toBe(2);

    const firstItemName = el.querySelector('[data-testid="order-item-name"]');
    expect(firstItemName.textContent).toBe('Wireless Mouse');
    expect(firstItemName.tagName).toBe('A');
    expect(firstItemName.getAttribute('href')).toBe(
      '/products/c1111111-1111-4111-8111-111111111111'
    );
    expect(firstItemName.getAttribute('aria-label')).toBe('Ver producto: Wireless Mouse');
    expect(firstItemName.hasAttribute('data-route')).toBeTrue();

    const totalEl = el.querySelector('[data-testid="order-detail-total"]');
    expect(totalEl.textContent).toContain('120.00');
    expect(totalEl.textContent).toContain('USD');

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
    expect(currentStep.getAttribute('aria-current')).toBe('step');

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
    expect(notice.textContent).toContain('Cancelada');
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

  it('renders placeholder SVG when item image fails to load', () => {
    const orderWithImage = {
      ...sampleOrder,
      items: [
        {
          id: 'item-broken',
          product_name: 'Broken Item',
          product_image_path: 'https://invalid.example/broken-product.png',
          quantity: 1,
          unit_price: 10,
          subtotal: 10,
        },
      ],
    };
    const component = new OrderDetailComponent({ order: orderWithImage });
    const el = component.render();

    const img = el.querySelector('.q-order-detail__item-image img');
    expect(img).not.toBeNull();

    img.dispatchEvent(new Event('error'));

    expect(el.querySelector('.q-order-detail__item-image img')).toBeNull();
    const svg = el.querySelector('.q-order-detail__item-image svg');
    expect(svg).not.toBeNull();
  });

  it('renders structured shipping address as formatted lines, without raw JSON', () => {
    const orderWithStructuredAddress = {
      ...sampleOrder,
      shipping_address: {
        full_name: 'Geeky Gaming',
        street: 'CL 04 #03-11',
        city: 'Buga',
        state: 'Valle de Cauca',
        postal_code: '760001',
        country: 'CO',
        phone: '+3137323311',
      },
    };
    const component = new OrderDetailComponent({ order: orderWithStructuredAddress });
    const el = component.render();

    const shippingCard = el.querySelector('[data-testid="order-shipping-card"]');
    expect(shippingCard).not.toBeNull();
    const lines = shippingCard.querySelectorAll('.q-order-shipping-address__line');
    expect(lines.length).toBe(5);
    expect(shippingCard.textContent).not.toContain('{');
    expect(shippingCard.textContent).not.toContain('"city"');
    expect(shippingCard.textContent).toContain('Geeky Gaming');
    expect(shippingCard.textContent).toContain('CL 04 #03-11');
    expect(shippingCard.textContent).toContain('Buga, Valle de Cauca, 760001');
    expect(shippingCard.textContent).toContain('CO');
    expect(shippingCard.textContent).toContain('Tel. +3137323311');
  });

  it('renders "Dirección no disponible" when shipping_address is null', () => {
    const orderWithoutAddress = { ...sampleOrder, shipping_address: null };
    const component = new OrderDetailComponent({ order: orderWithoutAddress });
    const el = component.render();

    const shippingCard = el.querySelector('[data-testid="order-shipping-card"]');
    expect(shippingCard).not.toBeNull();
    expect(shippingCard.textContent).toContain('Dirección no disponible');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('OrderDetailComponent (recovered 1)', () => {
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

    it('renders "Dirección no disponible" when shipping_address is null', () => {
      const orderWithoutAddress = { ...sampleOrder, shipping_address: null };
      const component = new OrderDetailComponent({ order: orderWithoutAddress });
      const el = component.render();

      const shippingCard = el.querySelector('[data-testid="order-shipping-card"]');
      expect(shippingCard).not.toBeNull();
      expect(shippingCard.textContent).toContain('Dirección no disponible');
    });
  });

  (() => {
    describe('OrderDetailComponent additional branches (recovered 2)', () => {
      let container;

      const buildOrder = (overrides = {}) => ({
        id: 'ord-1',
        order_number: 'ORD-100',
        status: 'confirmed',
        currency: 'USD',
        subtotal: 100,
        shipping_cost: 15,
        tax: 5,
        total: 120,
        created_at: '2026-10-14T11:00:00.000Z',
        shipping_address: 'Av. Siempre Viva 742',
        items: [
          {
            id: 'item-1',
            product_name: 'Mouse',
            quantity: 2,
            unit_price: 25,
            subtotal: 50,
          },
        ],
        ...overrides,
      });

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        container.remove();
      });

      it('renders the exact empty state for absent and null orders', () => {
        [new OrderDetailComponent(), new OrderDetailComponent({ order: null })].forEach(
          (component) => {
            const el = component.render();

            expect(el.tagName.toLowerCase()).toBe('article');
            expect(el.getAttribute('data-testid')).toBe('order-detail');
            expect(el.className).toBe('q-order-detail');
            expect(el.querySelector('.q-order-detail__empty').textContent).toBe(
              'No se encontró información de la orden.'
            );
            expect(el.querySelector('[data-testid="order-detail-back-btn"]')).toBeNull();
          }
        );
      });

      it('applies setOrder before the first render without creating an element', () => {
        const component = new OrderDetailComponent();

        component.setOrder(buildOrder());
        expect(component.element).toBeNull();

        const el = component.render();
        expect(el.querySelector('[data-testid="order-detail-title"]').textContent).toBe(
          'Orden #ORD-100'
        );
      });

      it('replaces the mounted element in place when setOrder is called', () => {
        const component = new OrderDetailComponent({ order: buildOrder() });
        const firstEl = component.render();
        container.appendChild(firstEl);
        const sentinel = document.createElement('span');
        container.appendChild(sentinel);

        component.setOrder(buildOrder({ order_number: 'ORD-200' }));
        expect(component.element).not.toBe(firstEl);
        expect(firstEl.parentNode).toBeNull();
        expect(container.children.length).toBe(2);
        expect(container.firstElementChild).toBe(component.element);
        expect(container.children[1]).toBe(sentinel);
        expect(container.querySelector('[data-testid="order-detail-title"]').textContent).toBe(
          'Orden #ORD-200'
        );

        component.setOrder(null);
        expect(container.children.length).toBe(2);
        expect(container.querySelector('.q-order-detail__empty').textContent).toBe(
          'No se encontró información de la orden.'
        );
      });

      it('formats missing dates as N/A', () => {
        const component = new OrderDetailComponent();

        expect(component._formatDate(null)).toBe('N/A');
        expect(component._formatDate('')).toBe('N/A');
        expect(component._formatDate(undefined)).toBe('N/A');
        expect(component._formatDate('2026-10-14T11:00:00.000Z')).toContain('2026');
      });

      it('formats currency edge cases and omits the code when absent or the amount is missing', () => {
        const component = new OrderDetailComponent();

        expect(component._formatCurrency(undefined)).toBe('0.00');
        expect(component._formatCurrency(null)).toBe('0.00');
        expect(component._formatCurrency(NaN)).toBe('0.00');
        expect(component._formatCurrency(12.5)).toBe('12.50');
        // Missing amounts short-circuit before the currency prefix is applied.
        expect(component._formatCurrency(undefined, 'USD')).toBe('0.00');
        expect(component._formatCurrency(25, 'COP')).toBe('COP 25.00');
      });

      it('renders the exact cancelled tracker notice without the step list', () => {
        const el = new OrderDetailComponent({
          order: buildOrder({ status: 'cancelled' }),
        }).render();
        const tracker = el.querySelector('[data-testid="order-tracker"]');

        expect(tracker.className).toBe('q-order-tracker');
        const notice = tracker.querySelector('[data-testid="order-cancelled-notice"]');
        expect(notice.className).toBe('q-order-tracker__cancelled');
        expect(notice.querySelector('.q-order-tracker__cancelled-badge').textContent).toBe(
          'Cancelada'
        );
        expect(tracker.querySelector('.q-order-tracker__steps')).toBeNull();
      });

      it('treats unknown statuses as a current first step with pending remaining steps', () => {
        const el = new OrderDetailComponent({ order: buildOrder({ status: 'mystery' }) }).render();
        const steps = el.querySelectorAll('.q-order-tracker__step');

        expect(steps.length).toBe(4);
        expect(Array.from(steps, (step) => step.className)).toEqual([
          'q-order-tracker__step q-order-tracker__step--current',
          'q-order-tracker__step q-order-tracker__step--pending',
          'q-order-tracker__step q-order-tracker__step--pending',
          'q-order-tracker__step q-order-tracker__step--pending',
        ]);
        expect(
          Array.from(el.querySelectorAll('.q-order-tracker__label'), (node) => node.textContent)
        ).toEqual(['Pendiente', 'Confirmada', 'Enviada', 'Entregada']);
      });

      it('marks completed and current steps for a confirmed order', () => {
        const el = new OrderDetailComponent({ order: buildOrder() }).render();

        expect(
          Array.from(el.querySelectorAll('.q-order-tracker__step'), (step) => step.className)
        ).toEqual([
          'q-order-tracker__step q-order-tracker__step--completed',
          'q-order-tracker__step q-order-tracker__step--current',
          'q-order-tracker__step q-order-tracker__step--pending',
          'q-order-tracker__step q-order-tracker__step--pending',
        ]);
      });

      it('falls back to the id, pending status and N/A date when fields are missing', () => {
        const el = new OrderDetailComponent({
          order: buildOrder({ order_number: '', status: undefined, created_at: null }),
        }).render();

        expect(el.querySelector('[data-testid="order-detail-title"]').textContent).toBe(
          'Orden #ord-1'
        );
        expect(el.querySelector('[data-testid="order-detail-date"]').textContent).toBe(
          'Realizada el N/A'
        );
        const badge = el.querySelector('[data-testid="order-detail-status"]');
        expect(badge.className).toBe('q-order-status q-order-status--pending');
        expect(badge.textContent).toBe('Pendiente');
      });

      it('renders the exact empty-items text for null, non-array and empty item lists', () => {
        [null, 'not-an-array', []].forEach((items) => {
          const el = new OrderDetailComponent({ order: buildOrder({ items }) }).render();
          const list = el.querySelector('[data-testid="order-detail-items-list"]');

          expect(list.children.length).toBe(1);
          expect(list.querySelector('.q-order-detail__item-empty').textContent).toBe(
            'No hay desglose de productos disponible para esta orden.'
          );
        });
      });

      it('prefers product_image_path over product_image and falls back to product_image', () => {
        const el = new OrderDetailComponent({
          order: buildOrder({
            items: [
              {
                product_image: 'https://example.com/from-product-image.png',
                product_name: 'First',
              },
              {
                product_image_path: 'https://example.com/from-path.png',
                product_image: 'https://example.com/ignored.png',
                name: 'Second',
              },
            ],
          }),
        }).render();
        const images = el.querySelectorAll('.q-order-detail__item-image img');

        expect(images.length).toBe(2);
        expect(images[0].getAttribute('src')).toBe('https://example.com/from-product-image.png');
        expect(images[0].alt).toBe('First');
        expect(images[1].getAttribute('src')).toBe('https://example.com/from-path.png');
        expect(images[1].alt).toBe('Second');
      });

      it('renders item name fallbacks, quantity text and formatted subtotals', () => {
        const el = new OrderDetailComponent({
          order: buildOrder({
            items: [
              { name: 'Fallback name', quantity: 2, unit_price: 25, subtotal: 50 },
              { quantity: 1, unit_price: 10, subtotal: 10 },
            ],
          }),
        }).render();

        expect(
          Array.from(
            el.querySelectorAll('[data-testid="order-item-name"]'),
            (node) => node.textContent
          )
        ).toEqual(['Fallback name', 'Producto sin nombre']);
        expect(
          Array.from(
            el.querySelectorAll('[data-testid="order-item-qty"]'),
            (node) => node.textContent
          )
        ).toEqual(['x2 · USD 25.00', 'x1 · USD 10.00']);
        expect(
          Array.from(
            el.querySelectorAll('[data-testid="order-item-subtotal"]'),
            (node) => node.textContent
          )
        ).toEqual(['USD 50.00', 'USD 10.00']);
      });

      it('renders exactly four summary rows using the values from the order', () => {
        const el = new OrderDetailComponent({ order: buildOrder() }).render();
        const rows = el.querySelectorAll('.q-order-detail__summary-row');

        expect(rows.length).toBe(4);
        expect(Array.from(rows, (row) => row.children[0].textContent)).toEqual([
          'Subtotal',
          'Envío',
          'Impuestos',
          'Total',
        ]);
        expect(Array.from(rows, (row) => row.children[1].textContent)).toEqual([
          'USD 100.00',
          'USD 15.00',
          'USD 5.00',
          'USD 120.00',
        ]);
        expect(rows[3].className).toBe(
          'q-order-detail__summary-row q-order-detail__summary-row--total'
        );
        expect(el.querySelector('[data-testid="order-detail-total"]').textContent).toBe(
          'USD 120.00'
        );
      });

      it('renders the notes card only when notes are present', () => {
        const withNotes = new OrderDetailComponent({ order: buildOrder({ notes: 42 }) }).render();
        const titles = Array.from(
          withNotes.querySelectorAll('.q-order-detail__info-title'),
          (node) => node.textContent
        );

        expect(titles).toContain('Notas');
        const notesCard = Array.from(withNotes.querySelectorAll('.q-order-detail__info-card')).find(
          (card) => card.querySelector('h4').textContent === 'Notas'
        );
        expect(notesCard.querySelector('.q-order-detail__info-text').textContent).toBe('42');

        const withoutNotes = new OrderDetailComponent({
          order: buildOrder({ notes: '' }),
        }).render();
        expect(
          Array.from(
            withoutNotes.querySelectorAll('.q-order-detail__info-title'),
            (node) => node.textContent
          )
        ).not.toContain('Notas');
      });

      it('does not throw when the back button is clicked without a callback', () => {
        const el = new OrderDetailComponent({ order: buildOrder() }).render();
        const backBtn = el.querySelector('[data-testid="order-detail-back-btn"]');

        expect(backBtn).not.toBeNull();
        expect(() => backBtn.click()).not.toThrow();
      });

      it('shows the unavailable address text for addresses that produce no lines', () => {
        [{}, { street: '   ' }, '   '].forEach((shipping_address) => {
          const el = new OrderDetailComponent({ order: buildOrder({ shipping_address }) }).render();
          const address = el.querySelector('.q-order-shipping-address');

          expect(address.textContent).toBe('Dirección no disponible');
          expect(address.children.length).toBe(0);
        });
      });

      it('characterizes unescaped currency interpolation in the summary rows', () => {
        const el = new OrderDetailComponent({
          order: buildOrder({ currency: '<b>INJECTED</b>' }),
        }).render();
        const injected = el.querySelector('.q-order-detail__summary-rows b');

        expect(injected).not.toBeNull();
        expect(injected.textContent).toBe('INJECTED');
      });
    });
  })();
})();
