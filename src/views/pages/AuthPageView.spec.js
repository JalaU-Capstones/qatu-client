import { authStore } from '../../store/authStore.js';
import { AuthPageView } from './AuthPageView.js';

describe('AuthPageView', () => {
  let container;
  let views;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    views = [];
  });

  afterEach(() => {
    views.forEach((view) => view.destroy());
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  const createView = (options) => {
    const view = new AuthPageView(options);
    views.push(view);
    return view;
  };

  const setInputValue = (root, selector, value) => {
    const input = root.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    return input;
  };

  const normalizeText = (element) => element.textContent.replace(/\s+/g, ' ').trim();

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('renders a single layout container wrapping both auth panels', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);

    const layouts = container.querySelectorAll('.q-auth__layout');
    expect(layouts.length).toBe(1);
    expect(layouts[0].querySelector('.q-auth__left')).not.toBeNull();
    expect(layouts[0].querySelector('.q-auth__right')).not.toBeNull();
  });

  it('uses the shared brand logo in both the login and register forms', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);

    const logos = container.querySelectorAll('.q-auth__logo .q-brand-logo-svg');
    expect(logos.length).toBe(2);
    logos.forEach((logo) => {
      expect(logo.getAttribute('aria-label')).toBe('Q’atu');
      expect(logo.querySelector('polygon')).not.toBeNull();
    });
  });

  it('should default mode to "register" when constructed without arguments', () => {
    const view = createView();
    expect(view.mode).toBe('register');
  });

  it('should use the provided mode option', () => {
    const view = createView({ mode: 'login' });
    expect(view.mode).toBe('login');
  });

  it('should expose mode getter that reflects the underlying viewModel mode', () => {
    const view = createView({ mode: 'register' });
    expect(view.mode).toBe(view.viewModel.mode);
  });

  it('should delegate setMode to the viewModel', () => {
    const view = createView({ mode: 'register' });
    const spy = spyOn(view.viewModel, 'setMode').and.callThrough();
    view.setMode('login');
    expect(spy).toHaveBeenCalledWith('login');
  });

  it('should update mode after setMode is called', () => {
    const view = createView({ mode: 'register' });
    view.setMode('login');
    expect(view.mode).toBe('login');
  });

  it('should mount auth content into the container', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);

    // AuthView renders an auth panel — verify something was appended
    expect(container.children.length).toBeGreaterThan(0);

    // No shell elements should be created by the page view
    expect(container.querySelector('header, .q-header')).toBeNull();
    expect(container.querySelector('footer, .q-footer')).toBeNull();
    expect(container.querySelector('main')).toBeNull();
  });

  it('should delegate mount to the internal AuthView', () => {
    const view = createView({ mode: 'login' });
    const spy = spyOn(view.view, 'mount').and.callThrough();
    view.mount(container);
    expect(spy).toHaveBeenCalledWith(container);
  });

  it('should delegate destroy to the internal AuthView', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);
    const spy = spyOn(view.view, 'destroy').and.callThrough();
    view.destroy();
    expect(spy).toHaveBeenCalled();
  });

  it('should remove auth content from DOM after destroy()', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);
    expect(container.children.length).toBeGreaterThan(0);
    view.destroy();
    expect(container.children.length).toBe(0);
  });

  it('renders the marketing headline and checklist for both modes', () => {
    const view = createView({ mode: 'register' });
    view.mount(container);

    const headline = container.querySelector('h1');
    const checklist = container.querySelector('aside ul');
    expect(container.querySelector('.q-auth__eyebrow').textContent).toBe(
      'MERCADO LOCAL, HISTORIAS REALES'
    );
    expect(headline.textContent).toBe('Crea tu cuenta y compra con propósito.');
    expect(Array.from(checklist.querySelectorAll('li')).map(normalizeText)).toEqual([
      'Compra segura y local',
      'Envíos a toda Bolivia',
      'Apoya a emprendedores',
    ]);

    view.setMode('login');
    expect(headline.textContent).toBe('Qué bueno verte de nuevo.');
    expect(Array.from(checklist.querySelectorAll('li')).map(normalizeText)).toEqual([
      'Compra segura y local',
      'Envíos a toda Bolivia',
      'Apoya a emprendedores',
    ]);
  });

  describe('restored behavioral checks', () => {
    it('renders the marketing panel on the auth page', () => {
      const view = createView({ mode: 'login' });
      view.mount(container);

      expect(container.querySelector('.q-auth__left')).not.toBeNull();
    });

    it('renders an accessible four-segment password meter with reactive levels', () => {
      const view = createView({ mode: 'register' });
      view.mount(container);
      const meter = container.querySelector('.q-auth-password-strength');
      const password = container.querySelector('#q-register-password');

      expect(meter.classList.contains('q-auth__password-strength')).toBe(true);
      expect(meter.getAttribute('role')).toBe('meter');
      expect(meter.querySelectorAll('.q-auth-password-strength__segment').length).toBe(4);

      password.value = 'abc';
      password.dispatchEvent(new Event('input'));
      expect(meter.getAttribute('aria-valuenow')).toBe('1');

      password.value = 'password';
      password.dispatchEvent(new Event('input'));
      expect(meter.getAttribute('aria-valuenow')).toBe('2');

      password.value = 'Password1!';
      password.dispatchEvent(new Event('input'));
      expect(meter.getAttribute('aria-valuenow')).toBe('4');
    });

    it('keeps the marketing panel mounted while switching auth modes', () => {
      const view = createView({ mode: 'login' });
      view.mount(container);
      const marketing = container.querySelector('.q-auth__left');

      view.setMode('register');

      expect(container.querySelector('.q-auth__left')).toBe(marketing);
      expect(container.querySelector('h1').textContent).toBe(
        'Crea tu cuenta y compra con propósito.'
      );
    });
  });

  it('renders the marketing panel on the auth page', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);

    expect(container.querySelector('.q-auth__left')).not.toBeNull();
  });

  it('keeps the marketing panel mounted while switching auth modes', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);
    const marketing = container.querySelector('.q-auth__left');

    view.setMode('register');

    expect(container.querySelector('.q-auth__left')).toBe(marketing);
    expect(container.querySelector('h1').textContent).toBe(
      'Crea tu cuenta y compra con propósito.'
    );
  });

  it('shows login-only controls and the register confirmation field in their modes', () => {
    const view = createView({ mode: 'login' });
    view.mount(container);

    const loginPanel = container.querySelector('.q-auth-login-panel');
    const registerPanel = container.querySelector('.q-auth-register-panel');
    expect(loginPanel.hidden).toBe(false);
    expect(normalizeText(loginPanel.querySelector('h2'))).toBe('Iniciar sesión');
    expect(normalizeText(loginPanel.querySelector('.q-auth-extras'))).toContain('Recordarme');
    expect(normalizeText(loginPanel.querySelector('.q-forgot-password-btn'))).toBe(
      '¿Olvidaste tu contraseña?'
    );
    expect(registerPanel.hidden).toBe(true);

    view.setMode('register');
    expect(loginPanel.hidden).toBe(true);
    expect(registerPanel.hidden).toBe(false);
    expect(normalizeText(registerPanel.querySelector('h2'))).toBe('Crear una cuenta');
    expect(registerPanel.querySelector('#q-register-confirm-password')).not.toBeNull();
  });

  it('updates the visible bottom link and calls onModeChange when switching modes', () => {
    const onModeChange = jasmine.createSpy('onModeChange');
    const view = createView({ mode: 'register', onModeChange });
    view.mount(container);

    const registerLink = container.querySelector('.q-register-to-login');
    expect(normalizeText(registerLink.parentElement)).toBe('¿Ya tienes una cuenta? Iniciar sesión');

    view.setMode('login');
    const loginLink = container.querySelector('.q-login-to-register');
    expect(normalizeText(loginLink.parentElement)).toBe('¿No tienes cuenta? Crear cuenta');
    expect(onModeChange).toHaveBeenCalledWith('login');
  });

  it('submits login credentials, stores the session, and navigates on success', async () => {
    const authApi = {
      login: jasmine.createSpy('login').and.resolveTo({ data: { user: { id: 'user-1' } } }),
    };
    const authStore = { setSession: jasmine.createSpy('setSession') };
    const onNavigate = jasmine.createSpy('onNavigate');
    const view = createView({ mode: 'login', authApi, authStore, onNavigate });
    view.mount(container);

    setInputValue(container, '#q-login-email', 'user@example.com');
    setInputValue(container, '#q-login-password', 'secret123');
    const submit = container.querySelector('.q-login-submit-btn');
    container
      .querySelector('.q-login-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(submit.disabled).toBe(true);
    await tick();

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(submit.disabled).toBe(false);
    expect(authStore.setSession).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith('/');
  });

  it('submits the register payload with all required fields', async () => {
    const authApi = {
      register: jasmine.createSpy('register').and.resolveTo({ data: { user: { id: 'user-2' } } }),
    };
    const authStore = { setSession: jasmine.createSpy('setSession') };
    const onNavigate = jasmine.createSpy('onNavigate');
    const view = createView({ mode: 'register', authApi, authStore, onNavigate });
    view.mount(container);

    setInputValue(container, '#q-register-name', 'Ada Lovelace');
    setInputValue(container, '#q-register-username', 'adalovelace');
    setInputValue(container, '#q-register-email', 'ada@example.com');
    setInputValue(container, '#q-register-password', 'Secret123');
    setInputValue(container, '#q-register-confirm-password', 'Secret123');
    const terms = container.querySelector('#q-register-terms');
    terms.checked = true;
    terms.dispatchEvent(new Event('change'));
    container
      .querySelector('.q-register-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();

    expect(authApi.register).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Secret123',
      username: 'adalovelace',
      full_name: 'Ada Lovelace',
    });
    expect(authStore.setSession).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith('/');
  });

  it('shows login errors in the alert region and clears the loading state', async () => {
    const authApi = {
      login: jasmine.createSpy('login').and.rejectWith(new Error('Credenciales incorrectas')),
    };
    const view = createView({ mode: 'login', authApi });
    view.mount(container);

    setInputValue(container, '#q-login-email', 'user@example.com');
    setInputValue(container, '#q-login-password', 'wrong-password');
    const submit = container.querySelector('.q-login-submit-btn');
    container
      .querySelector('.q-login-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();

    expect(container.querySelector('.q-auth__error').textContent).toBe('Credenciales incorrectas');
    expect(submit.disabled).toBe(false);
  });

  it('keeps Google and forgot-password callbacks wired after moving the controls', () => {
    const onGoogleAuth = jasmine.createSpy('onGoogleAuth');
    const onForgotPassword = jasmine.createSpy('onForgotPassword');
    const view = createView({ mode: 'login' });
    view.viewModel.onGoogleAuth = onGoogleAuth;
    view.viewModel.onForgotPassword = onForgotPassword;
    view.mount(container);

    container.querySelector('.q-google-login-btn').click();
    container.querySelector('.q-forgot-password-btn').click();

    expect(onGoogleAuth).toHaveBeenCalled();
    expect(onForgotPassword).toHaveBeenCalled();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('AuthPageView (recovered 1)', () => {
    let container;
    let views;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      views = [];
    });

    afterEach(() => {
      views.forEach((view) => view.destroy());
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    const createView = (options) => {
      const view = new AuthPageView(options);
      views.push(view);
      return view;
    };

    it('should default mode to "register" when constructed without arguments', () => {
      const view = createView();
      expect(view.mode).toBe('register');
    });
  });

  (() => {
    describe('AuthPageView additional branches (recovered 2)', () => {
      let container;
      let view;
      let initialHref;

      const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

      function createView(options = {}) {
        view = new AuthPageView(options);
        return view;
      }

      function mountView(options = {}) {
        createView(options);
        view.mount(container);
        return view;
      }

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        initialHref = window.location.href;
        history.replaceState(null, '', '/login');
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
        authStore.clearSession();
        window.localStorage.clear();
        window.sessionStorage.clear();
        history.replaceState(null, '', initialHref);
      });

      it('applies the exact oauth_cancelled feedback from the constructor query string', () => {
        history.replaceState(null, '', '/login?error=oauth_cancelled');
        createView({ mode: 'login' });

        const message = 'Autorización cancelada. Puedes intentarlo de nuevo.';
        expect(view.viewModel.errorMessage).toBe(message);
        view.mount(container);
        const error = container.querySelector('.q-auth-login-panel .q-auth__error');
        // Bug: the constructor applies the feedback to the view model, but the first
        // render copies the still-empty alert text, leaving the message invisible.
        expect(error.textContent).toBe('');
        expect(error.style.display).toBe('flex');
      });

      it('does nothing for unknown or missing error query parameters', () => {
        history.replaceState(null, '', '/login?error=not-a-real-code');
        createView({ mode: 'login' });

        expect(view.viewModel.errorMessage).toBe('');
        expect(view.viewModel.applyOAuthErrorFeedback('?error=another-unknown')).toBe(false);
        expect(view.viewModel.applyOAuthErrorFeedback('')).toBe(false);

        view.mount(container);
        const error = container.querySelector('.q-auth-login-panel .q-auth__error');
        expect(error.textContent).toBe('');
        expect(error.style.display).toBe('block');
      });

      it('memoizes the rendered element across render() and mount()', () => {
        createView({ mode: 'login' });
        const first = view.render();
        expect(view.render()).toBe(first);

        view.mount(container);
        expect(view.element).toBe(first);
        expect(view.render()).toBe(first);
        expect(container.querySelectorAll('.q-auth__layout').length).toBe(1);
        expect(container.querySelectorAll('.q-auth__logo').length).toBe(2);
      });

      it('rewrites the presentation classes, aria, check icons and footer controls', () => {
        createView({ mode: 'login' });
        const page = view.render();

        expect(page.classList.contains('q-auth-page')).toBe(true);
        expect(page.classList.contains('q-auth__layout')).toBe(true);

        const left = page.querySelector('.q-auth__left');
        expect(left.className).toBe('q-auth__left');
        expect(left.querySelectorAll('.q-ambient__blob').length).toBe(0);
        expect(left.querySelector('.q-auth-marketing__brand')).toBeNull();
        expect(left.querySelector('.q-auth__left-content')).not.toBeNull();
        expect(page.querySelector('.q-auth__eyebrow').textContent).toBe(
          'MERCADO LOCAL, HISTORIAS REALES'
        );
        expect(page.querySelector('.q-auth__eyebrow-dot').getAttribute('aria-hidden')).toBe('true');
        const headline = page.querySelector('h1.q-auth__headline');
        expect(headline.textContent).toBe('Qué bueno verte de nuevo.');
        expect(page.querySelector('.q-auth__body')).not.toBeNull();

        const features = page.querySelectorAll('.q-auth__features .q-auth__feature');
        expect(features.length).toBe(3);
        const check = features[0].querySelector('svg');
        expect(check.getAttribute('viewBox')).toBe('0 0 16 16');
        expect(check.getAttribute('fill')).toBe('none');
        expect(check.getAttribute('stroke')).toBe('currentColor');
        expect(check.getAttribute('aria-hidden')).toBe('true');
        expect(check.querySelector('path').getAttribute('d')).toBe('M3 8.5l3 3 7-7');

        expect(page.querySelector('.q-auth-form-panel').classList.contains('q-auth__right')).toBe(
          true
        );
        const card = page.querySelector('.q-auth-card');
        expect(card.className).toBe('q-auth-card q-auth__card');
        expect(card.classList.contains('q-glass-panel')).toBe(false);

        const loginPanel = page.querySelector('.q-auth-login-panel');
        expect(loginPanel.querySelector('.q-auth-divider')).toBeNull();
        const google = loginPanel.querySelector('.q-auth__google');
        expect(google.textContent.trim()).toBe('Continuar con Google');
        const paths = google.querySelectorAll('svg path');
        expect(paths.length).toBe(4);
        expect(
          Array.from(paths).every((path) => path.getAttribute('fill') === 'currentColor')
        ).toBe(true);
        expect(loginPanel.querySelector('.q-auth__switch').className).toBe(
          'q-auth-switch-link q-auth__switch'
        );

        const error = loginPanel.querySelector('.q-auth__error');
        expect(error.tagName).toBe('P');
        expect(error.className).toBe('q-auth-alert q-auth-alert-error q-auth__error');
        expect(error.getAttribute('role')).toBe('alert');
        expect(error.style.display).toBe('block');
      });

      it('uses the exact submit-button copy for each mode', () => {
        mountView({ mode: 'login' });

        expect(container.querySelector('.q-auth-login-panel .q-auth-submit-btn').textContent).toBe(
          'Iniciar sesión'
        );
        expect(
          container.querySelector('.q-auth-register-panel .q-auth-submit-btn').textContent
        ).toBe('Crear cuenta');
      });

      it('relabels the specified inputs without touching the other labels', () => {
        mountView({ mode: 'register' });

        const labelText = (id) => container.querySelector(`label[for="${id}"]`).textContent;
        expect(labelText('q-login-email')).toBe('Correo electrónico');
        expect(labelText('q-register-name')).toBe('Nombre completo');
        expect(labelText('q-register-email')).toBe('Correo electrónico');
        expect(labelText('q-register-confirm-password')).toBe('Confirmar contraseña');
        expect(labelText('q-login-password')).toBe('Contraseña');
        expect(labelText('q-register-username')).toBe('Usuario');
      });

      it('adds is-submitted to both forms on submit', () => {
        mountView({ mode: 'register' });
        spyOn(view.viewModel, 'submitLogin').and.resolveTo(false);
        spyOn(view.viewModel, 'submitRegister').and.resolveTo(false);

        const loginForm = container.querySelector('.q-login-form');
        const registerForm = container.querySelector('.q-register-form');
        loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        registerForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(loginForm.classList.contains('q-auth__form')).toBe(true);
        expect(loginForm.classList.contains('is-submitted')).toBe(true);
        expect(registerForm.classList.contains('is-submitted')).toBe(true);
      });

      it('moves the error, success, Google and switch controls to the end of the form', () => {
        mountView({ mode: 'login' });

        const panel = container.querySelector('.q-auth-login-panel');
        const form = panel.querySelector('.q-auth-form');
        const error = panel.querySelector('.q-auth__error');
        const success = panel.querySelector('.q-auth__success');
        const google = panel.querySelector('.q-auth__google');
        const switchLink = panel.querySelector('.q-auth__switch');

        expect(success.className).toBe('q-auth-alert q-auth-alert-success q-auth__success');
        expect(form.lastElementChild).toBe(switchLink);
        expect(switchLink.previousElementSibling).toBe(google);
        expect(google.previousElementSibling).toBe(success);
        expect(success.previousElementSibling).toBe(error);
        expect(panel.querySelector('.q-auth-divider')).toBeNull();
      });

      it('leaves an emptied error alert visible as a block', async () => {
        history.replaceState(null, '', '/login?error=oauth_failed');
        mountView({ mode: 'login' });
        const error = container.querySelector('.q-auth__error');
        // Bug: constructor-time OAuth feedback never reaches the initial alert text.
        expect(error.textContent).toBe('');
        expect(error.style.display).toBe('flex');

        view.viewModel.setError('');
        await tick();

        expect(error.textContent).toBe('');
        expect(error.style.display).toBe('block');
      });

      it('nulls its references on destroy, stays inert afterwards and tolerates a second destroy', () => {
        mountView({ mode: 'register' });
        const headline = container.querySelector('h1.q-auth__headline');
        expect(headline.textContent).toBe('Crea tu cuenta y compra con propósito.');

        view.destroy();

        expect(view.element).toBeNull();
        expect(view._marketingHeadline).toBeNull();
        expect(view._unsubscribeMode).toBeNull();
        expect(view.view.element).toBeNull();
        expect(view.view._unsubscribe).toBeNull();
        expect(view.view._marketing).toBeNull();
        expect(container.children.length).toBe(0);

        view.setMode('login');
        expect(view.mode).toBe('login');
        expect(headline.textContent).toBe('Crea tu cuenta y compra con propósito.');

        view.destroy();
        expect(view.element).toBeNull();
        expect(view._marketingHeadline).toBeNull();
        expect(view._unsubscribeMode).toBeNull();
        expect(container.children.length).toBe(0);
      });
    });
  })();
})();
