import { supabase } from './client.js';

/**
 * Contract spec for the Supabase client configuration (US-03 review).
 * If any of these drifts, the OAuth handoff breaks:
 *  - `flowType: 'pkce'` + `detectSessionInUrl` are required for the
 *    /auth/callback handoff AND for the PKCE state validation (CSRF defense).
 *  - `persistSession: false` guarantees ZERO tokens in localStorage/persisted
 *    storage — the backend owns the session via HttpOnly cookies (ADR-012).
 *  - Fallback URL must be port 54321 (Kong API gateway), never 54323
 *    (Supabase Studio).
 */
describe('supabase client', () => {
  it('enforces the PKCE flow with URL detection and no persisted session', () => {
    expect(supabase.options.auth).toEqual(
      jasmine.objectContaining({
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: false,
      })
    );
  });

  it('defaults to the local Supabase API gateway port 54321 (not Studio 54323)', () => {
    expect(supabase.supabaseUrl.endsWith(':54321')).toBe(true);
    expect(supabase.supabaseUrl).not.toContain('54323');
  });
});
