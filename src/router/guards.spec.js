import { AuthStore } from '../store/authStore.js';
import { getSellerRouteAccess } from './guards.js';

describe('getSellerRouteAccess', () => {
  let store;

  beforeEach(() => {
    window.sessionStorage.clear();
    store = new AuthStore();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  const signIn = (...roleNames) =>
    store.setSession({ user: { id: 'u1' }, roles: roleNames.map((name) => ({ name })) });

  it('sends anonymous visitors to the login', () => {
    expect(getSellerRouteAccess(store)).toBe('login');
  });

  it('sends a signed-in buyer home', () => {
    signIn('buyer');
    expect(getSellerRouteAccess(store)).toBe('home');
  });

  it('sends a signed-in user without any role home', () => {
    signIn();
    expect(getSellerRouteAccess(store)).toBe('home');
  });

  it('allows a seller', () => {
    signIn('buyer', 'seller');
    expect(getSellerRouteAccess(store)).toBe('allow');
  });

  it('allows an admin', () => {
    signIn('admin');
    expect(getSellerRouteAccess(store)).toBe('allow');
  });

  it('does not trust a role claim in user metadata', () => {
    store.setSession({
      user: { id: 'u1', user_metadata: { role: 'seller' } },
      roles: [{ name: 'buyer' }],
    });
    expect(getSellerRouteAccess(store)).toBe('home');
  });

  it('denies access again after the session is cleared', () => {
    signIn('seller');
    expect(getSellerRouteAccess(store)).toBe('allow');
    store.clearSession();
    expect(getSellerRouteAccess(store)).toBe('login');
  });
});
