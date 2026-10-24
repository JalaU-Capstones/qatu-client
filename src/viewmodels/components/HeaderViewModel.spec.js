import { HeaderViewModel } from './HeaderViewModel.js';

describe('HeaderViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new HeaderViewModel();
  });

  it('should initialize with default values', () => {
    expect(viewModel.logoText).toBe("Q'atu");
    expect(viewModel.logoHref).toBe('/');
    expect(viewModel.cartCount).toBe(0);
    expect(viewModel.loginText).toBe('Iniciar sesión');
    expect(viewModel.user).toBeNull();
  });

  it('should update cartCount and notify subscribers', () => {
    let notified = false;
    viewModel.subscribe(() => {
      notified = true;
    });

    viewModel.setCartCount(3);
    expect(viewModel.cartCount).toBe(3);
    expect(notified).toBe(true);
  });

  it('should update user and notify subscribers', () => {
    let notifiedUser = null;
    viewModel.subscribe((vm) => {
      notifiedUser = vm.user;
    });

    const mockUser = { username: 'lucia', email: 'lucia@qatu.pe' };
    viewModel.setUser(mockUser);
    expect(viewModel.user).toEqual(mockUser);
    expect(notifiedUser).toEqual(mockUser);

    viewModel.setUser(null);
    expect(viewModel.user).toBeNull();
  });

  it('should trigger onLoginClick, onCartClick, and onProfileClick callbacks', () => {
    let loginTriggered = false;
    let cartTriggered = false;
    let profileTriggered = false;

    const vm = new HeaderViewModel({
      onLoginClick: () => {
        loginTriggered = true;
      },
      onCartClick: () => {
        cartTriggered = true;
      },
      onProfileClick: () => {
        profileTriggered = true;
      },
    });

    vm.triggerLogin();
    expect(loginTriggered).toBe(true);

    vm.triggerCart();
    expect(cartTriggered).toBe(true);

    vm.triggerProfile();
    expect(profileTriggered).toBe(true);
  });
});
