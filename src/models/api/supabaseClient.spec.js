import { createAuthStorage, PKCE_STORAGE_KEY_PATTERN, supabase } from './client.js';

describe('supabase client', () => {
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

describe('createAuthStorage', () => {
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
      JSON.stringify({ access_token: 'supabase-access-token', refresh_token: 'supabase-refresh' })
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
