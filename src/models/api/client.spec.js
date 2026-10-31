import { authStore } from '../../store/authStore.js';
import { apiFetch } from './client.js';

describe('apiFetch', () => {
  let fetchSpy;

  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });

    authStore.clearSession();
    spyOn(authStore, 'clearSession').and.callThrough();
    fetchSpy = spyOn(window, 'fetch');
  });

  afterEach(() => {
    authStore.clearSession();
  });

  describe('credentials and CSRF', () => {
    it('always sends credentials: include', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
      await apiFetch('/products');
      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/products$/),
        jasmine.objectContaining({ credentials: 'include' })
      );
    });

    it('attaches X-CSRF-Token on mutating non-auth paths', async () => {
      document.cookie = 'csrf_token=abc123; path=/';
      fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
      await apiFetch('/cart/items', { method: 'POST' });
      const [, init] = fetchSpy.calls.first().args;
      expect(init.headers['X-CSRF-Token']).toBe('abc123');
    });

    it('does NOT attach X-CSRF-Token on GET', async () => {
      document.cookie = 'csrf_token=abc123; path=/';
      fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
      await apiFetch('/cart/items');
      const [, init] = fetchSpy.calls.first().args;
      expect(init.headers['X-CSRF-Token']).toBeUndefined();
    });

    it('does NOT attach X-CSRF-Token on /auth/* paths', async () => {
      document.cookie = 'csrf_token=abc123; path=/';
      fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
      await apiFetch('/auth/login', { method: 'POST' });
      const [, init] = fetchSpy.calls.first().args;
      expect(init.headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('401 handling on /auth/* paths', () => {
    it('propagates the raw response for /auth/login 401 (bad credentials)', async () => {
      const errBody = JSON.stringify({ error: { code: 'UNAUTHORIZED' } });
      fetchSpy.and.returnValue(Promise.resolve(new Response(errBody, { status: 401 })));

      const res = await apiFetch('/auth/login', { method: 'POST' });

      expect(res.status).toBe(401);
      expect(authStore.clearSession).not.toHaveBeenCalled();
    });
  });

  describe('401 handling on non-auth paths (refresh-and-retry)', () => {
    it('calls refresh and retries once on REFRESH_REQUIRED', async () => {
      const errBody = JSON.stringify({ error: { code: 'REFRESH_REQUIRED' } });
      fetchSpy.and.returnValues(
        Promise.resolve(new Response(errBody, { status: 401 })), // original 401
        Promise.resolve(new Response('{}', { status: 200 })), // refresh OK
        Promise.resolve(new Response('{"ok":true}', { status: 200 })) // retry OK
      );

      const res = await apiFetch('/cart/items', { method: 'POST' });

      expect(res.status).toBe(200);
      expect(fetchSpy.calls.count()).toBe(3);
      expect(fetchSpy.calls.argsFor(1)[0]).toContain('/auth/refresh');
    });

    it('rebuilds CSRF header with fresh cookie value on retry', async () => {
      document.cookie = 'csrf_token=old-csrf; path=/';
      const errBody = JSON.stringify({ error: { code: 'REFRESH_REQUIRED' } });
      fetchSpy.and.returnValues(
        Promise.resolve(new Response(errBody, { status: 401 })),
        Promise.resolve().then(() => {
          document.cookie = 'csrf_token=fresh-csrf; path=/';
          return new Response('{}', { status: 200 });
        }),
        Promise.resolve(new Response('{"ok":true}', { status: 200 }))
      );

      const res = await apiFetch('/cart/items', { method: 'POST' });
      expect(res.status).toBe(200);
      const retryInit = fetchSpy.calls.argsFor(2)[1];
      expect(retryInit.headers['X-CSRF-Token']).toBe('fresh-csrf');
    });

    it('clears session and emits event when refresh fails', async () => {
      const errBody = JSON.stringify({ error: { code: 'REFRESH_REQUIRED' } });
      fetchSpy.and.returnValues(
        Promise.resolve(new Response(errBody, { status: 401 })),
        Promise.resolve(new Response('{}', { status: 401 })) // refresh fails
      );

      const dispatchSpy = spyOn(window, 'dispatchEvent').and.callThrough();

      let thrownErr = null;
      try {
        await apiFetch('/cart/items', { method: 'POST' });
      } catch (err) {
        thrownErr = err;
      }

      expect(thrownErr).not.toBeNull();
      expect(thrownErr.code).toBe('SESSION_EXPIRED');
      expect(authStore.clearSession).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'qatu:auth-expired' })
      );
    });

    it('clears session on non-REFRESH_REQUIRED 401', async () => {
      const errBody = JSON.stringify({ error: { code: 'UNAUTHORIZED' } });
      fetchSpy.and.returnValue(Promise.resolve(new Response(errBody, { status: 401 })));

      let thrownErr = null;
      try {
        await apiFetch('/cart/items', { method: 'POST' });
      } catch (err) {
        thrownErr = err;
      }

      expect(thrownErr).not.toBeNull();
      expect(thrownErr.code).toBe('SESSION_EXPIRED');
      expect(authStore.clearSession).toHaveBeenCalled();
    });
  });

  describe('non-401 errors propagate', () => {
    it('returns 500 response without retry or clear', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response('oops', { status: 500 })));
      const res = await apiFetch('/cart/items', { method: 'POST' });
      expect(res.status).toBe(500);
      expect(authStore.clearSession).not.toHaveBeenCalled();
    });

    it('returns 200 response as-is', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response('{"ok":true}', { status: 200 })));
      const res = await apiFetch('/cart/items');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  describe('withAuth deprecated', () => {
    it('ignores the withAuth flag (no Authorization header added)', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response('{}', { status: 200 })));
      await apiFetch('/products', { withAuth: true });
      const [, init] = fetchSpy.calls.first().args;
      expect(init.headers['Authorization']).toBeUndefined();
    });
  });
});
