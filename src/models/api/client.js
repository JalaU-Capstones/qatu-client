import { createClient } from '@supabase/supabase-js';

import { authStore } from '../../store/authStore.js';
import { getCsrfToken, isCsrfExemptPath, isMutatingMethod } from './csrf.js';

/** Matches every PKCE verifier slot key (`*-code-verifier`). */
export const PKCE_STORAGE_KEY_PATTERN = /-code-verifier$/;

/**
 * Storage adapter for the Supabase auth client: persists only PKCE verifier
 * keys to localStorage (they must survive the Google redirect); tokens stay
 * in memory and never touch persistent storage.
 *
 * @returns {Storage}
 */
export function createAuthStorage() {
  const memory = new Map();
  const persistent =
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

  const isPkceKey = (key) => PKCE_STORAGE_KEY_PATTERN.test(key);

  return {
    getItem(key) {
      if (isPkceKey(key) && persistent) {
        return persistent.getItem(key);
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      if (isPkceKey(key) && persistent) {
        persistent.setItem(key, value);
        return;
      }
      memory.set(key, value);
    },
    removeItem(key) {
      if (isPkceKey(key) && persistent) {
        persistent.removeItem(key);
        return;
      }
      memory.delete(key);
    },
  };
}

/**
 * Supabase auth client shared application-wide. Consumes the PKCE code on
 * `/auth/callback` and emits SIGNED_IN for the OAuth handoff.
 */
export const supabase = createClient(
  import.meta.env?.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  import.meta.env?.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: false,
      storage: createAuthStorage(),
    },
  }
);

const DEFAULT_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:3000/v1';

/** Clears the session, emits `qatu:auth-expired` and throws SESSION_EXPIRED. */
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
 * Calls `POST /auth/refresh` with cookies attached. Deliberately bypasses
 * `apiFetch` to avoid recursion.
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
 * Authenticated fetch wrapper for the Qatu API. Sends cookies and the CSRF
 * header on mutating requests; on `REFRESH_REQUIRED` 401s it refreshes the
 * session and retries once, then throws SESSION_EXPIRED on failure.
 *
 * @param {string} path
 * @param {RequestInit & { withAuth?: boolean }} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options;
  delete rest.withAuth;

  const url = `${DEFAULT_BASE_URL}${path}`;
  const method = (rest.method || 'GET').toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;

  const finalHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers || {}),
  };

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

  const isAuthPath = isCsrfExemptPath(path);
  if (isAuthPath) {
    return response;
  }

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

  return _handleHardAuthFailure();
}
