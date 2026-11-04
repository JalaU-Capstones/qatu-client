import { createClient } from '@supabase/supabase-js';

import { authStore } from '../../store/authStore.js';
import { getCsrfToken, isCsrfExemptPath, isMutatingMethod } from './csrf.js';

export const supabase = createClient(
  import.meta.env?.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  import.meta.env?.VITE_SUPABASE_ANON_KEY,
  { auth: { flowType: 'pkce', detectSessionInUrl: true } }
);

const DEFAULT_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:3000/v1';

/**
 * Fires the `qatu:auth-expired` event and clears the session. Only called
 * for NON-auth paths when the session is genuinely dead (either the refresh
 * failed, or a non-REFRESH_REQUIRED 401 came back). Auth paths
 * (`/auth/login`, `/auth/register`, etc.) NEVER trigger this — a 401 there
 * means invalid credentials, not expired session.
 *
 * @private
 */
function _handleHardAuthFailure() {
  authStore.clearSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qatu:auth-expired'));
  }
  const err = new Error('SESSION_EXPIRED');
  err.code = 'SESSION_EXPIRED';
  err.status = 401;
  throw err;
}

/**
 * Calls `POST /auth/refresh` with cookies attached. Returns the raw Response.
 * Deliberately does NOT go through `apiFetch` to avoid recursion.
 *
 * @returns {Promise<Response>}
 * @private
 */
async function _refreshSession() {
  const url = `${DEFAULT_BASE_URL}/auth/refresh`;
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Authenticated fetch wrapper for the Qatu API.
 *
 * Behavior:
 *  1. Always sends cookies (`credentials: 'include'`). The session lives in
 *     HttpOnly cookies set by the backend — no `Authorization` header.
 *  2. On non-auth mutating requests, attaches `X-CSRF-Token` from the
 *     `csrf_token` cookie (double-submit pattern).
 *  3. On 401 from a non-auth path:
 *     a. If the body has `error.code === 'REFRESH_REQUIRED'` and this request
 *        hasn't been retried yet, calls `POST /auth/refresh` and retries the
 *        original ONCE with the fresh cookies.
 *     b. Otherwise (or if refresh fails), clears the session, emits
 *        `qatu:auth-expired`, throws `SESSION_EXPIRED`.
 *  4. On 401 from an `/auth/*` path, propagates the raw error — a bad login
 *     must NOT look like an expired session.
 *  5. The `withAuth` option is DEPRECATED and IGNORED. Cookies handle auth
 *     automatically. It is kept as an accepted-but-unused property so
 *     existing call sites don't break during migration.
 *
 * @param {string} path
 * @param {RequestInit & { withAuth?: boolean }} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options;
  delete rest.withAuth; // deprecated, no-op

  const url = `${DEFAULT_BASE_URL}${path}`;
  const method = (rest.method || 'GET').toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;

  const finalHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers || {}),
  };

  // Attach CSRF on mutating non-auth paths.
  if (isMutatingMethod(method) && !isCsrfExemptPath(path)) {
    const csrf = getCsrfToken();
    if (csrf) finalHeaders['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(url, {
    ...rest,
    method,
    headers: finalHeaders,
    credentials: 'include',
  });

  if (response.status !== 401) {
    return response;
  }

  // 401 handling.
  const isAuthPath = isCsrfExemptPath(path);
  if (isAuthPath) {
    // Bad credentials on /auth/login, invalid refresh on /auth/refresh, etc.
    // Propagate raw — the caller (AuthViewModel or auto-refresh) decides.
    return response;
  }

  // Non-auth path: try refresh-then-retry ONCE for REFRESH_REQUIRED.
  const cloned = response.clone();
  const errBody = await cloned.json().catch(() => ({}));
  const code = errBody?.error?.code;

  if (code === 'REFRESH_REQUIRED') {
    let refreshResponse;
    try {
      refreshResponse = await _refreshSession();
    } catch {
      refreshResponse = null;
    }

    if (refreshResponse && refreshResponse.ok) {
      // Rebuild CSRF header with the fresh cookie value.
      const retryHeaders = { ...finalHeaders };
      if (isMutatingMethod(method) && !isCsrfExemptPath(path)) {
        const freshCsrf = getCsrfToken();
        if (freshCsrf) retryHeaders['X-CSRF-Token'] = freshCsrf;
      }
      const retried = await fetch(url, {
        ...rest,
        method,
        headers: retryHeaders,
        credentials: 'include',
      });
      if (retried.status !== 401) return retried;
      return _handleHardAuthFailure();
    }
  }

  // No REFRESH_REQUIRED, or refresh failed → hard failure.
  return _handleHardAuthFailure();
}
