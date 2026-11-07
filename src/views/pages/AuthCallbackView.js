import { AuthApi } from '../../models/api/AuthApi.js';
import { supabase } from '../../models/api/client.js';
import { authStore } from '../../store/authStore.js';

/**
 * Guard time for the OAuth handoff. If Supabase never emits SIGNED_IN (e.g.
 * the PKCE `state` did not match — CSRF attempt — the code was already
 * consumed, or the network died), the user is NOT left on a blank screen:
 * we show the error inline and send them back to /login.
 *
 * Note on CSRF: Supabase (flowType 'pkce' + detectSessionInUrl) validates the
 * `state` parameter against the PKCE verifier it stored before redirecting to
 * Google. If the state does not match, NO SIGNED_IN event fires, so this
 * timeout is the catch-all for state-mismatch and stale/failed callbacks.
 */
const DEFAULT_HANDOFF_TIMEOUT_MS = 8000;

/** Brief pause so the user can read the inline message before redirecting. */
const DEFAULT_REDIRECT_DELAY_MS = 1200;

/**
 * Removes every Supabase-managed key from localStorage AND sessionStorage.
 *
 * After the handoff the backend owns the session (HttpOnly cookies), so the
 * browser-side tokens — stored by Supabase under `sb-*` keys — must not
 * survive. We deliberately do NOT call `supabase.auth.signOut()`: that
 * endpoint would revoke the very session the backend cookie now holds
 * (see ADR-012).
 *
 * @private
 */
function _clearSupabaseStorage() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    Object.keys(storage)
      .filter((key) => key.startsWith('sb-') || key.includes('supabase'))
      .forEach((key) => storage.removeItem(key));
  }
}

/**
 * /auth/callback page view (Google OAuth handoff).
 *
 * Flow:
 *  1. Supabase (`detectSessionInUrl`) consumes the `code` in the URL using the
 *     stored PKCE verifier and emits SIGNED_IN with the provider session.
 *  2. We POST the short-lived Supabase tokens to `POST /v1/auth/oauth/exchange`
 *     and the backend answers with its own session (Set-Cookie: HttpOnly).
 *  3. We wipe ALL Supabase token storage and redirect home. Zero tokens are
 *     ever left in localStorage/sessionStorage (DoD audit: search any `sb-*`
 *     or `*supabase*` key after the flow — it must be empty).
 */
export class AuthCallbackView {
  /**
   * @param {Object} [options]
   * @param {AuthApi} [options.authApi]
   * @param {number} [options.handoffTimeoutMs=8000]
   * @param {number} [options.redirectDelayMs=1200]
   * @param {Function} [options.navigate] Full-page redirect (defaults to
   *   `window.location.replace`). Injectable so specs can observe navigation
   *   without stubbing the `Location` object.
   */
  constructor({
    authApi = new AuthApi(),
    handoffTimeoutMs = DEFAULT_HANDOFF_TIMEOUT_MS,
    redirectDelayMs = DEFAULT_REDIRECT_DELAY_MS,
    navigate = (url) => window.location.replace(url),
  } = {}) {
    this.element = document.createElement('div');
    this.element.className = 'q-auth-callback q-glass-panel';
    this.element.style.padding = '10px';
    this.element.style.textAlign = 'center';

    this.authApi = authApi;
    this.handoffTimeoutMs = handoffTimeoutMs;
    this.redirectDelayMs = redirectDelayMs;
    this.navigate = navigate;

    this._subscription = null;
    this._timeoutId = null;
    this._redirectTimerId = null;
    this._settled = false;
  }

  render() {
    this._renderLoading();

    if (this._handleOAuthErrorParam()) {
      return this.element;
    }

    this._listenForSession();
    this._startTimeoutGuard();

    return this.element;
  }

  /** Clears timers/listeners. Called by the app shell when navigating away. */
  destroy() {
    if (this._subscription) {
      this._subscription.unsubscribe();
      this._subscription = null;
    }
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._redirectTimerId) {
      clearTimeout(this._redirectTimerId);
      this._redirectTimerId = null;
    }
  }

  /**
   * Loading state: "Completando inicio de sesión…" — the route must never
   * render a blank screen while the handoff is in flight.
   * @private
   */
  _renderLoading() {
    this.element.innerHTML = '<h3>Completando inicio de sesión…</h3><p>Por favor, espera.</p>';
  }

  /**
   * Handles a cancelled/failed provider authorization. Google redirects back
   * with `error=access_denied` (user closed the consent screen) or similar in
   * the query string — Supabase will never emit SIGNED_IN in that case.
   *
   * Clears partial state and returns the user to the login page with
   * `?error=oauth_cancelled`, which AuthViewModel surfaces as a banner.
   *
   * @returns {boolean} true when an OAuth error param was present.
   * @private
   */
  _handleOAuthErrorParam() {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');

    if (!oauthError) {
      return false;
    }

    const isCancelled = oauthError === 'access_denied';
    this._renderError(
      isCancelled
        ? 'Autorización cancelada.'
        : 'No se pudo completar el inicio de sesión con Google.',
      'Redirigiendo al inicio de sesión…'
    );

    _clearSupabaseStorage();
    authStore.clearSession?.();
    this._redirectToLogin('oauth_cancelled');
    return true;
  }

  /** Subscribes to Supabase auth events (keeps the subscription for destroy). @private */
  _listenForSession() {
    const { data } = supabase.auth.onAuthStateChange((event, session) =>
      this._onAuthStateChange(event, session)
    );
    this._subscription = data?.subscription || null;
  }

  /**
   * Fallback for the "nothing ever happens" edge cases: unmatched PKCE state
   * (CSRF check fails), consumed `code`, or network timeout.
   * @private
   */
  _startTimeoutGuard() {
    this._timeoutId = setTimeout(() => {
      if (this._settled) return;
      this._settled = true;
      this._renderError(
        'El inicio de sesión tardó demasiado.',
        'Redirigiendo al inicio de sesión…'
      );
      _clearSupabaseStorage();
      this._redirectToLogin('oauth_timeout');
    }, this.handoffTimeoutMs);
  }

  /**
   * SIGNED_IN handler: exchange the Supabase tokens for the backend session.
   * @private
   */
  async _onAuthStateChange(event, session) {
    if (event !== 'SIGNED_IN' || !session || this._settled) {
      return;
    }

    this._settled = true;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }

    try {
      const { data } = await this.authApi.exchangeOAuthToken(
        session.access_token,
        session.refresh_token
      );

      authStore.setSession({
        user: data.user,
        profile: data.profile,
        roles: data.roles,
      });

      supabase.auth.stopAutoRefresh();

      _clearSupabaseStorage();

      this.navigate('/');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error en handoff OAuth', error);
      this._renderError(
        'No se pudo completar el inicio de sesión con Google.',
        'Redirigiendo al inicio de sesión…'
      );
      _clearSupabaseStorage();
      this._redirectToLogin('oauth_failed');
    }
  }

  /**
   * Inline error UI (never a blank screen), then redirect to /login so the
   * AuthViewModel banner can repeat the context there.
   * @private
   */
  _renderError(title, detail) {
    this.element.innerHTML =
      `<h3>${title}</h3><p>${detail}</p>` +
      '<p><a href="/login">Volver al inicio de sesión</a></p>';
  }

  /** @private */
  _redirectToLogin(errorCode) {
    this._redirectTimerId = setTimeout(() => {
      this.navigate(`/login?error=${errorCode}`);
    }, this.redirectDelayMs);
  }
}
