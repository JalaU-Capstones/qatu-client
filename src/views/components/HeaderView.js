import { HeaderViewModel } from '../../viewmodels/components/HeaderViewModel.js';
import { createBrandLogo } from './BrandLogo.js';
import { NavbarView } from './NavbarView.js';

const DROPDOWN_ICONS = {
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>',
  orders:
    '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z"></path><path d="M16 3v5h5M8 13h8M8 17h8"></path>',
  products:
    '<path d="m12 3 9 5-9 5-9-5 9-5z"></path><path d="m3 8 9 5 9-5M3 13l9 5 9-5M3 8v8l9 5 9-5V8"></path>',
  sales: '<path d="M3 3v18h18"></path><path d="m7 14 4-4 4 3 6-7"></path>',
  store: '<path d="M3 10h18l-2-6H5l-2 6z"></path><path d="M5 10v10h14V10M9 20v-6h6v6"></path>',
  reports: '<path d="M4 19V5M4 19h17"></path><path d="m7 15 4-5 4 3 5-7"></path>',
  people:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="10" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>',
  logout:
    '<path d="M10 17l5-5-5-5M15 12H3"></path><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"></path>',
};

/**
 * View component for the Header.
 * Combines Brand Logo, Navbar, Cart Icon, and Iniciar Sesión button or User Avatar.
 */
export class HeaderView {
  /**
   * @param {HeaderViewModel} [viewModel]
   */
  constructor(viewModel = new HeaderViewModel()) {
    this.viewModel = viewModel;
    this.navbarView = new NavbarView(this.viewModel.navbarViewModel);
    this.element = null;
    this._unsubscribe = null;
    this._handleDocumentClick = this._handleDocumentClick.bind(this);
  }

  /**
   * Builds and returns the DOM element for the header.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const header = document.createElement('header');
    header.className = 'q-header';
    header.setAttribute('role', 'banner');

    const shell = document.createElement('div');
    shell.className = 'q-header__shell';

    const pill = document.createElement('div');
    pill.className = 'q-header__pill';

    const leftCluster = document.createElement('div');
    leftCluster.className = 'q-header__left';

    // 1. Brand Logo
    const brandLink = document.createElement('a');
    brandLink.className = 'q-header-brand';
    brandLink.href = this.viewModel.logoHref;
    brandLink.setAttribute('aria-label', `${this.viewModel.logoText} inicio`);

    brandLink.appendChild(createBrandLogo({ size: 'md' }));

    brandLink.dataset.route = '';

    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.triggerLogo();
    });

    // 2. Navigation
    const navWrapper = document.createElement('div');
    navWrapper.className = 'q-header-nav';
    navWrapper.appendChild(this.navbarView.render());
    const categoriesLink = navWrapper.querySelector('[data-link-id="nav-categorias"]');
    if (categoriesLink) categoriesLink.remove();

    // 3. Right Actions
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'q-header-actions';

    // Cart Button with SVG icon
    const cartBtn = document.createElement('button');
    cartBtn.type = 'button';
    cartBtn.className = 'q-header-icon-btn q-header-cart-btn';
    cartBtn.setAttribute('aria-label', 'Carrito de compras');
    cartBtn.setAttribute('title', 'Carrito de compras');
    cartBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    `;

    if (this.viewModel.cartCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'q-header-cart-badge';
      badge.textContent = String(this.viewModel.cartCount);
      cartBtn.appendChild(badge);
    }

    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerCart();
    });

    actionsWrapper.appendChild(cartBtn);

    // Theme toggle button
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'q-header-icon-btn q-header-theme-btn';
    themeBtn.setAttribute('aria-label', 'Cambiar tema');
    themeBtn.innerHTML = this._getThemeIconSvg(this.viewModel.theme);

    themeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerThemeToggle();
    });

    actionsWrapper.appendChild(themeBtn);

    // User authentication: Login Button or Circular User Profile Avatar
    if (this.viewModel.user) {
      actionsWrapper.appendChild(this._createUserAvatar(this.viewModel.user));
    } else {
      actionsWrapper.appendChild(this._createLoginButton());
    }

    leftCluster.append(brandLink, navWrapper);
    pill.append(leftCluster, this._createSearchBar(), actionsWrapper);
    shell.appendChild(pill);
    header.appendChild(shell);

    this.element = header;

    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    document.addEventListener('click', this._handleDocumentClick);

    return this.element;
  }

  /**
   * Returns the SVG markup for the theme icon.
   * @param {string} theme
   * @returns {string}
   * @private
   */
  _getThemeIconSvg(theme) {
    if (theme === 'dark') {
      return `
        <svg class="q-header-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="moon">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    }
    if (theme === 'system') {
      return `
        <svg class="q-header-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="system">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"></path>
        </svg>
      `;
    }
    return `
      <svg class="q-header-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="sun">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
  }

  /**
   * Creates the Iniciar Sesión button.
   * @returns {HTMLElement}
   * @private
   */
  _createLoginButton() {
    const loginBtn = document.createElement('button');
    loginBtn.type = 'button';
    loginBtn.className = 'q-btn q-btn--outline q-btn--sm q-header-login-btn';
    loginBtn.classList.add('q-header-login-btn--mobile');
    loginBtn.textContent = this.viewModel.loginText;

    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerLogin();
    });

