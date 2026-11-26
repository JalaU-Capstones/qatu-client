import { AuthStore } from '../store/authStore.js';
import { getAdminRouteAccess, getSellerRouteAccess } from './guards.js';

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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('getAdminRouteAccess (recovered 1)', () => {
      it('sends anonymous users to login', () => {
        expect(
          getAdminRouteAccess({
            isAuthenticated: () => false,
            isAdmin: () => true,
          })
        ).toBe('login');
      });

      it('forbids authenticated users without the admin role', () => {
        for (const isAdmin of [false, undefined]) {
          expect(
            getAdminRouteAccess({
              isAuthenticated: () => true,
              isAdmin: () => isAdmin,
            })
          ).toBe('forbidden');
        }
      });

      it('allows authenticated admins and revokes access after logout', () => {
        let authenticated = true;
        expect(
          getAdminRouteAccess({
            isAuthenticated: () => authenticated,
            isAdmin: () => true,
          })
        ).toBe('allow');

        authenticated = false;
        expect(
          getAdminRouteAccess({
            isAuthenticated: () => authenticated,
            isAdmin: () => true,
          })
        ).toBe('login');
      });
    });
  })();
})();
