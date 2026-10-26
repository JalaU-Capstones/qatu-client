import { authRedirectStore } from '../../store/authRedirectStore.js';
import { AuthViewModel } from '../../viewmodels/components/AuthViewModel.js';
import { AuthMarketingView } from './AuthMarketingView.js';

const QATU_LOGO_URL = new URL('../../assets/icons/qatu-logo.svg', import.meta.url).href;

// Ensure returnTo is preserved when logging out from protected / content routes
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const logoutBtn = e.target?.closest?.('.q-header-logout-btn');
      if (logoutBtn) {
        authRedirectStore.setReturnTo(window.location.pathname);
      }
    },
    true
  );
}

/**
 * View component for Authentication (Login and Register).
 * 2-column layout: marketing panel on left (desktop), single form card on right.
 */
export class AuthView {
  /**
   * @param {AuthViewModel} [viewModel]
   */
  constructor(viewModel = new AuthViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._marketing = null;
    this._unsubscribe = null;
  }

  /**
   * Renders the complete DOM tree for the authentication component.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    // Outer page wrapper — 2 columns on desktop, 1 column on mobile
    const page = document.createElement('div');
    page.className = 'q-auth-page';

    // LEFT COLUMN — marketing panel (AuthMarketingView from FE-09c-1)
    this._marketing = new AuthMarketingView({ mode: this.viewModel.mode });
    page.appendChild(this._marketing.render());

    // RIGHT COLUMN — form panel
    const formPanel = document.createElement('section');
    formPanel.className = 'q-auth-form-panel';

    const card = document.createElement('div');
    card.className = 'q-auth-card q-shadow-lg';
    card.setAttribute('data-mode', this.viewModel.mode);

    card.appendChild(this._createLoginPanel());
    card.appendChild(this._createRegisterPanel());

    formPanel.appendChild(card);
    page.appendChild(formPanel);

    this.element = page;

    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    return this.element;
  }

  /**
   * Creates the Login Form Panel (Left side).
   * @returns {HTMLElement}
   * @private
   */
  _createLoginPanel() {
    const panel = document.createElement('div');
    panel.className = 'q-auth-panel q-auth-login-panel';

    panel.innerHTML = `
      <div class="q-auth-header">
        <div class="q-auth-brand">
          <img src="${QATU_LOGO_URL}" alt="Q'atu" class="q-auth-brand-logo" />
        </div>
        <h2 class="q-auth-title">Iniciar Sesión</h2>
        <p class="q-auth-subtitle">Ingresa a tu cuenta para continuar comprando</p>
      </div>

      <div class="q-auth-alert q-auth-alert-error" style="display: none;" role="alert"></div>
      <div class="q-auth-alert q-auth-alert-success" style="display: none;" role="alert"></div>

      <button type="button" class="q-auth-social-btn q-google-login-btn">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continuar con Google
      </button>

      <div class="q-auth-divider">
        <span>o con tu correo</span>
      </div>

      <form class="q-auth-form q-login-form" novalidate>
        <div class="q-auth-field">
          <label class="q-auth-label" for="q-login-email">Correo Electrónico</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-login-email"
              class="q-auth-input"
              type="email"
              placeholder="nombre@ejemplo.com"
              autocomplete="email"
              required
            />
          </div>
        </div>

        <div class="q-auth-field">
          <label class="q-auth-label" for="q-login-password">Contraseña</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-login-password"
              class="q-auth-input"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
          </div>
        </div>

        <div class="q-auth-extras">
          <label class="q-auth-checkbox-label">
            <input type="checkbox" id="q-login-remember" />
            <span>Recordarme</span>
          </label>
          <button type="button" class="q-auth-link q-forgot-password-btn">
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button type="submit" class="q-auth-submit-btn q-login-submit-btn">
          Iniciar Sesión
        </button>

        <p class="q-auth-switch-link">
          ¿No tienes una cuenta?
          <button type="button" class="q-auth-link q-login-to-register">Regístrate</button>
        </p>
      </form>
    `;

    // Event Listeners
    const emailInput = panel.querySelector('#q-login-email');
    emailInput.addEventListener('input', (e) => {
      this.viewModel.setLoginField('email', e.target.value.trim());
    });

    const passwordInput = panel.querySelector('#q-login-password');
    passwordInput.addEventListener('input', (e) => {
      this.viewModel.setLoginField('password', e.target.value);
    });

    const rememberInput = panel.querySelector('#q-login-remember');
    rememberInput.addEventListener('change', (e) => {
      this.viewModel.setLoginField('rememberMe', e.target.checked);
    });

    const form = panel.querySelector('.q-login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.viewModel.submitLogin();
    });

