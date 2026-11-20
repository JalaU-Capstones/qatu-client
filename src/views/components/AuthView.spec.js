import { AuthViewModel } from '../../viewmodels/components/AuthViewModel.js';
import { AuthView, LoginRegisterView } from './AuthView.js';

describe('AuthView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new AuthViewModel();
    if (viewModel.authApi) {
      spyOn(viewModel.authApi, 'register').and.resolveTo({
        data: { token: 'mock-token', user: { id: 'u1' } },
      });
    }
    view = new AuthView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render the auth page and card with default login mode', () => {
    const el = view.render();
    expect(el.classList.contains('q-auth-page')).toBe(true);
    expect(el.querySelector('.q-auth-marketing')).not.toBeNull();
    expect(el.querySelector('.q-auth-form-panel')).not.toBeNull();
    expect(el.querySelector('.q-auth-overlay-container')).toBeNull();
    expect(el.querySelector('.q-auth-wrapper')).toBeNull();

    const card = el.querySelector('.q-auth-card');
    expect(card).not.toBeNull();
    expect(card.getAttribute('data-mode')).toBe('login');
  });

  it('should support LoginRegisterView alias', () => {
    const aliasView = new LoginRegisterView();
    const el = aliasView.render();
    expect(el.classList.contains('q-auth-page')).toBe(true);
    aliasView.destroy();
  });

  it('should render the shared theme-aware brand logo in both panels', () => {
    const el = view.render();
    const logos = el.querySelectorAll('.q-auth-brand .q-brand-logo-svg');
    expect(logos.length).toBe(2);
    expect(logos[0].getAttribute('aria-label')).toBe('Q’atu');
    expect(logos[0].querySelector('tspan').getAttribute('fill')).toContain('--q-accent');
  });

  it('should render both login and register panels with updated Figma copy and fields', () => {
    const el = view.render();
    const loginPanel = el.querySelector('.q-auth-login-panel');
    const registerPanel = el.querySelector('.q-auth-register-panel');

    expect(loginPanel).not.toBeNull();
    expect(registerPanel).not.toBeNull();
    expect(el.querySelector('.q-auth-overlay-container')).toBeNull();

    // Check login panel elements
    expect(loginPanel.querySelector('#q-login-email')).not.toBeNull();
    expect(loginPanel.querySelector('#q-login-password')).not.toBeNull();
    expect(loginPanel.querySelector('.q-login-submit-btn')).not.toBeNull();

    // Check register panel elements matching Figma mockup
    expect(registerPanel.querySelector('#q-register-name')).not.toBeNull();
    expect(registerPanel.querySelector('#q-register-username')).not.toBeNull();
    expect(registerPanel.querySelector('#q-register-email')).not.toBeNull();
    expect(registerPanel.querySelector('#q-register-password')).not.toBeNull();
    expect(registerPanel.querySelector('#q-register-confirm-password')).not.toBeNull();
    expect(registerPanel.querySelector('.q-register-submit-btn')).not.toBeNull();

    // Copy assertions
    const title = registerPanel.querySelector('.q-auth-title');
    expect(title.textContent).toBe('Crear una cuenta');

    const subtitle = registerPanel.querySelector('.q-auth-subtitle');
    expect(subtitle.textContent).toBe("Únete a la comunidad de Q'atu.");

    const socialBtn = registerPanel.querySelector('.q-google-register-btn');
    expect(socialBtn.textContent).toContain('Continuar con Google');

    const passwordHint = registerPanel.querySelector('.q-auth-password-hint');
    expect(passwordHint).not.toBeNull();
    expect(passwordHint.textContent).toBe('Mínimo 8 caracteres, una mayúscula y un número');

    const directSwitchBtn = registerPanel.querySelector('.q-register-to-login');
    expect(directSwitchBtn).not.toBeNull();
    expect(directSwitchBtn.textContent).toBe('Iniciar sesión');
  });

  it('should render a 2-column layout with marketing panel on the left and form panel on the right', () => {
    const el = view.render();
    expect(el.classList.contains('q-auth-page')).toBe(true);
    expect(el.children.length).toBe(2);
    expect(el.children[0].classList.contains('q-auth-marketing')).toBe(true);
    expect(el.children[1].classList.contains('q-auth-form-panel')).toBe(true);
  });

  it('should switch to register mode when clicking switch link on login card', () => {
    const el = view.render();
    const switchBtn = el.querySelector('.q-login-to-register');
    const card = el.querySelector('.q-auth-card');

    expect(card.getAttribute('data-mode')).toBe('login');

    switchBtn.click();

    expect(viewModel.mode).toBe('register');
    expect(card.getAttribute('data-mode')).toBe('register');
  });

  it('should switch back to login mode when clicking direct switch link on register card', () => {
    viewModel.setMode('register');
    const el = view.render();
    const card = el.querySelector('.q-auth-card');
    expect(card.getAttribute('data-mode')).toBe('register');

    const directSwitchBtn = el.querySelector('.q-register-to-login');
    directSwitchBtn.click();

    expect(viewModel.mode).toBe('login');
    expect(card.getAttribute('data-mode')).toBe('login');
  });

  it('should sync marketing panel when mode changes', () => {
    const el = view.render();
    const marketingTitle = el.querySelector('.q-auth-marketing__title');
    expect(marketingTitle.textContent).toContain('Qué bueno verte de nuevo');

    viewModel.setMode('register');
    expect(marketingTitle.textContent).toContain('Crea tu cuenta y compra con propósito');

    viewModel.setMode('login');
    expect(marketingTitle.textContent).toContain('Qué bueno verte de nuevo');
  });

  it('should update login data in ViewModel when inputs change', () => {
    const el = view.render();
    const emailInput = el.querySelector('#q-login-email');
    const passInput = el.querySelector('#q-login-password');
    const rememberInput = el.querySelector('#q-login-remember');

    emailInput.value = 'user@example.com';
    emailInput.dispatchEvent(new Event('input'));
    expect(viewModel.loginData.email).toBe('user@example.com');

    passInput.value = 'mypassword';
    passInput.dispatchEvent(new Event('input'));
    expect(viewModel.loginData.password).toBe('mypassword');

    rememberInput.checked = true;
    rememberInput.dispatchEvent(new Event('change'));
    expect(viewModel.loginData.rememberMe).toBe(true);
  });

  it('should update register data including username in ViewModel when inputs change', () => {
    const el = view.render();
    const nameInput = el.querySelector('#q-register-name');
    const usernameInput = el.querySelector('#q-register-username');
    const emailInput = el.querySelector('#q-register-email');
    const passInput = el.querySelector('#q-register-password');
    const confirmInput = el.querySelector('#q-register-confirm-password');
    const termsInput = el.querySelector('#q-register-terms');

    nameInput.value = 'Valeria Rios';
    nameInput.dispatchEvent(new Event('input'));
    expect(viewModel.registerData.name).toBe('Valeria Rios');

    usernameInput.value = 'valeriarios';
    usernameInput.dispatchEvent(new Event('input'));
    expect(viewModel.registerData.username).toBe('valeriarios');

    emailInput.value = 'valeria@example.com';
    emailInput.dispatchEvent(new Event('input'));
    expect(viewModel.registerData.email).toBe('valeria@example.com');

    passInput.value = 'Secr3t!';
    passInput.dispatchEvent(new Event('input'));
    expect(viewModel.registerData.password).toBe('Secr3t!');

    confirmInput.value = 'Secr3t!';
    confirmInput.dispatchEvent(new Event('input'));
    expect(viewModel.registerData.confirmPassword).toBe('Secr3t!');

    termsInput.checked = true;
    termsInput.dispatchEvent(new Event('change'));
    expect(viewModel.registerData.acceptTerms).toBe(true);
  });

  it('should render a password toggle for login and both register password fields', () => {
    const el = view.render();

    expect(el.querySelectorAll('#q-login-password + *').length).toBe(1);
    expect(el.querySelectorAll('.q-login-panel .q-auth-password-toggle').length).toBe(0);
    expect(el.querySelectorAll('.q-auth-password-toggle').length).toBe(3);
  });

  it('should give the login password toggle the correct controls and initial state', () => {
    const el = view.render();
    const input = el.querySelector('#q-login-password');
    const toggle = el.querySelector('.q-login-form .q-auth-password-toggle');

    expect(toggle).not.toBeNull();
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-controls')).toBe(input.id);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');
  });

  it('should toggle the login password input type and accessible state', () => {
    const el = view.render();
    container.appendChild(el);
    const input = el.querySelector('#q-login-password');
    const toggle = el.querySelector('.q-login-form .q-auth-password-toggle');
    input.value = 'hunter2';

    toggle.click();

    expect(input.type).toBe('text');
    expect(input.value).toBe('hunter2');
    expect(document.activeElement).toBe(input);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');

    toggle.click();
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('should keep register password toggles independent', () => {
    const el = view.render();
    const password = el.querySelector('#q-register-password');
    const confirm = el.querySelector('#q-register-confirm-password');
    const toggles = el.querySelectorAll('.q-register-form .q-auth-password-toggle');

    expect(toggles.length).toBe(2);
    toggles[0].click();
    expect(password.type).toBe('text');
    expect(confirm.type).toBe('password');

    toggles[1].click();
    expect(password.type).toBe('text');
    expect(confirm.type).toBe('text');
  });

  it('should expose every password toggle as keyboard-focusable', () => {
    const el = view.render();
    const toggles = el.querySelectorAll('.q-auth-password-toggle');

    expect(toggles.length).toBe(3);
    toggles.forEach((toggle) => {
      expect(toggle.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  it('should preserve independent aria-controls for every password field', () => {
    const el = view.render();
    const controls = Array.from(el.querySelectorAll('.q-auth-password-toggle')).map((toggle) =>
      toggle.getAttribute('aria-controls')
    );

    expect(controls).toEqual([
      'q-login-password',
      'q-register-password',
      'q-register-confirm-password',
    ]);
  });

  it('password toggle count remains unchanged after the auth layout pass', () => {
    const el = view.render();
    const loginToggles = el.querySelectorAll('.q-login-form .q-auth-password-toggle');
    const registerToggles = el.querySelectorAll('.q-register-form .q-auth-password-toggle');

    expect(loginToggles.length).toBe(1);
    expect(registerToggles.length).toBe(2);
  });

  it('should trigger login submit when login form is submitted', () => {
    let submitted = false;
    viewModel.onLogin = () => {
      submitted = true;
    };

    const el = view.render();
    const emailInput = el.querySelector('#q-login-email');
    const passInput = el.querySelector('#q-login-password');
    emailInput.value = 'user@qatu.pe';
    emailInput.dispatchEvent(new Event('input'));
    passInput.value = 'password123';
    passInput.dispatchEvent(new Event('input'));

    const form = el.querySelector('.q-login-form');
    form.dispatchEvent(new Event('submit'));

    expect(submitted).toBe(true);
  });

  it('should trigger register submit when register form is submitted', () => {
    let registered = false;
    viewModel.onRegister = () => {
      registered = true;
    };

    const el = view.render();
    const nameInput = el.querySelector('#q-register-name');
    const usernameInput = el.querySelector('#q-register-username');
    const emailInput = el.querySelector('#q-register-email');
    const passInput = el.querySelector('#q-register-password');
    const confirmInput = el.querySelector('#q-register-confirm-password');
    const termsInput = el.querySelector('#q-register-terms');

    nameInput.value = 'Carlos';
    nameInput.dispatchEvent(new Event('input'));
    usernameInput.value = 'carlos';
    usernameInput.dispatchEvent(new Event('input'));
    emailInput.value = 'carlos@qatu.pe';
    emailInput.dispatchEvent(new Event('input'));
    passInput.value = 'password123';
    passInput.dispatchEvent(new Event('input'));
    confirmInput.value = 'password123';
    confirmInput.dispatchEvent(new Event('input'));
    termsInput.checked = true;
    termsInput.dispatchEvent(new Event('change'));

    const form = el.querySelector('.q-register-form');
    form.dispatchEvent(new Event('submit'));

    expect(registered).toBe(true);
  });

  it('should trigger Google auth and forgot password buttons', () => {
    let googleCount = 0;
    let forgotCalled = false;

    viewModel.onGoogleAuth = () => {
      googleCount += 1;
    };
    viewModel.onForgotPassword = () => {
      forgotCalled = true;
    };

    const el = view.render();
    const googleLoginBtn = el.querySelector('.q-google-login-btn');
    const googleRegisterBtn = el.querySelector('.q-google-register-btn');
    const forgotBtn = el.querySelector('.q-forgot-password-btn');

    googleLoginBtn.click();
    googleRegisterBtn.click();
    expect(googleCount).toBe(2);

    forgotBtn.click();
    expect(forgotCalled).toBe(true);
  });

  it('should show and hide error and success alerts reactively', () => {
    const el = view.render();
    const errorAlert = el.querySelector('.q-auth-login-panel .q-auth-alert-error');
    const successAlert = el.querySelector('.q-auth-login-panel .q-auth-alert-success');

    expect(errorAlert.style.display).toBe('none');
    expect(successAlert.style.display).toBe('none');

    viewModel.setError('Error de prueba');
    expect(errorAlert.style.display).toBe('flex');
    expect(errorAlert.textContent).toBe('Error de prueba');

    viewModel.setSuccess('Operación exitosa');
    expect(successAlert.style.display).toBe('flex');
    expect(successAlert.textContent).toBe('Operación exitosa');
    expect(errorAlert.style.display).toBe('none');
  });

  it('should disable submit buttons when loading', () => {
    const el = view.render();
    const submitBtn = el.querySelector('.q-login-submit-btn');
    expect(submitBtn.disabled).toBe(false);

    viewModel.setLoading(true);
    expect(submitBtn.disabled).toBe(true);

    viewModel.setLoading(false);
    expect(submitBtn.disabled).toBe(false);
  });

  it('should mount into a container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-auth-card')).not.toBeNull();
  });
});
