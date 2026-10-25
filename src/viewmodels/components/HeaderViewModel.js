import { NavbarViewModel } from './NavbarViewModel.js';

/**
 * ViewModel for Header component.
 * Coordinates logo, navigation, search/cart actions, and user session actions.
 */
export class HeaderViewModel {
  /**
   * @param {Object} [options]
   * @param {string} [options.logoText]
   * @param {string} [options.logoHref]
   * @param {NavbarViewModel} [options.navbarViewModel]
   * @param {number} [options.cartCount]
   * @param {string} [options.loginText]
   * @param {string} [options.loginHref]
   * @param {Object|null} [options.user]
   * @param {Function} [options.onLoginClick]
   * @param {Function} [options.onCartClick]
   * @param {Function} [options.onLogoClick]
   * @param {Function} [options.onProfileClick]
   * @param {Function} [options.onLogoutClick]
   */
  constructor(options = {}) {
    this.logoText = options.logoText || "Q'atu";
    this.logoHref = options.logoHref || '/';
    this.navbarViewModel = options.navbarViewModel || new NavbarViewModel();
    this.cartCount = options.cartCount ?? 0;
    this.loginText = options.loginText || 'Iniciar sesión';
    this.loginHref = options.loginHref || '/login';
    this.user = options.user || null;
    this.onLoginClick = options.onLoginClick || null;
    this.onCartClick = options.onCartClick || null;
    this.onLogoClick = options.onLogoClick || null;
    this.onProfileClick = options.onProfileClick || null;
    this.onLogoutClick = options.onLogoutClick || null;
    this.isDropdownOpen = false;
    this._listeners = new Set();
  }

  /**
   * Sets current logged in user or null to log out.
   * When user becomes null, forces the dropdown closed.
   * @param {Object|null} user
   */
  setUser(user) {
    this.user = user || null;
    if (!this.user) this.isDropdownOpen = false;
    this._notify();
  }

  /**
   * Updates the cart item count.
   * @param {number} count
   */
  setCartCount(count) {
    if (this.cartCount !== count) {
      this.cartCount = count;
      this._notify();
    }
  }

  /**
   * Triggers the login action.
   */
  triggerLogin() {
    if (typeof this.onLoginClick === 'function') {
      this.onLoginClick();
    }
  }

  /**
   * Triggers the cart action.
   */
  triggerCart() {
    if (typeof this.onCartClick === 'function') {
      this.onCartClick();
    }
  }

  /**
   * Triggers the logo click action.
   */
  triggerLogo() {
    if (typeof this.onLogoClick === 'function') {
      this.onLogoClick();
    }
  }

  /**
   * Triggers user profile avatar click.
   */
  triggerProfile() {
    if (typeof this.onProfileClick === 'function') {
      this.onProfileClick(this.user);
    }
  }

  /**
   * Toggles the user dropdown open/closed. No-op when the user is anonymous.
   */
  toggleDropdown() {
    if (!this.user) return;
    this.isDropdownOpen = !this.isDropdownOpen;
    this._notify();
  }

  /**
   * Closes the user dropdown if open.
   */
  closeDropdown() {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false;
      this._notify();
    }
  }

  /**
   * Triggers the logout action and closes the dropdown.
   */
  triggerLogout() {
    this.isDropdownOpen = false;
    if (typeof this.onLogoutClick === 'function') {
      this.onLogoutClick();
    }
    this._notify();
  }

  /**
   * Subscribes to changes in ViewModel state.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notifies all listeners of state changes.
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
