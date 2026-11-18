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
