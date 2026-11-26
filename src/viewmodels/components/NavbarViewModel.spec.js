import { NavbarViewModel } from './NavbarViewModel.js';

describe('NavbarViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new NavbarViewModel();
  });

  it('should initialize with default navigation links', () => {
    expect(viewModel.links.length).toBe(3);
    expect(viewModel.links[0].label).toBe('Categorías');
    expect(viewModel.links[1].label).toBe('Tiendas');
    expect(viewModel.links[1].id).toBe('nav-tiendas');
    expect(viewModel.links[1].href).toBe('/stores');
    expect(viewModel.links[2].label).toBe('Productos');
  });

  it('should initialize with mobile menu closed', () => {
    expect(viewModel.isMenuOpen).toBe(false);
  });

  it('should toggle mobile menu', () => {
    viewModel.toggleMenu();
    expect(viewModel.isMenuOpen).toBe(true);

    viewModel.toggleMenu();
    expect(viewModel.isMenuOpen).toBe(false);
  });

  it('should open and close mobile menu explicitly', () => {
    viewModel.openMenu();
    expect(viewModel.isMenuOpen).toBe(true);

    viewModel.closeMenu();
    expect(viewModel.isMenuOpen).toBe(false);
  });

  it('should set active link and notify subscribers', () => {
    let notified = false;
    viewModel.subscribe((vm) => {
      notified = true;
      expect(vm.activeLinkId).toBe('nav-tiendas');
    });

    viewModel.setActiveLink('nav-tiendas');
    expect(viewModel.activeLinkId).toBe('nav-tiendas');
    expect(notified).toBe(true);
  });

  it('should allow unsubscribing from notifications', () => {
    let count = 0;
    const unsubscribe = viewModel.subscribe(() => {
      count += 1;
    });

    viewModel.toggleMenu();
    expect(count).toBe(1);

    unsubscribe();
    viewModel.toggleMenu();
    expect(count).toBe(1);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('NavbarViewModel additional branches (recovered 1)', () => {
      let viewModel;
      let unsubscribes;

      const track = (unsubscribe) => {
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      };

      beforeEach(() => {
        unsubscribes = [];
        viewModel = new NavbarViewModel();
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      });

      it('keeps custom links and activeLinkId, falling back for falsy options', () => {
        const links = [{ id: 'custom', label: 'Custom', href: '/custom' }];
        const vm = new NavbarViewModel({ links, activeLinkId: 'custom' });

        expect(vm.links).toBe(links);
        expect(vm.activeLinkId).toBe('custom');

        const fallback = new NavbarViewModel({ links: null, activeLinkId: '' });
        expect(fallback.links.length).toBe(3);
        expect(fallback.activeLinkId).toBeNull();
      });

      it('does not notify for redundant closeMenu and openMenu calls', () => {
        const listener = jasmine.createSpy('listener');
        track(viewModel.subscribe(listener));

        viewModel.closeMenu();
        expect(viewModel.isMenuOpen).toBe(false);
        expect(listener).not.toHaveBeenCalled();

        viewModel.openMenu();
        expect(listener.calls.count()).toBe(1);
        viewModel.openMenu();
        expect(viewModel.isMenuOpen).toBe(true);
        expect(listener.calls.count()).toBe(1);

        viewModel.closeMenu();
        expect(listener.calls.count()).toBe(2);
      });

      it('ignores a same-value active link and accepts null', () => {
        const vm = new NavbarViewModel({ activeLinkId: 'nav-tiendas' });
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setActiveLink('nav-tiendas');
        expect(listener).not.toHaveBeenCalled();

        vm.setActiveLink(null);
        expect(vm.activeLinkId).toBeNull();
        expect(listener.calls.count()).toBe(1);
        expect(listener).toHaveBeenCalledWith(vm);

        vm.setActiveLink(null);
        expect(listener.calls.count()).toBe(1);
      });

      it('toggleMenu notifies every listener with the view model payload', () => {
        const listener = jasmine.createSpy('listener');
        track(viewModel.subscribe(listener));

        viewModel.toggleMenu();
        expect(listener.calls.count()).toBe(1);
        expect(listener.calls.argsFor(0)[0]).toBe(viewModel);
        expect(listener.calls.argsFor(0)[0].isMenuOpen).toBe(true);

        viewModel.toggleMenu();
        expect(listener.calls.count()).toBe(2);
        expect(listener.calls.argsFor(1)[0].isMenuOpen).toBe(false);
      });

      it('notifies multiple listeners and only the unsubscribed one stops receiving updates', () => {
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        const unsubscribeFirst = track(viewModel.subscribe(first));
        const unsubscribeSecond = track(viewModel.subscribe(second));

        viewModel.toggleMenu();
        expect(first).toHaveBeenCalledWith(viewModel);
        expect(second).toHaveBeenCalledWith(viewModel);

        expect(unsubscribeFirst()).toBe(true);
        expect(unsubscribeFirst()).toBe(false);
        viewModel.toggleMenu();

        expect(first.calls.count()).toBe(1);
        expect(second.calls.count()).toBe(2);
        unsubscribeSecond();
      });
    });
  })();
})();
