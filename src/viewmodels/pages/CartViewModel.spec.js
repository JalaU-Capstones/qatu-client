import { FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from '../../store/cartStore.js';
import { CartViewModel } from './CartViewModel.js';

const product = (overrides = {}) => ({
  productId: 'p1',
  itemId: 'ci1',
  slug: 'aguayo',
  name: 'Aguayo',
  price: 40,
  currency: 'USD',
  seller: 'Tejidos Illimani',
  imageUrl: null,
  quantity: 1,
  ...overrides,
});

class MockCartStore {
  constructor(items = []) {
    this.items = [...items];
    this.listeners = new Set();
    this.quantities = [];
  }
  getItems() {
    return this.items;
  }
  getItem(id) {
    return this.items.find((i) => i.productId === id) || null;
  }
  getCount() {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }
  getSubtotal() {
    return this.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }
  getShipping() {
    return this.items.length === 0 || this.getSubtotal() >= FREE_SHIPPING_THRESHOLD
      ? 0
      : FLAT_SHIPPING_RATE;
  }
  getTotal() {
    return this.getSubtotal() + this.getShipping();
  }

  updateQuantity(id, qty) {
    const clamped = Math.max(1, Math.floor(Number(qty) || 1));
    const item = this.items.find((i) => i.productId === id);
    if (item) {
      item.quantity = clamped;
      this._notify();
    }
    return item ? { ...item } : null;
  }

  removeItem(id) {
    const removed = this.items.some((i) => i.productId === id);
    this.items = this.items.filter((i) => i.productId !== id);
    if (removed) this._notify();
    return removed;
  }

  clear() {
    this.items = [];
    this._notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  _notify() {
    this.listeners.forEach((l) => l());
  }
}

const createCartService = (overrides = {}) => ({
  loadCart: jasmine
    .createSpy('loadCart')
    .and.resolveTo(overrides.loadCartResult ?? { status: 'loaded', items: [], itemCount: 0 }),
  updateItem:
    overrides.updateItem ?? jasmine.createSpy('updateItem').and.resolveTo({ status: 'updated' }),
  removeItem:
    overrides.removeItem ?? jasmine.createSpy('removeItem').and.resolveTo({ status: 'removed' }),
  clear: overrides.clear ?? jasmine.createSpy('clear').and.resolveTo({ status: 'cleared' }),
});

describe('CartViewModel', () => {
  let store;
  let cartService;
  let vm;

  beforeEach(() => {
    store = new MockCartStore();
    cartService = createCartService();
    vm = new CartViewModel({ cartStore: store, cartService });
  });

  afterEach(() => {
    vm.destroy();
  });

  it('starts empty', () => {
    expect(vm.items).toEqual([]);
    expect(vm.subtotal).toBe(0);
    expect(vm.shipping).toBe(0);
    expect(vm.total).toBe(0);
    expect(vm.itemCount).toBe(0);
    expect(vm.isEmpty).toBe(true);
    expect(vm.requiresAuth).toBe(false);
    expect(vm.getShippingLabel()).toBe('');
  });

  it('reflects items added to the store with presentation labels', () => {
    store.items.push(product({ quantity: 2 }));

    vm.refresh();

    expect(vm.items.length).toBe(1);
    expect(vm.items[0]).toEqual(
      jasmine.objectContaining({
        productId: 'p1',
        name: 'Aguayo',
        quantity: 2,
        priceLabel: 'US$ 40.00',
        subtotal: 80,
        detailHref: '/products/aguayo',
      })
    );
    expect(vm.subtotal).toBe(80);
    expect(vm.itemCount).toBe(2);
  });

  it('load() hydrates from the backend and clears requiresAuth', async () => {
    cartService = createCartService({
      loadCartResult: { status: 'loaded', items: [product({ quantity: 2 })], itemCount: 2 },
    });
    store.items.push(product({ quantity: 2 }));
    vm = new CartViewModel({ cartStore: store, cartService });

    await vm.load();

    expect(cartService.loadCart).toHaveBeenCalled();
    expect(vm.requiresAuth).toBe(false);
    expect(vm.items.length).toBe(1);
  });

  it('load() flags guests so the view shows the login prompt', async () => {
    cartService = createCartService({ loadCartResult: { status: 'auth-required' } });
    vm = new CartViewModel({ cartStore: store, cartService });

    await vm.load();

    expect(vm.requiresAuth).toBe(true);
  });

  it('load() stores a notice when hydration fails', async () => {
    cartService = createCartService({
      loadCartResult: { status: 'error', error: new Error('Boom'), statusCode: 500 },
    });
    vm = new CartViewModel({ cartStore: store, cartService });

    await vm.load();

    expect(vm.notice).toBe('No pudimos actualizar tu carrito.');
  });

  it('increment and decrement update the quantity through the API', async () => {
    store.items.push(product());
    vm.refresh();

    await vm.increment('p1');
    expect(store.items[0].quantity).toBe(2);
    expect(cartService.updateItem).toHaveBeenCalledWith('p1', 2);

    await vm.decrement('p1');
    expect(store.items[0].quantity).toBe(1);
    expect(cartService.updateItem).toHaveBeenCalledWith('p1', 1);
  });

  it('restores the previous quantity and shows a notice when the API fails', async () => {
    store.items.push(product());
    vm.refresh();
    cartService = createCartService({
      updateItem: jasmine
        .createSpy('updateItem')
        .and.resolveTo({ status: 'error', error: new Error('Nope'), statusCode: 422 }),
    });
    vm = new CartViewModel({ cartStore: store, cartService });
    vm.refresh();

    await vm.setQuantity('p1', 4);

    expect(store.items[0].quantity).toBe(1);
    expect(vm.notice).toBe('Nope');
  });

  it('remove delegates to the service', async () => {
    store.items.push(product());
    vm.refresh();

    await vm.remove('p1');

    expect(cartService.removeItem).toHaveBeenCalledWith('p1');

    cartService = createCartService({
      removeItem: jasmine
        .createSpy('removeItem')
        .and.resolveTo({ status: 'error', error: new Error('Nope'), statusCode: 500 }),
    });
    vm = new CartViewModel({ cartStore: store, cartService });
    vm.refresh();

    await vm.remove('p1');

    expect(vm.notice).toBe('Nope');
  });

  it('clear delegates to the service', async () => {
    await vm.clear();

    expect(cartService.clear).toHaveBeenCalled();
  });

  it('setProducts-free summary helpers keep the storefront labels', () => {
    store.items.push(product({ quantity: 3 }));
    vm.refresh();

    expect(vm.getSubtotalLabel()).toBe('US$ 120.00');
    expect(vm.getShippingLabel()).toBe('Gratis');
    expect(vm.getTotalLabel()).toBe('US$ 120.00');
    expect(vm.getItemCountLabel()).toBe('3 artículos');
    expect(vm.getShippingNotice()).toBe('¡Tienes envío gratis!');
  });

  it('checkout shows the placeholder notice and dismiss clears it', () => {
    vm.checkout();
    expect(vm.notice).toContain('próximamente');

    vm.dismissNotice();
    expect(vm.notice).toBe('');
  });

  it('renders real product details when the store was hydrated with ?include=product', () => {
    store.items.push({
      productId: 'p1',
      itemId: 'ci1',
      slug: 'cafe-cusco',
      name: 'Café Cusco 500g',
      price: 14,
      currency: 'USD',
      imageUrl: 'https://cdn/p1.jpg',
      seller: 'Café Altura',
      quantity: 2,
    });

    vm.refresh();

    expect(vm.items[0]).toEqual(
      jasmine.objectContaining({
        name: 'Café Cusco 500g',
        priceLabel: 'US$ 14.00',
        subtotal: 28,
        subtotalLabel: 'US$ 28.00',
        detailHref: '/products/cafe-cusco',
      })
    );
    expect(vm.getSubtotalLabel()).toBe('US$ 28.00');
  });
});
