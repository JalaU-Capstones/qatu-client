import { CartView } from './CartView.js';

const createItem = (overrides = {}) => ({
  productId: 'p1',
  name: 'Aguayo tradicional',
  seller: 'Tejidos Illimani',
  price: 40,
  currency: 'USD',
  imageUrl: null,
  quantity: 2,
  priceLabel: 'US$ 40.00',
  subtotal: 80,
  subtotalLabel: 'US$ 80.00',
  detailHref: '/products/p1',
  ...overrides,
});

const createMockViewModel = (overrides = {}) => {
  const listeners = new Set();
  const vm = {
    items: [createItem()],
    subtotal: 80,
    shipping: 0,
    total: 80,
    itemCount: 2,
    distinctCount: 1,
    isEmpty: false,
    requiresAuth: false,
    notice: '',
    load: jasmine.createSpy('load').and.resolveTo(undefined),
    getSubtotalLabel: () => 'US$ 80.00',
    getShippingLabel: () => 'Gratis',
    getTotalLabel: () => 'US$ 80.00',
    getItemCountLabel: () => '2 artículos',
    getShippingNotice: () => '¡Tienes envío gratis!',
    setQuantity: jasmine.createSpy('setQuantity'),
    increment: jasmine.createSpy('increment'),
    decrement: jasmine.createSpy('decrement'),
    remove: jasmine.createSpy('remove'),
    clear: jasmine.createSpy('clear'),
    checkout: jasmine.createSpy('checkout'),
    dismissNotice: jasmine.createSpy('dismissNotice'),
    destroy: jasmine.createSpy('destroy'),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      listeners.forEach((listener) => listener(vm));
    },
    ...overrides,
  };
  return vm;
};

describe('CartView', () => {
  let container;
  let viewModel;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = createMockViewModel();
    view = new CartView({ viewModel });
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('renders the empty state with a continue-shopping link', () => {
    viewModel = createMockViewModel({
      items: [],
      subtotal: 0,
      shipping: 0,
      total: 0,
      itemCount: 0,
      distinctCount: 0,
      isEmpty: true,
    });
    view = new CartView({ viewModel });
    view.mount(container);

    expect(container.querySelector('section.q-cart')).not.toBeNull();
    expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
      'Tu carrito está vacío'
    );
    const link = container.querySelector('.q-cart__continue');
    expect(link.getAttribute('href')).toBe('/products');
    expect(link.dataset.route).toBe('');
    expect(container.querySelector('.q-cart__layout')).toBeNull();
  });

  it('renders the item list and order summary', () => {
    view.mount(container);

    expect(container.querySelector('.q-cart__title').textContent).toBe('Carrito de compras');
    expect(container.querySelectorAll('.q-cart-item').length).toBe(1);
    expect(container.querySelector('.q-cart-item__name').textContent).toBe('Aguayo tradicional');
    expect(container.querySelector('.q-cart-item__name').getAttribute('href')).toBe('/products/p1');
    expect(container.querySelector('.q-cart-item__seller').textContent).toBe('Tejidos Illimani');
    expect(container.querySelector('.q-cart-item__unit-price').textContent).toBe('US$ 40.00 c/u');
    expect(container.querySelector('.q-cart-item__subtotal-value').textContent).toBe('US$ 80.00');
    expect(container.querySelectorAll('.q-quantity-selector').length).toBe(1);
    expect(container.querySelector('.q-cart__summary')).not.toBeNull();
    expect(container.querySelector('.q-cart__summary-row--total').textContent).toContain(
      'US$ 80.00'
    );
    expect(container.querySelector('.q-cart__checkout').textContent).toBe('Continuar al pago');
    expect(container.querySelector('.q-cart__clear').textContent).toBe('Vaciar carrito');
  });

  it('quantity controls update the item quantity through the view model', () => {
    view.mount(container);

    container.querySelector('.q-quantity-selector__btn--decrease').click();
    expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 1);

    container.querySelector('.q-quantity-selector__btn--increase').click();
    expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 2);
  });

  it('remove button calls remove with the product id', () => {
    view.mount(container);

    container.querySelector('.q-cart-item__remove').click();
    expect(viewModel.remove).toHaveBeenCalledWith('p1');
  });

  it('clear button empties the cart through the view model', () => {
    view.mount(container);

    container.querySelector('.q-cart__clear').click();
    expect(viewModel.clear).toHaveBeenCalled();
  });

  it('checkout button calls checkout', () => {
    view.mount(container);

    container.querySelector('.q-cart__checkout').click();
    expect(viewModel.checkout).toHaveBeenCalled();
  });

  it('uses the onCheckout callback when provided', () => {
    const onCheckout = jasmine.createSpy('onCheckout');
    view = new CartView({ viewModel, onCheckout });
    view.mount(container);

    container.querySelector('.q-cart__checkout').click();
    expect(onCheckout).toHaveBeenCalled();
    expect(viewModel.checkout).not.toHaveBeenCalled();
  });

  it('renders the checkout notice and allows dismissing it', () => {
    viewModel.notice = 'El pago estará disponible próximamente.';
    view.mount(container);

    expect(container.querySelector('.q-cart__notice-text').textContent).toBe(
      'El pago estará disponible próximamente.'
    );
    container.querySelector('.q-cart__notice-close').click();
    expect(viewModel.dismissNotice).toHaveBeenCalled();
  });

  it('re-renders when the view model notifies', () => {
    view.mount(container);
    expect(container.querySelectorAll('.q-cart-item').length).toBe(1);

    viewModel.items = [createItem(), createItem({ productId: 'p2', name: 'Café' })];
    viewModel.notify();

    expect(container.querySelectorAll('.q-cart-item').length).toBe(2);
  });

  it('destroy removes the section and unsubscribes', () => {
    view.mount(container);
    expect(container.querySelector('.q-cart')).not.toBeNull();

    view.destroy();

    expect(container.querySelector('.q-cart')).toBeNull();
    expect(viewModel.destroy).toHaveBeenCalled();
  });
});
