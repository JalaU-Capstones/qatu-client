import { supabase } from '../../models/api/client.js';
import { AuthStore } from '../../store/authStore.js';
import { AuthViewModel, LoginRegisterViewModel } from './AuthViewModel.js';

describe('AuthViewModel', () => {
  let viewModel;
  let mockAuthApi;
  let mockAuthStore;

  beforeEach(() => {
    mockAuthApi = {
      register: jasmine.createSpy('register').and.resolveTo({
        data: {
          user: { id: 'u1', username: 'zzz', email: 'user@example.com' },
          profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
          roles: [{ id: 'r1', name: 'buyer' }],
        },
      }),
      login: jasmine.createSpy('login').and.resolveTo({
        data: {
          user: { id: 'u1', username: 'zzz', email: 'user@example.com' },
          profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
          roles: [{ id: 'r1', name: 'buyer' }],
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

  it('calculates empty, weak, fair, good, and strong password strength', () => {
    expect(viewModel.passwordStrength).toEqual({
      score: 0,
      label: 'Sin contraseña',
      level: 'empty',
    });

    viewModel.setRegisterField('password', 'abc');
    expect(viewModel.passwordStrength).toEqual({ score: 1, label: 'Débil', level: 'weak' });

    viewModel.setRegisterField('password', 'password');
    expect(viewModel.passwordStrength).toEqual({ score: 2, label: 'Regular', level: 'fair' });

    viewModel.setRegisterField('password', 'Password1');
    expect(viewModel.passwordStrength).toEqual({ score: 3, label: 'Buena', level: 'good' });

    viewModel.setRegisterField('password', 'Password1!');
    expect(viewModel.passwordStrength).toEqual({ score: 4, label: 'Fuerte', level: 'strong' });
  });

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

  it('should succeed login submit, call API, store session and navigate home', async () => {
    let capturedData = null;
    let navigatedPath = null;
    let successCalled = false;
    let successPayload = null;

    viewModel.onLogin = (data) => {
      capturedData = data;
    };
    viewModel.onNavigate = (path) => {
      navigatedPath = path;
    };
    viewModel.onLoginSuccess = (payload) => {
      successCalled = true;
      successPayload = payload;
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
    expect(mockAuthStore.isAuthenticated()).toBe(true);
    expect(mockAuthStore.getUser()).toEqual({
      id: 'u1',
      username: 'zzz',
      email: 'user@example.com',
    });
    expect(successCalled).toBe(true);
    expect(successPayload).toEqual(
      jasmine.objectContaining({
        user: jasmine.any(Object),
        profile: jasmine.any(Object),
        roles: jasmine.any(Array),
      })
    );
    expect(successPayload.token).toBeUndefined();
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
    viewModel.setRegisterField('username', 'carlos');
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

  it('should succeed register submit and call API with payload', async () => {
    let capturedData = null;
    let navigatedPath = null;
    let successCalled = false;
    let successPayload = null;

    viewModel.onRegister = (data) => {
      capturedData = data;
    };
    viewModel.onNavigate = (path) => {
      navigatedPath = path;
    };
    viewModel.onRegisterSuccess = (payload) => {
      successCalled = true;
      successPayload = payload;
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
    expect(mockAuthStore.isAuthenticated()).toBe(true);
    expect(mockAuthStore.getUser()).toEqual({
      id: 'u1',
      username: 'zzz',
      email: 'user@example.com',
    });
    expect(successCalled).toBe(true);
    expect(successPayload).toEqual(
      jasmine.objectContaining({
        user: jasmine.any(Object),
        profile: jasmine.any(Object),
        roles: jasmine.any(Array),
      })
    );
    expect(successPayload.token).toBeUndefined();
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
      jasmine.objectContaining({ user: jasmine.any(Object), roles: rolesData })
    );
  });

  it('submitRegister() passes roles from response.data.roles to authStore.setSession', async () => {
    const rolesData = [{ id: 'r2', name: 'seller' }];
    mockAuthApi.register = jasmine.createSpy('register').and.resolveTo({
      data: {
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
      jasmine.objectContaining({ user: jasmine.any(Object), roles: rolesData })
    );
  });

  describe('applyOAuthErrorFeedback', () => {
    it('maps /auth/callback redirect codes to a user-facing banner', () => {
      expect(viewModel.applyOAuthErrorFeedback('?error=oauth_cancelled')).toBe(true);
      expect(viewModel.errorMessage).toBe('Autorización cancelada. Puedes intentarlo de nuevo.');

      expect(viewModel.applyOAuthErrorFeedback('?error=oauth_failed')).toBe(true);
      expect(viewModel.errorMessage).toContain('No se pudo completar el inicio de sesión');

      expect(viewModel.applyOAuthErrorFeedback('?error=oauth_timeout')).toBe(true);
      expect(viewModel.errorMessage).toContain('tardó demasiado');
    });

    it('is a no-op without an error param or with an unknown code', () => {
      expect(viewModel.applyOAuthErrorFeedback('?code=abc')).toBe(false);
      expect(viewModel.errorMessage).toBe('');

      expect(viewModel.applyOAuthErrorFeedback('?error=unknown_code')).toBe(false);
      expect(viewModel.errorMessage).toBe('');
    });

    it('clears success messages when the banner is applied', () => {
      viewModel.setSuccess('Éxito');
      viewModel.applyOAuthErrorFeedback('?error=oauth_cancelled');
      expect(viewModel.errorMessage).toContain('Autorización cancelada');
      expect(viewModel.successMessage).toBe('');
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('AuthViewModel (recovered 1)', () => {
    let viewModel;
    let mockAuthApi;
    let mockAuthStore;

    beforeEach(() => {
      mockAuthApi = {
        register: jasmine.createSpy('register').and.resolveTo({
          data: {
            user: { id: 'u1', username: 'zzz', email: 'user@example.com' },
            profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
            roles: [{ id: 'r1', name: 'buyer' }],
          },
        }),
        login: jasmine.createSpy('login').and.resolveTo({
          data: {
            user: { id: 'u1', username: 'zzz', email: 'user@example.com' },
            profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
            roles: [{ id: 'r1', name: 'buyer' }],
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
  });

  (() => {
    describe('AuthViewModel additional branches (recovered 2)', () => {
      let authApi;
      let authStore;
      let disposers;
      let vm;

      const fillLogin = (viewModel, email = 'user@example.com', password = 'secret123') => {
        viewModel.setLoginField('email', email);
        viewModel.setLoginField('password', password);
      };

      const fillRegister = (viewModel, overrides = {}) => {
        const fields = {
          full_name: 'Maria Perez',
          username: 'maria_p',
          email: 'maria@example.com',
          password: 'Pass123!',
          confirmPassword: 'Pass123!',
          acceptTerms: true,
          ...overrides,
        };
        for (const [field, value] of Object.entries(fields)) {
          viewModel.setRegisterField(field, value);
        }
      };

      beforeEach(() => {
        authApi = {
          login: jasmine.createSpy('login').and.resolveTo({ data: { user: { id: 'u1' } } }),
          register: jasmine.createSpy('register').and.resolveTo({ data: { user: { id: 'u1' } } }),
        };
        authStore = { setSession: jasmine.createSpy('setSession') };
        vm = new AuthViewModel({ authApi, authStore });
        disposers = [];
      });

      afterEach(() => {
        disposers.forEach((unsubscribe) => unsubscribe());
      });

      it('treats an unchanged or invalid mode as a silent no-op', () => {
        const onModeChange = jasmine.createSpy('onModeChange');
        const localVm = new AuthViewModel({ onModeChange });
        const listener = jasmine.createSpy('listener');
        disposers.push(localVm.subscribe(listener));
        localVm.errorMessage = 'keep error';
        localVm.successMessage = 'keep success';

        localVm.setMode('login');
        localVm.setMode('not-a-mode');
        localVm.setMode(undefined);

        expect(localVm.mode).toBe('login');
        expect(localVm.isLoginMode).toBe(true);
        expect(localVm.isRegisterMode).toBe(false);
        expect(localVm.errorMessage).toBe('keep error');
        expect(localVm.successMessage).toBe('keep success');
        expect(onModeChange).not.toHaveBeenCalled();
        expect(listener).not.toHaveBeenCalled();
      });

      it('clears both messages and notifies exactly once when the mode really changes', () => {
        const onModeChange = jasmine.createSpy('onModeChange');
        vm.onModeChange = onModeChange;
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));
        vm.errorMessage = 'old error';
        vm.successMessage = 'old success';

        vm.setMode('register');

        expect(vm.mode).toBe('register');
        expect(vm.errorMessage).toBe('');
        expect(vm.successMessage).toBe('');
        expect(onModeChange).toHaveBeenCalledTimes(1);
        expect(onModeChange).toHaveBeenCalledWith('register');
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('clears the opposite message only when the new message is truthy', () => {
        vm.errorMessage = 'error';
        vm.successMessage = 'success';

        vm.setError('');
        expect(vm.errorMessage).toBe('');
        expect(vm.successMessage).toBe('success');

        vm.setError('boom');
        expect(vm.successMessage).toBe('');

        vm.successMessage = 'kept';
        vm.setSuccess('');
        expect(vm.errorMessage).toBe('boom');
        expect(vm.successMessage).toBe('');

        vm.setSuccess('done');
        expect(vm.errorMessage).toBe('');
        expect(vm.successMessage).toBe('done');
      });

      it('ignores unknown field names and mirrors full_name/name in both directions', () => {
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));

        vm.setLoginField('notAField', 'x');
        vm.setRegisterField('notAField', 'x');

        expect(listener).not.toHaveBeenCalled();
        expect(vm.loginData).toEqual({ email: '', password: '', rememberMe: false });
        expect(vm.registerData).toEqual({
          name: '',
          full_name: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: false,
        });

        vm.setRegisterField('full_name', 'Ana Perez');
        expect(vm.registerData.name).toBe('Ana Perez');
        vm.setRegisterField('name', 'Luis Perez');
        expect(vm.registerData.full_name).toBe('Luis Perez');
        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('characterizes inherited keys being accepted by the field setters', () => {
        vm.setLoginField('toString', 'shadowed');
        vm.setRegisterField('constructor', 'shadowed');

        expect(Object.prototype.hasOwnProperty.call(vm.loginData, 'toString')).toBe(true);
        expect(vm.loginData.toString).toBe('shadowed');
        expect(vm.registerData.constructor).toBe('shadowed');
      });

      it('trims the login email for the callback and API but sends the raw password', async () => {
        const onLogin = jasmine.createSpy('onLogin');
        const localVm = new AuthViewModel({ authApi, authStore, onLogin });
        fillLogin(localVm, '  user@example.com  ', ' secret ');

        await expectAsync(localVm.submitLogin()).toBeResolvedTo(true);

        expect(onLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: ' secret ',
          rememberMe: false,
        });
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: ' secret ',
        });
        expect(authStore.setSession).toHaveBeenCalledWith({
          user: { id: 'u1' },
          profile: { id: 'u1' },
          roles: [],
        });
      });

      it('rejects a whitespace-only email or an empty password before calling the API', async () => {
        fillLogin(vm, '   ', 'secret123');
        await expectAsync(vm.submitLogin()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Por favor completa todos los campos.');

        fillLogin(vm, 'user@example.com', '');
        await expectAsync(vm.submitLogin()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Por favor completa todos los campos.');
        expect(authApi.login).not.toHaveBeenCalled();
      });

      it('accepts a whitespace-only password because only its truthiness is checked', async () => {
        fillLogin(vm, 'user@example.com', '   ');

        await expectAsync(vm.submitLogin()).toBeResolvedTo(true);

        expect(authApi.login).toHaveBeenCalledWith({ email: 'user@example.com', password: '   ' });
      });

      it('uses top-level login response fallbacks and tolerates a store without setSession', async () => {
        const user = { id: 'u7', username: 'top' };
        const roles = [{ name: 'seller' }];
        const response = { user, roles };
        const localApi = { login: jasmine.createSpy('login').and.resolveTo(response) };
        const onLoginSuccess = jasmine.createSpy('onLoginSuccess');
        const localVm = new AuthViewModel({ authApi: localApi, authStore: {}, onLoginSuccess });
        fillLogin(localVm);

        await expectAsync(localVm.submitLogin()).toBeResolvedTo(true);

        expect(onLoginSuccess).toHaveBeenCalledWith({ user, profile: user, roles, response });

        const bareVm = new AuthViewModel({ authApi: localApi, authStore: {} });
        fillLogin(bareVm);
        await expectAsync(bareVm.submitLogin()).toBeResolvedTo(true);

        localApi.login.and.resolveTo(undefined);
        await localVm.submitLogin();
        expect(onLoginSuccess.calls.mostRecent().args[0]).toEqual({
          user: null,
          profile: null,
          roles: [],
          response: undefined,
        });
      });

      it('uses top-level register response fallbacks and trims all submitted fields', async () => {
        const user = { id: 'u8', username: 'maria_p' };
        const roles = [{ name: 'buyer' }];
        const response = { user, roles };
        const localApi = { register: jasmine.createSpy('register').and.resolveTo(response) };
        const onRegister = jasmine.createSpy('onRegister');
        const onRegisterSuccess = jasmine.createSpy('onRegisterSuccess');
        const localVm = new AuthViewModel({
          authApi: localApi,
          authStore: {},
          onRegister,
          onRegisterSuccess,
        });
        fillRegister(localVm, {
          full_name: '  Maria Perez  ',
          username: '  maria_p  ',
          email: '  maria@example.com  ',
        });

        await expectAsync(localVm.submitRegister()).toBeResolvedTo(true);

        expect(localApi.register).toHaveBeenCalledWith({
          email: 'maria@example.com',
          password: 'Pass123!',
          username: 'maria_p',
          full_name: 'Maria Perez',
        });
        expect(onRegister).toHaveBeenCalledWith(
          jasmine.objectContaining({
            name: '  Maria Perez  ',
            full_name: 'Maria Perez',
            username: 'maria_p',
            email: 'maria@example.com',
          })
        );
        expect(onRegisterSuccess).toHaveBeenCalledWith({ user, profile: user, roles, response });
      });

      it('characterizes a successful return when login/register methods are missing', async () => {
        const onLogin = jasmine.createSpy('onLogin');
        const onRegister = jasmine.createSpy('onRegister');
        const localVm = new AuthViewModel({ authApi: {}, authStore, onLogin, onRegister });

        fillLogin(localVm);
        await expectAsync(localVm.submitLogin()).toBeResolvedTo(true);
        expect(onLogin).toHaveBeenCalledTimes(1);

        fillRegister(localVm);
        await expectAsync(localVm.submitRegister()).toBeResolvedTo(true);
        expect(onRegister).toHaveBeenCalledTimes(1);

        expect(authStore.setSession).not.toHaveBeenCalled();
        expect(localVm.isLoading).toBe(false);
        expect(localVm.errorMessage).toBe('');
      });

      it('falls back to generic messages when a rejected error has no message', async () => {
        authApi.login.and.rejectWith(new Error(''));
        fillLogin(vm);
        await expectAsync(vm.submitLogin()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Error al iniciar sesión');
        expect(vm.isLoading).toBe(false);

        authApi.register.and.rejectWith({ code: 'UNKNOWN' });
        fillRegister(vm);
        await expectAsync(vm.submitRegister()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Error en el registro');
        expect(vm.isLoading).toBe(false);
      });

      it('rejects short, spaced and too-long usernames and accepts the 30-character boundary', async () => {
        for (const username of ['ab', 'bad name', 'a'.repeat(31)]) {
          fillRegister(vm, { username });
          await expectAsync(vm.submitRegister()).toBeResolvedTo(false);
          expect(vm.errorMessage).toBe(
            'El nombre de usuario debe tener entre 3 y 30 caracteres alfanuméricos.'
          );
        }
        expect(authApi.register).not.toHaveBeenCalled();

        fillRegister(vm, { username: 'a'.repeat(30) });
        await expectAsync(vm.submitRegister()).toBeResolvedTo(true);
        expect(authApi.register).toHaveBeenCalledTimes(1);
      });

      it('reports the missing-required-fields message for blank or whitespace-only values', async () => {
        await expectAsync(vm.submitRegister()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Por favor completa todos los campos obligatorios.');

        fillRegister(vm, { full_name: '', name: '', email: '   ' });
        await expectAsync(vm.submitRegister()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Por favor completa todos los campos obligatorios.');
        expect(authApi.register).not.toHaveBeenCalled();
      });

      describe('applyOAuthErrorFeedback defaults (recovered 3)', () => {
        const originalHref = window.location.href;

        afterEach(() => {
          window.history.replaceState(null, '', originalHref);
        });

        it('reads window.location.search when no argument is passed', () => {
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}?error=oauth_cancelled`
          );

          expect(vm.applyOAuthErrorFeedback()).toBe(true);
          expect(vm.errorMessage).toBe('Autorización cancelada. Puedes intentarlo de nuevo.');
        });

        it('does nothing for the default URL without an error parameter', () => {
          window.history.replaceState(null, '', `${window.location.pathname}?code=abc`);

          expect(vm.applyOAuthErrorFeedback()).toBe(false);
          expect(vm.errorMessage).toBe('');
        });
      });

      it('bypasses Supabase and loading notifications when onGoogleAuth is provided', async () => {
        const signIn = spyOn(supabase.auth, 'signInWithOAuth').and.resolveTo({ error: null });
        const onGoogleAuth = jasmine.createSpy('onGoogleAuth');
        const localVm = new AuthViewModel({ onGoogleAuth });
        const listener = jasmine.createSpy('listener');
        disposers.push(localVm.subscribe(listener));

        await localVm.triggerGoogleAuth();

        expect(onGoogleAuth).toHaveBeenCalledTimes(1);
        expect(signIn).not.toHaveBeenCalled();
        expect(localVm.isLoading).toBe(false);
        expect(listener).not.toHaveBeenCalled();
      });

      it('characterizes isLoading staying true after a successful Supabase sign-in', async () => {
        const signIn = spyOn(supabase.auth, 'signInWithOAuth').and.resolveTo({
          data: {},
          error: null,
        });
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));

        await vm.triggerGoogleAuth();

        expect(signIn).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            flowType: 'pkce',
          },
        });
        expect(vm.isLoading).toBe(true);
        expect(vm.errorMessage).toBe('');
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('maps Supabase returned errors and rejections to the error message', async () => {
        const signIn = spyOn(supabase.auth, 'signInWithOAuth');
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));

        signIn.and.resolveTo({ error: { message: 'Popup cerrado' } });
        await vm.triggerGoogleAuth();
        expect(vm.errorMessage).toBe('Popup cerrado');
        expect(vm.isLoading).toBe(false);
        expect(listener).toHaveBeenCalledTimes(2);

        signIn.and.rejectWith({ code: 'network' });
        await vm.triggerGoogleAuth();
        expect(vm.errorMessage).toBe('Error al conectar con Google');
        expect(vm.isLoading).toBe(false);
        expect(listener).toHaveBeenCalledTimes(4);
      });

      it('does nothing when no forgot-password callback is configured', () => {
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));

        expect(() => vm.triggerForgotPassword()).not.toThrow();
        expect(listener).not.toHaveBeenCalled();
        expect(vm.errorMessage).toBe('');
      });

      it('stops notifying listeners after unsubscribe', () => {
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);
        disposers.push(unsubscribe);

        vm.setLoading(true);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.calls.mostRecent().args[0]).toBe(vm);

        unsubscribe();
        vm.setLoading(false);
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
