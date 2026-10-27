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

  it('should intercept click on data-route anchor and navigate', () => {
    const originalHref = window.location.href;
    const a = document.createElement('a');
    a.href = '/products';
    a.dataset.route = '';
    a.textContent = 'x';
    document.body.appendChild(a);

    const handler = jasmine.createSpy('handler');
    router.addRoute('/products', handler);
    router.start();

    a.click();

    expect(window.location.pathname).toBe('/products');
    expect(handler).toHaveBeenCalled();

    a.remove();
    window.history.pushState({}, '', originalHref);
  });

  it('should ignore clicks on non-data-route anchors', () => {
    const a = document.createElement('a');
    a.href = '/about';
    a.textContent = 'x';
    a.addEventListener('click', (e) => e.preventDefault());
    document.body.appendChild(a);

    const handler = jasmine.createSpy('handler');
    router.addRoute('/about', handler);
    router.start();

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);

    expect(handler).not.toHaveBeenCalled();

    a.remove();
  });

  it('should ignore clicks on external data-route anchors', () => {
    const a = document.createElement('a');
    a.href = 'https://example.com';
    a.dataset.route = '';
    a.textContent = 'x';
    a.addEventListener('click', (e) => e.preventDefault());
    document.body.appendChild(a);

    const handler = jasmine.createSpy('handler');
    router.addRoute('/example', handler);
    router.start();

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);

    expect(handler).not.toHaveBeenCalled();

    a.remove();
  });

  it('should resolve dynamic routes and pass decoded params to the handler', () => {
    const handler = jasmine.createSpy('productHandler');
    router.addRoute('/products/:id', handler);

    router.resolve('/products/aguayo-tradicional-tarabuco');

    expect(handler).toHaveBeenCalledWith('/products/aguayo-tradicional-tarabuco', {
      id: 'aguayo-tradicional-tarabuco',
    });
  });

  it('should decode URI components in dynamic params', () => {
    const handler = jasmine.createSpy('productHandler');
    router.addRoute('/products/:id', handler);

    router.resolve('/products/caf%C3%A9-cusco');

    expect(handler).toHaveBeenCalledWith('/products/caf%C3%A9-cusco', {
      id: 'café-cusco',
    });
  });

  it('should prefer an exact route over a dynamic route', () => {
    const exact = jasmine.createSpy('exact');
    const dynamic = jasmine.createSpy('dynamic');
    router.addRoute('/products/:id', dynamic);
    router.addRoute('/products', exact);

    router.resolve('/products');

    expect(exact).toHaveBeenCalledWith('/products', {});
    expect(dynamic).not.toHaveBeenCalled();
  });

  it('should not match a dynamic route with extra path segments', () => {
    const dynamic = jasmine.createSpy('dynamic');
    const home = jasmine.createSpy('home');
    router.addRoute('/products/:id', dynamic);
    router.addRoute('/', home);

    router.resolve('/products/one/extra');

    expect(dynamic).not.toHaveBeenCalled();
    expect(home).toHaveBeenCalled();
  });

  it('should navigate to a dynamic path and pass params', () => {
    spyOn(window.history, 'pushState');
    const handler = jasmine.createSpy('productHandler');
    router.addRoute('/products/:id', handler);

    router.navigate('/products/mochila-trekking-45l');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/products/mochila-trekking-45l');
    expect(handler).toHaveBeenCalledWith('/products/mochila-trekking-45l', {
      id: 'mochila-trekking-45l',
    });
  });
});
