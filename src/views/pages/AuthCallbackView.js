import { AuthApi } from '../../models/api/AuthApi.js';
import { supabase } from '../../models/api/client.js';
import { authStore } from '../../store/authStore.js';

const DEFAULT_HANDOFF_TIMEOUT_MS = 8000;
const DEFAULT_REDIRECT_DELAY_MS = 1200;

/** Dev-only gate: debug output is stripped from production builds. */
const DEBUG = Boolean(import.meta.env?.DEV);

/**
 * Structured debug logging, gated behind `import.meta.env.DEV` so no raw
 * console output ships to production (review F5).
 *
 * @param {string} event
 * @param {Object} [details]
 * @private
 */
function debugLog(event, details = {}) {
  if (!DEBUG) return;
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.debug('[OAuth Callback]', event, details);
  }, 0);
}

/**
 * Removes every Supabase-managed key from localStorage and sessionStorage,
 * leaving zero tokens behind after the handoff (DoD audit).
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
 * /auth/callback page view (Google OAuth handoff). Waits for Supabase to
 * consume the PKCE code (SIGNED_IN), POSTs the tokens to
 * /v1/auth/oauth/exchange, clears the local Supabase session and redirects
 * home or back to /login with an error code.
 */
export class AuthCallbackView {
  /**
   * @param {Object} [options]
   * @param {AuthApi} [options.authApi]
   * @param {number} [options.handoffTimeoutMs=8000]
   * @param {number} [options.redirectDelayMs=1200]
   * @param {Function} [options.navigate] Full-page redirect injected for specs.
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

  /** @returns {HTMLElement} */
  render() {
    this._renderLoading();
    debugLog('route-mounted', { href: window.location.href });

    if (this._handleOAuthErrorParam()) {
      return this.element;
    }

    this._listenForSession();
    this._startTimeoutGuard();

    return this.element;
  }

  /** Clears timers and listeners. Called by the app shell when navigating away. */
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

  /** @private */
  _renderLoading() {
    this.element.innerHTML = '<h3>Completando inicio de sesión…</h3><p>Por favor, espera.</p>';
  }

  /**
   * Handles a cancelled/failed provider authorization (`error=access_denied`
   * in the query string). Supabase never emits SIGNED_IN in that case.
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
    debugLog('oauth-error-param', { error: oauthError, cancelled: isCancelled });
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

  /** @private */
  _listenForSession() {
    debugLog('awaiting-signed-in', {});
    const { data } = supabase.auth.onAuthStateChange((event, session) =>
      this._onAuthStateChange(event, session)
    );
    this._subscription = data?.subscription || null;
  }

  /**
   * Fallback for PKCE state mismatch, consumed code or network failure.
   * @private
   */
  _startTimeoutGuard() {
    this._timeoutId = setTimeout(() => {
      if (this._settled) return;
      this._settled = true;
      debugLog('handoff-timeout', { ms: this.handoffTimeoutMs });
      this._renderError(
        'El inicio de sesión tardó demasiado.',
        'Redirigiendo al inicio de sesión…'
      );
      _clearSupabaseStorage();
      this._redirectToLogin('oauth_timeout');
    }, this.handoffTimeoutMs);
  }

  /**
   * SIGNED_IN handler: exchange the Supabase tokens for the backend session,
   * then clear the local-only Supabase session and redirect home.
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

    debugLog('signed-in-received', {
      hasAccessToken: Boolean(session?.access_token),
      hasRefreshToken: Boolean(session?.refresh_token),
    });

    if (!session?.access_token || !session?.refresh_token) {
      debugLog('signed-in-incomplete', {});
      this._renderError(
        'No se pudo completar el inicio de sesión con Google.',
        'Redirigiendo al inicio de sesión…'
      );
      _clearSupabaseStorage();
      this._redirectToLogin('oauth_timeout');
      return;
    }

    try {
      debugLog('exchange-starting', { endpoint: '/v1/auth/oauth/exchange' });

      const { data } = await this.authApi.exchangeOAuthToken(
        session.access_token,
        session.refresh_token
      );

      debugLog('exchange-finished', {
        hasUser: Boolean(data?.user),
        hasProfile: Boolean(data?.profile),
      });

      authStore.setSession({
        user: data.user,
        profile: data.profile,
        roles: data.roles,
      });

      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        debugLog('signout-failed', { message: signOutError?.message });
      }

      supabase.auth.stopAutoRefresh();
      _clearSupabaseStorage();

      debugLog('handoff-completed', { next: '/' });
      this.navigate('/');
    } catch (error) {
      debugLog('exchange-failed', { message: error?.message, status: error?.status ?? null });
      this._renderError(
        'No se pudo completar el inicio de sesión con Google.',
        'Redirigiendo al inicio de sesión…'
      );
      _clearSupabaseStorage();
      this._redirectToLogin('oauth_failed');
    }
  }

  /**
   * Renders an inline error message, then redirects to /login so
   * AuthViewModel surfaces a banner with the same context.
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
