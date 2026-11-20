import { AuthViewModel } from '../../viewmodels/components/AuthViewModel.js';
import { AuthView } from '../components/AuthView.js';
import { createBrandLogo } from '../components/BrandLogo.js';

const MARKETING_HEADLINES = {
  login: 'Qué bueno verte de nuevo.',
  register: 'Crea tu cuenta y compra con propósito.',
};

function createCheckIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 8.5l3 3 7-7');
  svg.appendChild(path);
  return svg;
}

function createBrand() {
  const brand = document.createElement('div');
  brand.className = 'q-auth__logo';
  brand.setAttribute('aria-label', "Q'atu");

  brand.appendChild(createBrandLogo({ size: 'md' }));
  return brand;
}

/**
 * Authentication page shell around the shared AuthView.
 * The AuthView continues to own all form fields, listeners, and submission state.
 */
export class AuthPageView {
  /**
   * @param {Object} [options]
   * @param {'login'|'register'} [options.mode='register']
   * @param {Object} [options.authApi]
   * @param {Object} [options.authStore]
   * @param {Function} [options.onNavigate] Path-based navigation callback (e.g. router.navigate)
   * @param {Function} [options.onModeChange] Called with the new mode after a mode change
   */
  constructor({
    mode = 'register',
    authApi,
    authStore,
    onNavigate = () => {},
    onModeChange = () => {},
  } = {}) {
    this.viewModel = new AuthViewModel({
      initialMode: mode,
      authApi,
      authStore,
      onNavigate,
      onModeChange,
    });
    this.viewModel.applyOAuthErrorFeedback();
    this.view = new AuthView(this.viewModel);
    this.element = null;
    this._marketingHeadline = null;
    this._unsubscribeMode = null;
  }

  /** @returns {'login'|'register'} */
  get mode() {
    return this.viewModel.mode;
  }

  /** @param {'login'|'register'} mode */
  setMode(mode) {
    this.viewModel.setMode(mode);
  }

  /**
   * Renders the underlying AuthView inside the split-screen presentation.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) return this.element;

    const page = this.view.render();
    this._applyPresentation(page);
    this.element = page;
    this._syncPresentation(this.viewModel);
    this._unsubscribeMode = this.viewModel.subscribe((viewModel) => {
      this._syncPresentation(viewModel);
    });
    return this.element;
  }

  /** @param {HTMLElement} container */
  mount(container) {
    this.render();
    this.view.mount(container);
  }

  destroy() {
    if (typeof this._unsubscribeMode === 'function') {
      this._unsubscribeMode();
      this._unsubscribeMode = null;
    }
    this.view.destroy();
    this.element = null;
    this._marketingHeadline = null;
  }

  _applyPresentation(page) {
    page.classList.add('q-auth__layout');

    const marketing = page.querySelector('.q-auth-marketing');
    const content = marketing?.querySelector('.q-auth-marketing__content');
    const formPanel = page.querySelector('.q-auth-form-panel');
    const card = page.querySelector('.q-auth-card');

    if (marketing && content) {
      marketing.className = 'q-auth__left';
      marketing.querySelectorAll('.q-ambient__blob').forEach((blob) => blob.remove());
      content.className = 'q-auth__left-content';
      content.querySelector('.q-auth-marketing__brand')?.remove();

      const eyebrow = content.querySelector('.q-auth-marketing__eyebrow');
      if (eyebrow) {
        eyebrow.className = 'q-auth__eyebrow';
        const eyebrowText = eyebrow.textContent;
        const dot = document.createElement('span');
        dot.className = 'q-auth__eyebrow-dot';
        dot.setAttribute('aria-hidden', 'true');
        eyebrow.replaceChildren(dot, document.createTextNode(eyebrowText));
      }

      const headline = content.querySelector('.q-auth-marketing__title');
      if (headline) {
        const replacement = document.createElement('h1');
        replacement.className = 'q-auth__headline';
        replacement.textContent = headline.textContent;
        headline.replaceWith(replacement);
        this._marketingHeadline = replacement;
      }

      const body = content.querySelector('.q-auth-marketing__subtitle');
      if (body) body.className = 'q-auth__body';

      const features = content.querySelector('.q-auth-marketing__features');
      if (features) {
        features.className = 'q-auth__features';
        features.querySelectorAll('.q-auth-marketing__feature').forEach((feature) => {
          feature.className = 'q-auth__feature';
          feature.querySelector('svg')?.replaceWith(createCheckIcon());
        });
      }
    }

    if (formPanel) {
      formPanel.classList.add('q-auth__right');
    }

    if (card) {
      card.classList.add('q-auth__card');
      card.classList.remove('q-glass-panel');
    }

    page.querySelectorAll('.q-auth-login-panel, .q-auth-register-panel').forEach((panel) => {
      this._prepareFormPanel(panel);
    });
  }

