# OAuth Social Login Setup (US-03)

Google login via Supabase. The backend exchanges the Supabase tokens for its
own HttpOnly cookie session (`POST /v1/auth/oauth/exchange`, see ADR-012).

## 1. Environment variables (`client/.env`)

```bash
VITE_API_BASE_URL=http://localhost:3000/v1
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon/public key from supabase/themes or dashboard>
```

Port 54321 is the Kong API gateway; 54323 is Supabase Studio — do not use it.
Restart the Vite dev server after changing `.env`.

The client is created in `src/models/api/client.js` with the PKCE-aware
`createAuthStorage()` adapter: only `*-code-verifier` keys persist to
localStorage (they must survive the Google redirect); Supabase tokens stay
memory-only and are handed to the backend during the handoff.

## 2. Supabase Dashboard

**Authentication → Providers → Google**: enable the provider and paste the
Google OAuth Client ID/Secret (step 3).

**Authentication → URL Configuration → Redirect URLs** (no trailing slashes,
no wildcards):

```
http://localhost:5173/auth/callback
https://staging.qatu.pe/auth/callback
https://qatu.pe/auth/callback
```

## 3. Google Cloud Console

**APIs & Services → Credentials → OAuth 2.0 Client** (Web application):

- **Authorized JavaScript origins** (exact match, no trailing slash):

```
http://localhost:5173
https://staging.qatu.pe
https://qatu.pe
```

- **Authorized redirect URIs**: copy the exact callback URL from the Supabase
  dashboard (Authentication → Providers → Google → Callback URL for OAuth):

```
https://<project-ref>.supabase.co/auth/v1/callback
```

## 4. How the flow works (frontend)

1. "Continuar con Google" calls `signInWithOAuth({ provider: 'google',
flowType: 'pkce' })` with `redirectTo = <origin>/auth/callback`; the SDK
   stores the PKCE verifier in browser storage first.
2. `/auth/callback` (`AuthCallbackView`) waits for Supabase to consume the
   `code` and emit `SIGNED_IN`.
3. On `SIGNED_IN`, the view POSTs the tokens to
   `POST /v1/auth/oauth/exchange` (`credentials: 'include'` via `apiFetch`);
   the backend answers with its own session (`Set-Cookie`: HttpOnly
   `access_token`, `refresh_token`, `csrf_token`).
4. The view revokes the local Supabase session
   (`signOut({ scope: 'local' })`), wipes every `sb-*`/`*supabase*` key from
   localStorage and sessionStorage, and redirects to `/`.
5. `AuthBootstrapService` rehydrates via `GET /auth/me` on the next boot.

| Scenario                    | Detection                    | Behavior (`/login?error=…`) |
| --------------------------- | ---------------------------- | --------------------------- |
| User cancels consent        | `error=access_denied` in URL | `oauth_cancelled`           |
| Exchange fails              | `exchangeOAuthToken` throws  | `oauth_failed`              |
| Stale code / state mismatch | No `SIGNED_IN` within 8 s    | `oauth_timeout`             |

`AuthViewModel.applyOAuthErrorFeedback` translates those codes into a banner.

## 5. Zero-token audit (DoD)

After a completed login, run in DevTools:

```js
Object.keys(localStorage).filter((k) => k.includes('token'));
// → []
Object.keys(sessionStorage).filter((k) => k.startsWith('sb-') || k.includes('token'));
// → []
```

Automated coverage lives in `src/views/pages/AuthCallbackView.spec.js`.

## 6. Debugging (dev builds only)

Diagnostics come from `debugLog()` in `AuthCallbackView.js` — gated behind
`import.meta.env.DEV`, no raw `console.log` ships to production.

1. **Network tab** → `oauth/exchange` must appear during the handoff. If it
   does not, `SIGNED_IN` never arrived (check that a `*-code-verifier` key
   exists in localStorage before the redirect).
2. **Console** → filter `[OAuth Callback]` and follow the event trail; the
   last event before an error pinpoints the failing step.
3. `POST /v1/auth/oauth/exchange` returns `400`/`401` for invalid tokens and
   `200` with `Set-Cookie` for valid ones.
