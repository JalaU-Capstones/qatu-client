import { AuthStore } from '../../store/authStore.js';
import { AuthViewModel, LoginRegisterViewModel } from './AuthViewModel.js';

/**
 * NOTE (FE-04 audit @ 087b05b): several callbacks exercised in this file
 * (onLoginSuccess, onRegisterSuccess, onLogin, onRegister, onGoogleAuth,
 * onForgotPassword) are declared by AuthViewModel but NOT wired by
 * AuthPageView or main.js in production. The specs that exercise them
 * are kept as contract tests. Dead-code removal is tracked separately.
 */

describe('AuthViewModel', () => {
  let viewModel;
  let mockAuthApi;
  let mockAuthStore;

  beforeEach(() => {
    mockAuthApi = {
      register: jasmine.createSpy('register').and.resolveTo({
        data: {
          token: 'token-abc',
          user: { id: 'u1', username: 'zzz', email: 'user@example.com' },
          profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
        },
      }),
      login: jasmine.createSpy('login').and.resolveTo({
        data: {
          token: 'token-login-xyz',
          user: { id: 'u1', username: 'zzz', email: 'user@example.com' },
          profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
        },
      }),
    };
    mockAuthStore = new AuthStore();
    viewModel = new AuthViewModel({
      authApi: mockAuthApi,
      authStore: mockAuthStore,
    });
  });

  it('should initialize with default mode "login"', () => {
    expect(viewModel.mode).toBe('login');
    expect(viewModel.isLoginMode).toBe(true);
    expect(viewModel.isRegisterMode).toBe(false);
  });

  it('should support alias LoginRegisterViewModel', () => {
    const aliasVM = new LoginRegisterViewModel();
    expect(aliasVM.mode).toBe('login');
  });

  it('should initialize with custom initialMode if provided', () => {
    const customVM = new AuthViewModel({ initialMode: 'register' });
    expect(customVM.mode).toBe('register');
    expect(customVM.isLoginMode).toBe(false);
    expect(customVM.isRegisterMode).toBe(true);
  });

  it('should switch mode and notify subscribers', () => {
    let notifiedMode = null;
    viewModel.subscribe((vm) => {
      notifiedMode = vm.mode;
    });

    viewModel.setMode('register');
    expect(viewModel.mode).toBe('register');
    expect(notifiedMode).toBe('register');

    viewModel.setMode('login');
    expect(viewModel.mode).toBe('login');
    expect(notifiedMode).toBe('login');
  });

  it('should ignore invalid mode string', () => {
    viewModel.setMode('invalid_mode');
    expect(viewModel.mode).toBe('login');
  });

  it('should toggle mode back and forth', () => {
    expect(viewModel.mode).toBe('login');
    viewModel.toggleMode();
    expect(viewModel.mode).toBe('register');
    viewModel.toggleMode();
    expect(viewModel.mode).toBe('login');
  });

  it('should fire onModeChange callback when mode switches', () => {
    let callbackMode = null;
    const vm = new AuthViewModel({
      onModeChange: (m) => {
        callbackMode = m;
      },
    });

    vm.setMode('register');
    expect(callbackMode).toBe('register');
  });

  it('should update login form fields', () => {
    viewModel.setLoginField('email', 'user@example.com');
    viewModel.setLoginField('password', 'secret123');
    viewModel.setLoginField('rememberMe', true);

    expect(viewModel.loginData.email).toBe('user@example.com');
    expect(viewModel.loginData.password).toBe('secret123');
    expect(viewModel.loginData.rememberMe).toBe(true);
  });

  it('should update register form fields including username', () => {
    viewModel.setRegisterField('name', 'Usuario ZZZ');
    viewModel.setRegisterField('username', 'zzz');
    viewModel.setRegisterField('email', 'user@example.com');
    viewModel.setRegisterField('password', 'Pass123!');
    viewModel.setRegisterField('confirmPassword', 'Pass123!');
    viewModel.setRegisterField('acceptTerms', true);

    expect(viewModel.registerData.name).toBe('Usuario ZZZ');
    expect(viewModel.registerData.full_name).toBe('Usuario ZZZ');
    expect(viewModel.registerData.username).toBe('zzz');
    expect(viewModel.registerData.email).toBe('user@example.com');
    expect(viewModel.registerData.password).toBe('Pass123!');
    expect(viewModel.registerData.confirmPassword).toBe('Pass123!');
    expect(viewModel.registerData.acceptTerms).toBe(true);
  });

  // Documents a callback that AuthViewModel declares and fires, but that is
  // NOT wired by AuthPageView/main.js today (see FE-04 audit @ 087b05b).
  // Keep this spec: it validates the callback contract. If the team later
  // removes the callback, remove this spec in the same commit.
  it('should validate and fail login submit if fields are missing', async () => {
    let loggedIn = false;
    viewModel.onLogin = () => {
      loggedIn = true;
    };

    const result = await viewModel.submitLogin();
    expect(result).toBe(false);
    expect(loggedIn).toBe(false);
    expect(viewModel.errorMessage).toBe('Por favor completa todos los campos.');
  });

  // Documents a callback that AuthViewModel declares and fires, but that is
  // NOT wired by AuthPageView/main.js today (see FE-04 audit @ 087b05b).
  // Keep this spec: it validates the callback contract. If the team later
  // removes the callback, remove this spec in the same commit.
  it('should succeed login submit, call API, store session and navigate home', async () => {
    let capturedData = null;
    let navigatedPath = null;
    let successCalled = false;

    viewModel.onLogin = (data) => {
      capturedData = data;
    };
    viewModel.onNavigate = (path) => {
      navigatedPath = path;
    };
    viewModel.onLoginSuccess = () => {
      successCalled = true;
    };

    viewModel.setLoginField('email', 'user@example.com');
    viewModel.setLoginField('password', 'password123');
    const result = await viewModel.submitLogin();

    expect(result).toBe(true);
    expect(capturedData.email).toBe('user@example.com');
    expect(mockAuthApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(mockAuthStore.getToken()).toBe('token-login-xyz');
    expect(successCalled).toBe(true);
    expect(navigatedPath).toBe('/');
    expect(viewModel.errorMessage).toBe('');
  });

  it('should update errorMessage when API login fails', async () => {
    mockAuthApi.login.and.rejectWith(new Error('Credenciales inválidas'));

    viewModel.setLoginField('email', 'user@example.com');
    viewModel.setLoginField('password', 'wrongpass');

    const result = await viewModel.submitLogin();
    expect(result).toBe(false);
    expect(viewModel.errorMessage).toBe('Credenciales inválidas');
    expect(viewModel.isLoading).toBe(false);
  });

  it('should validate and fail register submit if fields missing or terms not accepted', async () => {
    viewModel.setRegisterField('name', 'Carlos');
    viewModel.setRegisterField('username', 'carlos'); // <--- Agregá esta línea
    viewModel.setRegisterField('email', 'carlos@qatu.pe');
    viewModel.setRegisterField('password', 'pass123');
    viewModel.setRegisterField('confirmPassword', 'differentPass');

    let result = await viewModel.submitRegister();
    expect(result).toBe(false);
    expect(viewModel.errorMessage).toBe('Las contraseñas no coinciden.');

    viewModel.setRegisterField('confirmPassword', 'pass123');
    result = await viewModel.submitRegister();
    expect(result).toBe(false);
    expect(viewModel.errorMessage).toBe('Debes aceptar los términos y condiciones.');
  });

  // Documents a callback that AuthViewModel declares and fires, but that is
  // NOT wired by AuthPageView/main.js today (see FE-04 audit @ 087b05b).
  // Keep this spec: it validates the callback contract. If the team later
  // removes the callback, remove this spec in the same commit.
  it('should succeed register submit and call API with payload', async () => {
    let capturedData = null;
    let navigatedPath = null;
    viewModel.onRegister = (data) => {
      capturedData = data;
    };
    viewModel.onNavigate = (path) => {
      navigatedPath = path;
    };

    viewModel.setRegisterField('name', 'Usuario ZZZ');
    viewModel.setRegisterField('username', 'zzz');
    viewModel.setRegisterField('email', 'user@example.com');
    viewModel.setRegisterField('password', 'secure123');
    viewModel.setRegisterField('confirmPassword', 'secure123');
    viewModel.setRegisterField('acceptTerms', true);

    const result = await viewModel.submitRegister();
    expect(result).toBe(true);
    expect(capturedData.name).toBe('Usuario ZZZ');
    expect(capturedData.username).toBe('zzz');
    expect(viewModel.errorMessage).toBe('');

    expect(mockAuthApi.register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secure123',
      username: 'zzz',
      full_name: 'Usuario ZZZ',
    });
    expect(mockAuthStore.getToken()).toBe('token-abc');
    expect(navigatedPath).toBe('/');
  });

  it('should update errorMessage when API register fails', async () => {
    mockAuthApi.register.and.rejectWith(new Error('El correo ya está registrado'));

    viewModel.setRegisterField('name', 'Usuario ZZZ');
    viewModel.setRegisterField('username', 'zzz');
    viewModel.setRegisterField('email', 'user@example.com');
    viewModel.setRegisterField('password', 'secure123');
    viewModel.setRegisterField('confirmPassword', 'secure123');
    viewModel.setRegisterField('acceptTerms', true);

    const result = await viewModel.submitRegister();
    expect(result).toBe(false);
    expect(viewModel.errorMessage).toBe('El correo ya está registrado');
    expect(viewModel.isLoading).toBe(false);
  });

  // Documents a callback that AuthViewModel declares and fires, but that is
  // NOT wired by AuthPageView/main.js today (see FE-04 audit @ 087b05b).
  // Keep this spec: it validates the callback contract. If the team later
  // removes the callback, remove this spec in the same commit.
  it('should trigger onGoogleAuth and onForgotPassword callbacks', () => {
    let googleClicked = false;
    let forgotClicked = false;

    const vm = new AuthViewModel({
      onGoogleAuth: () => {
        googleClicked = true;
      },
      onForgotPassword: () => {
        forgotClicked = true;
      },
    });

    vm.triggerGoogleAuth();
    expect(googleClicked).toBe(true);

    vm.triggerForgotPassword();
    expect(forgotClicked).toBe(true);
  });

  it('should handle loading, error, and success messages', () => {
    viewModel.setLoading(true);
    expect(viewModel.isLoading).toBe(true);

    viewModel.setError('Error test');
    expect(viewModel.errorMessage).toBe('Error test');

    viewModel.setSuccess('Éxito');
    expect(viewModel.successMessage).toBe('Éxito');
    expect(viewModel.errorMessage).toBe('');
  });

  it('submitLogin() passes roles from response.data.roles to authStore.setSession', async () => {
    const rolesData = [{ id: 'r1', name: 'buyer' }];
    mockAuthApi.login = jasmine.createSpy('login').and.resolveTo({
      data: {
        token: 'tok-role-login',
        user: { id: 'u1', username: 'zzz' },
        profile: { id: 'u1', full_name: 'ZZZ' },
        roles: rolesData,
      },
    });
    spyOn(mockAuthStore, 'setSession');

    viewModel.setLoginField('email', 'test@example.com');
    viewModel.setLoginField('password', 'pass123');
    await viewModel.submitLogin();

    expect(mockAuthStore.setSession).toHaveBeenCalledWith(
      jasmine.objectContaining({ roles: rolesData })
    );
  });

  it('submitRegister() passes roles from response.data.roles to authStore.setSession', async () => {
    const rolesData = [{ id: 'r2', name: 'seller' }];
    mockAuthApi.register = jasmine.createSpy('register').and.resolveTo({
      data: {
        token: 'tok-role-register',
        user: { id: 'u2', username: 'new_user' },
        profile: { id: 'u2', full_name: 'New User' },
        roles: rolesData,
      },
    });
    spyOn(mockAuthStore, 'setSession');

    viewModel.setRegisterField('full_name', 'New User');
    viewModel.setRegisterField('username', 'new_user');
    viewModel.setRegisterField('email', 'new@example.com');
    viewModel.setRegisterField('password', 'StrongPass1!');
    viewModel.setRegisterField('confirmPassword', 'StrongPass1!');
    viewModel.registerData.acceptTerms = true;
    await viewModel.submitRegister();

    expect(mockAuthStore.setSession).toHaveBeenCalledWith(
      jasmine.objectContaining({ roles: rolesData })
    );
  });
});
