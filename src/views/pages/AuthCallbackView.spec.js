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

/**
 * DoD audit helper: "verify no access_token or refresh_token appears in
 * localStorage after OAuth login completes".
 */
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

  /** Flushes the async SIGNED_IN handler (exchange → setSession → clean → redirect). */
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

  it('revokes only the local Supabase session with signOut({scope: "local"}) before redirecting (review F4)', async () => {
    const view = new AuthCallbackView({ authApi: fakeAuthApi, navigate });
    view.render();

    supabase.auth._emitAuthEvent('SIGNED_IN', FAKE_SUPABASE_SESSION);
    await flushMicrotasks();

    expect(supabase.auth.signOutCalls).toContain(jasmine.objectContaining({ scope: 'local' }));
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
