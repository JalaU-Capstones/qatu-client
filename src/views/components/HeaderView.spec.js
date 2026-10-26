import { HeaderViewModel } from '../../viewmodels/components/HeaderViewModel.js';
import { HeaderView } from './HeaderView.js';

describe('HeaderView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new HeaderViewModel();
    view = new HeaderView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render header element with brand logo and actions', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('header');
    expect(el.classList.contains('q-header')).toBe(true);

    const logo = el.querySelector('.q-brand-logo');
    expect(logo).not.toBeNull();
    expect(logo.textContent).toBe("Q'atu");

    const loginBtn = el.querySelector('.q-header-login-btn');
    expect(loginBtn).not.toBeNull();
    expect(loginBtn.textContent).toBe('Iniciar sesión');

    const cartBtn = el.querySelector('.q-header-cart-btn');
    expect(cartBtn).not.toBeNull();
  });

  it('should include the navbar navigation inside header', () => {
    const el = view.render();
    const nav = el.querySelector('.q-navbar');
    expect(nav).not.toBeNull();

    const links = el.querySelectorAll('.q-navbar-link');
    expect(links.length).toBe(3);
  });

  it('should render cart badge when cartCount > 0 and update reactively', () => {
    const el = view.render();
    let badge = el.querySelector('.q-header-cart-badge');
    expect(badge).toBeNull();

    viewModel.setCartCount(2);
    badge = el.querySelector('.q-header-cart-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('2');

    viewModel.setCartCount(0);
    badge = el.querySelector('.q-header-cart-badge');
    expect(badge).toBeNull();
  });

  it('should trigger onLoginClick callback when login button is clicked', () => {
    let clicked = false;
    const customVM = new HeaderViewModel({
      onLoginClick: () => {
        clicked = true;
      },
    });
    const customView = new HeaderView(customVM);
    const el = customView.mount(container);

    const loginBtn = el.querySelector('.q-header-login-btn');
    loginBtn.click();
    expect(clicked).toBe(true);
    customView.destroy();
  });

  it('should render circular default avatar placeholder when user is logged in without avatarUrl', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'camilam', full_name: 'Camila Morales' },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    expect(el.querySelector('.q-header-login-btn')).toBeNull();
    const avatar = el.querySelector('.q-header-user-avatar');
    expect(avatar).not.toBeNull();
    expect(avatar.querySelector('.q-header-avatar-placeholder')).not.toBeNull();
    loggedInView.destroy();
  });

  it('should render image avatar when user has avatarUrl', () => {
    const loggedInVM = new HeaderViewModel({
      user: {
        username: 'camilam',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const img = el.querySelector('.q-header-avatar-img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    loggedInView.destroy();
  });

  it('should reactively transition from login button to avatar when user logs in', () => {
    const el = view.render();
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).toBeNull();

    viewModel.setUser({ username: 'roberto' });
    expect(el.querySelector('.q-header-login-btn')).toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).not.toBeNull();

    viewModel.setUser(null);
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).toBeNull();
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-header')).not.toBeNull();
  });

  // --- Dropdown tests ---

  it('avatar click calls toggleDropdown() on the viewModel', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'pedro' },
    });
    spyOn(loggedInVM, 'toggleDropdown').and.callThrough();
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const avatar = el.querySelector('.q-header-avatar');
    avatar.click();
    expect(loggedInVM.toggleDropdown).toHaveBeenCalled();
    loggedInView.destroy();
  });

  it('dropdown is hidden by default when user is set', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'lara', email: 'lara@q.com' },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const dropdown = el.querySelector('.q-header-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown.hasAttribute('hidden')).toBe(true);
    loggedInView.destroy();
  });

  it('dropdown removes hidden attribute when isDropdownOpen becomes true', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'lara', email: 'lara@q.com' },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    loggedInVM.toggleDropdown(); // open it
    const dropdown = el.querySelector('.q-header-dropdown');
    expect(dropdown.hasAttribute('hidden')).toBe(false);

    loggedInVM.toggleDropdown(); // close it
    expect(dropdown.hasAttribute('hidden')).toBe(true);
    loggedInView.destroy();
  });

  it('clicking outside the header closes the dropdown', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'tomas', email: 'tomas@q.com' },
    });
    const loggedInView = new HeaderView(loggedInVM);
    loggedInView.mount(container);

    // Open the dropdown
    loggedInVM.toggleDropdown();
    expect(loggedInVM.isDropdownOpen).toBe(true);

    // Dispatch a click on an element outside the header
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const outsideClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    outside.dispatchEvent(outsideClick);

    expect(loggedInVM.isDropdownOpen).toBe(false);

    outside.remove();
    loggedInView.destroy();
  });

  it('.q-header-logout-btn click calls viewModel.triggerLogout()', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'vera', email: 'vera@q.com' },
    });
    spyOn(loggedInVM, 'triggerLogout');
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const logoutBtn = el.querySelector('.q-header-logout-btn');
    expect(logoutBtn).not.toBeNull();
    logoutBtn.click();
    expect(loggedInVM.triggerLogout).toHaveBeenCalled();
    loggedInView.destroy();
  });

  it('when user transitions null → object, avatar wrapper with dropdown is created', () => {
    const el = view.render();
    expect(el.querySelector('.q-header-avatar-wrapper')).toBeNull();

    viewModel.setUser({ username: 'sofia', email: 'sofia@q.com' });
    const wrapper = el.querySelector('.q-header-avatar-wrapper');
    expect(wrapper).not.toBeNull();
    const dropdown = wrapper.querySelector('.q-header-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown.hasAttribute('hidden')).toBe(true);
  });

  it('when user transitions object → null, avatar wrapper is removed from DOM', () => {
    viewModel.setUser({ username: 'sofia', email: 'sofia@q.com' });
    const el = view.render();
    expect(el.querySelector('.q-header-avatar-wrapper')).not.toBeNull();

    viewModel.setUser(null);
    expect(el.querySelector('.q-header-avatar-wrapper')).toBeNull();
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
  });

  it('renders .q-header-theme-btn between cart and login', () => {
    const el = view.render();
    const actions = el.querySelector('.q-header-actions');
    expect(actions).not.toBeNull();

    const cartBtn = actions.querySelector('.q-header-cart-btn');
    const themeBtn = actions.querySelector('.q-header-theme-btn');
    const loginBtn = actions.querySelector('.q-header-login-btn');

    expect(cartBtn).not.toBeNull();
    expect(themeBtn).not.toBeNull();
    expect(loginBtn).not.toBeNull();

    expect(cartBtn.nextElementSibling).toBe(themeBtn);
    expect(themeBtn.nextElementSibling).toBe(loginBtn);
  });

  it('clicking .q-header-theme-btn calls viewModel.triggerThemeToggle()', () => {
    spyOn(viewModel, 'triggerThemeToggle');
    const el = view.render();
    const themeBtn = el.querySelector('.q-header-theme-btn');
    expect(themeBtn).not.toBeNull();

    themeBtn.click();
    expect(viewModel.triggerThemeToggle).toHaveBeenCalled();
  });

  it('_update() swaps the SVG when vm.theme changes', () => {
    const el = view.render();
    const themeBtn = el.querySelector('.q-header-theme-btn');

    viewModel.setTheme('light');
    let svg = themeBtn.querySelector('svg.q-header-theme-icon');
    expect(svg.getAttribute('data-icon')).toBe('sun');

    viewModel.setTheme('dark');
    svg = themeBtn.querySelector('svg.q-header-theme-icon');
    expect(svg.getAttribute('data-icon')).toBe('moon');

    viewModel.setTheme('system');
    svg = themeBtn.querySelector('svg.q-header-theme-icon');
    expect(svg.getAttribute('data-icon')).toBe('system');
  });
});
