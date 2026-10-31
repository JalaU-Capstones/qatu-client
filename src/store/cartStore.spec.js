import { CartStore, cartStore, FLAT_SHIPPING_RATE } from './cartStore.js';

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
    window.localStorage.clear();
    store = new CartStore();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(store.getCount()).toBe(0);
    expect(store.getDistinctCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
    expect(store.getSubtotal()).toBe(0);
    expect(store.getShipping()).toBe(0);
    expect(store.getTotal()).toBe(0);
  });

  it('addItem stores a product snapshot and persists schema v2', () => {
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

    const parsed = JSON.parse(window.localStorage.getItem('qatu.cart'));
    expect(parsed.v).toBe(2);
    expect(parsed.items).toEqual([item]);
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

  it('clear removes all items and the persisted payload', () => {
    store.addItem(product(), 2);
    expect(window.localStorage.getItem('qatu.cart')).not.toBeNull();

    store.clear();
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
    expect(window.localStorage.getItem('qatu.cart')).toBeNull();
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

  it('hydrates from a schema v2 payload in localStorage', () => {
    const payload = {
      v: 2,
      userId: null,
      items: [
        {
          productId: 'p1',
          itemId: null,
          slug: null,
          name: 'Aguayo',
          price: 40,
          currency: 'USD',
          seller: 'Tejidos Illimani',
          imageUrl: null,
          quantity: 2,
        },
      ],
    };
    window.localStorage.setItem('qatu.cart', JSON.stringify(payload));

    const hydrated = new CartStore();
    expect(hydrated.getCount()).toBe(2);
    expect(hydrated.getItems()).toEqual(payload.items);
  });

  it('migrates the legacy schema v1 payload to v2 snapshots', () => {
    window.localStorage.setItem(
      'qatu.cart',
      JSON.stringify({
        v: 1,
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 2 }],
      })
    );

    const migrated = new CartStore();
    expect(migrated.getCount()).toBe(2);
    expect(migrated.getItems()[0].name).toBe('Producto');
    expect(migrated.getItems()[0].price).toBe(0);

    const parsed = JSON.parse(window.localStorage.getItem('qatu.cart'));
    expect(parsed.v).toBe(2);
  });

  it('ignores corrupt JSON payloads', () => {
    window.localStorage.setItem('qatu.cart', 'not-valid-json{{{');
    const hydrated = new CartStore();
    expect(hydrated.getCount()).toBe(0);
  });

  it('ignores payloads with an unknown schema version', () => {
    window.localStorage.setItem(
      'qatu.cart',
      JSON.stringify({
        v: 999,
        items: [{ productId: 'p1', quantity: 2 }],
      })
    );
    const hydrated = new CartStore();
    expect(hydrated.getCount()).toBe(0);
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
});
