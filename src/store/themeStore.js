const THEME_KEY = 'qatu.theme'; // 'light' | 'dark' | 'system'

export class ThemeStore {
  constructor() {
    this._theme = 'system';
    this._resolved = 'light'; // the actual applied theme: 'light' | 'dark'
    this._listeners = new Set();
    this._mediaQuery = null;
    this._onMediaChange = null;
  }

  /** Reads localStorage, applies to <html data-theme>, subscribes to system changes. */
  init() {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        this._theme = stored;
      }
    } catch {
      // ignore
    }

    if (!this._onMediaChange) {
      this._mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)') || null;
      this._onMediaChange = () => this._apply();
      this._mediaQuery?.addEventListener?.('change', this._onMediaChange);
    }

    this._apply();
  }

  /** @returns {'light'|'dark'|'system'} */
  getPreference() {
    return this._theme;
  }

  /** @returns {'light'|'dark'} the actually-applied theme */
  getResolved() {
    return this._resolved;
  }

  /** @param {'light'|'dark'|'system'} theme */
  setPreference(theme) {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return;
    this._theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
    this._apply();
  }

  /** Cycles light → dark → system → light. */
  cycle() {
    let next;
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (!stored && this._theme === 'system') {
        next = this._resolved === 'dark' ? 'light' : 'dark';
      }
    } catch {
      // ignore
    }

    if (!next) {
      const order = ['light', 'dark', 'system'];
      next = order[(order.indexOf(this._theme) + 1) % order.length];
    }

    this.setPreference(next);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    this._mediaQuery?.removeEventListener?.('change', this._onMediaChange);
    this._mediaQuery = null;
    this._onMediaChange = null;
    this._listeners.clear();
  }

  _apply() {
    const systemDark = this._mediaQuery?.matches ?? false;
    const resolved = this._theme === 'system' ? (systemDark ? 'dark' : 'light') : this._theme;

    this._resolved = resolved;
    document.documentElement.setAttribute('data-theme', resolved);
    this._listeners.forEach((l) => l(this));
  }
}

export const themeStore = new ThemeStore();
