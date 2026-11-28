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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('PendingCartActionStore (recovered 1)', () => {
    let store;

    beforeEach(() => {
      window.sessionStorage.clear();
      store = new PendingCartActionStore();
    });

    afterEach(() => {
      window.sessionStorage.clear();
    });

    it('set({ productId: "abc" }) → get() returns { productId: "abc", quantity: 1 }', () => {
      store.set({ productId: 'abc' });
      expect(store.get()).toEqual({ productId: 'abc', quantity: 1 });
    });

    it('set({ productId: "abc", quantity: 3 }) → get() returns { productId: "abc", quantity: 3 }', () => {
      store.set({ productId: 'abc', quantity: 3 });
      expect(store.get()).toEqual({ productId: 'abc', quantity: 3 });
    });

    it('set({ productId: "" }) is a no-op', () => {
      store.set({ productId: '' });
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
  });

  (() => {
    describe('PendingCartActionStore additional branches (recovered 2)', () => {
      let store;

      beforeEach(() => {
        window.sessionStorage.clear();
        window.localStorage.clear();
        store = new PendingCartActionStore();
      });

      afterEach(() => {
        window.sessionStorage.clear();
        window.localStorage.clear();
      });

      it('ignores null, undefined and malformed actions', () => {
        for (const action of [null, undefined, {}, { productId: 42 }, { productId: '' }]) {
          store.set(action);
        }
        expect(store.get()).toBeNull();
        expect(window.sessionStorage.length).toBe(0);
      });

      it('overwrites the previous intent and writes the documented raw key', () => {
        store.set({ productId: 'p1', quantity: 2 });
        store.set({ productId: 'p2', quantity: 3 });

        expect(window.sessionStorage.getItem('qatu.cart.pending')).toBe(
          JSON.stringify({ v: 1, productId: 'p2', quantity: 3 })
        );
        expect(store.get()).toEqual({ productId: 'p2', quantity: 3 });
      });

      it('rejects stored payloads with invalid product ids or quantities', () => {
        const invalid = [
          '"text"',
          'null',
          JSON.stringify({ v: 1, productId: 42, quantity: 1 }),
          JSON.stringify({ v: 1, productId: '', quantity: 1 }),
          JSON.stringify({ v: 1, productId: 'p1', quantity: 0 }),
          JSON.stringify({ v: 1, productId: 'p1', quantity: 1.5 }),
          JSON.stringify({ v: 1, productId: 'p1' }),
        ];

        for (const raw of invalid) {
          window.sessionStorage.setItem('qatu.cart.pending', raw);
          expect(store.get()).toBeNull();
        }
      });

      it('tolerates storage failures in set, get and clear', () => {
        const setSpy = spyOn(window.sessionStorage, 'setItem').and.throwError('blocked');
        expect(() => store.set({ productId: 'p1' })).not.toThrow();
        expect(setSpy).toHaveBeenCalled();

        const getSpy = spyOn(window.sessionStorage, 'getItem').and.throwError('blocked');
        expect(store.get()).toBeNull();
        expect(getSpy).toHaveBeenCalled();

        const removeSpy = spyOn(window.sessionStorage, 'removeItem').and.throwError('blocked');
        expect(() => store.clear()).not.toThrow();
        expect(removeSpy).toHaveBeenCalled();
      });

      it('never writes the pending intent to localStorage', () => {
        store.set({ productId: 'p1', quantity: 1 });
        expect(window.localStorage.length).toBe(0);
      });
    });
  })();
})();
