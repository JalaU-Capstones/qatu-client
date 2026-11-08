import { AuthApi } from '../../models/api/AuthApi.js';
import { supabase } from '../../models/api/client.js';
import { authStore } from '../../store/authStore.js';

/** Maps the /login `error` query param to a user-facing message. */
export const OAUTH_LOGIN_ERROR_MESSAGES = {
  oauth_cancelled: 'Autorización cancelada. Puedes intentarlo de nuevo.',
  oauth_failed: 'No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.',
  oauth_timeout: 'El inicio de sesión tardó demasiado. Inténtalo de nuevo.',
};

/**
 * ViewModel for Authentication (Login and Register) component.
 * Manages mode switching ('login' vs 'register'), form states, validation,
 * API integration for registration and login, session management, and routing navigation.
 */
export class AuthViewModel {
  /**
   * @param {Object} [options]
   * @param {'login'|'register'} [options.initialMode='login']
   * @param {AuthApi} [options.authApi]
   * @param {import('../../store/authStore.js').AuthStore} [options.authStore]
   * @param {Function} [options.onLogin] Callback receiving { email, password, rememberMe }
   * @param {Function} [options.onLoginSuccess] Callback receiving { user, profile, roles, response }
   * @param {Function} [options.onRegister] Callback receiving { name, full_name, username, email, password, confirmPassword, acceptTerms }
   * @param {Function} [options.onRegisterSuccess] Callback receiving { user, profile, roles, response }
   * @param {Function} [options.onNavigate] Callback for navigation, e.g. (path) => router.navigate(path)
   * @param {Function} [options.onModeChange] Callback receiving the new mode ('login' | 'register')
   * @param {Function} [options.onGoogleAuth] Callback for Google authentication
   * @param {Function} [options.onForgotPassword] Callback when user clicks forgot password
   */
  constructor(options = {}) {
    this.mode = options.initialMode || 'login';
    this.authApi = options.authApi || new AuthApi();
    this.authStore = options.authStore || authStore;
    this.onNavigate = options.onNavigate || null;
    this.onLoginSuccess = options.onLoginSuccess || null;
    this.onRegisterSuccess = options.onRegisterSuccess || null;

    this.loginData = {
      email: '',
      password: '',
      rememberMe: false,
    };
    this.registerData = {
      name: '',
      full_name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    };
    this.isLoading = false;
    this.errorMessage = '';
    this.successMessage = '';

    this.onLogin = options.onLogin || null;
    this.onRegister = options.onRegister || null;
    this.onModeChange = options.onModeChange || null;
    this.onGoogleAuth = options.onGoogleAuth || null;
    this.onForgotPassword = options.onForgotPassword || null;

    this._listeners = new Set();
  }

  get isLoginMode() {
    return this.mode === 'login';
  }

  get isRegisterMode() {
    return this.mode === 'register';
  }

  setMode(newMode) {
    if (newMode !== 'login' && newMode !== 'register') {
      return;
    }
    if (this.mode !== newMode) {
      this.mode = newMode;
      this.errorMessage = '';
      this.successMessage = '';
      if (typeof this.onModeChange === 'function') {
        this.onModeChange(this.mode);
      }
      this._notify();
    }
  }

  toggleMode() {
    this.setMode(this.mode === 'login' ? 'register' : 'login');
  }

  setLoginField(field, value) {
    if (field in this.loginData) {
      this.loginData[field] = value;
      this._notify();
    }
  }

  setRegisterField(field, value) {
    if (field in this.registerData) {
      this.registerData[field] = value;
      if (field === 'name') {
        this.registerData.full_name = value;
      } else if (field === 'full_name') {
        this.registerData.name = value;
      }
      this._notify();
    }
  }

  setLoading(loading) {
    this.isLoading = Boolean(loading);
    this._notify();
  }

  setError(message) {
    this.errorMessage = message || '';
    if (this.errorMessage) {
      this.successMessage = '';
    }
    this._notify();
  }

  setSuccess(message) {
    this.successMessage = message || '';
    if (this.successMessage) {
      this.errorMessage = '';
    }
    this._notify();
  }

