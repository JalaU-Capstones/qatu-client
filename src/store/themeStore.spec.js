import { ThemeStore, themeStore } from './themeStore.js';

describe('ThemeStore', () => {
  let mockMediaQuery;
  let mediaChangeHandler;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mediaChangeHandler = null;
    mockMediaQuery = {
      matches: false,
      addEventListener: jasmine.createSpy('addEventListener').and.callFake((evt, handler) => {
        if (evt === 'change') {
          mediaChangeHandler = handler;
        }
      }),
      removeEventListener: jasmine.createSpy('removeEventListener'),
    };
    spyOn(window, 'matchMedia').and.returnValue(mockMediaQuery);
  });

  afterEach(() => {
    themeStore.destroy();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('init() defaults to "system" when localStorage empty; resolved is "light" when prefers-color-scheme is not dark', () => {
    const store = new ThemeStore();
    store.init();
    expect(store.getPreference()).toBe('system');
    expect(store.getResolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    store.destroy();
  });

  it('init() reads a stored "dark" preference and applies data-theme="dark"', () => {
    window.localStorage.setItem('qatu.theme', 'dark');
    const store = new ThemeStore();
    store.init();
    expect(store.getPreference()).toBe('dark');
    expect(store.getResolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    store.destroy();
  });

  it('setPreference("dark") writes to localStorage and sets data-theme="dark"', () => {
    const store = new ThemeStore();
    store.init();
    store.setPreference('dark');
    expect(window.localStorage.getItem('qatu.theme')).toBe('dark');
    expect(store.getPreference()).toBe('dark');
    expect(store.getResolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    store.destroy();
  });

  it('cycle() toggles the effective theme from light to dark and back in one call', () => {
    window.localStorage.setItem('qatu.theme', 'system');
    const store = new ThemeStore();
    store.init();
    expect(store.getPreference()).toBe('system');
    expect(store.getResolved()).toBe('light');

    store.cycle();
    expect(store.getPreference()).toBe('dark');
    expect(window.localStorage.getItem('qatu.theme')).toBe('dark');
    expect(store.getResolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    store.cycle();
    expect(store.getPreference()).toBe('light');
    expect(window.localStorage.getItem('qatu.theme')).toBe('light');
    expect(store.getResolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    store.destroy();
  });

  it('cycle() toggles from dark system preference to light immediately', () => {
    mockMediaQuery.matches = true;
    const store = new ThemeStore();
    store.init();
    expect(store.getResolved()).toBe('dark');

    store.cycle();

    expect(store.getPreference()).toBe('light');
    expect(window.localStorage.getItem('qatu.theme')).toBe('light');
    expect(store.getResolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    store.destroy();
  });

  it('getResolved() returns "dark" when preference is "system" and media query matches dark', () => {
    mockMediaQuery.matches = true;
    const store = new ThemeStore();
    store.init();
    expect(store.getPreference()).toBe('system');
    expect(store.getResolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    store.destroy();
  });

  it('subscribers are notified on setPreference and on system change', () => {
    const store = new ThemeStore();
    store.init();
    let notificationCount = 0;
    const unsubscribe = store.subscribe(() => {
      notificationCount++;
    });

    store.setPreference('dark');
    expect(notificationCount).toBe(1);

    mockMediaQuery.matches = true;
    if (typeof mediaChangeHandler === 'function') {
      mediaChangeHandler();
    }
    expect(notificationCount).toBe(2);

    unsubscribe();
    store.destroy();
  });

  it('init() twice does not register duplicate listeners', () => {
    const store = new ThemeStore();
    store.init();
    store.init();
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledTimes(1);
    store.destroy();
  });

  it('exports a singleton themeStore instance', () => {
    expect(themeStore).toBeDefined();
    expect(themeStore instanceof ThemeStore).toBe(true);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('ThemeStore (recovered 1)', () => {
    let mockMediaQuery;

    beforeEach(() => {
      window.localStorage.clear();
      document.documentElement.removeAttribute('data-theme');
      mockMediaQuery = {
        matches: false,
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener'),
      };
      spyOn(window, 'matchMedia').and.returnValue(mockMediaQuery);
    });

    afterEach(() => {
      themeStore.destroy();
      window.localStorage.clear();
      document.documentElement.removeAttribute('data-theme');
    });

    it('init() defaults to "system" when localStorage empty; resolved is "light" when prefers-color-scheme is not dark', () => {
      const store = new ThemeStore();
      store.init();
      expect(store.getPreference()).toBe('system');
      expect(store.getResolved()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      store.destroy();
    });

    it('init() reads a stored "dark" preference and applies data-theme="dark"', () => {
      window.localStorage.setItem('qatu.theme', 'dark');
      const store = new ThemeStore();
      store.init();
      expect(store.getPreference()).toBe('dark');
      expect(store.getResolved()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      store.destroy();
    });

    it('setPreference("dark") writes to localStorage and sets data-theme="dark"', () => {
      const store = new ThemeStore();
      store.init();
      store.setPreference('dark');
      expect(window.localStorage.getItem('qatu.theme')).toBe('dark');
      expect(store.getPreference()).toBe('dark');
      expect(store.getResolved()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      store.destroy();
    });

    it('getResolved() returns "dark" when preference is "system" and media query matches dark', () => {
      mockMediaQuery.matches = true;
      const store = new ThemeStore();
      store.init();
      expect(store.getPreference()).toBe('system');
      expect(store.getResolved()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      store.destroy();
    });
  });

  (() => {
    describe('ThemeStore additional branches (recovered 2)', () => {
      let store;
      let mediaQuery;

      beforeEach(() => {
        window.localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        mediaQuery = {
          matches: false,
          addEventListener: jasmine.createSpy('addEventListener'),
          removeEventListener: jasmine.createSpy('removeEventListener'),
        };
        spyOn(window, 'matchMedia').and.returnValue(mediaQuery);
        store = new ThemeStore();
      });

      afterEach(() => {
        store.destroy();
        document.documentElement.removeAttribute('data-theme');
        window.localStorage.clear();
      });

      it('reads a stored light preference and ignores invalid stored values', () => {
        window.localStorage.setItem('qatu.theme', 'light');
        store.init();
        expect(store.getPreference()).toBe('light');
        expect(store.getResolved()).toBe('light');

        store.destroy();
        store = new ThemeStore();
        window.localStorage.setItem('qatu.theme', 'purple');
        store.init();
        expect(store.getPreference()).toBe('system');
      });

      it('resolves system preference to light when matchMedia is unavailable', () => {
        window.matchMedia.and.returnValue(undefined);
        store.init();

        expect(store.getResolved()).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      it('survives localStorage failures on init and setPreference', () => {
        const getItemSpy = spyOn(window.localStorage, 'getItem').and.throwError('blocked');
        expect(() => store.init()).not.toThrow();
        expect(getItemSpy).toHaveBeenCalled();

        const setItemSpy = spyOn(window.localStorage, 'setItem').and.throwError('blocked');
        expect(() => store.setPreference('dark')).not.toThrow();
        expect(setItemSpy).toHaveBeenCalled();
        expect(store.getResolved()).toBe('dark');
      });

      it('removes the media listener and clears subscribers on destroy', () => {
        const listener = jasmine.createSpy('listener');
        store.init();
        const unsubscribe = store.subscribe(listener);

        expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', store._onMediaChange);
        const mediaChangeHandler = store._onMediaChange;

        store.destroy();
        expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', mediaChangeHandler);

        mediaQuery.matches = true;
        mediaChangeHandler();
        expect(listener).not.toHaveBeenCalled();
        expect(unsubscribe()).toBe(false);
      });

      it('can be reinitialized after destroy and still registers one listener', () => {
        store.init();
        store.destroy();
        spyOn(console, 'warn');
        store.init();
        store.init();

        expect(mediaQuery.addEventListener).toHaveBeenCalledTimes(2);
      });

      it('ignores invalid preferences and supports an explicit system preference', () => {
        store.init();
        const listener = jasmine.createSpy('listener');
        store.subscribe(listener);

        store.setPreference('purple');
        expect(store.getPreference()).toBe('system');
        expect(listener).not.toHaveBeenCalled();

        mediaQuery.matches = true;
        store.setPreference('system');
        expect(store.getResolved()).toBe('dark');
        expect(window.localStorage.getItem('qatu.theme')).toBe('system');
      });
    });
  })();
})();
