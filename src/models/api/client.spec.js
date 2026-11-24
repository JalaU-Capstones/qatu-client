import { authStore } from '../../store/authStore.js';
import { apiFetch, createAuthStorage, PKCE_STORAGE_KEY_PATTERN, supabase } from './client.js';

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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('apiFetch additional branches (recovered 1)', () => {
      let fetchSpy;

      beforeEach(() => {
        document.cookie.split(';').forEach((cookie) => {
          const name = cookie.split('=')[0].trim();
          if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
        authStore.clearSession();
        spyOn(authStore, 'clearSession').and.callThrough();
        spyOn(window, 'dispatchEvent').and.callThrough();
        fetchSpy = spyOn(window, 'fetch');
      });

      afterEach(() => {
        authStore.clearSession();
      });

      it('normalizes a lowercase method to uppercase and still attaches the CSRF header', async () => {
        document.cookie = 'csrf_token=token-1; path=/';
        fetchSpy.and.resolveTo(new Response('{}', { status: 200 }));

        await apiFetch('/cart/items', { method: 'post' });

        const [, init] = fetchSpy.calls.first().args;
        expect(init.method).toBe('POST');
        expect(init.headers['X-CSRF-Token']).toBe('token-1');
      });

      it('does not attach CSRF for safe methods such as HEAD and OPTIONS', async () => {
        document.cookie = 'csrf_token=token-1; path=/';
        fetchSpy.and.resolveTo(new Response('{}', { status: 200 }));

        await apiFetch('/products', { method: 'head' });
        await apiFetch('/products', { method: 'OPTIONS' });

        expect(fetchSpy.calls.first().args[1].headers['X-CSRF-Token']).toBeUndefined();
        expect(fetchSpy.calls.mostRecent().args[1].headers['X-CSRF-Token']).toBeUndefined();
      });

      it('omits Content-Type for FormData bodies and keeps it for other bodies', async () => {
        const form = new FormData();
        form.append('image', new Blob(['x']), 'a.png');
        fetchSpy.and.resolveTo(new Response('{}', { status: 200 }));

        await apiFetch('/products/1/images', { method: 'POST', body: form });
        await apiFetch('/products', { method: 'POST', body: 'raw-body' });

        expect(fetchSpy.calls.first().args[1].headers['Content-Type']).toBeUndefined();
        expect(fetchSpy.calls.mostRecent().args[1].headers['Content-Type']).toBe(
          'application/json'
        );
      });

      it('merges caller headers over the defaults and never mutates the caller options', async () => {
        const headers = { 'Content-Type': 'text/plain', 'X-Custom': 'yes' };
        const options = { method: 'POST', headers, withAuth: true };
        fetchSpy.and.resolveTo(new Response('{}', { status: 200 }));

        await apiFetch('/cart/items', options);

        const [, init] = fetchSpy.calls.first().args;
        expect(init.headers['Content-Type']).toBe('text/plain');
        expect(init.headers['X-Custom']).toBe('yes');
        expect('withAuth' in init).toBe(false);
        expect(options.withAuth).toBe(true);
        expect(headers).toEqual({ 'Content-Type': 'text/plain', 'X-Custom': 'yes' });
      });

      it('omits the CSRF header when the cookie is missing or empty', async () => {
        fetchSpy.and.resolveTo(new Response('{}', { status: 200 }));
        await apiFetch('/cart/items', { method: 'POST' });
        expect(fetchSpy.calls.first().args[1].headers['X-CSRF-Token']).toBeUndefined();

        document.cookie = 'csrf_token=; path=/';
        await apiFetch('/cart/items', { method: 'POST' });
        expect(fetchSpy.calls.mostRecent().args[1].headers['X-CSRF-Token']).toBeUndefined();
      });

      it('returns a 401 on an auth path even when the body says REFRESH_REQUIRED', async () => {
        const response = new Response('{"error":{"code":"REFRESH_REQUIRED"}}', { status: 401 });
        fetchSpy.and.resolveTo(response);

        const result = await apiFetch('/auth/login', { method: 'POST' });

        expect(result).toBe(response);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(authStore.clearSession).not.toHaveBeenCalled();
      });

      it('sends the refresh request with POST, cookies and no CSRF header', async () => {
        document.cookie = 'csrf_token=token-1; path=/';
        fetchSpy.and.returnValues(
          Promise.resolve(new Response('{"error":{"code":"REFRESH_REQUIRED"}}', { status: 401 })),
          Promise.resolve(new Response('{}', { status: 200 })),
          Promise.resolve(new Response('{"ok":true}', { status: 200 }))
        );

        await apiFetch('/cart/items', { method: 'POST' });

        const [url, init] = fetchSpy.calls.argsFor(1);
        expect(url).toMatch(/\/auth\/refresh$/);
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('include');
        expect(init.headers['X-CSRF-Token']).toBeUndefined();
        expect(init.headers['Content-Type']).toBe('application/json');
      });

      it('reuses fresh CSRF on a mutating retry but omits it on a safe-method retry', async () => {
        document.cookie = 'csrf_token=token-1; path=/';
        fetchSpy.and.returnValues(
          Promise.resolve(new Response('{"error":{"code":"REFRESH_REQUIRED"}}', { status: 401 })),
          Promise.resolve(new Response('{}', { status: 200 })),
          Promise.resolve(new Response('{"ok":true}', { status: 200 }))
        );

        await apiFetch('/cart/items', { method: 'POST' });
        expect(fetchSpy.calls.argsFor(2)[1].headers['X-CSRF-Token']).toBe('token-1');

        fetchSpy.calls.reset();
        fetchSpy.and.returnValues(
          Promise.resolve(new Response('{"error":{"code":"REFRESH_REQUIRED"}}', { status: 401 })),
          Promise.resolve(new Response('{}', { status: 200 })),
          Promise.resolve(new Response('{"ok":true}', { status: 200 }))
        );
        await apiFetch('/products');
        expect(fetchSpy.calls.argsFor(2)[1].headers['X-CSRF-Token']).toBeUndefined();
      });

      it('clears the session, emits the event and throws SESSION_EXPIRED after a second 401', async () => {
        fetchSpy.and.returnValues(
          Promise.resolve(new Response('{"error":{"code":"REFRESH_REQUIRED"}}', { status: 401 })),
          Promise.resolve(new Response('{}', { status: 200 })),
          Promise.resolve(new Response('{}', { status: 401 }))
        );

        let thrown;
        try {
          await apiFetch('/products');
        } catch (error) {
          thrown = error;
        }

        expect(thrown.message).toBe('SESSION_EXPIRED');
        expect(thrown.code).toBe('SESSION_EXPIRED');
        expect(thrown.status).toBe(401);
        expect(authStore.clearSession).toHaveBeenCalled();
        const event = window.dispatchEvent.calls.mostRecent().args[0];
        expect(event.type).toBe('qatu:auth-expired');
        expect(event instanceof CustomEvent).toBe(true);
      });

      it('handles a rejected refresh request as a hard auth failure', async () => {
        fetchSpy.and.callFake((url) => {
          if (url.endsWith('/auth/refresh')) {
            throw new Error('network down');
          }
          return Promise.resolve(
            new Response('{"error":{"code":"REFRESH_REQUIRED"}}', { status: 401 })
          );
        });

        await expectAsync(apiFetch('/products')).toBeRejectedWithError('SESSION_EXPIRED');
        expect(authStore.clearSession).toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });

      it('treats a non-JSON 401 body as a hard auth failure', async () => {
        fetchSpy.and.resolveTo(new Response('not-json', { status: 401 }));

        await expectAsync(apiFetch('/products')).toBeRejectedWithError('SESSION_EXPIRED');
        expect(authStore.clearSession).toHaveBeenCalled();
      });

      it('propagates an initial network failure without clearing the session', async () => {
        fetchSpy.and.rejectWith(new Error('offline'));

        await expectAsync(apiFetch('/products')).toBeRejectedWithError('offline');
        expect(authStore.clearSession).not.toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      it('returns non-401 responses regardless of their status code', async () => {
        fetchSpy.and.resolveTo(new Response('{}', { status: 500 }));

        const response = await apiFetch('/products');
        expect(response.status).toBe(500);
        expect(authStore.clearSession).not.toHaveBeenCalled();
      });

      it('matches only PKCE verifier suffix keys', () => {
        expect(PKCE_STORAGE_KEY_PATTERN.test('sb-project-auth-token-code-verifier')).toBe(true);
        expect(PKCE_STORAGE_KEY_PATTERN.test('code-verifier')).toBe(false);
        expect(PKCE_STORAGE_KEY_PATTERN.test('sb-code-verifier-extra')).toBe(false);
        expect(PKCE_STORAGE_KEY_PATTERN.test('sb-CODE-VERIFIER')).toBe(false);
      });
    });
  })();

  (() => {
    describe('supabase client (recovered 2)', () => {
      it('enforces the PKCE flow with URL detection and in-memory session storage', () => {
        expect(supabase.options.auth).toEqual(
          jasmine.objectContaining({
            flowType: 'pkce',
            detectSessionInUrl: true,
            autoRefreshToken: false,
            storage: jasmine.anything(),
          })
        );
      });

      it('defaults to the local Supabase API gateway port 54321 (not Studio 54323)', () => {
        expect(supabase.supabaseUrl.endsWith(':54321')).toBe(true);
        expect(supabase.supabaseUrl).not.toContain('54323');
      });
    });

    describe('createAuthStorage (recovered 3)', () => {
      let storage;
      let seededKeys;

      beforeEach(() => {
        storage = createAuthStorage();
        seededKeys = [...Object.keys(window.localStorage), ...Object.keys(window.sessionStorage)];
      });

      afterEach(() => {
        [...Object.keys(window.localStorage)]
          .filter((key) => !seededKeys.includes(key))
          .forEach((key) => window.localStorage.removeItem(key));
      });

      it('persists PKCE verifier keys to localStorage', () => {
        [
          'sb-127.0.0.1:54321-auth-token-code-verifier',
          'sb-127.0.0.1:54321-flow-1-code-verifier',
        ].forEach((key) => {
          storage.setItem(key, 'verifier');
          expect(window.localStorage.getItem(key)).toBe('verifier');
          expect(storage.getItem(key)).toBe('verifier');
        });
      });

      it('keeps session/token keys in memory only (zero tokens on disk)', () => {
        const sessionKey = 'sb-127.0.0.1:54321-auth-token';
        storage.setItem(
          sessionKey,
          JSON.stringify({
            access_token: 'supabase-access-token',
            refresh_token: 'supabase-refresh',
          })
        );

        expect(window.localStorage.getItem(sessionKey)).toBeNull();
        expect(storage.getItem(sessionKey)).toContain('supabase-access-token');
      });

      it('removes verifier keys and keeps the memory contract consistent', () => {
        const verifierKey = 'sb-127.0.0.1:54321-code-verifier';
        const sessionKey = 'sb-127.0.0.1:54321-auth-token';
        storage.setItem(verifierKey, 'verifier');
        storage.setItem(sessionKey, 'session');

        storage.removeItem(verifierKey);
        storage.removeItem(sessionKey);

        expect(window.localStorage.getItem(verifierKey)).toBeNull();
        expect(storage.getItem(verifierKey)).toBeNull();
        expect(storage.getItem(sessionKey)).toBeNull();
      });

      it('matches only verifier-slot keys with the shared pattern', () => {
        [
          'sb-127.0.0.1:54321-code-verifier',
          'sb-127.0.0.1:54321-flow-40-code-verifier',
          'sb-127.0.0.1:54321-flows-code-verifier',
        ].forEach((key) => {
          expect(PKCE_STORAGE_KEY_PATTERN.test(key)).toBeTrue();
        });
        expect(PKCE_STORAGE_KEY_PATTERN.test('sb-127.0.0.1:54321-auth-token')).toBeFalse();
      });
    });
  })();
})();
