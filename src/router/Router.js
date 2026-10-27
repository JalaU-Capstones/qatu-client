/**
 * Client-side Router using HTML5 History API.
 *
 * Supports static routes (`/products`) and dynamic segments (`/products/:id`).
 * Handlers receive `(path, params)`, so existing one-argument handlers keep
 * working unchanged.
 */
export class Router {
  /**
   * @param {Object} [options]
   * @param {string} [options.root='/']
   */
  constructor(options = {}) {
    this.routes = new Map();
    /** @type {Array<{ keys: string[], regex: RegExp, handler: Function }>} */
    this._dynamicRoutes = [];
    this.root = options.root || '/';
    this.currentPath = null;
    this._onPopState = this._handlePopState.bind(this);
    this._onDocumentClick = this._handleClick.bind(this);
    this._isStarted = false;
  }

  /**
   * Registers a route path and handler.
   * @param {string} path
   * @param {Function} handler Called with `(path, params)`.
   * @returns {Router}
   */
  addRoute(path, handler) {
    const normalized = this._normalizePath(path);

    if (normalized.includes(':')) {
      const compiled = this._compileRoute(normalized);
      this._dynamicRoutes = this._dynamicRoutes.filter((route) => route.pattern !== normalized);
      this._dynamicRoutes.push({ ...compiled, pattern: normalized, handler });
      return this;
    }

    this.routes.set(normalized, handler);
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

    const match = this._match(targetPath);
    if (typeof match.handler === 'function') {
      match.handler(targetPath, match.params);
    }
  }

  /**
   * Starts listening to browser history popstate and document link click events.
   */
  start() {
    if (!this._isStarted) {
      window.addEventListener('popstate', this._onPopState);
      document.addEventListener('click', this._onDocumentClick);
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
      document.removeEventListener('click', this._onDocumentClick);
      this._isStarted = false;
    }
    this.routes.clear();
    this._dynamicRoutes = [];
  }

  /**
   * Finds the handler and params for a normalized path.
   * @param {string} path
   * @returns {{ handler: Function|undefined, params: Object }}
   * @private
   */
  _match(path) {
    const exactHandler = this.routes.get(path);
    if (exactHandler) {
      return { handler: exactHandler, params: {} };
    }

    for (const route of this._dynamicRoutes) {
      const result = path.match(route.regex);
      if (!result) continue;

      const params = {};
      route.keys.forEach((key, index) => {
        const rawValue = result[index + 1];
        try {
          params[key] = decodeURIComponent(rawValue);
        } catch {
          params[key] = rawValue;
        }
      });
      return { handler: route.handler, params };
    }

    return { handler: this.routes.get('/') || this.routes.get('*'), params: {} };
  }

  /**
   * Turns `/products/:id` into a RegExp with named keys.
   * @param {string} path
   * @returns {{ keys: string[], regex: RegExp }}
   * @private
   */
  _compileRoute(path) {
    const keys = [];
    const pattern = path
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          keys.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');

    return { keys, regex: new RegExp(`^${pattern}$`) };
  }

  /**
   * Intercepts clicks on anchors marked with `data-route` and performs
   * an SPA navigation instead of a full page reload.
   *
   * @param {MouseEvent} event
   * @private
   */
  _handleClick(event) {
    const anchor = event.target.closest('a[data-route]');
    if (!anchor) return;
    // External links (target=_blank, mailto:, tel:, absolute URLs) opt out.
    if (anchor.target === '_blank' || anchor.hostname !== window.location.hostname) {
      return;
    }
    event.preventDefault();
    const path = anchor.getAttribute('href');
    if (path) {
      this.navigate(path);
    }
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
