import { supabase } from '../../models/api/client.js';
import { authStore } from '../../store/authStore.js';
import { AuthCallbackView } from './AuthCallbackView.js';

const FAKE_BACKEND_SESSION = {
  data: {
    user: { id: 'u1', email: 'user@example.com' },
    profile: { id: 'u1', username: 'zzz' },
    roles: [{ id: 'r1', name: 'buyer' }],
  },
};

const FAKE_SUPABASE_SESSION = {
  access_token: 'supabase-access-token',
  refresh_token: 'supabase-refresh-token',
  provider_token: 'google-oauth-token',
};

const tokenKeysIn = (storage) =>
  Object.keys(storage).filter((key) => key.toLowerCase().includes('token'));

const supabaseKeysIn = (storage) =>
  Object.keys(storage).filter((key) => key.startsWith('sb-') || key.includes('supabase'));

describe('AuthCallbackView', () => {
  let fakeAuthApi;
  let navigate;
  let initialHref;
  let clockInstalled;

  beforeEach(() => {
    initialHref = window.location.href;
    history.replaceState(null, '', '/auth/callback');
    clockInstalled = false;

    window.localStorage.clear();
    window.sessionStorage.clear();

    fakeAuthApi = {
      exchangeOAuthToken: jasmine
        .createSpy('exchangeOAuthToken')
        .and.resolveTo(FAKE_BACKEND_SESSION),
    };

    navigate = jasmine.createSpy('navigate');

    window.localStorage.setItem(
      'sb-project-ref-auth-token',
      JSON.stringify({
        access_token: FAKE_SUPABASE_SESSION.access_token,
        refresh_token: FAKE_SUPABASE_SESSION.refresh_token,
      })
    );
    window.sessionStorage.setItem('sb-project-ref-auth-token', 'partial-state');
    window.localStorage.setItem('supabase.auth.token', 'legacy-key');

    supabase.auth.signOutCalls = [];
  });

  afterEach(() => {
    if (clockInstalled) {
      jasmine.clock().uninstall();
    }
    history.replaceState(null, '', initialHref);
  });

  async function flushMicrotasks() {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  }

  it('renders a loading state without leaving the user on a blank screen', () => {
    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    const element = view.render();

    expect(element.textContent).toContain('Completando inicio de sesión');

    view.destroy();
  });

  it('subscribes and unsubscribes to auth state changes across render/destroy', () => {
    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    view.render();
    expect(supabase.auth.listeners.size).toBeGreaterThan(0);

    view.destroy();
    expect(supabase.auth.listeners.size).toBe(0);
  });

  it('exchanges the Supabase session for the backend session on SIGNED_IN', async () => {
    const setSessionSpy = spyOn(authStore, 'setSession').and.callThrough();

    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    await flushMicrotasks();

    expect(fakeAuthApi.exchangeOAuthToken).toHaveBeenCalledWith(
      FAKE_SUPABASE_SESSION.access_token,
      FAKE_SUPABASE_SESSION.refresh_token
    );
    expect(setSessionSpy).toHaveBeenCalledWith({
      user: FAKE_BACKEND_SESSION.data.user,
      profile: FAKE_BACKEND_SESSION.data.profile,
      roles: FAKE_BACKEND_SESSION.data.roles,
    });

    view.destroy();
  });

  it('does NOT revoke the Supabase session after the handoff (ADR-012: the network signOut kills the backend-issued session)', async () => {
    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    await flushMicrotasks();

    expect(supabase.auth.signOutCalls).toEqual([]);
    expect(navigate).toHaveBeenCalledWith('/');

    view.destroy();
  });

  it('sends NO exchange request when SIGNED_IN arrives without tokens, and times out per review §2', async () => {
    const view = new AuthCallbackView({
      authApi: fakeAuthApi,
      navigate,
      redirectDelayMs: 5,
    });
    jasmine.clock().install();
    clockInstalled = true;
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', {});
    await flushMicrotasks();

    expect(fakeAuthApi.exchangeOAuthToken).not.toHaveBeenCalled();

    expect(tokenKeysIn(window.localStorage)).toEqual([]);
    expect(tokenKeysIn(window.sessionStorage)).toEqual([]);

    jasmine.clock().tick(10);
    expect(navigate).toHaveBeenCalledWith('/login?error=oauth_timeout');

    view.destroy();
  });

  it('redirects home after a successful handoff', async () => {
    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    await flushMicrotasks();

    expect(navigate).toHaveBeenCalledWith('/');

    view.destroy();
  });

  it('leaves ZERO tokens/supabase keys in localStorage or sessionStorage after the handoff (DoD audit)', async () => {
    expect(tokenKeysIn(window.localStorage).length).toBeGreaterThan(0);

    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    await flushMicrotasks();

    expect(tokenKeysIn(window.localStorage)).toEqual([]);
    expect(tokenKeysIn(window.sessionStorage)).toEqual([]);
    expect(supabaseKeysIn(window.localStorage)).toEqual([]);
    expect(supabaseKeysIn(window.sessionStorage)).toEqual([]);

    view.destroy();
  });

  it('redirects to /login?error=oauth_failed with an inline message when the exchange fails', async () => {
    fakeAuthApi.exchangeOAuthToken.and.rejectWith(new Error('boom'));

    const view = new AuthCallbackView({
      authApi: fakeAuthApi,
      navigate,
      redirectDelayMs: 5,
    });
    jasmine.clock().install();
    clockInstalled = true;
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    await flushMicrotasks();

    expect(view.element.textContent).toContain(
      'No se pudo completar el inicio de sesión con Google.'
    );

    expect(tokenKeysIn(window.localStorage)).toEqual([]);
    expect(tokenKeysIn(window.sessionStorage)).toEqual([]);

    jasmine.clock().tick(10);
    expect(navigate).toHaveBeenCalledWith('/login?error=oauth_failed');

    view.destroy();
  });

  it('treats error=access_denied (cancelled consent) as a cancellation, not a crash', () => {
    history.replaceState(
      null,
      '',
      '/auth/callback?error=access_denied&error_description=the+user+closed+the+consent+screen'
    );

    const view = new AuthCallbackView({
      authApi: fakeAuthApi,
      navigate,
      redirectDelayMs: 5,
    });
    jasmine.clock().install();
    clockInstalled = true;
    view.render();

    expect(view.element.textContent).toContain('Autorización cancelada.');
    expect(fakeAuthApi.exchangeOAuthToken).not.toHaveBeenCalled();

    expect(supabaseKeysIn(window.localStorage)).toEqual([]);
    expect(supabaseKeysIn(window.sessionStorage)).toEqual([]);

    jasmine.clock().tick(10);
    expect(navigate).toHaveBeenCalledWith('/login?error=oauth_cancelled');

    view.destroy();
  });

  it('falls back to /login?error=oauth_timeout when no session ever arrives (PKCE state mismatch, stale code, network)', () => {
    const view = new AuthCallbackView({
      authApi: fakeAuthApi,
      navigate,
      handoffTimeoutMs: 10,
      redirectDelayMs: 5,
    });
    jasmine.clock().install();
    clockInstalled = true;
    view.render();

    jasmine.clock().tick(50);

    expect(view.element.textContent).toContain('El inicio de sesión tardó demasiado.');
    expect(supabaseKeysIn(window.localStorage)).toEqual([]);
    expect(navigate).toHaveBeenCalledWith('/login?error=oauth_timeout');

    view.destroy();
  });

  it('ignores a late SIGNED_IN once the timeout guard already fired', () => {
    const view = new AuthCallbackView({
      authApi: fakeAuthApi,
      navigate,
      handoffTimeoutMs: 10,
      redirectDelayMs: 5,
    });
    jasmine.clock().install();
    clockInstalled = true;
    view.render();

    jasmine.clock().tick(50);
    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    jasmine.clock().tick(50);

    expect(fakeAuthApi.exchangeOAuthToken).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login?error=oauth_timeout');

    view.destroy();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('AuthCallbackView additional branches (recovered 1)', () => {
      let container;
      let view;
      let navigate;
      let authApi;
      let initialHref;
      let clockInstalled;

      const backendSession = {
        data: {
          user: { id: 'u1', email: 'user@example.com' },
          profile: { id: 'u1', username: 'zzz' },
          roles: [{ id: 'r1', name: 'buyer' }],
        },
      };
      const supabaseSession = {
        access_token: 'supabase-access',
        refresh_token: 'supabase-refresh',
      };

      // Case-insensitive on purpose: production cleanup only matches lower-case keys,
      // so uppercase keys survive and must still be counted by this helper.
      const supabaseKeys = (storage) =>
        Object.keys(storage).filter((key) => /^sb-/i.test(key) || /supabase/i.test(key));

      async function flushMicrotasks() {
        for (let i = 0; i < 6; i += 1) {
          await Promise.resolve();
        }
      }

      function installClock() {
        jasmine.clock().install();
        clockInstalled = true;
      }

      function createView(options = {}) {
        view = new AuthCallbackView({
          authApi,
          navigate,
          redirectDelayMs: 5,
          ...options,
        });
        container.appendChild(view.element);
        return view;
      }

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        initialHref = window.location.href;
        clockInstalled = false;
        history.replaceState(null, '', '/auth/callback');

        window.localStorage.clear();
        window.sessionStorage.clear();
        window.localStorage.setItem('sb-project-auth-token', 'local-token');
        window.sessionStorage.setItem('supabase.auth.token', 'session-token');

        authApi = {
          exchangeOAuthToken: jasmine.createSpy('exchangeOAuthToken').and.resolveTo(backendSession),
        };
        navigate = jasmine.createSpy('navigate');
        supabase.auth.signOutCalls = [];
      });

      afterEach(() => {
        if (clockInstalled) {
          jasmine.clock().uninstall();
          clockInstalled = false;
        }
        view?.destroy();
        view = null;
        container.remove();
        authStore.clearSession();
        window.localStorage.clear();
        window.sessionStorage.clear();
        supabase.auth.listeners.clear();
        history.replaceState(null, '', initialHref);
      });

      it('renders the exact loading heading and waiting copy before any handoff', () => {
        createView();
        view.render();

        expect(view.element.className).toBe('q-auth-callback q-glass-panel');
        expect(view.element.style.padding).toBe('10px');
        expect(view.element.style.textAlign).toBe('center');
        expect(view.element.querySelector('h3').textContent).toBe('Completando inicio de sesión…');
        expect(view.element.querySelector('p').textContent).toBe('Por favor, espera.');
        expect(view.element.querySelectorAll('a').length).toBe(0);
        expect(navigate).not.toHaveBeenCalled();
      });

      it('leaks the first listener and timeout when render() is called twice', () => {
        installClock();
        createView({ handoffTimeoutMs: 10 });
        view.render();
        view.render();

        expect(supabase.auth.listeners.size).toBe(2);
        expect(view._subscription).not.toBeNull();
        expect(view._timeoutId).not.toBeNull();

        view.destroy();
        expect(supabase.auth.listeners.size).toBe(1);
        expect(view._timeoutId).toBeNull();

        jasmine.clock().tick(10);
        expect(view.element.textContent).toContain('El inicio de sesión tardó demasiado.');
        jasmine.clock().tick(5);
        expect(navigate).toHaveBeenCalledOnceWith('/login?error=oauth_timeout');
      });

      it('shows the generic OAuth error copy, clears the session and redirects with oauth_cancelled', () => {
        history.replaceState(null, '', '/auth/callback?error=server_error');
        const clearSession = spyOn(authStore, 'clearSession').and.callThrough();
        installClock();
        createView();
        view.render();

        expect(view.element.querySelector('h3').textContent).toBe(
          'No se pudo completar el inicio de sesión con Google.'
        );
        expect(view.element.querySelector('p').textContent).toBe(
          'Redirigiendo al inicio de sesión…'
        );
        const link = view.element.querySelector('a[href="/login"]');
        expect(link.textContent).toBe('Volver al inicio de sesión');
        expect(clearSession).toHaveBeenCalledTimes(1);
        expect(authApi.exchangeOAuthToken).not.toHaveBeenCalled();
        expect(supabase.auth.listeners.size).toBe(0);
        expect(view._subscription).toBeNull();
        expect(view._timeoutId).toBeNull();
        expect(view._settled).toBe(false);
        expect(supabaseKeys(window.localStorage)).toEqual([]);
        expect(supabaseKeys(window.sessionStorage)).toEqual([]);

        jasmine.clock().tick(5);
        expect(navigate).toHaveBeenCalledOnceWith('/login?error=oauth_cancelled');
      });

      it('keeps _subscription null when the auth client returns no subscription', () => {
        const onAuthStateChange = spyOn(supabase.auth, 'onAuthStateChange').and.returnValue({});
        createView();
        view.render();

        expect(onAuthStateChange).toHaveBeenCalledTimes(1);
        expect(view._subscription).toBeNull();
        expect(supabase.auth.listeners.size).toBe(0);
      });

      it('ignores non-SIGNED_IN events and SIGNED_IN events without a session', async () => {
        createView();
        view.render();

        supabase.auth._emitAuthEvent('TOKEN_REFRESHED', supabaseSession);
        supabase.auth._emitAuthEvent('SIGNED_IN', null);
        await flushMicrotasks();

        expect(authApi.exchangeOAuthToken).not.toHaveBeenCalled();
        expect(view._settled).toBe(false);
        expect(view._timeoutId).not.toBeNull();
        expect(navigate).not.toHaveBeenCalled();
        expect(supabaseKeys(window.localStorage).length).toBe(1);
      });

      it('renders the exact incomplete-token error, clears storage and cancels the timeout', async () => {
        installClock();
        createView();
        view.render();

        supabase.auth._emitAuthEvent('SIGNED_IN', { access_token: 'only-access' });
        await flushMicrotasks();

        expect(authApi.exchangeOAuthToken).not.toHaveBeenCalled();
        expect(view.element.querySelector('h3').textContent).toBe(
          'No se pudo completar el inicio de sesión con Google.'
        );
        expect(view.element.querySelector('a[href="/login"]').textContent).toBe(
          'Volver al inicio de sesión'
        );
        expect(supabaseKeys(window.localStorage)).toEqual([]);
        expect(supabaseKeys(window.sessionStorage)).toEqual([]);
        expect(view._timeoutId).toBeNull();
        expect(view._settled).toBe(true);
        expect(view._redirectTimerId).not.toBeNull();

        jasmine.clock().tick(5);
        expect(navigate).toHaveBeenCalledOnceWith('/login?error=oauth_timeout');
      });

      it('stops auto refresh and navigates home exactly once after a successful exchange', async () => {
        const stopAutoRefresh = spyOn(supabase.auth, 'stopAutoRefresh');
        createView();
        view.render();

        supabase.auth._emitAuthEvent('SIGNED_IN', supabaseSession);
        await flushMicrotasks();

        expect(authApi.exchangeOAuthToken).toHaveBeenCalledWith(
          'supabase-access',
          'supabase-refresh'
        );
        expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/');
        expect(view._settled).toBe(true);
        expect(view._timeoutId).toBeNull();
        expect(view._redirectTimerId).toBeNull();
        expect(supabaseKeys(window.localStorage)).toEqual([]);
        expect(supabaseKeys(window.sessionStorage)).toEqual([]);
      });

      it('falls into the oauth_failed catch when a resolved exchange response has no data', async () => {
        authApi.exchangeOAuthToken.and.resolveTo({});
        installClock();
        createView();
        view.render();

        supabase.auth._emitAuthEvent('SIGNED_IN', supabaseSession);
        await flushMicrotasks();

        expect(view.element.querySelector('h3').textContent).toBe(
          'No se pudo completar el inicio de sesión con Google.'
        );
        expect(supabaseKeys(window.localStorage)).toEqual([]);
        expect(supabaseKeys(window.sessionStorage)).toEqual([]);

        jasmine.clock().tick(5);
        expect(navigate).toHaveBeenCalledOnceWith('/login?error=oauth_failed');
      });

      it('does not navigate when destroyed before the handoff or redirect timers fire', () => {
        installClock();
        createView({ handoffTimeoutMs: 10 });
        view.render();
        view.destroy();

        expect(view._timeoutId).toBeNull();
        expect(view._redirectTimerId).toBeNull();
        expect(supabase.auth.listeners.size).toBe(0);

        jasmine.clock().tick(30);
        expect(navigate).not.toHaveBeenCalled();
        expect(view.element.textContent).toContain('Completando inicio de sesión');
      });

      it('renders the return-to-login link and redirects with oauth_failed when the exchange fails', async () => {
        authApi.exchangeOAuthToken.and.rejectWith(new Error('boom'));
        installClock();
        createView();
        view.render();

        supabase.auth._emitAuthEvent('SIGNED_IN', supabaseSession);
        await flushMicrotasks();

        expect(view.element.querySelector('h3').textContent).toBe(
          'No se pudo completar el inicio de sesión con Google.'
        );
        const link = view.element.querySelector('a[href="/login"]');
        expect(link.textContent).toBe('Volver al inicio de sesión');
        expect(supabaseKeys(window.localStorage)).toEqual([]);

        jasmine.clock().tick(5);
        expect(navigate).toHaveBeenCalledOnceWith('/login?error=oauth_failed');
      });

      it('only removes lower-case supabase storage keys during token cleanup', async () => {
        window.localStorage.setItem('SB-Project-Auth-Token', 'upper-local');
        window.sessionStorage.setItem('Supabase.Auth.Token', 'upper-session');
        createView();
        view.render();

        supabase.auth._emitAuthEvent('SIGNED_IN', supabaseSession);
        await flushMicrotasks();

        expect(supabaseKeys(window.localStorage)).toEqual(['SB-Project-Auth-Token']);
        expect(supabaseKeys(window.sessionStorage)).toEqual(['Supabase.Auth.Token']);
        expect(window.localStorage.getItem('SB-Project-Auth-Token')).toBe('upper-local');
        expect(window.sessionStorage.getItem('Supabase.Auth.Token')).toBe('upper-session');
      });
    });
  })();
})();
