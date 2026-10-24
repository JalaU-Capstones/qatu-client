import { Router } from './Router.js';

describe('Router', () => {
  let router;

  beforeEach(() => {
    router = new Router();
  });

  afterEach(() => {
    router.destroy();
  });

  it('should register routes and resolve exact path', () => {
    let homeCalled = false;
    let registerCalled = false;

    router.addRoute('/', () => {
      homeCalled = true;
    });
    router.addRoute('/register', () => {
      registerCalled = true;
    });

    router.resolve('/');
    expect(homeCalled).toBe(true);
    expect(registerCalled).toBe(false);

    router.resolve('/register');
    expect(registerCalled).toBe(true);
  });

  it('should normalize paths with trailing slashes and missing leading slash', () => {
    let called = false;
    router.addRoute('/register', () => {
      called = true;
    });

    router.resolve('/register/');
    expect(called).toBe(true);

    called = false;
    router.resolve('register');
    expect(called).toBe(true);
  });

  it('should fallback to root route if path is unknown', () => {
    let homeCalled = false;
    router.addRoute('/', () => {
      homeCalled = true;
    });

    router.resolve('/unknown-path');
    expect(homeCalled).toBe(true);
  });

  it('should push state and resolve on navigate', () => {
    spyOn(window.history, 'pushState');
    let navigatedPath = null;
    router.addRoute('/login', (path) => {
      navigatedPath = path;
    });

    router.navigate('/login');
    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/login');
    expect(navigatedPath).toBe('/login');
  });

  it('should replace state on navigate with replace=true', () => {
    spyOn(window.history, 'replaceState');
    let navigatedPath = null;
    router.addRoute('/register', (path) => {
      navigatedPath = path;
    });

    router.navigate('/register', { replace: true });
    expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/register');
    expect(navigatedPath).toBe('/register');
  });

  it('should start listening to popstate and resolve current path', () => {
    let resolved = false;
    router.addRoute('/', () => {
      resolved = true;
    });
    router.start();
    expect(resolved).toBe(true);
  });
});
