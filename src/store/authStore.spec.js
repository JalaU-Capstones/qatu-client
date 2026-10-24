import { AuthStore, authStore } from './authStore.js';

describe('AuthStore', () => {
  let store;

  beforeEach(() => {
    store = new AuthStore();
  });

  it('should initialize with null token, user, and profile', () => {
    expect(store.getToken()).toBeNull();
    expect(store.getUser()).toBeNull();
    expect(store.getProfile()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should set session and notify subscribers', () => {
    let notified = null;
    const unsubscribe = store.subscribe((s) => {
      notified = s;
    });

    const user = { id: 'u1', username: 'maria' };
    const profile = { id: 'u1', username: 'maria', full_name: 'María Flores' };
    store.setSession({ token: 'jwt-xyz', user, profile });

    expect(store.getToken()).toBe('jwt-xyz');
    expect(store.getUser()).toEqual(user);
    expect(store.getProfile()).toEqual(profile);
    expect(store.isAuthenticated()).toBe(true);
    expect(notified).toBe(store);

    unsubscribe();
  });

  it('should clear session correctly', () => {
    store.setSession({ token: 'token-123', user: { id: 'u1' } });
    expect(store.isAuthenticated()).toBe(true);

    store.clearSession();
    expect(store.getToken()).toBeNull();
    expect(store.getUser()).toBeNull();
    expect(store.getProfile()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should clear session if setSession is passed null or undefined', () => {
    store.setSession({ token: 'token-123', user: { id: 'u1' } });
    store.setSession(null);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should export a singleton authStore instance', () => {
    expect(authStore).toBeDefined();
    expect(authStore instanceof AuthStore).toBe(true);
  });
});