  /**
   * Submits the login form: validates fields, calls the login endpoint and
   * stores the session on success.
   *
   * @returns {Promise<boolean>}
   */
  async submitLogin() {
    const rawEmail = (this.loginData.email || '').trim();
    const rawPassword = this.loginData.password;

    if (!rawEmail || !rawPassword) {
      this.setError('Por favor completa todos los campos.');
      return false;
    }

    this.setError('');

    if (typeof this.onLogin === 'function') {
      this.onLogin({ ...this.loginData, email: rawEmail });
    }

    if (this.authApi && typeof this.authApi.login === 'function') {
      this.setLoading(true);
      try {
        const response = await this.authApi.login({
          email: rawEmail,
          password: rawPassword,
        });
        this.setLoading(false);

        const user = response?.data?.user || response?.user || null;
        const profile = response?.data?.profile || response?.profile || user || null;
        const roles = response?.data?.roles || response?.roles || [];

        if (this.authStore && typeof this.authStore.setSession === 'function') {
          this.authStore.setSession({ user, profile, roles });
        }

        if (typeof this.onLoginSuccess === 'function') {
          this.onLoginSuccess({ user, profile, roles, response });
        }

        if (typeof this.onNavigate === 'function') {
          this.onNavigate('/');
        }

        return true;
      } catch (err) {
        this.setLoading(false);
        this.setError(err.message || 'Error al iniciar sesión');
        return false;
      }
    }

    return true;
  }

  /**
   * Submits the register form: validates fields, password match and terms,
   * then calls the register endpoint and stores the session on success.
   *
   * @returns {Promise<boolean>}
   */
  async submitRegister() {
    const rawUsername = this.registerData.username ? this.registerData.username.trim() : '';
    const rawFullName = (this.registerData.full_name || this.registerData.name || '').trim();
    const rawEmail = (this.registerData.email || '').trim();

    if (!rawFullName || !rawUsername || !rawEmail || !this.registerData.password) {
      this.setError('Por favor completa todos los campos obligatorios.');
      return false;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(rawUsername)) {
      this.setError('El nombre de usuario debe tener entre 3 y 30 caracteres alfanuméricos.');
      return false;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.setError('Las contraseñas no coinciden.');
      return false;
    }

    if (!this.registerData.acceptTerms) {
      this.setError('Debes aceptar los términos y condiciones.');
      return false;
    }

    const payload = {
      email: rawEmail,
      password: this.registerData.password,
      username: rawUsername,
      full_name: rawFullName,
    };

    this.setError('');

    if (typeof this.onRegister === 'function') {
      this.onRegister({ ...this.registerData, ...payload });
    }

    if (this.authApi && typeof this.authApi.register === 'function') {
      this.setLoading(true);
      try {
        const response = await this.authApi.register(payload);
        this.setLoading(false);

        const user = response?.data?.user || response?.user || null;
        const profile = response?.data?.profile || response?.profile || user || null;
        const roles = response?.data?.roles || response?.roles || [];

        if (this.authStore && typeof this.authStore.setSession === 'function') {
          this.authStore.setSession({ user, profile, roles });
        }

        if (typeof this.onRegisterSuccess === 'function') {
          this.onRegisterSuccess({ user, profile, roles, response });
        }

        if (typeof this.onNavigate === 'function') {
          this.onNavigate('/');
        }

        return true;
      } catch (err) {
        this.setLoading(false);
        this.setError(err.message || 'Error en el registro');
        return false;
      }
    }

    return true;
  }

  /**
   * Surfaces OAuth handoff errors redirected from /auth/callback via the
   * `?error=` query param. No-ops when the param is absent or unknown.
   *
   * @param {string} [search] Query string to inspect (defaults to the current URL).
   * @returns {boolean} true when an OAuth error message was applied.
   */
  applyOAuthErrorFeedback(search = window.location.search) {
    const code = new URLSearchParams(search).get('error');
    const message = OAUTH_LOGIN_ERROR_MESSAGES[code];
    if (!message) {
      return false;
    }
    this.setError(message);
    return true;
  }

  /**
   * Starts the Google OAuth sign-in flow with PKCE and redirects to the
   * callback page. Delegates to `onGoogleAuth` when provided.
   *
   * @returns {Promise<void>}
   */
  async triggerGoogleAuth() {
    if (typeof this.onGoogleAuth === 'function') {
      this.onGoogleAuth();
      return;
    }

    this.isLoading = true;
    this._notify();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          flowType: 'pkce',
        },
      });

      if (error) throw error;
    } catch (err) {
      this.errorMessage = err.message || 'Error al conectar con Google';
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Triggers forgot password flow.
   */
  triggerForgotPassword() {
    if (typeof this.onForgotPassword === 'function') {
      this.onForgotPassword();
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}

export { AuthViewModel as LoginRegisterViewModel };
