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

    return this.element;
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
   * Creates a circular user profile avatar element.
   * Renders user avatar image if available, or a generic default avatar placeholder.
   * @param {Object} user
   * @returns {HTMLElement}
   * @private
   */
  _createUserAvatar(user) {
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
      this.viewModel.triggerProfile();
    });

    return avatar;
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

    const actionsWrapper = this.element.querySelector('.q-header-actions');
    if (actionsWrapper) {
      const existingLogin = actionsWrapper.querySelector('.q-header-login-btn');
      const existingAvatar = actionsWrapper.querySelector(
        '.q-header-avatar, .q-header-user-avatar'
      );

      if (vm.user) {
        if (existingLogin) existingLogin.remove();
        if (!existingAvatar) {
          actionsWrapper.appendChild(this._createUserAvatar(vm.user));
        }
      } else {
        if (existingAvatar) existingAvatar.remove();
        if (!existingLogin) {
          actionsWrapper.appendChild(this._createLoginButton());
        } else {
          existingLogin.textContent = vm.loginText;
        }
      }
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
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
