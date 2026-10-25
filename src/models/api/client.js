import { authStore } from '../../store/authStore.js';

const DEFAULT_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:3000/v1';

/**
 * Minimal authenticated fetch wrapper.
 *
 * - Prepends VITE_API_BASE_URL (fallback localhost:3000/v1).
 * - If `withAuth` is true, attaches `Authorization: Bearer <token>` from authStore.
 * - On 401 with `withAuth`, clears the session and emits `qatu:auth-expired`
 *   on window, then throws a `SESSION_EXPIRED` error.
 *
 * @param {string} path       e.g. "/cart/items"
 * @param {RequestInit & { withAuth?: boolean }} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const { withAuth = false, headers, ...rest } = options;
  const url = `${DEFAULT_BASE_URL}${path}`;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (withAuth) {
    const token = authStore.getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...rest, headers: finalHeaders });

  if (withAuth && response.status === 401) {
    authStore.clearSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('qatu:auth-expired'));
    }
    const err = new Error('SESSION_EXPIRED');
    err.code = 'SESSION_EXPIRED';
    err.status = 401;
    throw err;
  }

  return response;
}