    const googleBtn = panel.querySelector('.q-google-login-btn');
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.triggerGoogleAuth();
    });

    const forgotBtn = panel.querySelector('.q-forgot-password-btn');
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.triggerForgotPassword();
    });

    const directRegister = panel.querySelector('.q-login-to-register');
    if (directRegister) {
      directRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.viewModel.setMode('register');
      });
    }

    return panel;
  }

  /**
   * Creates the Register Form Panel (Right side).
   * Incorporates Figma requirements: official logo, revised copy, username input,
   * password requirement guidance, direct switch link, and tokenized styling.
   * @returns {HTMLElement}
   * @private
   */
  _createRegisterPanel() {
    const panel = document.createElement('div');
    panel.className = 'q-auth-panel q-auth-register-panel';

    panel.innerHTML = `
      <div class="q-auth-header">
        <div class="q-auth-brand">
          <img src="${QATU_LOGO_URL}" alt="Q'atu" class="q-auth-brand-logo" />
        </div>
        <h2 class="q-auth-title">Crea tu cuenta y compra con propósito</h2>
        <p class="q-auth-subtitle">Únete a la comunidad de Q'atu</p>
      </div>

      <div class="q-auth-alert q-auth-alert-error" style="display: none;" role="alert"></div>
      <div class="q-auth-alert q-auth-alert-success" style="display: none;" role="alert"></div>

      <button type="button" class="q-auth-social-btn q-google-register-btn">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continuar con Google
      </button>

      <div class="q-auth-divider">
        <span>o con tus datos</span>
      </div>

      <form class="q-auth-form q-register-form" novalidate>
        <div class="q-auth-field">
          <label class="q-auth-label" for="q-register-name">Nombre Completo</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-register-name"
              class="q-auth-input"
              type="text"
              placeholder="Ej. Camila Morales"
              autocomplete="name"
              required
            />
          </div>
        </div>

        <div class="q-auth-field">
          <label class="q-auth-label" for="q-register-username">Usuario</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-register-username"
              class="q-auth-input"
              type="text"
              placeholder="Ej. camilam"
              autocomplete="username"
              required
            />
          </div>
        </div>

        <div class="q-auth-field">
          <label class="q-auth-label" for="q-register-email">Correo Electrónico</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-register-email"
              class="q-auth-input"
              type="email"
              placeholder="nombre@ejemplo.com"
              autocomplete="email"
              required
            />
          </div>
        </div>

        <div class="q-auth-field">
          <label class="q-auth-label" for="q-register-password">Contraseña</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-register-password"
              class="q-auth-input"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
            />
          </div>
          <p class="q-auth-password-hint">Mínimo 8 caracteres, una mayúscula y un número</p>
        </div>

        <div class="q-auth-field">
          <label class="q-auth-label" for="q-register-confirm-password">Confirmar Contraseña</label>
          <div class="q-auth-input-wrapper">
            <input
              id="q-register-confirm-password"
              class="q-auth-input"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
            />
          </div>
        </div>

        <div class="q-auth-extras">
          <label class="q-auth-checkbox-label">
            <input type="checkbox" id="q-register-terms" />
            <span>Acepto los términos y condiciones</span>
          </label>
        </div>

        <button type="submit" class="q-auth-submit-btn q-register-submit-btn">
          Crear Cuenta
        </button>

        <p class="q-auth-switch-link">
          ¿Ya tienes una cuenta?
          <button type="button" class="q-auth-link q-register-to-login">Iniciar sesión</button>
        </p>
      </form>
    `;

    // Event Listeners
    const nameInput = panel.querySelector('#q-register-name');
    nameInput.addEventListener('input', (e) => {
      this.viewModel.setRegisterField('name', e.target.value);
    });

    const usernameInput = panel.querySelector('#q-register-username');
    usernameInput.addEventListener('input', (e) => {
      this.viewModel.setRegisterField('username', e.target.value.trim());
    });

    const emailInput = panel.querySelector('#q-register-email');
    emailInput.addEventListener('input', (e) => {
      this.viewModel.setRegisterField('email', e.target.value.trim());
    });

    const passInput = panel.querySelector('#q-register-password');
    passInput.addEventListener('input', (e) => {
      this.viewModel.setRegisterField('password', e.target.value);
    });

    const confirmPassInput = panel.querySelector('#q-register-confirm-password');
    confirmPassInput.addEventListener('input', (e) => {
      this.viewModel.setRegisterField('confirmPassword', e.target.value);
    });

    const termsInput = panel.querySelector('#q-register-terms');
    termsInput.addEventListener('change', (e) => {
      this.viewModel.setRegisterField('acceptTerms', e.target.checked);
    });

    const form = panel.querySelector('.q-register-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.viewModel.submitRegister();
    });

    const googleBtn = panel.querySelector('.q-google-register-btn');
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.triggerGoogleAuth();
    });

    const directToLogin = panel.querySelector('.q-register-to-login');
    if (directToLogin) {
      directToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.viewModel.setMode('login');
      });
    }

    return panel;
  }

  /**
   * Updates the DOM based on ViewModel state.
   * @param {AuthViewModel} vm
   * @private
   */
  _update(vm) {
    if (!this.element) return;

    // Sync the marketing panel's title with the current mode
    if (this._marketing) {
      this._marketing.setMode(vm.mode);
    }

    // Toggle which form panel is visible
    const card = this.element.querySelector('.q-auth-card');
    if (card) {
      card.setAttribute('data-mode', vm.mode);
    }

    // Alerts — same as before
    const errorAlerts = this.element.querySelectorAll('.q-auth-alert-error');
    errorAlerts.forEach((alert) => {
      if (vm.errorMessage) {
        alert.textContent = vm.errorMessage;
        alert.style.display = 'flex';
      } else {
        alert.textContent = '';
        alert.style.display = 'none';
      }
    });

    const successAlerts = this.element.querySelectorAll('.q-auth-alert-success');
    successAlerts.forEach((alert) => {
      if (vm.successMessage) {
        alert.textContent = vm.successMessage;
        alert.style.display = 'flex';
      } else {
        alert.textContent = '';
        alert.style.display = 'none';
      }
    });

    // Submit buttons loading state — same as before
    const submitBtns = this.element.querySelectorAll('.q-auth-submit-btn');
    submitBtns.forEach((btn) => {
      btn.disabled = vm.isLoading;
    });
  }

  /**
   * Mounts the authentication component into a parent container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Destroys the component, cleans up event listeners and subscriptions.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._marketing) {
      this._marketing.destroy();
      this._marketing = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Alias for convenience
export { AuthView as LoginRegisterView };
