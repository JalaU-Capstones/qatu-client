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
    expect(logo.getAttribute('aria-label')).toBe('Q’atu');
    expect(logo.querySelector('text').textContent).toBe('Q’atu');

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
    expect(links.length).toBe(2);
  });

  it('login button text is "Iniciar sesión"', () => {
    expect(view.render().querySelector('.q-header-login-btn').textContent).toBe('Iniciar sesión');
  });

  describe('restored behavioral checks', () => {
    it('login button text is "Iniciar sesión"', () => {
      expect(view.render().querySelector('.q-header-login-btn').textContent).toBe('Iniciar sesión');
    });
  });

  it('renders the header shell with the pill inside and its three content clusters', () => {
    const el = view.render();
    const shell = el.querySelector('.q-header__shell');
    const pill = shell.querySelector('.q-header__pill');

    expect(shell).not.toBeNull();
    expect(pill).not.toBeNull();
    expect(pill.querySelector('.q-header__left .q-header-brand')).not.toBeNull();
    expect(pill.querySelector('.q-header-search')).not.toBeNull();
    expect(pill.querySelector('.q-header-actions')).not.toBeNull();
  });

  describe('restored route-awareness check', () => {
    it('route-awareness: mounting the header does not remove the body route', () => {
      const previousRoute = document.body.dataset.route;
      document.body.dataset.route = 'auth';
      view.mount(container);

      expect(document.body.dataset.route).toBe('auth');

      if (previousRoute === undefined) {
        delete document.body.dataset.route;
      } else {
        document.body.dataset.route = previousRoute;
      }
    });
  });

  it('route-awareness: mounting the header does not remove the body route', () => {
    const previousRoute = document.body.dataset.route;
    document.body.dataset.route = 'auth';
    view.mount(container);

    expect(document.body.dataset.route).toBe('auth');

    if (previousRoute === undefined) {
      delete document.body.dataset.route;
    } else {
      document.body.dataset.route = previousRoute;
    }
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

  it('renders circular placeholder SVG when avatar image fails to load', () => {
    const loggedInVM = new HeaderViewModel({
      user: {
        username: 'camilam',
        avatarUrl: 'https://invalid.example/avatar-broken.jpg',
      },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const img = el.querySelector('.q-header-avatar-img');
    expect(img).not.toBeNull();

    img.dispatchEvent(new Event('error'));

    const avatar = el.querySelector('.q-header-user-avatar');
    expect(avatar.querySelector('.q-header-avatar-img')).toBeNull();
    expect(avatar.querySelector('.q-header-avatar-placeholder')).not.toBeNull();

    loggedInView.destroy();
  });

  it('should reactively transition from login button to avatar when user logs in', () => {
    const el = view.render();
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
    expect(el.querySelector('.q-header-login-btn').textContent).toBe('Iniciar sesión');
    expect(el.querySelector('.q-header-user-avatar')).toBeNull();

    viewModel.setUser({ username: 'roberto' });
    expect(el.querySelector('.q-header-login-btn')).toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).not.toBeNull();

    viewModel.setUser(null);
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).toBeNull();
  });

  it('preserves header, navigation, and dropdown handlers after mounting', () => {
    const callbacks = {
      onLoginClick: jasmine.createSpy('onLoginClick'),
      onLogoClick: jasmine.createSpy('onLogoClick'),
      onCartClick: jasmine.createSpy('onCartClick'),
      onOrdersClick: jasmine.createSpy('onOrdersClick'),
      onSellerOrdersClick: jasmine.createSpy('onSellerOrdersClick'),
      onSellerProductsClick: jasmine.createSpy('onSellerProductsClick'),
      onProfileClick: jasmine.createSpy('onProfileClick'),
      onSearch: jasmine.createSpy('onSearch'),
      onCategoryClick: jasmine.createSpy('onCategoryClick'),
      onLogoutClick: jasmine.createSpy('onLogoutClick'),
      onThemeToggleClick: jasmine.createSpy('onThemeToggleClick'),
    };
    Object.assign(viewModel, callbacks);
    viewModel.setIsSeller(true);
    viewModel.setCategories([{ id: 'cat-1', name: 'Artesanía' }]);
    viewModel.setUser({ username: 'seller', email: 'seller@example.com' });
    const el = view.mount(container);

    el.querySelector('.q-header-brand').click();
    el.querySelector('.q-header-cart-btn').click();
    el.querySelector('.q-header-theme-btn').click();
    el.querySelector('[data-link-id="nav-tiendas"]').click();
    expect(viewModel.navbarViewModel.activeLinkId).toBe('nav-tiendas');

    viewModel.setUser(null);
    expect(el.querySelector('.q-header-login-btn').textContent).toBe('Iniciar sesión');
    el.querySelector('.q-header-login-btn').click();
    viewModel.setUser({ username: 'seller', email: 'seller@example.com' });

    el.querySelector('.q-header-user-avatar').click();
    el.querySelector('.q-header-profile-btn').click();
    el.querySelector('.q-header-orders-btn').click();
    el.querySelector('.q-header-seller-orders-btn').click();
    el.querySelector('.q-header-seller-products-btn').click();
    el.querySelector('.q-header-logout-btn').click();

    expect(el.querySelector('[data-link-id="nav-categorias"]')).toBeNull();
    expect(el.querySelector('.q-header-cat-dropdown')).toBeNull();

    const searchInput = el.querySelector('.q-header-search__input');
    searchInput.value = 'zapatos';
    el.querySelector('.q-header-search').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(callbacks.onLoginClick).toHaveBeenCalled();
    expect(callbacks.onLogoClick).toHaveBeenCalled();
    expect(callbacks.onCartClick).toHaveBeenCalled();
    expect(callbacks.onThemeToggleClick).toHaveBeenCalled();
    expect(callbacks.onProfileClick).toHaveBeenCalledWith(
      jasmine.objectContaining({ username: 'seller' })
    );
    expect(callbacks.onOrdersClick).toHaveBeenCalled();
    expect(callbacks.onSellerOrdersClick).toHaveBeenCalled();
    expect(callbacks.onSellerProductsClick).toHaveBeenCalled();
    expect(callbacks.onLogoutClick).toHaveBeenCalled();
    expect(callbacks.onCategoryClick).not.toHaveBeenCalled();
    expect(callbacks.onSearch).toHaveBeenCalledWith('zapatos');
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

  it('shows the signed-in role and inline icons for each dropdown action', () => {
    viewModel.setUser({
      username: 'seller',
      full_name: 'Seller Name',
      email: 'seller@example.qatu.pe',
    });
    viewModel.setIsSeller(true);
    const el = view.render();
    const dropdown = el.querySelector('.q-header-dropdown');

    expect(dropdown.querySelector('.q-header-dropdown-name').textContent).toBe('Seller Name');
    expect(dropdown.querySelector('.q-header-dropdown-role').textContent).toBe('Vendedor');
    expect(dropdown.querySelectorAll('.q-header-dropdown-icon').length).toBeGreaterThan(0);
    expect(dropdown.querySelector('.q-header-dropdown-separator')).not.toBeNull();
    expect(dropdown.querySelector('.q-header-logout-btn .q-header-dropdown-icon')).not.toBeNull();

    viewModel.setIsAdmin(true);
    expect(dropdown.querySelector('.q-header-dropdown-role').textContent).toBe('Admin');
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

  it('.q-header-profile-btn click calls viewModel.triggerProfile()', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'vera', email: 'vera@q.com' },
    });
    spyOn(loggedInVM, 'triggerProfile');
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const profileBtn = el.querySelector('.q-header-profile-btn');
    expect(profileBtn).not.toBeNull();
    expect(profileBtn.textContent).toBe('Mi Perfil');
    profileBtn.click();
    expect(loggedInVM.triggerProfile).toHaveBeenCalled();
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

  describe('Seller links (dashboard)', () => {
    const SELLER_ORDERS_LINK = '.q-header-seller-orders-btn';
    const SELLER_PRODUCTS_LINK = '.q-header-seller-products-btn';

    it('is hidden for a signed-in buyer', () => {
      viewModel.setUser({ username: 'ana' });
      const el = view.render();
      expect(el.querySelector(SELLER_ORDERS_LINK)).toBeNull();
      expect(el.querySelector(SELLER_PRODUCTS_LINK)).toBeNull();
    });

    it('is shown for a seller or admin, with Mis Productos and Mis Ventas', () => {
      viewModel.setIsSeller(true);
      viewModel.setUser({ username: 'sam' });
      const el = view.render();

      const ordersLink = el.querySelector(SELLER_ORDERS_LINK);
      expect(ordersLink).not.toBeNull();
      expect(ordersLink.textContent).toBe('Mis Ventas');
      expect(ordersLink.getAttribute('href')).toBe('/seller/orders');

      const productsLink = el.querySelector(SELLER_PRODUCTS_LINK);
      expect(productsLink).not.toBeNull();
      expect(productsLink.textContent).toBe('Mis Productos');
      expect(productsLink.getAttribute('href')).toBe('/seller/products');
    });

    it('seller dropdown distinguishes buyer orders from seller sales', () => {
      viewModel.setIsSeller(true);
      viewModel.setUser({ username: 'sam' });
      const el = view.render();

      const dropdown = el.querySelector('.q-header-dropdown');
      expect(dropdown).not.toBeNull();

      const ordersLink = dropdown.querySelector('.q-header-orders-btn');
      const salesLink = dropdown.querySelector('.q-header-seller-orders-btn');
      const productsLink = dropdown.querySelector('.q-header-seller-products-btn');

      expect(ordersLink).not.toBeNull();
      expect(salesLink).not.toBeNull();
      expect(productsLink).not.toBeNull();

      expect(ordersLink.textContent).toBe('Mis Órdenes');
      expect(salesLink.textContent).toBe('Mis Ventas');
      expect(productsLink.textContent).toBe('Mis Productos');
    });

    it('is not rendered for anonymous visitors, even if the flag is set', () => {
      viewModel.setIsSeller(true);
      const el = view.render();
      expect(el.querySelector(SELLER_ORDERS_LINK)).toBeNull();
      expect(el.querySelector(SELLER_PRODUCTS_LINK)).toBeNull();
      expect(el.querySelector('.q-header-dropdown')).toBeNull();
    });

    it('appears and disappears when the roles change for an already rendered user', () => {
      viewModel.setUser({ username: 'sam' });
      const el = view.render();
      expect(el.querySelector(SELLER_ORDERS_LINK)).toBeNull();
      expect(el.querySelector(SELLER_PRODUCTS_LINK)).toBeNull();

      viewModel.setIsSeller(true);
      expect(el.querySelectorAll(SELLER_ORDERS_LINK).length).toBe(1);
      expect(el.querySelectorAll(SELLER_PRODUCTS_LINK).length).toBe(1);

      viewModel.setIsSeller(false);
      expect(el.querySelector(SELLER_ORDERS_LINK)).toBeNull();
      expect(el.querySelector(SELLER_PRODUCTS_LINK)).toBeNull();
    });

    it('does not duplicate the link on repeated updates', () => {
      viewModel.setIsSeller(true);
      viewModel.setUser({ username: 'sam' });
      const el = view.render();

      viewModel.setCartCount(1);
      viewModel.setCartCount(2);
      expect(el.querySelectorAll(SELLER_ORDERS_LINK).length).toBe(1);
      expect(el.querySelectorAll(SELLER_PRODUCTS_LINK).length).toBe(1);
    });

    it('clicking it calls viewModel.triggerSellerOrders() without a page reload', () => {
      viewModel.setIsSeller(true);
      viewModel.setUser({ username: 'sam' });
      spyOn(viewModel, 'triggerSellerOrders');
      const el = view.render();

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      el.querySelector(SELLER_ORDERS_LINK).dispatchEvent(event);

      expect(viewModel.triggerSellerOrders).toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });

    it('clicking Mis Productos calls viewModel.triggerSellerProducts() without a page reload', () => {
      viewModel.setIsSeller(true);
      viewModel.setUser({ username: 'sam' });
      spyOn(viewModel, 'triggerSellerProducts');
      const el = view.render();

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      el.querySelector(SELLER_PRODUCTS_LINK).dispatchEvent(event);

      expect(viewModel.triggerSellerProducts).toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });
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

  it('updates the theme icon in one click in both directions', () => {
    viewModel.setTheme('light');
    viewModel.onThemeToggleClick = () => {
      viewModel.setTheme(viewModel.theme === 'dark' ? 'light' : 'dark');
    };
    const el = view.render();
    const themeBtn = el.querySelector('.q-header-theme-btn');

    themeBtn.click();
    expect(viewModel.theme).toBe('dark');
    expect(themeBtn.querySelector('.q-header-theme-icon').getAttribute('data-icon')).toBe('moon');

    themeBtn.click();
    expect(viewModel.theme).toBe('light');
    expect(themeBtn.querySelector('.q-header-theme-icon').getAttribute('data-icon')).toBe('sun');
  });

  describe('Categorías dropdown and search bar', () => {
    it('with viewModel.categories = [{id:1,name:"Electrónica"}], the dropdown trigger exists and menu contains "Electrónica"', () => {
      viewModel.setCategories([{ id: 1, name: 'Electrónica' }]);
      const el = view.render();

      expect(viewModel.categories).toEqual([{ id: 1, name: 'Electrónica' }]);
      expect(el.querySelector('[data-link-id="nav-categorias"]')).toBeNull();
      expect(el.querySelector('.q-header-cat-dropdown')).toBeNull();
    });

    it('clicking the trigger toggles the menu (hidden attribute)', () => {
      viewModel.setCategories([{ id: 1, name: 'Electrónica' }]);
      const el = view.render();

      expect(el.querySelector('[data-link-id="nav-categorias"]')).toBeNull();
      expect(el.querySelector('.q-header-cat-dropdown')).toBeNull();
    });

    it('header does NOT render the categorias dropdown or nav item', () => {
      viewModel.setCategories([{ id: 1, name: 'Electrónica' }]);
      const el = view.render();

      expect(el.querySelector('[data-link-id="nav-categorias"]')).toBeNull();
      expect(el.querySelector('.q-header-cat-dropdown')).toBeNull();
    });

    it('search form: submitting with text calls viewModel.triggerSearch', () => {
      spyOn(viewModel, 'triggerSearch');
      const el = view.render();

      const input = el.querySelector('.q-header-search__input');
      const form = el.querySelector('.q-header-search');
      input.value = 'zapatos';

      form.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(viewModel.triggerSearch).toHaveBeenCalled();
      expect(viewModel.searchValue).toBe('zapatos');
    });

    it('search submit calls onSearch with the typed term', () => {
      const onSearch = jasmine.createSpy('onSearch');
      viewModel.onSearch = onSearch;
      const el = view.render();
      const input = el.querySelector('.q-header-search__input');
      input.value = '  cerámica  ';

      el.querySelector('.q-header-search').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );

      expect(onSearch).toHaveBeenCalledWith('cerámica');
    });

    it('uses a text input with the mobile search keyboard hints', () => {
      const el = view.render();
      const input = el.querySelector('.q-header-search__input');

      expect(el.querySelector('.q-header-search').getAttribute('role')).toBe('search');
      expect(input.type).toBe('text');
      expect(input.getAttribute('inputmode')).toBe('search');
      expect(input.getAttribute('enterkeyhint')).toBe('search');
    });

    it('search toggle exposes the input and updates its expanded state', () => {
      const el = view.render();
      const form = el.querySelector('.q-header-search');
      const pill = el.querySelector('.q-header__pill');
      const toggle = el.querySelector('.q-header-search__toggle');

      toggle.click();
      expect(form.classList.contains('q-header-search--expanded')).toBe(true);
      expect(pill.classList.contains('q-header__pill--search-expanded')).toBe(true);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(form.firstElementChild).toBe(toggle);
      expect(toggle.querySelector('[data-icon="collapse"]')).not.toBeNull();

      toggle.click();
      expect(form.classList.contains('q-header-search--expanded')).toBe(false);
      expect(pill.classList.contains('q-header__pill--search-expanded')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.querySelector('[data-icon="search"]')).not.toBeNull();
    });

    it('search toggle updates its label and focuses the expanded input', () => {
      const el = view.mount(container);
      const input = el.querySelector('.q-header-search__input');
      const toggle = el.querySelector('.q-header-search__toggle');

      toggle.click();
      expect(toggle.getAttribute('aria-label')).toBe('Cerrar búsqueda');
      expect(document.activeElement).toBe(input);

      toggle.click();
      expect(toggle.getAttribute('aria-label')).toBe('Abrir búsqueda');
    });

    it('clears the search term without collapsing the expanded search', () => {
      const el = view.mount(container);
      const form = el.querySelector('.q-header-search');
      const input = el.querySelector('.q-header-search__input');
      const clearButton = el.querySelector('.q-header-search__clear');
      const toggle = el.querySelector('.q-header-search__toggle');

      toggle.click();
      input.value = 'cerámica';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(clearButton.hidden).toBe(false);
      expect(viewModel.searchValue).toBe('cerámica');

      clearButton.click();

      expect(input.value).toBe('');
      expect(viewModel.searchValue).toBe('');
      expect(clearButton.hidden).toBe(true);
      expect(form.classList.contains('q-header-search--expanded')).toBe(true);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(input);

      input.value = 'volver';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      toggle.click();
      expect(clearButton.hidden).toBe(true);

      toggle.click();
      expect(clearButton.hidden).toBe(false);
      expect(input.value).toBe('volver');
    });

    it('closes the expanded search with Escape and returns focus to the toggle', () => {
      const el = view.mount(container);
      const form = el.querySelector('.q-header-search');
      const pill = el.querySelector('.q-header__pill');
      const input = el.querySelector('.q-header-search__input');
      const toggle = el.querySelector('.q-header-search__toggle');

      toggle.click();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );

      expect(form.classList.contains('q-header-search--expanded')).toBe(false);
      expect(pill.classList.contains('q-header__pill--search-expanded')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.getAttribute('aria-label')).toBe('Abrir búsqueda');
      expect(document.activeElement).toBe(toggle);
    });

    describe('restored search checks', () => {
      it('search toggle updates its label and focuses the expanded input', () => {
        const el = view.mount(container);
        const input = el.querySelector('.q-header-search__input');
        const toggle = el.querySelector('.q-header-search__toggle');

        toggle.click();
        expect(toggle.getAttribute('aria-label')).toBe('Cerrar búsqueda');
        expect(document.activeElement).toBe(input);

        toggle.click();
        expect(toggle.getAttribute('aria-label')).toBe('Abrir búsqueda');
      });

      it('updates category dropdown items when categories arrive after mounting', () => {
        const onCategoryClick = jasmine.createSpy('onCategoryClick');
        viewModel.onCategoryClick = onCategoryClick;
        const el = view.mount(container);

        viewModel.setCategories([{ id: 'cat-new', name: 'Cerámica' }]);
        expect(viewModel.categories).toEqual([{ id: 'cat-new', name: 'Cerámica' }]);
        expect(el.querySelector('[data-link-id="nav-categorias"]')).toBeNull();
        expect(el.querySelector('.q-header-cat-dropdown')).toBeNull();

        expect(onCategoryClick).not.toHaveBeenCalled();
      });
    });

    it('updates category dropdown items when categories arrive after mounting', () => {
      const onCategoryClick = jasmine.createSpy('onCategoryClick');
      viewModel.onCategoryClick = onCategoryClick;
      const el = view.mount(container);

      viewModel.setCategories([{ id: 'cat-new', name: 'Cerámica' }]);
      expect(viewModel.categories).toEqual([{ id: 'cat-new', name: 'Cerámica' }]);
      expect(el.querySelector('[data-link-id="nav-categorias"]')).toBeNull();
      expect(el.querySelector('.q-header-cat-dropdown')).toBeNull();

      expect(onCategoryClick).not.toHaveBeenCalled();
    });

    it('search: empty submit does nothing', () => {
      spyOn(viewModel, 'triggerSearch');
      const el = view.render();

      const input = el.querySelector('.q-header-search__input');
      const form = el.querySelector('.q-header-search');
      input.value = '   ';

      form.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(viewModel.triggerSearch).not.toHaveBeenCalled();
    });
  });

  describe('admin reports link', () => {
    it('is shown only for an admin and points at /admin/reports', () => {
      viewModel.setUser({ username: 'ada' });
      const el = view.render();
      expect(el.querySelector('.q-header-admin-reports-btn')).toBeNull();

      viewModel.setIsAdmin(true);
      const link = el.querySelector('.q-header-admin-reports-btn');
      expect(link).not.toBeNull();
      expect(link.textContent).toBe('Reportes');
      expect(link.getAttribute('href')).toBe('/admin/reports');
      expect(el.querySelectorAll('.q-header-admin-reports-btn').length).toBe(1);

      viewModel.setIsAdmin(false);
      expect(el.querySelector('.q-header-admin-reports-btn')).toBeNull();
    });
  });
});
