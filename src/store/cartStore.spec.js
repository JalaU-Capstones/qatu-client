import { CartStore, cartStore, FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from './cartStore.js';

const product = (overrides = {}) => ({
  id: 'p1',
  name: 'Aguayo',
  price: 40,
  currency: 'USD',
  seller: 'Tejidos Illimani',
  imageUrl: null,
  ...overrides,
});

describe('CartStore', () => {
  let store;

  beforeEach(() => {
    store = new CartStore();
  });

  it('starts empty', () => {
    expect(store.getCount()).toBe(0);
    expect(store.getDistinctCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
    expect(store.getSubtotal()).toBe(0);
    expect(store.getShipping()).toBe(0);
    expect(store.getTotal()).toBe(0);
  });

  it('addItem stores a product snapshot', () => {
    const item = store.addItem(product(), 2);

    expect(item).toEqual({
      productId: 'p1',
      itemId: null,
      slug: null,
      name: 'Aguayo',
      price: 40,
      currency: 'USD',
      seller: 'Tejidos Illimani',
      imageUrl: null,
      quantity: 2,
    });
    expect(store.getCount()).toBe(2);
    expect(store.getDistinctCount()).toBe(1);
  });

  it('addItem sums quantities when the product already exists', () => {
    store.addItem(product(), 2);
    store.addItem(product(), 3);

    expect(store.getCount()).toBe(5);
    expect(store.getDistinctCount()).toBe(1);
    expect(store.getItems()[0].quantity).toBe(5);
  });

  it('addItem keeps a richer snapshot when a partial product is added later', () => {
    store.addItem(product(), 1);
    store.addItem({ id: 'p1', price: 40 }, 1);

    const [item] = store.getItems();
    expect(item.name).toBe('Aguayo');
    expect(item.seller).toBe('Tejidos Illimani');
    expect(item.quantity).toBe(2);
  });

  it('addItem ignores products without an id', () => {
    expect(store.addItem({ name: 'No id' }, 1)).toBeNull();
    expect(store.getCount()).toBe(0);
  });

  it('addItem accumulates different products', () => {
    store.addItem(product(), 2);
    store.addItem(product({ id: 'p2', name: 'Café', price: 14 }), 3);

    expect(store.getCount()).toBe(5);
    expect(store.getDistinctCount()).toBe(2);
    expect(store.getSubtotal()).toBe(40 * 2 + 14 * 3);
  });

  it('updateQuantity changes the quantity and recalculates totals', () => {
    store.addItem(product(), 1);
    store.updateQuantity('p1', 4);

    expect(store.getCount()).toBe(4);
    expect(store.getSubtotal()).toBe(160);
    expect(store.getTotal()).toBe(160);
  });

  it('updateQuantity clamps quantities below 1 to 1', () => {
    store.addItem(product(), 2);
    store.updateQuantity('p1', 0);
    expect(store.getItems()[0].quantity).toBe(1);

    store.updateQuantity('p1', -5);
    expect(store.getItems()[0].quantity).toBe(1);
  });

  it('updateQuantity returns null for an unknown product', () => {
    expect(store.updateQuantity('missing', 2)).toBeNull();
  });

  it('removeItem removes the product and updates totals', () => {
    store.addItem(product(), 2);
    store.addItem(product({ id: 'p2', name: 'Café', price: 14 }), 1);

    expect(store.removeItem('p1')).toBe(true);
    expect(store.getDistinctCount()).toBe(1);
    expect(store.getCount()).toBe(1);
    expect(store.getSubtotal()).toBe(14);
    expect(store.removeItem('p1')).toBe(false);
  });

  it('clear removes all items', () => {
    store.addItem(product(), 2);

    store.clear();
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('getShipping applies the flat rate below US$ 50 and is free from US$ 50', () => {
    store.addItem(product({ price: 20 }), 1);
    expect(store.getSubtotal()).toBe(20);
    expect(store.getShipping()).toBe(FLAT_SHIPPING_RATE);
    expect(store.getTotal()).toBe(24.99);

    store.updateQuantity('p1', 3);
    expect(store.getSubtotal()).toBe(60);
    expect(store.getShipping()).toBe(0);
    expect(store.getTotal()).toBe(60);
  });

  it('getTotals returns a summary object', () => {
    store.addItem(product({ price: 25 }), 2);
    expect(store.getTotals()).toEqual({
      subtotal: 50,
      shipping: 0,
      total: 50,
      count: 2,
      distinctCount: 1,
    });
  });

  it('getItems returns copies so callers cannot mutate internal state', () => {
    store.addItem(product(), 1);
    const items = store.getItems();
    items[0].quantity = 99;

    expect(store.getItems()[0].quantity).toBe(1);
  });

  it('setUser records the user id without clearing the anonymous cart', () => {
    store.addItem(product(), 2);
    store.setUser('u1');

    expect(store.getUserId()).toBe('u1');
    expect(store.getCount()).toBe(2);

    store.setUser(null);
    expect(store.getUserId()).toBeNull();
    expect(store.getCount()).toBe(2);
  });

  it('setFromAddResponse upserts an item using the legacy API shape', () => {
    store.setFromAddResponse({ product_id: 'p1', quantity: 3 });
    expect(store.getCount()).toBe(3);
    expect(store.getItems()).toEqual([
      {
        productId: 'p1',
        itemId: null,
        slug: null,
        name: 'Producto',
        price: 0,
        currency: 'USD',
        imageUrl: null,
        seller: '',
        quantity: 3,
      },
    ]);

    // The API cart-item shape ({ id, product_id, product: {...} }) fills
    // itemId and the snapshot fields from the populated product.
    store.setFromAddResponse({
      id: 'ci1',
      user_id: 'u1',
      product_id: 'p2',
      quantity: 2,
      product: {
        id: 'p2',
        name: 'Café',
        slug: 'cafe',
        price: 14,
        currency: 'USD',
        primary_image_path: 'https://cdn/p2.jpg',
      },
    });
    expect(store.getItem('p2')).toEqual({
      productId: 'p2',
      itemId: 'ci1',
      slug: 'cafe',
      name: 'Café',
      price: 14,
      currency: 'USD',
      imageUrl: 'https://cdn/p2.jpg',
      seller: '',
      quantity: 2,
    });

    store.setFromAddResponse({ product_id: 'p1', quantity: 5 });
    expect(store.getCount()).toBe(7);
    expect(store.getDistinctCount()).toBe(2);
  });

  it('setFromAddResponse is a no-op for invalid input', () => {
    const listener = jasmine.createSpy('listener');
    store.subscribe(listener);

    store.setFromAddResponse(null);
    store.setFromAddResponse({});
    store.setFromAddResponse({ quantity: 3 });

    expect(store.getCount()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('setFromGet replaces the entire cart', () => {
    store.addItem(product(), 2);
    store.setFromGet([
      { product_id: 'p2', quantity: 3 },
      { product_id: 'p3', quantity: 1 },
    ]);

    expect(store.getCount()).toBe(4);
    expect(store.getDistinctCount()).toBe(2);
    expect(store.getItems().map((item) => item.productId)).toEqual(['p2', 'p3']);
  });

  it('setFromGet with an empty array clears the cart', () => {
    store.addItem(product(), 2);
    store.setFromGet([]);
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('notifies subscribers on add, update, remove and clear', () => {
    const listener = jasmine.createSpy('listener');
    store.subscribe(listener);

    store.addItem(product(), 1);
    store.updateQuantity('p1', 2);
    store.removeItem('p1');
    store.clear();

    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenCalledWith(store);
  });

  it('unsubscribe removes the listener', () => {
    const listener = jasmine.createSpy('listener');
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.addItem(product(), 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('singleton export cartStore is an instance of CartStore', () => {
    expect(cartStore).toBeDefined();
    expect(cartStore instanceof CartStore).toBe(true);
  });

  it('does not touch localStorage (cart state lives in memory only)', () => {
    window.localStorage.clear();

    store.setUser('u1');
    store.addItem(product(), 2);
    store.updateQuantity('p1', 3);
    store.removeItem('p1');
    store.clear();

    expect(window.localStorage.length).toBe(0);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('CartStore additional branches (recovered 1)', () => {
      let store;

      beforeEach(() => {
        store = new CartStore();
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      afterEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      it('returns defensive copies from getItem and does not expose internal state', () => {
        expect(store.getItem('missing')).toBeNull();

        store.addItem({ id: 'p1', name: 'Producto', price: 10 });
        const item = store.getItem('p1');
        item.price = 999;
        item.quantity = 50;

        expect(store.getItem('p1').price).toBe(10);
        expect(store.getItem('p1').quantity).toBe(1);
      });

      it('notifies on setUser only when the user id actually changes', () => {
        const listener = jasmine.createSpy('listener');
        store.subscribe(listener);

        store.setUser(null);
        expect(listener).not.toHaveBeenCalled();

        store.setUser('u1');
        expect(listener).toHaveBeenCalledTimes(1);
        store.setUser('u1');
        expect(listener).toHaveBeenCalledTimes(1);
        store.setUser(undefined);
        expect(listener).toHaveBeenCalledTimes(2);
        expect(store.getUserId()).toBeNull();
      });

      it('notifies for setFromGet, setFromAddResponse and clear, but not for failed removals', () => {
        const listener = jasmine.createSpy('listener');
        store.subscribe(listener);

        store.setFromGet([null, 'invalid', { product_id: 'p1', price: 5 }]);
        expect(store.getItems().length).toBe(1);
        expect(listener).toHaveBeenCalledTimes(1);

        store.setFromAddResponse({ productId: 'p2', price: 3 });
        expect(listener).toHaveBeenCalledTimes(2);

        store.setFromAddResponse({});
        expect(listener).toHaveBeenCalledTimes(2);

        expect(store.removeItem('missing')).toBe(false);
        expect(listener).toHaveBeenCalledTimes(2);

        store.clear();
        expect(listener).toHaveBeenCalledTimes(3);
      });

      it('treats a non-array setFromGet input as an empty cart', () => {
        store.addItem({ id: 'p1', price: 5 });
        store.setFromGet(null);

        expect(store.getCount()).toBe(0);
        expect(store.getDistinctCount()).toBe(0);
      });

      it('normalizes API item ids, images, sellers, currencies and quantities', () => {
        store.addItem({
          id: 'cart-1',
          product_id: 'p1',
          name: 'Producto',
          price: 12.5,
          currency: 'BOB',
          cartItemId: 'custom-id',
          primary_image_path: 'product-images/a.png',
          seller: 'Taller Wari',
          quantity: -3,
        });

        const item = store.getItem('p1');
        expect(item.itemId).toBe('custom-id');
        expect(item.imageUrl).toBe('product-images/a.png');
        expect(item.currency).toBe('BOB');
        expect(item.seller).toBe('Taller Wari');
        expect(item.quantity).toBe(1);

        store.addItem({ productId: 42, price: NaN, quantity: '3' });
        expect(store.getItem('42').price).toBe(0);
        expect(store.getItem('42').quantity).toBe(1);
      });

      it('does not treat an item whose id equals its product id as an API cart item', () => {
        store.setFromAddResponse({ id: 'p1', product_id: 'p1', price: 4 });
        expect(store.getItem('p1').itemId).toBeNull();
      });

      it('rounds fractional totals and applies shipping at the threshold', () => {
        store.addItem({ id: 'p1', price: 10.125 }, 3);
        expect(store.getSubtotal()).toBe(30.38);
        expect(store.getShipping()).toBe(FLAT_SHIPPING_RATE);
        expect(store.getTotal()).toBe(35.37);

        store.addItem({ id: 'p2', price: FREE_SHIPPING_THRESHOLD - 30.38 }, 1);
        expect(store.getSubtotal()).toBe(FREE_SHIPPING_THRESHOLD);
        expect(store.getShipping()).toBe(0);
        expect(store.getTotals()).toEqual({
          subtotal: FREE_SHIPPING_THRESHOLD,
          shipping: 0,
          total: FREE_SHIPPING_THRESHOLD,
          count: 4,
          distinctCount: 2,
        });
      });

      it('stops notifying after unsubscribe and writes nothing to storage', () => {
        const listener = jasmine.createSpy('listener');
        const unsubscribe = store.subscribe(listener);
        unsubscribe();

        store.addItem({ id: 'p1', price: 1 });
        expect(listener).not.toHaveBeenCalled();
        expect(window.localStorage.length).toBe(0);
        expect(window.sessionStorage.length).toBe(0);
      });
    });
  })();
})();
