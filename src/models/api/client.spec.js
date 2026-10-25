import { authStore } from '../../store/authStore.js';
import { apiFetch } from './client.js';

describe('apiFetch', () => {
  let fetchSpy;

  beforeEach(() => {
    window.localStorage.clear();
    authStore.clearSession();
    fetchSpy = spyOn(window, 'fetch');
  });

  afterEach(() => {
    authStore.clearSession();
  });

  it('prepends the base URL to the path', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
    await apiFetch('/ping');
    expect(fetchSpy).toHaveBeenCalledWith(jasmine.stringMatching(/\/ping$/), jasmine.any(Object));
  });

  it('does NOT add Authorization header when withAuth is false', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
    authStore.setSession({ token: 'tok-test', user: { id: 'u1' } });

    await apiFetch('/public', { withAuth: false });

    const callArgs = fetchSpy.calls.mostRecent().args;
    const headers = callArgs[1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('adds Authorization: Bearer header when withAuth is true and token exists', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
    authStore.setSession({ token: 'tok-bearer', user: { id: 'u2' } });

    await apiFetch('/protected', { withAuth: true });

    const callArgs = fetchSpy.calls.mostRecent().args;
    const headers = callArgs[1].headers;
    expect(headers['Authorization']).toBe('Bearer tok-bearer');
  });

  it('omits Authorization header when withAuth is true but no token exists', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
    // authStore is already cleared in beforeEach

    await apiFetch('/protected', { withAuth: true });

    const callArgs = fetchSpy.calls.mostRecent().args;
    const headers = callArgs[1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('on 401 with withAuth: clears session, dispatches qatu:auth-expired, throws SESSION_EXPIRED', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response('Unauthorized', { status: 401 })));
    authStore.setSession({ token: 'tok-expired', user: { id: 'u3' } });
    expect(authStore.isAuthenticated()).toBe(true);

    let authExpiredFired = false;
    const handler = () => {
      authExpiredFired = true;
    };
    window.addEventListener('qatu:auth-expired', handler);

    let thrownErr = null;
    try {
      await apiFetch('/secured', { withAuth: true });
    } catch (e) {
      thrownErr = e;
    }

    window.removeEventListener('qatu:auth-expired', handler);

    expect(authStore.isAuthenticated()).toBe(false);
    expect(authExpiredFired).toBe(true);
    expect(thrownErr).not.toBeNull();
    expect(thrownErr.message).toBe('SESSION_EXPIRED');
    expect(thrownErr.code).toBe('SESSION_EXPIRED');
    expect(thrownErr.status).toBe(401);
  });

  it('on 200 with withAuth: does NOT clear session', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response('{"ok":true}', { status: 200 })));
    authStore.setSession({ token: 'tok-valid', user: { id: 'u4' } });

    await apiFetch('/secured', { withAuth: true });

    expect(authStore.isAuthenticated()).toBe(true);
  });
});
