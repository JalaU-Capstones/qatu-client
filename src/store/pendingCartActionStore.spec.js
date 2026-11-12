import { PendingCartActionStore, pendingCartActionStore } from './pendingCartActionStore.js';

describe('PendingCartActionStore', () => {
  let store;

  beforeEach(() => {
    window.sessionStorage.clear();
    store = new PendingCartActionStore();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('get() returns null when storage is empty', () => {
    expect(store.get()).toBeNull();
  });

  it('set({ productId: "abc" }) → get() returns { productId: "abc", quantity: 1 }', () => {
    store.set({ productId: 'abc' });
    expect(store.get()).toEqual({ productId: 'abc', quantity: 1 });
  });

  it('set({ productId: "abc", quantity: 3 }) → get() returns { productId: "abc", quantity: 3 }', () => {
    store.set({ productId: 'abc', quantity: 3 });
    expect(store.get()).toEqual({ productId: 'abc', quantity: 3 });
  });

  it('set({}) is a no-op', () => {
    store.set({});
    expect(store.get()).toBeNull();
  });

  it('set({ productId: "" }) is a no-op', () => {
    store.set({ productId: '' });
    expect(store.get()).toBeNull();
  });

  it('set({ productId: 123 }) is a no-op', () => {
    store.set({ productId: 123 });
    expect(store.get()).toBeNull();
  });

  it('set({ productId: "abc", quantity: 0 }) defaults quantity to 1', () => {
    store.set({ productId: 'abc', quantity: 0 });
    expect(store.get()).toEqual({ productId: 'abc', quantity: 1 });
  });

  it('set({ productId: "abc", quantity: -1 }) defaults quantity to 1', () => {
    store.set({ productId: 'abc', quantity: -1 });
    expect(store.get()).toEqual({ productId: 'abc', quantity: 1 });
  });

  it('set({ productId: "abc", quantity: 1.5 }) defaults quantity to 1', () => {
    store.set({ productId: 'abc', quantity: 1.5 });
    expect(store.get()).toEqual({ productId: 'abc', quantity: 1 });
  });

  it('clear() removes the pending action', () => {
    store.set({ productId: 'abc', quantity: 2 });
    expect(store.get()).toEqual({ productId: 'abc', quantity: 2 });
    store.clear();
    expect(store.get()).toBeNull();
  });

  it('get() returns null for corrupt JSON in storage', () => {
    window.sessionStorage.setItem('qatu.cart.pending', '{not-json');
    expect(store.get()).toBeNull();
  });

  it('get() returns null for wrong schema version', () => {
    window.sessionStorage.setItem(
      'qatu.cart.pending',
      JSON.stringify({ v: 2, productId: 'abc', quantity: 1 })
    );
    expect(store.get()).toBeNull();
  });

  it('singleton export pendingCartActionStore is an instance of PendingCartActionStore', () => {
    expect(pendingCartActionStore).toBeDefined();
    expect(pendingCartActionStore instanceof PendingCartActionStore).toBe(true);
  });
});
