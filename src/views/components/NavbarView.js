import { NavbarViewModel } from '../../viewmodels/components/NavbarViewModel.js';

/**
 * View component for the Navigation Bar.
 */
export class NavbarView {
  /**
   * @param {NavbarViewModel} [viewModel]
   */
  constructor(viewModel = new NavbarViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._unsubscribe = null;
    this._handleDocumentClick = this._handleDocumentClick.bind(this);
  }

  /**
   * Builds and returns the DOM element for the navbar.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const nav = document.createElement('nav');
    nav.className = 'q-navbar';
    nav.setAttribute('aria-label', 'Navegación principal');

    // Burger button for mobile viewports
    const burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'q-navbar-burger';
    burger.setAttribute('aria-label', 'Abrir menú de navegación');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';

    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewModel.toggleMenu();
    });

    // Menu container
    const menu = document.createElement('div');
    menu.className = 'q-navbar-menu';

    const list = document.createElement('ul');
    list.className = 'q-navbar-list';

    this.viewModel.links.forEach((link) => {
      const item = document.createElement('li');
      item.className = 'q-navbar-item';

      const anchor = document.createElement('a');
      anchor.className = 'q-navbar-link';
      anchor.href = link.href;
      anchor.textContent = link.label;
      anchor.dataset.linkId = link.id;

      if (this.viewModel.activeLinkId === link.id) {
        anchor.classList.add('is-active');
      }

      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.viewModel.setActiveLink(link.id);
        this.viewModel.closeMenu();
      });

      item.appendChild(anchor);
      list.appendChild(item);
    });

    menu.appendChild(list);
    nav.appendChild(burger);
    nav.appendChild(menu);

    this.element = nav;

    // Subscribe to ViewModel changes
    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    document.addEventListener('click', this._handleDocumentClick);

    return this.element;
  }

  /**
   * Mounts the navbar to a parent container.
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
   * @param {NavbarViewModel} vm
   * @private
   */
  _update(vm) {
    if (!this.element) return;

    const burger = this.element.querySelector('.q-navbar-burger');
    const menu = this.element.querySelector('.q-navbar-menu');

    if (burger && menu) {
      if (vm.isMenuOpen) {
        burger.classList.add('is-active');
        burger.setAttribute('aria-expanded', 'true');
        menu.classList.add('is-active');
      } else {
        burger.classList.remove('is-active');
        burger.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-active');
      }
    }

    const links = this.element.querySelectorAll('.q-navbar-link');
    links.forEach((anchor) => {
      if (anchor.dataset.linkId === vm.activeLinkId) {
        anchor.classList.add('is-active');
      } else {
        anchor.classList.remove('is-active');
      }
    });
  }

  /**
   * Closes mobile menu when clicking outside.
   * @param {MouseEvent} event
   * @private
   */
  _handleDocumentClick(event) {
    if (this.viewModel.isMenuOpen && this.element && !this.element.contains(event.target)) {
      this.viewModel.closeMenu();
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
    document.removeEventListener('click', this._handleDocumentClick);
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
