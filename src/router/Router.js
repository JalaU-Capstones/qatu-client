/**
 * Client-side Router using HTML5 History API.
 */
export class Router {
  /**
   * @param {Object} [options]
   * @param {string} [options.root='/']
   */
  constructor(options = {}) {
    this.routes = new Map();
    this.root = options.root || '/';
    this.currentPath = null;
    this._onPopState = this._handlePopState.bind(this);
    this._isStarted = false;
  }

  /**
   * Registers a route path and handler.
   * @param {string} path
   * @param {Function} handler
   * @returns {Router}
   */
  addRoute(path, handler) {
    this.routes.set(this._normalizePath(path), handler);
    return this;
  }

  /**
   * Navigates to a new path.
   * @param {string} path
   * @param {Object} [options]
   * @param {boolean} [options.replace=false]
   */
  navigate(path, options = {}) {
    const normalized = this._normalizePath(path);
    if (options.replace) {
      window.history.replaceState({}, '', normalized);
    } else {
      window.history.pushState({}, '', normalized);
    }
    this.resolve(normalized);
  }

  /**
   * Resolves the current or given path and executes the matching handler.
   * @param {string} [path]
   */
  resolve(path) {
    const targetPath = this._normalizePath(path || window.location.pathname);
    this.currentPath = targetPath;

    let handler = this.routes.get(targetPath);
    if (!handler) {
      handler = this.routes.get('/') || this.routes.get('*');
    }

    if (typeof handler === 'function') {
      handler(targetPath);
    }
  }

  /**
   * Starts listening to browser history popstate events.
   */
  start() {
    if (!this._isStarted) {
      window.addEventListener('popstate', this._onPopState);
      this._isStarted = true;
    }
    this.resolve();
  }

  /**
   * Stops listening and cleans up event listeners.
   */
  destroy() {
    if (this._isStarted) {
      window.removeEventListener('popstate', this._onPopState);
      this._isStarted = false;
    }
    this.routes.clear();
  }

  /**
   * @private
   */
  _handlePopState() {
    this.resolve();
  }

  /**
   * @param {string} path
   * @returns {string}
   * @private
   */
  _normalizePath(path) {
    if (!path) return '/';
    const trimmed = path.trim();
    if (!trimmed.startsWith('/')) {
      return `/${trimmed}`;
    }
    if (trimmed.length > 1 && trimmed.endsWith('/')) {
      return trimmed.slice(0, -1);
    }
    return trimmed;
  }
}
