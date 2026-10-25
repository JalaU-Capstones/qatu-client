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

  it('toggleDropdown() opens and closes when user is set', () => {
    viewModel.setUser({ username: 'ana' });
    expect(viewModel.isDropdownOpen).toBe(false);

    viewModel.toggleDropdown();
    expect(viewModel.isDropdownOpen).toBe(true);

    viewModel.toggleDropdown();
    expect(viewModel.isDropdownOpen).toBe(false);
  });

  it('toggleDropdown() is a no-op when user is null', () => {
    let notified = false;
    viewModel.subscribe(() => {
      notified = true;
    });

    viewModel.toggleDropdown(); // user is null
    expect(viewModel.isDropdownOpen).toBe(false);
    expect(notified).toBe(false);
  });

  it('closeDropdown() closes an open dropdown and notifies', () => {
    viewModel.setUser({ username: 'ana' });
    viewModel.toggleDropdown();
    expect(viewModel.isDropdownOpen).toBe(true);

    let notified = false;
    viewModel.subscribe(() => {
      notified = true;
    });

    viewModel.closeDropdown();
    expect(viewModel.isDropdownOpen).toBe(false);
    expect(notified).toBe(true);
  });

  it('closeDropdown() is a no-op when already closed', () => {
    let notified = false;
    viewModel.subscribe(() => {
      notified = true;
    });

    viewModel.closeDropdown();
    expect(notified).toBe(false);
  });

  it('triggerLogout() calls onLogoutClick and closes dropdown', () => {
    let logoutCalled = false;
    const vm = new HeaderViewModel({
      user: { username: 'ben' },
      onLogoutClick: () => {
        logoutCalled = true;
      },
    });
    vm.toggleDropdown();
    expect(vm.isDropdownOpen).toBe(true);

    vm.triggerLogout();
    expect(logoutCalled).toBe(true);
    expect(vm.isDropdownOpen).toBe(false);
  });

  it('triggerLogout() does not throw when onLogoutClick is not set', () => {
    viewModel.setUser({ username: 'clara' });
    viewModel.toggleDropdown();
    expect(() => viewModel.triggerLogout()).not.toThrow();
    expect(viewModel.isDropdownOpen).toBe(false);
  });

  it('setUser(null) forces isDropdownOpen to false', () => {
    viewModel.setUser({ username: 'dani' });
    viewModel.toggleDropdown();
    expect(viewModel.isDropdownOpen).toBe(true);

    viewModel.setUser(null);
    expect(viewModel.isDropdownOpen).toBe(false);
    expect(viewModel.user).toBeNull();
  });
});
