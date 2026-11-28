import { HeaderViewModel } from './HeaderViewModel.js';
import { NavbarViewModel } from './NavbarViewModel.js';

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

  it('is not a seller by default and setIsSeller notifies only on a real change', () => {
    expect(viewModel.isSeller).toBe(false);

    let notifications = 0;
    viewModel.subscribe(() => {
      notifications += 1;
    });

    viewModel.setIsSeller(true);
    expect(viewModel.isSeller).toBe(true);
    expect(notifications).toBe(1);

    viewModel.setIsSeller(true);
    expect(notifications).toBe(1);

    viewModel.setIsSeller(false);
    expect(viewModel.isSeller).toBe(false);
    expect(notifications).toBe(2);
  });

  it('is not an admin by default and setIsAdmin notifies only on a real change', () => {
    expect(viewModel.isAdmin).toBe(false);

    let notifications = 0;
    viewModel.subscribe(() => {
      notifications += 1;
    });

    viewModel.setIsAdmin(true);
    expect(viewModel.isAdmin).toBe(true);
    expect(notifications).toBe(1);

    viewModel.setIsAdmin(true);
    expect(notifications).toBe(1);
  });

  it('accepts isSeller as a constructor option and coerces it to boolean', () => {
    expect(new HeaderViewModel({ isSeller: true }).isSeller).toBe(true);
    expect(new HeaderViewModel({ isSeller: 'yes' }).isSeller).toBe(true);
    expect(new HeaderViewModel({}).isSeller).toBe(false);
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

  it('triggerProfile() calls onProfileClick and closes dropdown', () => {
    let profileUser = null;
    const vm = new HeaderViewModel({
      user: { username: 'camila' },
      onProfileClick: (user) => {
        profileUser = user;
      },
    });
    vm.toggleDropdown();
    expect(vm.isDropdownOpen).toBe(true);

    vm.triggerProfile();
    expect(profileUser).toEqual({ username: 'camila' });
    expect(vm.isDropdownOpen).toBe(false);
  });

  it('setUser(null) forces isDropdownOpen to false', () => {
    viewModel.setUser({ username: 'dani' });
    viewModel.toggleDropdown();
    expect(viewModel.isDropdownOpen).toBe(true);

    viewModel.setUser(null);
    expect(viewModel.isDropdownOpen).toBe(false);
    expect(viewModel.user).toBeNull();
  });

  it('setTheme("dark") notifies subscribers and updates theme', () => {
    let notified = false;
    viewModel.subscribe(() => {
      notified = true;
    });

    viewModel.setTheme('dark');
    expect(viewModel.theme).toBe('dark');
    expect(notified).toBe(true);
  });

  it('triggerThemeToggle() calls onThemeToggleClick when defined', () => {
    let clicked = false;
    const vm = new HeaderViewModel({
      onThemeToggleClick: () => {
        clicked = true;
      },
    });

    vm.triggerThemeToggle();
    expect(clicked).toBe(true);
  });

  it('setCategories updates this.categories and notifies subscribers', () => {
    let notified = false;
    viewModel.subscribe(() => {
      notified = true;
    });

    viewModel.setCategories([{ id: 1, name: 'Electrónica' }]);
    expect(viewModel.categories).toEqual([{ id: 1, name: 'Electrónica' }]);
    expect(notified).toBe(true);
  });

  it('triggerSearch() with empty searchValue is a no-op', () => {
    const onSearch = jasmine.createSpy('onSearch');
    const vm = new HeaderViewModel({ onSearch });

    vm.setSearchValue('');
    vm.triggerSearch();
    vm.setSearchValue('   ');
    vm.triggerSearch();

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('triggerSearch() with "abc" calls onSearch("abc")', () => {
    const onSearch = jasmine.createSpy('onSearch');
    const vm = new HeaderViewModel({ onSearch });

    vm.setSearchValue('abc');
    vm.triggerSearch();

    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('triggerCategory(42) calls onCategoryClick(42)', () => {
    const onCategoryClick = jasmine.createSpy('onCategoryClick');
    const vm = new HeaderViewModel({ onCategoryClick });

    vm.triggerCategory(42);

    expect(onCategoryClick).toHaveBeenCalledWith(42);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('HeaderViewModel (recovered 1)', () => {
    let viewModel;

    beforeEach(() => {
      viewModel = new HeaderViewModel();
    });

    it('setTheme("dark") notifies subscribers and updates theme', () => {
      let notified = false;
      viewModel.subscribe(() => {
        notified = true;
      });

      viewModel.setTheme('dark');
      expect(viewModel.theme).toBe('dark');
      expect(notified).toBe(true);
    });

    it('triggerSearch() with "abc" calls onSearch("abc")', () => {
      const onSearch = jasmine.createSpy('onSearch');
      const vm = new HeaderViewModel({ onSearch });

      vm.setSearchValue('abc');
      vm.triggerSearch();

      expect(onSearch).toHaveBeenCalledWith('abc');
    });
  });

  (() => {
    describe('HeaderViewModel additional branches (recovered 2)', () => {
      let unsubscribes;

      const triggerCases = [
        { method: 'triggerThemeToggle', callbackName: 'onThemeToggleClick' },
        { method: 'triggerLogin', callbackName: 'onLoginClick' },
        { method: 'triggerCart', callbackName: 'onCartClick' },
        { method: 'triggerLogo', callbackName: 'onLogoClick' },
        {
          method: 'triggerProfile',
          callbackName: 'onProfileClick',
          expectedArgs: (vm) => [vm.user],
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        { method: 'triggerCategory', callbackName: 'onCategoryClick', args: () => ['cat-7'] },
        {
          method: 'triggerOrders',
          callbackName: 'onOrdersClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        {
          method: 'triggerSellerOrders',
          callbackName: 'onSellerOrdersClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        {
          method: 'triggerSellerProducts',
          callbackName: 'onSellerProductsClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        {
          method: 'triggerSellerApply',
          callbackName: 'onSellerApplyClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        {
          method: 'triggerAdminReports',
          callbackName: 'onAdminReportsClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        {
          method: 'triggerAdminSellerApplications',
          callbackName: 'onAdminSellerApplicationsClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
        {
          method: 'triggerAdminCategories',
          callbackName: 'onAdminCategoriesClick',
          closesDropdown: true,
          notifiesWithoutCallback: true,
        },
      ];

      const track = (unsubscribe) => {
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      };

      beforeEach(() => {
        unsubscribes = [];
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      });

      it('passes through constructor options including a supplied navbarViewModel', () => {
        const navbarViewModel = { links: [], activeLinkId: null };
        const onSearch = jasmine.createSpy('onSearch');
        const onLogoutClick = jasmine.createSpy('onLogoutClick');
        const user = { username: 'lucia' };
        const vm = new HeaderViewModel({
          logoText: 'Qatu',
          logoHref: '/home',
          navbarViewModel,
          cartCount: 0,
          loginText: 'Entrar',
          loginHref: '/signin',
          user,
          isSeller: true,
          isAdmin: true,
          theme: 'dark',
          categories: [{ id: 'cat-1' }],
          onSearch,
          onLogoutClick,
        });

        expect(vm.logoText).toBe('Qatu');
        expect(vm.logoHref).toBe('/home');
        expect(vm.navbarViewModel).toBe(navbarViewModel);
        expect(vm.cartCount).toBe(0);
        expect(vm.loginText).toBe('Entrar');
        expect(vm.loginHref).toBe('/signin');
        expect(vm.user).toBe(user);
        expect(vm.isSeller).toBe(true);
        expect(vm.isAdmin).toBe(true);
        expect(vm.theme).toBe('dark');
        expect(vm.categories).toEqual([{ id: 'cat-1' }]);
        expect(vm.onSearch).toBe(onSearch);
        expect(vm.onLogoutClick).toBe(onLogoutClick);
      });

      it('defaults to a NavbarViewModel when the option is missing or falsy', () => {
        expect(new HeaderViewModel().navbarViewModel instanceof NavbarViewModel).toBe(true);
        expect(
          new HeaderViewModel({ navbarViewModel: null }).navbarViewModel instanceof NavbarViewModel
        ).toBe(true);
      });

      it('preserves zero and only falls back on nullish cartCount values', () => {
        expect(new HeaderViewModel({ cartCount: 0 }).cartCount).toBe(0);
        expect(new HeaderViewModel({ cartCount: null }).cartCount).toBe(0);
        expect(new HeaderViewModel({}).cartCount).toBe(0);
        expect(new HeaderViewModel({ cartCount: Number.NaN }).cartCount).toBeNaN();
      });

      it('falls back to default copy, categories and null user for falsy options', () => {
        const vm = new HeaderViewModel({
          logoText: '',
          logoHref: '',
          loginText: '',
          loginHref: '',
          theme: '',
          user: 0,
          categories: null,
        });

        expect(vm.logoText).toBe("Q'atu");
        expect(vm.logoHref).toBe('/');
        expect(vm.loginText).toBe('Iniciar sesión');
        expect(vm.loginHref).toBe('/login');
        expect(vm.theme).toBe('system');
        expect(vm.user).toBeNull();
        expect(vm.categories).toEqual([]);
        expect(new HeaderViewModel({ user: '' }).user).toBeNull();
      });

      it('coerces isAdmin and notifies only when the boolean value actually changes', () => {
        expect(new HeaderViewModel({ isAdmin: 'yes' }).isAdmin).toBe(true);
        expect(new HeaderViewModel({ isAdmin: 0 }).isAdmin).toBe(false);

        const vm = new HeaderViewModel();
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setIsAdmin(false);
        vm.setIsAdmin(0);
        expect(vm.isAdmin).toBe(false);
        expect(listener).not.toHaveBeenCalled();

        vm.setIsAdmin('admin');
        expect(vm.isAdmin).toBe(true);
        expect(listener.calls.count()).toBe(1);
        expect(listener.calls.argsFor(0)[0]).toBe(vm);

        vm.setIsAdmin(1);
        expect(listener.calls.count()).toBe(1);

        vm.setIsAdmin('');
        expect(vm.isAdmin).toBe(false);
        expect(listener.calls.count()).toBe(2);
      });

      it('ignores same-value setCartCount and setTheme calls', () => {
        const vm = new HeaderViewModel({ cartCount: 2, theme: 'dark' });
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setCartCount(2);
        vm.setTheme('dark');
        expect(listener).not.toHaveBeenCalled();

        vm.setCartCount(3);
        vm.setTheme('light');
        expect(listener.calls.count()).toBe(2);
      });

      it('stores a string cart count verbatim instead of coercing it', () => {
        const vm = new HeaderViewModel();

        vm.setCartCount('5');

        expect(vm.cartCount).toBe('5');
      });

      it('setCategories() with no argument resets categories to an empty array and notifies', () => {
        const vm = new HeaderViewModel({ categories: [{ id: 'old' }] });
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setCategories();

        expect(vm.categories).toEqual([]);
        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('setSearchValue converts non-strings to an empty string without notifying', () => {
        const vm = new HeaderViewModel();
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setSearchValue(123);
        expect(vm.searchValue).toBe('');
        vm.setSearchValue(null);
        expect(vm.searchValue).toBe('');
        expect(listener).not.toHaveBeenCalled();
      });

      it('triggerSearch trims the stored search value', () => {
        const onSearch = jasmine.createSpy('onSearch');
        const vm = new HeaderViewModel({ onSearch });

        vm.setSearchValue('  café  ');
        vm.triggerSearch();

        expect(onSearch).toHaveBeenCalledWith('café');
      });

      it('setUser coerces falsy values to null, closes the dropdown and notifies', () => {
        const user = { username: 'ana' };
        const vm = new HeaderViewModel({ user });
        vm.toggleDropdown();
        expect(vm.isDropdownOpen).toBe(true);

        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setUser(0);
        expect(vm.user).toBeNull();
        expect(vm.isDropdownOpen).toBe(false);
        expect(listener.calls.count()).toBe(1);
        expect(listener).toHaveBeenCalledWith(vm);

        vm.setUser(user);
        vm.isDropdownOpen = true;
        vm.setUser('');
        expect(vm.user).toBeNull();
        expect(vm.isDropdownOpen).toBe(false);
        expect(listener.calls.count()).toBe(3);
      });

      it('setUser notifies even when the user is already null', () => {
        const vm = new HeaderViewModel();
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setUser(null);

        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('stops notifying listeners after unsubscribe', () => {
        const vm = new HeaderViewModel();
        const listener = jasmine.createSpy('listener');
        const unsubscribe = track(vm.subscribe(listener));

        vm.setCartCount(1);
        expect(listener.calls.count()).toBe(1);

        unsubscribe();
        vm.setCartCount(2);
        expect(listener.calls.count()).toBe(1);
      });

      for (const triggerCase of triggerCases) {
        it(`${triggerCase.method} calls ${triggerCase.callbackName} with the expected arguments`, () => {
          const callback = jasmine.createSpy(triggerCase.callbackName);
          const vm = new HeaderViewModel({
            user: { username: 'ana' },
            [triggerCase.callbackName]: callback,
          });
          vm.isDropdownOpen = true;
          const listener = jasmine.createSpy('listener');
          track(vm.subscribe(listener));

          const callArgs = triggerCase.args ? triggerCase.args(vm) : [];
          const expectedArgs = triggerCase.expectedArgs ? triggerCase.expectedArgs(vm) : callArgs;
          vm[triggerCase.method](...callArgs);

          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback).toHaveBeenCalledWith(...expectedArgs);
          expect(listener.calls.count()).toBe(triggerCase.notifiesWithoutCallback ? 1 : 0);
          if (triggerCase.closesDropdown) expect(vm.isDropdownOpen).toBe(false);
        });

        it(`${triggerCase.method} is safe without ${triggerCase.callbackName}`, () => {
          const vm = new HeaderViewModel({ user: { username: 'ana' } });
          vm.isDropdownOpen = true;
          const listener = jasmine.createSpy('listener');
          track(vm.subscribe(listener));
          const callArgs = triggerCase.args ? triggerCase.args(vm) : [];

          expect(() => vm[triggerCase.method](...callArgs)).not.toThrow();
          expect(listener.calls.count()).toBe(triggerCase.notifiesWithoutCallback ? 1 : 0);
          if (triggerCase.notifiesWithoutCallback) {
            expect(listener).toHaveBeenCalledWith(vm);
            expect(vm.isDropdownOpen).toBe(false);
          } else {
            expect(vm.isDropdownOpen).toBe(true);
          }
        });
      }
    });
  })();
})();
