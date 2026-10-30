import { AuthStore, authStore } from './authStore.js';

describe('AuthStore', () => {
  let store;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    store = new AuthStore();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('initializes anonymous (no user, profile, roles)', () => {
    expect(store.getUser()).toBeNull();
    expect(store.getProfile()).toBeNull();
    expect(store.getRoles()).toEqual([]);
    expect(store.isAuthenticated()).toBe(false);
  });

  describe('setSession', () => {
    it('stores user, profile, roles and derives isAuthenticated from user.id', () => {
      const user = { id: 'u1', email: 'a@b.com' };
      const profile = { id: 'u1', username: 'jdoe' };
      const roles = [{ id: 'r1', name: 'buyer' }];

      store.setSession({ user, profile, roles });

      expect(store.getUser()).toEqual(user);
      expect(store.getProfile()).toEqual(profile);
      expect(store.getRoles()).toEqual(roles);
      expect(store.isAuthenticated()).toBe(true);
    });

    it('defaults profile to user when omitted', () => {
      const user = { id: 'u1', email: 'a@b.com' };
      store.setSession({ user });
      expect(store.getProfile()).toEqual(user);
    });

    it('defaults roles to empty array when omitted', () => {
      store.setSession({ user: { id: 'u1' } });
      expect(store.getRoles()).toEqual([]);
    });

    it('clears the session when user is missing', () => {
      store.setSession({ user: { id: 'u1' } });
      expect(store.isAuthenticated()).toBe(true);

      store.setSession({});
      expect(store.isAuthenticated()).toBe(false);
      expect(store.getUser()).toBeNull();
    });

    it('clears the session when user.id is missing', () => {
      store.setSession({ user: { email: 'a@b.com' } });
      expect(store.isAuthenticated()).toBe(false);
    });

    it('notifies subscribers', () => {
      let notified = null;
      const unsub = store.subscribe((s) => {
        notified = s;
      });

      store.setSession({ user: { id: 'u1' } });

      expect(notified).toBe(store);
      unsub();
    });
  });

  describe('clearSession', () => {
    it('resets all fields and isAuthenticated', () => {
      store.setSession({
        user: { id: 'u1' },
        profile: { id: 'u1', username: 'jdoe' },
        roles: [{ id: 'r1' }],
      });
      expect(store.isAuthenticated()).toBe(true);

      store.clearSession();

      expect(store.getUser()).toBeNull();
      expect(store.getProfile()).toBeNull();
      expect(store.getRoles()).toEqual([]);
      expect(store.isAuthenticated()).toBe(false);
    });

    it('notifies subscribers', () => {
      let callCount = 0;
      const unsub = store.subscribe(() => {
        callCount++;
      });

      store.clearSession();

      expect(callCount).toBe(1);
      unsub();
    });
  });

  describe('persistence (sessionStorage)', () => {
    it('setSession persists to sessionStorage under qatu.auth.session with v:2 and no token', () => {
      store.setSession({
        user: { id: 'u1' },
        profile: { id: 'u1', username: 'jdoe' },
        roles: [{ id: 'r1' }],
      });

      const raw = window.sessionStorage.getItem('qatu.auth.session');
      expect(raw).not.toBeNull();

      const payload = JSON.parse(raw);
      expect(payload.v).toBe(2);
      expect(payload.user.id).toBe('u1');
      expect(payload.profile.username).toBe('jdoe');
      expect(payload.roles.length).toBe(1);
      expect(payload.savedAt).toEqual(jasmine.any(String));
      expect(payload.token).toBeUndefined();
      expect(payload.accessToken).toBeUndefined();
    });

    it('does NOT write to localStorage', () => {
      store.setSession({ user: { id: 'u1' } });
      expect(window.localStorage.getItem('qatu.auth.session')).toBeNull();
    });

    it('clearSession removes the sessionStorage entry', () => {
      store.setSession({ user: { id: 'u1' } });
      expect(window.sessionStorage.getItem('qatu.auth.session')).not.toBeNull();

      store.clearSession();
      expect(window.sessionStorage.getItem('qatu.auth.session')).toBeNull();
    });
  });

  describe('loadFromStorage', () => {
    it('returns false when nothing is stored', () => {
      expect(store.loadFromStorage()).toBe(false);
      expect(store.isAuthenticated()).toBe(false);
    });

    it('hydrates from a valid v2 sessionStorage payload', () => {
      window.sessionStorage.setItem(
        'qatu.auth.session',
        JSON.stringify({
          v: 2,
          user: { id: 'u1', email: 'a@b.com' },
          profile: { id: 'u1', username: 'jdoe' },
          roles: [{ id: 'r1', name: 'buyer' }],
          savedAt: '2026-10-30T00:00:00.000Z',
        })
      );

      expect(store.loadFromStorage()).toBe(true);
      expect(store.getUser().id).toBe('u1');
      expect(store.getProfile().username).toBe('jdoe');
      expect(store.getRoles()[0].name).toBe('buyer');
      expect(store.isAuthenticated()).toBe(true);
    });

    it('notifies subscribers on successful hydrate', () => {
      let notified = false;
      const unsub = store.subscribe(() => {
        notified = true;
      });

      window.sessionStorage.setItem(
        'qatu.auth.session',
        JSON.stringify({ v: 2, user: { id: 'u1' } })
      );

      store.loadFromStorage();
      expect(notified).toBe(true);
      unsub();
    });

    it('discards corrupt JSON and clears the entry', () => {
      window.sessionStorage.setItem('qatu.auth.session', '{not-json');
      expect(store.loadFromStorage()).toBe(false);
      expect(window.sessionStorage.getItem('qatu.auth.session')).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
    });

    it('discards v1 payloads (legacy localStorage era)', () => {
      window.sessionStorage.setItem(
        'qatu.auth.session',
        JSON.stringify({ v: 1, token: 'old-jwt', user: { id: 'u1' } })
      );
      expect(store.loadFromStorage()).toBe(false);
      expect(store.isAuthenticated()).toBe(false);
    });

    it('discards payloads missing user.id', () => {
      window.sessionStorage.setItem(
        'qatu.auth.session',
        JSON.stringify({ v: 2, user: { email: 'a@b.com' } })
      );
      expect(store.loadFromStorage()).toBe(false);
    });

    it('deletes legacy localStorage entry on load (security cleanup)', () => {
      window.localStorage.setItem(
        'qatu.auth.session',
        JSON.stringify({ v: 1, token: 'leaked-jwt', user: { id: 'u1' } })
      );

      store.loadFromStorage();

      expect(window.localStorage.getItem('qatu.auth.session')).toBeNull();
    });

    it('does NOT migrate user data from legacy localStorage (revalidated via /me on boot)', () => {
      window.localStorage.setItem(
        'qatu.auth.session',
        JSON.stringify({ v: 1, token: 'old-jwt', user: { id: 'u1' } })
      );

      store.loadFromStorage();

      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('unsubscribe removes the listener', () => {
      let callCount = 0;
      const unsub = store.subscribe(() => {
        callCount++;
      });

      store.clearSession(); // 1
      unsub();
      store.clearSession(); // not counted

      expect(callCount).toBe(1);
    });
  });

  describe('getToken (REMOVED)', () => {
    it('does not expose a getToken method (tokens live in HttpOnly cookies)', () => {
      expect(store.getToken).toBeUndefined();
    });
  });

  describe('singleton', () => {
    it('exports a singleton authStore instance', () => {
      expect(authStore instanceof AuthStore).toBe(true);
    });
  });
});
