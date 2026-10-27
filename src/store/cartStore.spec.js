import { CartStore, cartStore } from './cartStore.js';

describe('CartStore', () => {
  let store;

  beforeEach(() => {
    window.localStorage.clear();
    store = new CartStore();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('getCount() returns 0 when empty', () => {
    expect(store.getCount()).toBe(0);
  });

  it('getDistinctCount() returns 0 when empty', () => {
    expect(store.getDistinctCount()).toBe(0);
  });

  it('setUser(null) clears items and storage', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    expect(store.getCount()).toBe(2);
    expect(window.localStorage.getItem('qatu.cart')).not.toBeNull();

    store.setUser(null);
    expect(store.getCount()).toBe(0);
    expect(store.getUserId()).toBeNull();
    expect(window.localStorage.getItem('qatu.cart')).toBeNull();
  });

  it('setUser("u1") loads from empty storage (no-op)', () => {
    store.setUser('u1');
    expect(store.getUserId()).toBe('u1');
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('setFromAddResponse adds a new item; getCount returns its quantity', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 3 });
    expect(store.getCount()).toBe(3);
    expect(store.getDistinctCount()).toBe(1);
    expect(store.getItems()).toEqual([{ productId: 'p1', quantity: 3 }]);
  });

  it('setFromAddResponse with same productId upserts quantity', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    store.setFromAddResponse({ product_id: 'p1', quantity: 5 });
    expect(store.getCount()).toBe(5);
    expect(store.getDistinctCount()).toBe(1);
    expect(store.getItems()).toEqual([{ productId: 'p1', quantity: 5 }]);
  });

  it('setFromAddResponse with different productIds accumulates; getCount sums, getDistinctCount counts', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 3 });
    store.setFromAddResponse({ product_id: 'p2', quantity: 4 });
    expect(store.getCount()).toBe(7);
    expect(store.getDistinctCount()).toBe(2);
  });

  it('setFromGet replaces the entire map', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    store.setFromGet([
      { product_id: 'p2', quantity: 3 },
      { product_id: 'p3', quantity: 1 },
    ]);
    expect(store.getCount()).toBe(4);
    expect(store.getDistinctCount()).toBe(2);
    expect(store.getItems()).toEqual([
      { productId: 'p2', quantity: 3 },
      { productId: 'p3', quantity: 1 },
    ]);
  });

  it('setFromGet with empty array clears', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    store.setFromGet([]);
    expect(store.getCount()).toBe(0);
    expect(store.getDistinctCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('clear() removes all items and storage', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    expect(window.localStorage.getItem('qatu.cart')).not.toBeNull();
    store.clear();
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
    expect(window.localStorage.getItem('qatu.cart')).toBeNull();
  });

  it('setUser("u1") restores from localStorage when userId matches', () => {
    const payload = {
      v: 1,
      userId: 'u1',
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 5 },
      ],
    };
    window.localStorage.setItem('qatu.cart', JSON.stringify(payload));
    store.setUser('u1');
    expect(store.getCount()).toBe(7);
    expect(store.getDistinctCount()).toBe(2);
    expect(store.getItems()).toEqual(payload.items);
  });

  it('setUser("u2") discards localStorage when userId does not match', () => {
    const payload = {
      v: 1,
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 2 }],
    };
    window.localStorage.setItem('qatu.cart', JSON.stringify(payload));
    store.setUser('u2');
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('setUser("u1") discards corrupt JSON payloads (invalid JSON)', () => {
    window.localStorage.setItem('qatu.cart', 'not-valid-json{{{');
    store.setUser('u1');
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('setUser("u1") discards payloads with wrong schema version', () => {
    const payload = {
      v: 999,
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 2 }],
    };
    window.localStorage.setItem('qatu.cart', JSON.stringify(payload));
    store.setUser('u1');
    expect(store.getCount()).toBe(0);
    expect(store.getItems()).toEqual([]);
  });

  it('subscribers are notified on setFromAddResponse', () => {
    const listener = jasmine.createSpy('listener');
    store.subscribe(listener);
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    expect(listener).toHaveBeenCalledWith(store);
  });

  it('subscribers are notified on clear', () => {
    const listener = jasmine.createSpy('listener');
    store.subscribe(listener);
    store.clear();
    expect(listener).toHaveBeenCalledWith(store);
  });

  it('unsubscribe removes the listener', () => {
    const listener = jasmine.createSpy('listener');
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('_persist writes the exact payload shape { v: 1, userId, items } to localStorage', () => {
    store.setUser('u1');
    store.setFromAddResponse({ product_id: 'p1', quantity: 2 });
    const raw = window.localStorage.getItem('qatu.cart');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({
      v: 1,
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 2 }],
    });
  });

  it('setFromAddResponse is a no-op when item is null or missing product_id', () => {
    const listener = jasmine.createSpy('listener');
    store.subscribe(listener);
    store.setFromAddResponse(null);
    store.setFromAddResponse({});
    store.setFromAddResponse({ quantity: 3 });
    expect(store.getCount()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('singleton export cartStore is an instance of CartStore', () => {
    expect(cartStore).toBeDefined();
    expect(cartStore instanceof CartStore).toBe(true);
  });
});