  _prepareFormPanel(panel) {
    const mode = panel.classList.contains('q-auth-login-panel') ? 'login' : 'register';
    const header = panel.querySelector('.q-auth-header');
    const originalBrand = header?.querySelector('.q-auth-brand');
    if (originalBrand) originalBrand.replaceWith(createBrand());

    const title = panel.querySelector('.q-auth-title');
    title?.classList.add('q-auth__title');
    const helper = panel.querySelector('.q-auth-subtitle');
    helper?.classList.add('q-auth__helper');

    const fieldLabels = {
      '#q-login-email': 'Correo electrónico',
      '#q-register-name': 'Nombre completo',
      '#q-register-email': 'Correo electrónico',
      '#q-register-confirm-password': 'Confirmar contraseña',
    };
    Object.entries(fieldLabels).forEach(([inputSelector, labelText]) => {
      const input = panel.querySelector(inputSelector);
      if (!input) return;
      const label = panel.querySelector(`label[for="${input.id}"]`);
      if (label) label.textContent = labelText;
    });

    const form = panel.querySelector('.q-auth-form');
    form?.classList.add('q-auth__form');
    form?.addEventListener('submit', () => form.classList.add('is-submitted'));
    panel.querySelectorAll('.q-auth-label').forEach((label) => {
      label.classList.add('q-auth__label');
    });
    panel.querySelectorAll('.q-auth-input').forEach((input) => {
      input.classList.add('q-auth__input');
    });
    panel.querySelector('.q-auth-password-hint')?.classList.add('q-auth__password-hint');
    panel.querySelector('.q-auth-password-strength')?.classList.add('q-auth__password-strength');
    panel.querySelector('.q-auth-extras')?.classList.add('q-auth__extras');
    panel.querySelector('.q-auth-checkbox-label')?.classList.add('q-auth__checkbox-label');
    panel.querySelector('.q-forgot-password-btn')?.classList.add('q-auth__forgot');

    const submitButton = panel.querySelector('.q-auth-submit-btn');
    submitButton?.classList.add('q-auth__submit');
    if (submitButton) {
      submitButton.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    }

    const switchLink = panel.querySelector('.q-auth-switch-link');
    const switchButton = switchLink?.querySelector('.q-auth-link');
    if (switchLink) {
      switchLink.classList.add('q-auth__switch');
      const textNode = Array.from(switchLink.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE
      );
      if (textNode) {
        textNode.nodeValue = mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes una cuenta? ';
      }
    }
    if (switchButton) {
      switchButton.textContent = mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión';
    }

    const googleButton = panel.querySelector('.q-auth-social-btn');
    if (googleButton) {
      googleButton.classList.add('q-auth__google');
      googleButton.querySelectorAll('svg path').forEach((path) => {
        path.setAttribute('fill', 'currentColor');
      });
      Array.from(googleButton.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .forEach((node) => node.remove());
      googleButton.appendChild(document.createTextNode('Continuar con Google'));
    }

    const originalError = panel.querySelector('.q-auth-alert-error');
    let error = originalError;
    if (originalError) {
      error = document.createElement('p');
      error.className = `${originalError.className} q-auth__error`;
      error.setAttribute('role', 'alert');
      error.textContent = originalError.textContent;
      error.style.display = this.viewModel.errorMessage ? 'flex' : 'block';
      originalError.replaceWith(error);
    }

    const success = panel.querySelector('.q-auth-alert-success');
    success?.classList.add('q-auth__success');

    panel.querySelector('.q-auth-divider')?.remove();
    switchLink?.remove();
    googleButton?.remove();
    error?.remove();
    success?.remove();
    if (form) {
      form.append(error, success, googleButton, switchLink);
    }
  }

  _syncPresentation(viewModel) {
    if (this._marketingHeadline) {
      this._marketingHeadline.textContent = MARKETING_HEADLINES[viewModel.mode];
    }

    const card = this.element?.querySelector('.q-auth-card');
    card?.querySelectorAll('.q-auth-login-panel, .q-auth-register-panel').forEach((panel) => {
      panel.hidden = panel.classList.contains('q-auth-login-panel')
        ? viewModel.mode !== 'login'
        : viewModel.mode !== 'register';
    });

    if (!viewModel.errorMessage) {
      this.element?.querySelectorAll('.q-auth__error').forEach((error) => {
        error.style.display = 'block';
      });
    }
  }
}
