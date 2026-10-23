/**
 * Lightweight client-side router using the History API.
 * Routes map path strings to View classes with mount(container) and destroy() methods.
 */
export class Router {
  /**
   * @param {Record<string, { new(): { mount(container: HTMLElement): void, destroy(): void } }>} routes
   */
  constructor(routes) {
    this._routes = routes;
    this._currentView = null;
    this._container = null;

    this._handlePopState = this._handlePopState.bind(this);
    this._handleClick = this._handleClick.bind(this);
  }

  /**
   * Initializes the router: mounts the initial view and wires up event listeners.
   * @param {HTMLElement} container
   */
  init(container) {
    this._container = container;
    window.addEventListener('popstate', this._handlePopState);
    document.addEventListener('click', this._handleClick);
    this._render(window.location.pathname);
  }

  /**
   * Navigates to the given path using pushState.
   * @param {string} path
   */
  navigate(path) {
    if (window.location.pathname === path) return;
    window.history.pushState({}, '', path);
    this._render(path);
  }

  /**
   * Renders the view for the given path.
   * @param {string} path
   * @private
   */
  _render(path) {
    const ViewClass = this._routes[path] || this._routes['/'];

    if (this._currentView && typeof this._currentView.destroy === 'function') {
      this._currentView.destroy();
    }

    this._container.innerHTML = '';
    this._currentView = new ViewClass();
    this._currentView.mount(this._container);
  }

  /**
   * Handles browser back/forward navigation.
   * @private
   */
  _handlePopState() {
    this._render(window.location.pathname);
  }

  /**
   * Intercepts clicks on <a data-route> anchors.
   * @param {MouseEvent} event
   * @private
   */
  _handleClick(event) {
    const anchor = event.target.closest('a[data-route]');
    if (!anchor) return;
    event.preventDefault();
    const path = anchor.getAttribute('href');
    if (path) {
      this.navigate(path);
    }
  }

  /**
   * Cleans up event listeners.
   */
  destroy() {
    window.removeEventListener('popstate', this._handlePopState);
    document.removeEventListener('click', this._handleClick);
    if (this._currentView && typeof this._currentView.destroy === 'function') {
      this._currentView.destroy();
    }
    this._currentView = null;
    this._container = null;
  }
}
