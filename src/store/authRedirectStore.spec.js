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
