import { AuthRedirectStore, authRedirectStore } from './authRedirectStore.js';

describe('AuthRedirectStore', () => {
  let store;

  beforeEach(() => {
    window.sessionStorage.clear();
    store = new AuthRedirectStore();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('getReturnTo() returns null when nothing is stored', () => {
    expect(store.getReturnTo()).toBeNull();
  });

  it('setReturnTo("/products") persists and getReturnTo() returns it', () => {
    store.setReturnTo('/products');
    expect(store.getReturnTo()).toBe('/products');
  });

  it('setReturnTo("/login") is a no-op (auth routes are not stored)', () => {
    store.setReturnTo('/login');
    expect(store.getReturnTo()).toBeNull();
    expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBeNull();
  });

  it('setReturnTo("/register") is a no-op (auth routes are not stored)', () => {
    store.setReturnTo('/register');
    expect(store.getReturnTo()).toBeNull();
    expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBeNull();
  });

  it('setReturnTo("") / setReturnTo(null) / setReturnTo(undefined) are no-ops', () => {
    store.setReturnTo('');
    expect(store.getReturnTo()).toBeNull();
    store.setReturnTo(null);
    expect(store.getReturnTo()).toBeNull();
    store.setReturnTo(undefined);
    expect(store.getReturnTo()).toBeNull();
  });

  it('clearReturnTo() removes the stored path', () => {
    store.setReturnTo('/products');
    expect(store.getReturnTo()).toBe('/products');
    store.clearReturnTo();
    expect(store.getReturnTo()).toBeNull();
    expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBeNull();
  });

  it('setReturnTo("/") stores "/" — homepage is a valid return target', () => {
    store.setReturnTo('/');
    expect(store.getReturnTo()).toBe('/');
    expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBe('/');
  });

  it('getReturnTo() ignores a value of "/login" set by external code', () => {
    window.sessionStorage.setItem('qatu.auth.returnTo', '/login');
    expect(store.getReturnTo()).toBeNull();
  });

  it('exports a singleton authRedirectStore instance', () => {
    expect(authRedirectStore).toBeDefined();
    expect(authRedirectStore instanceof AuthRedirectStore).toBe(true);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('AuthRedirectStore (recovered 1)', () => {
    let store;

    beforeEach(() => {
      window.sessionStorage.clear();
      store = new AuthRedirectStore();
    });

    afterEach(() => {
      window.sessionStorage.clear();
    });

    it('setReturnTo("/products") persists and getReturnTo() returns it', () => {
      store.setReturnTo('/products');
      expect(store.getReturnTo()).toBe('/products');
    });

    it('setReturnTo("/login") is a no-op (auth routes are not stored)', () => {
      store.setReturnTo('/login');
      expect(store.getReturnTo()).toBeNull();
      expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBeNull();
    });

    it('setReturnTo("/register") is a no-op (auth routes are not stored)', () => {
      store.setReturnTo('/register');
      expect(store.getReturnTo()).toBeNull();
      expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBeNull();
    });

    it('setReturnTo("") / setReturnTo(null) / setReturnTo(undefined) are no-ops', () => {
      store.setReturnTo('');
      expect(store.getReturnTo()).toBeNull();
      store.setReturnTo(null);
      expect(store.getReturnTo()).toBeNull();
      store.setReturnTo(undefined);
      expect(store.getReturnTo()).toBeNull();
    });

    it('setReturnTo("/") stores "/" — homepage is a valid return target', () => {
      store.setReturnTo('/');
      expect(store.getReturnTo()).toBe('/');
      expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBe('/');
    });

    it('getReturnTo() ignores a value of "/login" set by external code', () => {
      window.sessionStorage.setItem('qatu.auth.returnTo', '/login');
      expect(store.getReturnTo()).toBeNull();
    });
  });

  (() => {
    describe('AuthRedirectStore additional branches (recovered 2)', () => {
      let store;

      beforeEach(() => {
        window.sessionStorage.clear();
        window.localStorage.clear();
        store = new AuthRedirectStore();
      });

      afterEach(() => {
        window.sessionStorage.clear();
        window.localStorage.clear();
      });

      it('ignores non-string paths and auth values written externally', () => {
        for (const path of [123, {}, [], true]) {
          store.setReturnTo(path);
        }
        expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBeNull();

        window.sessionStorage.setItem('qatu.auth.returnTo', '/register');
        expect(store.getReturnTo()).toBeNull();

        store.setReturnTo('/products');
        expect(window.sessionStorage.getItem('qatu.auth.returnTo')).toBe('/products');
      });

      it('overwrites a previous path and tolerates clearing an empty store', () => {
        store.setReturnTo('/products');
        store.setReturnTo('/cart?q=1');
        expect(store.getReturnTo()).toBe('/cart?q=1');

        store.clearReturnTo();
        expect(store.getReturnTo()).toBeNull();
        expect(() => store.clearReturnTo()).not.toThrow();
      });

      it('does not read, write or clear localStorage', () => {
        store.setReturnTo('/orders');
        store.getReturnTo();
        store.clearReturnTo();

        expect(window.localStorage.length).toBe(0);
      });

      it('silently handles storage failures in all three operations', () => {
        const setItemSpy = spyOn(window.sessionStorage, 'setItem').and.throwError('blocked');
        expect(() => store.setReturnTo('/products')).not.toThrow();
        expect(setItemSpy).toHaveBeenCalled();

        const getItemSpy = spyOn(window.sessionStorage, 'getItem').and.throwError('blocked');
        expect(store.getReturnTo()).toBeNull();
        expect(getItemSpy).toHaveBeenCalled();

        const removeItemSpy = spyOn(window.sessionStorage, 'removeItem').and.throwError('blocked');
        expect(() => store.clearReturnTo()).not.toThrow();
        expect(removeItemSpy).toHaveBeenCalled();
      });
    });
  })();
})();
