import { HeaderViewModel } from '../../viewmodels/components/HeaderViewModel.js';
import { NavbarView } from './NavbarView.js';

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

    const container = document.createElement('div');
    container.className = 'q-header-container';

    // 1. Brand Logo
    const brandLink = document.createElement('a');
    brandLink.className = 'q-header-brand';
    brandLink.href = this.viewModel.logoHref;
    brandLink.setAttribute('aria-label', `${this.viewModel.logoText} inicio`);

    const logoBadge = document.createElement('span');
    logoBadge.className = 'q-brand-logo';
    logoBadge.textContent = this.viewModel.logoText;
    brandLink.appendChild(logoBadge);

    brandLink.dataset.route = '';

    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.triggerLogo();
    });

    // 2. Navigation
    const navWrapper = document.createElement('div');
    navWrapper.className = 'q-header-nav';
    navWrapper.appendChild(this.navbarView.render());

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

    container.appendChild(brandLink);
    container.appendChild(navWrapper);
    container.appendChild(actionsWrapper);
    header.appendChild(container);

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
    loginBtn.className = 'q-header-login-btn';
    loginBtn.textContent = this.viewModel.loginText;

    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerLogin();
    });

    return loginBtn;
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

    const avatarUrl = user.avatar_url || user.avatarUrl;
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = user.username || user.full_name || 'Usuario';
      img.className = 'q-header-avatar-img';
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

    const emailSpan = document.createElement('span');
    emailSpan.className = 'q-header-dropdown-email';
    emailSpan.textContent = user.email || '';

    dropdownHeader.appendChild(nameSpan);
    dropdownHeader.appendChild(emailSpan);

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'q-header-dropdown-item q-header-logout-btn';
    logoutBtn.textContent = 'Cerrar sesión';
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.viewModel.triggerLogout();
    });

    dropdown.appendChild(dropdownHeader);
    dropdown.appendChild(logoutBtn);

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

    // Update dropdown visibility
    const dropdown = this.element.querySelector('.q-header-dropdown');
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
