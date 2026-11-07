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
3. **`/auth/callback`** (`AuthCallbackView`) shows
   _"Completando inicio de sesión…"_ while it waits for Supabase to consume
   the `code` and emit `SIGNED_IN`.
4. On `SIGNED_IN`, the view POSTs the short-lived Supabase tokens to
   `POST /v1/auth/oauth/exchange`; the backend answers with its own session
   (`Set-Cookie`: HttpOnly `access_token`, `refresh_token`, `csrf_token`).
5. The view **wipes every `sb-*` / `*supabase*` key from localStorage AND
   sessionStorage** (never `supabase.auth.signOut()` — that would revoke the
   session the backend cookie now holds) and redirects to `/`.
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
