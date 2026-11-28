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
    expect(vm.getShippingProgressPercentage()).toBe(100);
  });

  it('calculates shipping progress without changing shipping totals', () => {
    store.items.push(product({ price: 25 }));
    vm.refresh();

    expect(vm.getShippingProgressPercentage()).toBe(50);
    expect(vm.shipping).toBe(4.99);

    store.items[0].price = 60;
    vm.refresh();

    expect(vm.getShippingProgressPercentage()).toBe(100);
    expect(vm.shipping).toBe(0);
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const createItem = (overrides = {}) => ({
      productId: 'p1',
      itemId: 'ci1',
      slug: 'aguayo',
      name: 'Aguayo',
      price: 40,
      currency: 'USD',
      quantity: 1,
      ...overrides,
    });

    const createStore = ({
      items = [],
      helpers = true,
      subscribe = true,
      notifyOnUpdate = true,
    } = {}) => {
      const state = { items: items.map((item) => ({ ...item })) };
      const listeners = new Set();
      const store = {
        state,
        getItems: jasmine
          .createSpy('getItems')
          .and.callFake(() => state.items.map((item) => ({ ...item }))),
        updateQuantity: jasmine.createSpy('updateQuantity').and.callFake((id, quantity) => {
          const item = state.items.find((entry) => entry.productId === id);
          if (item) item.quantity = quantity;
          if (notifyOnUpdate) store._notify();
          return item ? { ...item } : null;
        }),
        _notify: () => [...listeners].forEach((listener) => listener()),
      };

      if (helpers) {
        store.getSubtotal = () =>
          Math.round(state.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) /
          100;
        store.getShipping = () =>
          state.items.length === 0 || store.getSubtotal() >= FREE_SHIPPING_THRESHOLD
            ? 0
            : FLAT_SHIPPING_RATE;
        store.getTotal = () => store.getSubtotal() + store.getShipping();
        store.getCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      if (subscribe) {
        store.subscribe = (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        };
      }

      return store;
    };

    const createService = ({
      loadCartResult = { status: 'loaded' },
      updateItemResult = { status: 'updated' },
      removeItemResult = { status: 'removed' },
      clearResult = { status: 'cleared' },
    } = {}) => ({
      loadCart: jasmine.createSpy('loadCart').and.resolveTo(loadCartResult),
      updateItem: jasmine.createSpy('updateItem').and.resolveTo(updateItemResult),
      removeItem: jasmine.createSpy('removeItem').and.resolveTo(removeItemResult),
      clear: jasmine.createSpy('clear').and.resolveTo(clearResult),
    });

    describe('CartViewModel additional branches (recovered 1)', () => {
      let viewModels;

      beforeEach(() => {
        viewModels = [];
      });

      afterEach(() => {
        viewModels.forEach((vm) => vm.destroy());
        viewModels = [];
      });

      const createViewModel = (options) => {
        const vm = new CartViewModel(options);
        viewModels.push(vm);
        return vm;
      };

      it('ignores load() when the injected service has no loadCart method', async () => {
        const vm = createViewModel({
          cartStore: createStore(),
          cartService: { updateItem: jasmine.createSpy('updateItem') },
        });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        await expectAsync(vm.load()).toBeResolved();

        expect(vm.requiresAuth).toBe(false);
        expect(vm.notice).toBe('');
        expect(listener).not.toHaveBeenCalled();
      });

      it('resets requiresAuth when a later load succeeds after an auth-required result', async () => {
        const service = createService({ loadCartResult: { status: 'auth-required' } });
        const vm = createViewModel({ cartStore: createStore(), cartService: service });

        await vm.load();
        expect(vm.requiresAuth).toBe(true);

        service.loadCart.and.resolveTo({ status: 'loaded' });
        await vm.load();

        expect(vm.requiresAuth).toBe(false);
        expect(vm.notice).toBe('');
      });

      it('computes totals locally when the store has no total helper methods', () => {
        const vm = createViewModel({
          cartStore: createStore({ items: [createItem()], helpers: false }),
          cartService: createService(),
        });

        expect(vm.subtotal).toBe(40);
        expect(vm.shipping).toBe(4.99);
        expect(vm.total).toBe(44.99);
        expect(vm.itemCount).toBe(1);
        expect(vm.items[0].subtotalLabel).toBe('US$ 40.00');
        expect(vm.getSubtotalLabel()).toBe('US$ 40.00');
        expect(vm.getShippingLabel()).toBe('US$ 4.99');
        expect(vm.getTotalLabel()).toBe('US$ 44.99');
        expect(vm.getShippingNotice()).toBe('Te faltan US$ 10.00 para obtener envío gratis.');
      });

      it('falls back to /products when an item has neither slug nor productId', () => {
        const vm = createViewModel({
          cartStore: createStore({
            items: [
              createItem({ productId: '', slug: null }),
              createItem({ productId: 'p9', slug: null }),
              createItem({ productId: 'ignored', slug: 'cafe-cusco' }),
            ],
          }),
          cartService: createService(),
        });

        expect(vm.items.map((item) => item.detailHref)).toEqual([
          '/products',
          '/products/p9',
          '/products/cafe-cusco',
        ]);
      });

      it('exposes empty-cart labels and singular/plural item count labels', () => {
        const vm = createViewModel({ cartStore: createStore(), cartService: createService() });

        expect(vm.getCurrency()).toBe('USD');
        expect(vm.getSubtotalLabel()).toBe('US$ 0.00');
        expect(vm.getTotalLabel()).toBe('US$ 0.00');
        expect(vm.getShippingLabel()).toBe('');
        expect(vm.getShippingNotice()).toBe('');

        vm.itemCount = 1;
        expect(vm.getItemCountLabel()).toBe('1 artículo');
        vm.itemCount = 2;
        expect(vm.getItemCountLabel()).toBe('2 artículos');
      });

      it('does not call the API from increment/decrement for an unknown product id', async () => {
        const store = createStore({ items: [createItem()] });
        const service = createService();
        const vm = createViewModel({ cartStore: store, cartService: service });

        await vm.increment('missing');
        await vm.decrement('missing');

        expect(store.updateQuantity).not.toHaveBeenCalled();
        expect(service.updateItem).not.toHaveBeenCalled();
      });

      it('keeps the API message and skips the restore branch when setQuantity has no previous item', async () => {
        const store = createStore({ notifyOnUpdate: false });
        const service = createService({
          updateItemResult: { status: 'error', error: { message: 'Stock agotado' } },
        });
        const vm = createViewModel({ cartStore: store, cartService: service });

        await vm.setQuantity('ghost', 3);

        expect(service.updateItem).toHaveBeenCalledWith('ghost', 3);
        expect(store.updateQuantity).toHaveBeenCalledTimes(1);
        expect(store.updateQuantity).toHaveBeenCalledWith('ghost', 3);
        expect(vm.notice).toBe('Stock agotado');
      });

      it('uses the default update notice when the failed response has no error message', async () => {
        const vm = createViewModel({
          cartStore: createStore({ notifyOnUpdate: false }),
          cartService: createService({ updateItemResult: { status: 'error' } }),
        });

        await vm.setQuantity('ghost', 4);

        expect(vm.notice).toBe('No pudimos actualizar tu carrito.');
      });

      it('refreshes explicitly after a successful mutation only when the store has no subscription', async () => {
        const standaloneStore = createStore({ subscribe: false, notifyOnUpdate: false });
        const standaloneVm = createViewModel({
          cartStore: standaloneStore,
          cartService: createService(),
        });
        const standaloneRefresh = spyOn(standaloneVm, 'refresh').and.callThrough();

        await standaloneVm.setQuantity('p1', 2);

        expect(standaloneRefresh).toHaveBeenCalledTimes(1);

        const subscribedStore = createStore({ subscribe: true, notifyOnUpdate: false });
        const subscribedVm = createViewModel({
          cartStore: subscribedStore,
          cartService: createService(),
        });
        const subscribedRefresh = spyOn(subscribedVm, 'refresh').and.callThrough();

        await subscribedVm.setQuantity('p1', 2);

        expect(subscribedRefresh).not.toHaveBeenCalled();
        subscribedStore._notify();
        expect(subscribedRefresh).toHaveBeenCalledTimes(1);
      });

      it('notifies the default clear error and a custom one', async () => {
        const service = createService({ clearResult: { status: 'error' } });
        const vm = createViewModel({ cartStore: createStore(), cartService: service });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        await vm.clear();
        expect(vm.notice).toBe('No pudimos vaciar tu carrito.');
        expect(listener).toHaveBeenCalledWith(vm);

        service.clear.and.resolveTo({ status: 'error', error: { message: 'Intenta de nuevo' } });
        await vm.clear();
        expect(vm.notice).toBe('Intenta de nuevo');
      });

      it('treats dismissNotice on an empty notice as a no-op', () => {
        const vm = createViewModel({ cartStore: createStore(), cartService: createService() });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        vm.dismissNotice();
        expect(listener).not.toHaveBeenCalled();

        vm.notice = 'Aviso';
        vm.dismissNotice();

        expect(vm.notice).toBe('');
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('uses the store subscription as a refresh source', () => {
        const store = createStore({ items: [createItem()] });
        const vm = createViewModel({ cartStore: store, cartService: createService() });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        store.state.items.push(
          createItem({ productId: 'p2', slug: 'otro', price: 10, quantity: 2 })
        );
        store._notify();

        expect(vm.items.length).toBe(2);
        expect(vm.itemCount).toBe(3);
        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('destroy() stops store notifications and clears view listeners', () => {
        const store = createStore({ items: [createItem()] });
        const vm = createViewModel({ cartStore: store, cartService: createService() });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        vm.destroy();
        expect(vm._storeUnsubscribe).toBeNull();

        store.state.items.push(createItem({ productId: 'p2', slug: 'otro' }));
        store._notify();
        vm.checkout();
        vm.destroy();

        expect(vm.items.length).toBe(1);
        expect(listener).not.toHaveBeenCalled();
      });

      it('subscribe() returns a working unsubscribe function', () => {
        const vm = createViewModel({ cartStore: createStore(), cartService: createService() });
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);

        unsubscribe();
        vm.checkout();

        expect(listener).not.toHaveBeenCalled();
      });

      it('characterizes that a successful load leaves a previous notice untouched', async () => {
        const service = createService({ loadCartResult: { status: 'error' } });
        const vm = createViewModel({ cartStore: createStore(), cartService: service });

        await vm.load();
        expect(vm.notice).toBe('No pudimos actualizar tu carrito.');

        service.loadCart.and.resolveTo({ status: 'loaded' });
        await vm.load();

        expect(vm.requiresAuth).toBe(false);
        expect(vm.notice).toBe('No pudimos actualizar tu carrito.');
      });
    });
  })();
})();
