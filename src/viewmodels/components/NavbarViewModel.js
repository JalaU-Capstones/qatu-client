/**
 * ViewModel for Navbar component.
 * Manages navigation items, active state, and mobile menu toggle.
 */
export class NavbarViewModel {
  /**
   * @param {Object} [options]
   * @param {Array<{id: string, label: string, href: string}>} [options.links]
   */
  constructor(options = {}) {
    this.links = options.links || [
      { id: 'nav-categorias', label: 'Categorías', href: '/categorias' },
      { id: 'nav-tiendas', label: 'Tiendas', href: '/tiendas' },
      { id: 'nav-productos', label: 'Productos', href: '/products' },
    ];
    this.activeLinkId = options.activeLinkId || null;
    this.isMenuOpen = false;
    this._listeners = new Set();
  }

  /**
   * Toggles the mobile menu open/closed state.
   */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this._notify();
  }

  /**
   * Closes the mobile menu.
   */
  closeMenu() {
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
      this._notify();
    }
  }

  /**
   * Opens the mobile menu.
   */
  openMenu() {
    if (!this.isMenuOpen) {
      this.isMenuOpen = true;
      this._notify();
    }
  }

  /**
   * Sets the active link by ID.
   * @param {string} id
   */
  setActiveLink(id) {
    if (this.activeLinkId !== id) {
      this.activeLinkId = id;
      this._notify();
    }
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
