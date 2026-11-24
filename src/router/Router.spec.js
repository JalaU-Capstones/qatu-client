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

  it('resolves the /about page route', () => {
    const aboutCalled = jasmine.createSpy('aboutCalled');
    router.addRoute('/about', aboutCalled);

    router.resolve('/about');

    expect(aboutCalled).toHaveBeenCalledWith('/about', {});
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

  it('should match /products even when the URL has a search query', () => {
    const handler = jasmine.createSpy('handler');
    router.addRoute('/products', handler);

    router.resolve('/products?q=phone&category=electronics');

    expect(handler).toHaveBeenCalledWith('/products', {});
  });

  it('should keep the query string in history when navigating', () => {
    spyOn(window.history, 'pushState');
    const handler = jasmine.createSpy('handler');
    router.addRoute('/products', handler);

    router.navigate('/products?q=phone');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/products?q=phone');
    expect(handler).toHaveBeenCalledWith('/products', {});
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('Router additional branches (recovered 1)', () => {
      let router;

      beforeEach(() => {
        document.body.innerHTML = '';
        router = new Router();
        spyOn(window.history, 'pushState');
        spyOn(window.history, 'replaceState');
      });

      afterEach(() => {
        router.destroy();
        document.body.innerHTML = '';
      });

      it('registers and removes exactly one pair of listeners across repeated starts', () => {
        const addSpy = spyOn(window, 'addEventListener');
        const documentAddSpy = spyOn(document, 'addEventListener');
        const removeSpy = spyOn(window, 'removeEventListener');
        const documentRemoveSpy = spyOn(document, 'removeEventListener');
        const resolveSpy = spyOn(router, 'resolve');

        router.start();
        router.start();

        expect(addSpy.calls.allArgs().filter(([name]) => name === 'popstate').length).toBe(1);
        expect(documentAddSpy.calls.allArgs().filter(([name]) => name === 'click').length).toBe(1);
        expect(resolveSpy).toHaveBeenCalledTimes(2);

        router.destroy();
        expect(removeSpy).toHaveBeenCalledWith('popstate', router._onPopState);
        expect(documentRemoveSpy).toHaveBeenCalledWith('click', router._onDocumentClick);
        router.destroy();
        expect(removeSpy).toHaveBeenCalledTimes(1);
      });

      it('resolves the current path on popstate', () => {
        const handler = jasmine.createSpy('rootHandler');
        router.addRoute('/', handler);
        router.start();

        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(handler).toHaveBeenCalled();
      });

      it('clears all routes on destroy', () => {
        const handler = jasmine.createSpy('handler');
        router.addRoute('/gone', handler);
        router.destroy();

        expect(() => router.resolve('/gone')).not.toThrow();
        expect(handler).not.toHaveBeenCalled();
      });

      it('falls back to a wildcard route when no exact or dynamic route matches', () => {
        const fallback = jasmine.createSpy('fallback');
        router.routes.set('*', fallback);

        router.resolve('/unknown/path');

        expect(fallback).toHaveBeenCalledWith('/unknown/path', {});
      });

      it('prefers the root route over the wildcard', () => {
        const root = jasmine.createSpy('root');
        const fallback = jasmine.createSpy('fallback');
        router.routes.set('*', fallback);
        router.addRoute('/', root);

        router.resolve('/other');

        expect(root).toHaveBeenCalled();
        expect(fallback).not.toHaveBeenCalled();
      });

      it('does nothing when neither a root nor a wildcard route exists', () => {
        expect(() => router.resolve('/missing')).not.toThrow();
        expect(router.currentPath).toBe('/missing');
      });

      it('supports multiple dynamic segments and escapes literal regex characters', () => {
        const handler = jasmine.createSpy('handler');
        router.addRoute('/v1.0/:category/:item', handler);

        router.resolve('/v1X0/books/123');

        expect(handler).not.toHaveBeenCalled();
        router.resolve('/v1.0/books/123');
        expect(handler).toHaveBeenCalledWith('/v1.0/books/123', {
          category: 'books',
          item: '123',
        });
      });

      it('tries later dynamic routes when an earlier one does not match', () => {
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        router.addRoute('/items/:id', first);
        router.addRoute('/items/:id/detail', second);

        router.resolve('/items/a/detail');

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith('/items/a/detail', { id: 'a' });
      });

      it('keeps the raw param value when decodeURIComponent throws', () => {
        const handler = jasmine.createSpy('handler');
        router.addRoute('/p/:slug', handler);

        router.resolve('/p/%E0%A4%A');

        expect(handler).toHaveBeenCalledWith('/p/%E0%A4%A', { slug: '%E0%A4%A' });
      });

      it('ignores target=_blank and handles nested clicks on marked anchors', () => {
        router.start();
        const navigateSpy = spyOn(router, 'navigate');
        const anchor = document.createElement('a');
        anchor.setAttribute('data-route', '');
        anchor.href = '/products';
        anchor.target = '_blank';
        const child = document.createElement('span');
        anchor.appendChild(child);
        document.body.appendChild(anchor);

        child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(navigateSpy).not.toHaveBeenCalled();

        anchor.target = '';
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        child.dispatchEvent(event);
        expect(navigateSpy).toHaveBeenCalledWith('/products');
        expect(event.defaultPrevented).toBe(true);
      });

      it('intercepts a same-hostname absolute URL and ignores empty hrefs', () => {
        router.start();
        const navigateSpy = spyOn(router, 'navigate');
        const anchor = document.createElement('a');
        anchor.setAttribute('data-route', '');
        anchor.href = `${window.location.origin}/about`;
        document.body.appendChild(anchor);

        anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(navigateSpy).toHaveBeenCalledWith(anchor.href);

        anchor.removeAttribute('href');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        anchor.dispatchEvent(event);
        expect(navigateSpy).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(false);
      });

      it('strips query strings and hashes before matching and normalizes navigation paths', () => {
        const handler = jasmine.createSpy('handler');
        router.addRoute('/products', handler);

        router.resolve('  /products/?q=phone#top  ');

        expect(handler).toHaveBeenCalledWith('/products', {});

        router.navigate('/products/?q=phone#top');
        expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/products?q=phone#top');

        router.navigate('/products', { replace: true });
        expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/products');
      });
    });
  })();
})();
