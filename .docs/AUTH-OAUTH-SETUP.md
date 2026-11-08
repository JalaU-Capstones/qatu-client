# OAuth Social Login Setup (US-03)

Configuration guide for Google login via Supabase. Frontend repo lives in
`client/`; the backend exchanges the Supabase tokens for its own HttpOnly
cookie session (`POST /v1/auth/oauth/exchange`, see ADR-012).

## 1. Environment variables (`client/.env`)

```bash
# Qatu API
VITE_API_BASE_URL=http://localhost:3000/v1

# Supabase — API gateway (Kong) on port 54321 when using the Supabase CLI.
# DO NOT use 54323: that port is Supabase Studio (admin dashboard).
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon/public key from supabase/themes or dashboard>
```

The client is created in `src/models/api/client.js` with
`{ flowType: 'pkce', detectSessionInUrl: true, autoRefreshToken: false,
storage: createAuthStorage() }`. The PKCE-aware storage adapter persists ONLY
the OAuth **code verifier** keys (`*-code-verifier`) to localStorage — they must
survive the full-page redirect from Google back to `/auth/callback`
(`persistSession: false` would keep the verifier memory-only and the handoff
would time out with `?error=oauth_timeout`). **No Supabase token is ever
written to persistent storage**: `access_token`/`refresh_token` stay in a
memory-only adapter and are handed to the backend in step 4; the backend owns
the real session via HttpOnly Cookies (ADR-012).

**Common mistake:** port `54323` is Supabase Studio; use `54321`.

After changing `.env`, restart the Vite dev server — `import.meta.env` values
are baked in at startup.

## 2. Supabase Dashboard

**Authentication → Providers → Google**: enable the provider and paste the
Google OAuth Client ID/Secret (step 3).

**Authentication → URL Configuration → Redirect URLs** must contain exactly:

```
http://localhost:5173/auth/callback
https://staging.qatu.pe/auth/callback
https://qatu.pe/auth/callback
```

- The client redirects here after Google consent (`redirectTo` in
  `AuthViewModel.triggerGoogleAuth`).
- No trailing slashes, no wildcards.

## 3. Google Cloud Console

**APIs & Services → Credentials → OAuth 2.0 Client** (Web application):

- **Authorized JavaScript origins** (exact match, no trailing slash):

```
http://localhost:5173
https://staging.qatu.pe
https://qatu.pe
```

- **Authorized redirect URIs** must match the Supabase callback endpoint
  exactly (Google redirects here first; Supabase then redirects to our
  `/auth/callback`):

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Copy that exact URL from the Supabase dashboard
(**Authentication → Providers → Google → Callback URL (for OAuth)**).

## 4. How the flow works (frontend)

1. **Login page** (`/login`) → "Continuar con Google" calls
   `supabase.auth.signInWithOAuth({ provider: 'google', flowType: 'pkce' })`
   with `redirectTo = <origin>/auth/callback`.
2. Supabase stores the **PKCE verifier + state in browser storage** before
   navigating to Google. On the way back it validates the `state` parameter
   against the stored verifier — **this is the CSRF defense for the OAuth
   redirect itself**; a mismatched `state` never produces a session.
   (Only verifier keys persist across the redirect — see section 1.)
3. **`/auth/callback`** (`AuthCallbackView`) shows
   _"Completando inicio de sesión…"_ while it waits for Supabase to consume
   the `code` and emit `SIGNED_IN`.
4. On `SIGNED_IN`, the view POSTs the short-lived Supabase tokens to
   `POST /v1/auth/oauth/exchange` with `credentials: 'include'` (via
   `apiFetch`); the backend answers with its own session
   (`Set-Cookie`: HttpOnly `access_token`, `refresh_token`, `csrf_token`).
5. The view clears the residual Supabase state and redirects to `/`:
   `supabase.auth.signOut({ scope: 'local' })` (revokes the local-only
   Supabase session, review F4) followed by wiping every `sb-*`/
   `*supabase*` key from localStorage AND sessionStorage.
6. `AuthBootstrapService` rehydrates via `GET /auth/me` on the next boot.

### Edge cases handled in `AuthCallbackView`

| Scenario                                                   | Detection                                   | Behavior                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| User cancels consent                                       | Google redirects with `error=access_denied` | In-line "Autorización cancelada." → clear partial state → `/login?error=oauth_cancelled` |
| Exchange fails (network/backend down)                      | `exchangeOAuthToken` throws                 | In-line error → clear partial state → `/login?error=oauth_failed`                        |
| Stale `code` / PKCE `state` mismatch (CSRF) / dead network | No `SIGNED_IN` within 8 s                   | In-line timeout message → clear partial state → `/login?error=oauth_timeout`             |

The login page (`AuthViewModel.applyOAuthErrorFeedback`) translates those
`?error=` codes into a visible banner.

## 5. Zero-token audit (DoD)

After a completed login, run in DevTools:

```js
Object.keys(localStorage).filter((k) => k.includes('token'));
// → []
Object.keys(sessionStorage).filter((k) => k.startsWith('sb-') || k.includes('token'));
// → [] (only the non-sensitive qatu.auth.session cache may remain)
```

Automated coverage: `src/views/pages/AuthCallbackView.spec.js`
("leaves ZERO tokens/supabase keys … after the handoff").

## 6. Debugging the handoff (dev builds only)

Never ship raw `console.log` — all callback diagnostics go through
`debugLog()` in `src/views/pages/AuthCallbackView.js`, which is gated behind
`import.meta.env.DEV` and light up as structured
`[OAuth Callback] <event> {...}` entries in the Console (debug level).

1. **Network tab** → filter `Fetch/XHR` → `oauth/exchange` must appear during
   the handoff. No request ⇒ the `SIGNED_IN` event never arrived (verify the
   PKCE verifier key `*-code-verifier` exists in localStorage before the
   Google redirect and that the backend is reachable).
2. **Application → Local Storage** → after a completed login there must be no
   `sb-*` / `*supabase*` key left (see section 5).
3. **Console** → filter `[OAuth Callback]` → follow
   `route-mounted → awaiting-signed-in → signed-in-received →
exchange-starting → exchange-finished → handoff-completed`. The last event
   before an error pinpoints the failing step.
4. Endpoint sanity: `POST /v1/auth/oauth/exchange` returns `400`/`401` for
   invalid tokens (it is live) and `200` with `Set-Cookie` for valid ones.
