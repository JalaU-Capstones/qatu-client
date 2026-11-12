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
