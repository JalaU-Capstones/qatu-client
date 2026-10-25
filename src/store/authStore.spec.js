import { AuthStore, authStore } from './authStore.js';

describe('AuthStore', () => {
  let store;

  beforeEach(() => {
    store = new AuthStore();
    window.localStorage.clear();
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

  // --- New persistence tests ---

  it('loadFromStorage() returns false when storage is empty', () => {
    const result = store.loadFromStorage();
    expect(result).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('loadFromStorage() hydrates a valid payload and returns true', () => {
    const payload = {
      v: 1,
      token: 'tok-abc',
      user: { id: 'u2', username: 'elena' },
      profile: { id: 'u2', full_name: 'Elena V.' },
      roles: [{ id: 'r1', name: 'buyer' }],
      savedAt: '2026-10-24T00:00:00.000Z',
    };
    window.localStorage.setItem('qatu.auth.session', JSON.stringify(payload));

    const result = store.loadFromStorage();
    expect(result).toBe(true);
    expect(store.getToken()).toBe('tok-abc');
    expect(store.getUser()).toEqual(payload.user);
    expect(store.getProfile()).toEqual(payload.profile);
    expect(store.getRoles()).toEqual(payload.roles);
    expect(store.getSavedAt()).toBe('2026-10-24T00:00:00.000Z');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('loadFromStorage() discards a corrupt JSON payload and clears the key', () => {
    window.localStorage.setItem('qatu.auth.session', '{not json');
    const result = store.loadFromStorage();
    expect(result).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem('qatu.auth.session')).toBeNull();
  });

  it('loadFromStorage() discards a payload missing the token field', () => {
    const payload = { user: { id: 'u2' }, profile: {}, roles: [] };
    window.localStorage.setItem('qatu.auth.session', JSON.stringify(payload));
    const result = store.loadFromStorage();
    expect(result).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('setSession() persists to localStorage with correct shape', () => {
    const user = { id: 'u3', username: 'pablo' };
    const profile = { id: 'u3', full_name: 'Pablo R.' };
    const roles = [{ id: 'r2', name: 'seller' }];
    store.setSession({ token: 'tok-xyz', user, profile, roles });

    const raw = window.localStorage.getItem('qatu.auth.session');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.v).toBe(1);
    expect(parsed.token).toBe('tok-xyz');
    expect(parsed.user).toEqual(user);
    expect(parsed.profile).toEqual(profile);
    expect(parsed.roles).toEqual(roles);
    expect(typeof parsed.savedAt).toBe('string');
    // Verify it's a valid ISO date string
    expect(isNaN(Date.parse(parsed.savedAt))).toBe(false);
  });

  it('clearSession() removes the persisted key from localStorage', () => {
    store.setSession({ token: 'tok-del', user: { id: 'u4' } });
    expect(window.localStorage.getItem('qatu.auth.session')).not.toBeNull();

    store.clearSession();
    expect(window.localStorage.getItem('qatu.auth.session')).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('getRoles() returns empty array when not authenticated', () => {
    expect(store.getRoles()).toEqual([]);
  });

  it('getRoles() returns the roles from the session when authenticated', () => {
    const roles = [{ id: 'r1', name: 'buyer' }];
    store.setSession({ token: 'tok-roles', user: { id: 'u5' }, roles });
    expect(store.getRoles()).toEqual(roles);
  });

  it('loadFromStorage() notifies subscribers when hydration succeeds', () => {
    const payload = {
      v: 1,
      token: 'tok-notify',
      user: { id: 'u6', username: 'carla' },
      roles: [],
      savedAt: '2026-10-24T00:00:00.000Z',
    };
    window.localStorage.setItem('qatu.auth.session', JSON.stringify(payload));

    let notifiedStore = null;
    store.subscribe((s) => {
      notifiedStore = s;
    });

    store.loadFromStorage();
    expect(notifiedStore).toBe(store);
  });
});
