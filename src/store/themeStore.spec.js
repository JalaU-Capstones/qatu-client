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

  it('cycle() from "light" → "dark" → "system" → "light" and persists each', () => {
    const store = new ThemeStore();
    store.init();
    store.setPreference('light');
    expect(store.getPreference()).toBe('light');
    expect(window.localStorage.getItem('qatu.theme')).toBe('light');

    store.cycle();
    expect(store.getPreference()).toBe('dark');
    expect(window.localStorage.getItem('qatu.theme')).toBe('dark');

    store.cycle();
    expect(store.getPreference()).toBe('system');
    expect(window.localStorage.getItem('qatu.theme')).toBe('system');

    store.cycle();
    expect(store.getPreference()).toBe('light');
    expect(window.localStorage.getItem('qatu.theme')).toBe('light');
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