    return loginBtn;
  }

  _createSearchBar() {
    const form = document.createElement('form');
    form.className = 'q-header-search';
    form.setAttribute('role', 'search');
    form.setAttribute('aria-label', "Buscar en Q'atu");

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'q-header-search-input';
    input.name = 'q';
    input.className = 'q-header-search__input';
    input.setAttribute('inputmode', 'search');
    input.setAttribute('enterkeyhint', 'search');
    input.placeholder = "Buscar en Q'atu";
    input.setAttribute('aria-label', 'Buscar productos, tiendas y categorías');
    if (this.viewModel.searchValue) {
      input.value = this.viewModel.searchValue;
    }

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'q-header-search__clear';
    clearButton.setAttribute('aria-label', 'Limpiar búsqueda');
    clearButton.textContent = '\u00d7';
    clearButton.hidden = true;

    input.addEventListener('input', () => {
      this.viewModel.setSearchValue(input.value);
      clearButton.hidden = !form.classList.contains('q-header-search--expanded') || !input.value;
    });

    clearButton.addEventListener('click', () => {
      input.value = '';
      clearButton.hidden = true;
      this.viewModel.setSearchValue('');
      input.focus();
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'q-header-search__toggle';
    toggle.setAttribute('aria-label', 'Abrir búsqueda');
    toggle.setAttribute('aria-controls', input.id);
    toggle.setAttribute('aria-expanded', 'false');
    const searchIcon = `
      <svg data-icon="search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m20 20-4-4"></path>
      </svg>
    `;
    const collapseIcon = `
      <svg data-icon="collapse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6"></path>
      </svg>
    `;
    const setExpanded = (expanded) => {
      form.classList.toggle('q-header-search--expanded', expanded);
      clearButton.hidden = !expanded || !input.value;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? 'Cerrar búsqueda' : 'Abrir búsqueda');
      toggle.innerHTML = expanded ? collapseIcon : searchIcon;
      if (expanded) {
        input.focus();
      } else {
        input.blur();
        toggle.focus();
      }
    };

    toggle.innerHTML = searchIcon;
    toggle.addEventListener('click', () => {
      setExpanded(!form.classList.contains('q-header-search--expanded'));
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && form.classList.contains('q-header-search--expanded')) {
        event.preventDefault();
        setExpanded(false);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (input.value || '').trim();
      if (!val) return;
      this.viewModel.setSearchValue(input.value);
      this.viewModel.triggerSearch();
    });

    form.append(toggle, input, clearButton);
    return form;
  }

  /**
   * Creates the "Mis Ventas" dropdown link (seller sales dashboard).
   * @returns {HTMLElement}
   * @private
   */
  _createSellerOrdersLink() {
    const salesBtn = document.createElement('a');
    salesBtn.className = 'q-header-dropdown-item q-header-seller-orders-btn';
    salesBtn.href = '/seller/orders';
    salesBtn.dataset.route = '';
    this._setDropdownItemContent(salesBtn, 'Mis Ventas', 'sales');
    salesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerSellerOrders();
    });
    return salesBtn;
  }

  /**
   * Creates the "Mis Productos" dropdown link (seller dashboard).
   * @returns {HTMLElement}
   * @private
   */
  _createSellerProductsLink() {
    const link = document.createElement('a');
    link.className = 'q-header-dropdown-item q-header-seller-products-btn';
    link.href = '/seller/products';
    link.dataset.route = '';
    this._setDropdownItemContent(link, 'Mis Productos', 'products');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerSellerProducts();
    });
    return link;
  }

  _createSellerApplyLink() {
    const link = document.createElement('a');
    link.className = 'q-header-dropdown-item q-header-seller-apply-btn';
    link.href = '/seller/apply';
    link.dataset.route = '';
    this._setDropdownItemContent(link, 'Quiero vender', 'store');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerSellerApply();
    });
    return link;
  }

  _createAdminReportsLink() {
    const link = document.createElement('a');
    link.className = 'q-header-dropdown-item q-header-admin-reports-btn';
    link.href = '/admin/reports';
    link.dataset.route = '';
    this._setDropdownItemContent(link, 'Reportes', 'reports');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerAdminReports();
    });
    return link;
  }

  _createAdminSellerApplicationsLink() {
    const link = document.createElement('a');
    link.className = 'q-header-dropdown-item q-header-admin-applications-btn';
    link.href = '/admin/seller-applications';
    link.dataset.route = '';
    this._setDropdownItemContent(link, 'Solicitudes de vendedores', 'people');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerAdminSellerApplications();
    });
    return link;
  }

  _setDropdownItemContent(item, label, icon) {
    const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconElement.setAttribute('class', 'q-header-dropdown-icon');
    iconElement.setAttribute('viewBox', '0 0 24 24');
    iconElement.setAttribute('fill', 'none');
    iconElement.setAttribute('stroke', 'currentColor');
    iconElement.setAttribute('stroke-width', '1.7');
    iconElement.setAttribute('stroke-linecap', 'round');
    iconElement.setAttribute('stroke-linejoin', 'round');
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.innerHTML = DROPDOWN_ICONS[icon];

    const labelElement = document.createElement('span');
    labelElement.className = 'q-header-dropdown-label';
    labelElement.textContent = label;
    item.replaceChildren(iconElement, labelElement);
  }

  _getDropdownRoleLabel(vm = this.viewModel) {
    if (vm.isAdmin) return 'Admin';
    return vm.isSeller ? 'Vendedor' : 'Comprador';
  }

  _syncSellerLink(vm) {
    const dropdown = this.element?.querySelector('.q-header-dropdown');
    if (!dropdown) return;
    const existingApply = dropdown.querySelector('.q-header-seller-apply-btn');
    const existingProducts = dropdown.querySelector('.q-header-seller-products-btn');
    const existingOrders = dropdown.querySelector('.q-header-seller-orders-btn');
    const existingAdminReports = dropdown.querySelector('.q-header-admin-reports-btn');
    const existingAdminApps = dropdown.querySelector('.q-header-admin-applications-btn');
    const logoutBtn = dropdown.querySelector('.q-header-logout-btn');
    const separator = dropdown.querySelector('.q-header-dropdown-separator');
    const adminAnchor = existingAdminReports || existingAdminApps || separator || logoutBtn;

    if (vm.isSeller) {
      if (existingApply) existingApply.remove();
      if (!existingProducts) {
        dropdown.insertBefore(this._createSellerProductsLink(), existingOrders || adminAnchor);
      }
      if (!existingOrders) {
        dropdown.insertBefore(this._createSellerOrdersLink(), adminAnchor);
      }
    } else {
      if (existingProducts) existingProducts.remove();
      if (existingOrders) existingOrders.remove();
      if (!existingApply) {
        dropdown.insertBefore(this._createSellerApplyLink(), adminAnchor);
      }
    }

    if (vm.isAdmin) {
      if (!existingAdminReports) {
        dropdown.insertBefore(
          this._createAdminReportsLink(),
          existingAdminApps || separator || logoutBtn
        );
      }
      if (!existingAdminApps) {
        dropdown.insertBefore(this._createAdminSellerApplicationsLink(), separator || logoutBtn);
      }
    } else {
      if (existingAdminReports) existingAdminReports.remove();
      if (existingAdminApps) existingAdminApps.remove();
    }
  }

  /**
   * Attaches an error fallback handler to an avatar image element.
   * @param {HTMLImageElement} img
   * @private
   */
  _attachAvatarErrorFallback(img) {
    img.addEventListener(
      'error',
      () => {
        img.removeAttribute('src');
        img.style.display = 'none';
        const parent = img.parentElement;
        if (parent) {
          parent.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="q-header-avatar-placeholder">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
        }
      },
      { once: true }
    );
  }

  /**
   * Creates a circular user profile avatar element wrapped in a dropdown container.
   * @param {Object} user
   * @returns {HTMLElement} wrapper div containing the avatar button and dropdown
   * @private
   */
  _createUserAvatar(user) {
    const wrapper = document.createElement('div');
    wrapper.className = 'q-header-avatar-wrapper';

    const avatar = document.createElement('button');
    avatar.type = 'button';
    avatar.className = 'q-header-avatar q-header-user-avatar';
    avatar.setAttribute('aria-label', `Perfil de ${user.username || user.full_name || 'usuario'}`);
    avatar.setAttribute('title', user.username || user.full_name || 'Perfil de usuario');

    const avatarUrl = user.avatar_path || user.avatarPath || user.avatar_url || user.avatarUrl;
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = user.username || user.full_name || 'Usuario';
      img.className = 'q-header-avatar-img';
      this._attachAvatarErrorFallback(img);
      avatar.appendChild(img);
    } else {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="q-header-avatar-placeholder">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
    }

    avatar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.toggleDropdown();
    });

    // Dropdown panel
    const dropdown = document.createElement('div');
    dropdown.className = 'q-header-dropdown';
    dropdown.setAttribute('hidden', '');

    const dropdownHeader = document.createElement('div');
    dropdownHeader.className = 'q-header-dropdown-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'q-header-dropdown-name';
    nameSpan.textContent = user.full_name || user.username || user.email || '';

    const roleBadge = document.createElement('span');
    roleBadge.className = 'q-header-dropdown-role';
    roleBadge.textContent = this._getDropdownRoleLabel();

    const emailSpan = document.createElement('span');
    emailSpan.className = 'q-header-dropdown-email';
    emailSpan.textContent = user.email || '';

    const identity = document.createElement('div');
    identity.className = 'q-header-dropdown-identity';
    identity.append(nameSpan, roleBadge);
    dropdownHeader.append(identity, emailSpan);

    const profileBtn = document.createElement('button');
    profileBtn.type = 'button';
    profileBtn.className = 'q-header-dropdown-item q-header-profile-btn';
    this._setDropdownItemContent(profileBtn, 'Mi Perfil', 'user');
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerProfile();
    });

    const ordersBtn = document.createElement('a');
    ordersBtn.className = 'q-header-dropdown-item q-header-orders-btn';
    ordersBtn.href = '/orders';
    ordersBtn.dataset.route = '';
    this._setDropdownItemContent(ordersBtn, 'Mis Órdenes', 'orders');
    ordersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerOrders();
    });

    dropdown.appendChild(dropdownHeader);
    dropdown.appendChild(profileBtn);
    dropdown.appendChild(ordersBtn);

    if (this.viewModel.isSeller) {
      dropdown.appendChild(this._createSellerProductsLink());
      dropdown.appendChild(this._createSellerOrdersLink());
    } else {
      dropdown.appendChild(this._createSellerApplyLink());
    }

    if (this.viewModel.isAdmin) {
      dropdown.appendChild(this._createAdminReportsLink());
      dropdown.appendChild(this._createAdminSellerApplicationsLink());
    }

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'q-header-dropdown-item q-header-logout-btn';
    this._setDropdownItemContent(logoutBtn, 'Cerrar sesión', 'logout');
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerLogout();
    });

    const separator = document.createElement('div');
    separator.className = 'q-header-dropdown-separator';
    separator.setAttribute('aria-hidden', 'true');
    dropdown.append(separator, logoutBtn);

    wrapper.appendChild(avatar);
    wrapper.appendChild(dropdown);

    return wrapper;
  }

  /**
   * Mounts the header into a container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Updates the DOM based on ViewModel state.
   * @param {HeaderViewModel} vm
   * @private
   */
  _update(vm) {
    if (!this.element) return;

    const cartBtn = this.element.querySelector('.q-header-cart-btn');
    if (cartBtn) {
      let badge = cartBtn.querySelector('.q-header-cart-badge');
      if (vm.cartCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'q-header-cart-badge';
          cartBtn.appendChild(badge);
        }
        badge.textContent = String(vm.cartCount);
      } else if (badge) {
        badge.remove();
      }
    }

    const themeBtn = this.element.querySelector('.q-header-theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = this._getThemeIconSvg(vm.theme);
    }

    const actionsWrapper = this.element.querySelector('.q-header-actions');
    if (actionsWrapper) {
      const existingLogin = actionsWrapper.querySelector('.q-header-login-btn');
      const existingAvatarWrapper = actionsWrapper.querySelector('.q-header-avatar-wrapper');
      const existingAvatar = actionsWrapper.querySelector(
        '.q-header-avatar, .q-header-user-avatar'
      );

      if (vm.user) {
        if (existingLogin) existingLogin.remove();
        if (!existingAvatarWrapper) {
          actionsWrapper.appendChild(this._createUserAvatar(vm.user));
        } else {
          const nameSpan = existingAvatarWrapper.querySelector('.q-header-dropdown-name');
          if (nameSpan) {
            nameSpan.textContent = vm.user.full_name || vm.user.username || vm.user.email || '';
          }
          const roleBadge = existingAvatarWrapper.querySelector('.q-header-dropdown-role');
          if (roleBadge) {
            roleBadge.textContent = this._getDropdownRoleLabel(vm);
          }
          const emailSpan = existingAvatarWrapper.querySelector('.q-header-dropdown-email');
          if (emailSpan) {
            emailSpan.textContent = vm.user.email || '';
          }
          const avatarBtn = existingAvatarWrapper.querySelector('.q-header-user-avatar');
          const avatarUrl =
            vm.user.avatar_path || vm.user.avatarPath || vm.user.avatar_url || vm.user.avatarUrl;
          if (avatarBtn) {
            const existingImg = avatarBtn.querySelector('.q-header-avatar-img');
            if (avatarUrl) {
              if (existingImg) {
                this._attachAvatarErrorFallback(existingImg);
                existingImg.src = avatarUrl;
              } else {
                avatarBtn.innerHTML = '';
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = vm.user.username || vm.user.full_name || 'Usuario';
                img.className = 'q-header-avatar-img';
                this._attachAvatarErrorFallback(img);
                avatarBtn.appendChild(img);
              }
            } else if (existingImg) {
              avatarBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="q-header-avatar-placeholder">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              `;
            }
          }
        }
      } else {
        if (existingAvatarWrapper) existingAvatarWrapper.remove();
        else if (existingAvatar) existingAvatar.remove();
        if (!existingLogin) {
          actionsWrapper.appendChild(this._createLoginButton());
        } else {
          existingLogin.textContent = vm.loginText;
        }
      }
    }

    this._syncSellerLink(vm);

    // Update dropdown visibility
    const dropdown = this.element.querySelector('.q-header-dropdown');
    const avatarButton = this.element.querySelector('.q-header-user-avatar');
    if (avatarButton) {
      avatarButton.setAttribute('aria-expanded', String(vm.isDropdownOpen));
    }
    if (dropdown) {
      if (vm.isDropdownOpen) {
        dropdown.removeAttribute('hidden');
      } else {
        dropdown.setAttribute('hidden', '');
      }
    }
  }

  /**
   * Closes the dropdown when a click is detected outside the header element.
   * @param {MouseEvent} event
   * @private
   */
  _handleDocumentClick(event) {
    if (this.viewModel.isDropdownOpen && this.element && !this.element.contains(event.target)) {
      this.viewModel.closeDropdown();
    }
  }

  /**
   * Cleans up event listeners and subscriptions.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this.navbarView) {
      this.navbarView.destroy();
    }
    document.removeEventListener('click', this._handleDocumentClick);
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
