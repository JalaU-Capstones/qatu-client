import { Router } from '../../router/Router.js';
import { FooterViewModel } from '../../viewmodels/components/FooterViewModel.js';
import { FooterView } from './FooterView.js';

describe('FooterView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FooterViewModel();
    view = new FooterView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render footer element with brand column', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('footer');
    expect(el.classList.contains('q-footer')).toBe(true);

    const logo = el.querySelector('.q-footer-col-brand .q-brand-logo-svg');
    expect(logo).not.toBeNull();
    expect(logo.querySelector('text').textContent).toBe('Q’atu');
    expect(logo.querySelector('polygon')).not.toBeNull();

    const tagline = el.querySelector('.q-footer-tagline');
    expect(tagline).not.toBeNull();
    expect(tagline.textContent).toContain('El mercado de Latinoamérica');
  });

  it('should render category and help section links', () => {
    const el = view.render();
    const headings = Array.from(el.querySelectorAll('.q-footer-heading')).map((h) => h.textContent);
    expect(headings).toContain('Comprar');
    expect(headings).toContain('Vender');
    expect(headings).toContain('Ayuda');
    expect(headings).not.toContain('Síguenos');

    const links = Array.from(el.querySelectorAll('.q-footer-links a')).map((a) => a.textContent);
    expect(links).toContain('Productos');
    expect(links).toContain('Categorías');
    expect(links).toContain('Tiendas');
    expect(links).toContain('Preguntas frecuentes');
  });

  it('renders the four-column structure and Figma navigation headings', () => {
    const el = view.render();

    expect(el.querySelectorAll('.q-footer-grid > .q-footer-col').length).toBe(4);
    expect(el.querySelector('.q-footer-col-brand .q-brand-logo-svg')).not.toBeNull();
    const headings = Array.from(el.querySelectorAll('.q-footer-heading')).map(
      (heading) => heading.textContent
    );
    expect(headings).toEqual(['Comprar', 'Vender', 'Ayuda']);
  });

  it('should render bottom legal bar with copyright and motto', () => {
    const el = view.render();
    const copyright = el.querySelector('.q-footer-copyright');
    expect(copyright).not.toBeNull();
    expect(copyright.textContent).toContain('2026');

    const motto = el.querySelector('.q-footer-motto');
    expect(motto).not.toBeNull();
    expect(copyright.textContent).toBe("© 2026 Q'atu");
    expect(motto.textContent).toBe('El mercado de Latinoamérica, en un solo lugar');
    expect(motto.tagName.toLowerCase()).toBe('a');
    expect(motto.getAttribute('href')).toBe('/about');
    expect(motto.hasAttribute('data-route')).toBe(true);
  });

  it('includes a Nosotros navigation link to /about', () => {
    const el = view.render();
    const aboutLink = Array.from(el.querySelectorAll('.q-footer-links a')).find(
      (link) => link.textContent === 'Nosotros'
    );

    expect(aboutLink).not.toBeNull();
    expect(aboutLink.getAttribute('href')).toBe('/about');
    expect(aboutLink.hasAttribute('data-route')).toBe(true);
  });

  it('navigates to /about when the footer motto is clicked', () => {
    const originalPath = window.location.pathname;
    const router = new Router();
    const aboutRoute = jasmine.createSpy('aboutRoute');
    router.addRoute('/about', aboutRoute);
    router.start();
    view.mount(container);

    container.querySelector('.q-footer-motto').click();

    expect(aboutRoute).toHaveBeenCalledWith('/about', {});
    router.destroy();
    window.history.replaceState({}, '', originalPath);
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-footer')).not.toBeNull();
  });

  it('non-seller -> footer "Vender" link href is /seller/apply', () => {
    const mockAuth = { isSeller: () => false };
    const footerView = new FooterView(viewModel, { authStore: mockAuth });
    const el = footerView.render();

    const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
      a.textContent.toLowerCase().includes('vende')
    );
    expect(venderLink).not.toBeNull();
    expect(venderLink.getAttribute('href')).toBe('/seller/apply');
    footerView.destroy();
  });

  it('seller -> footer "Vender" link href is /seller/products', () => {
    const mockAuth = { isSeller: () => true };
    const footerView = new FooterView(viewModel, { authStore: mockAuth });
    const el = footerView.render();

    const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
      a.textContent.toLowerCase().includes('vende')
    );
    expect(venderLink).not.toBeNull();
    expect(venderLink.getAttribute('href')).toBe('/seller/products');
    footerView.destroy();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('FooterView (recovered 1)', () => {
    let view;
    let viewModel;
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      viewModel = new FooterViewModel();
      view = new FooterView(viewModel);
    });

    afterEach(() => {
      view.destroy();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('non-seller -> footer "Vender" link href is /seller/apply', () => {
      const mockAuth = { isSeller: () => false };
      const footerView = new FooterView(viewModel, { authStore: mockAuth });
      const el = footerView.render();

      const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
        a.textContent.toLowerCase().includes('vende')
      );
      expect(venderLink).not.toBeNull();
      expect(venderLink.getAttribute('href')).toBe('/seller/apply');
      footerView.destroy();
    });

    it('seller -> footer "Vender" link href is /seller/products', () => {
      const mockAuth = { isSeller: () => true };
      const footerView = new FooterView(viewModel, { authStore: mockAuth });
      const el = footerView.render();

      const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
        a.textContent.toLowerCase().includes('vende')
      );
      expect(venderLink).not.toBeNull();
      expect(venderLink.getAttribute('href')).toBe('/seller/products');
      footerView.destroy();
    });
  });

  (() => {
    describe('FooterView additional branches (recovered 2)', () => {
      const makeAuth = (isSeller = false) => ({
        isSeller: jasmine.createSpy('isSeller').and.returnValue(isSeller),
      });

      const findLink = (root, label) =>
        Array.from(root.querySelectorAll('.q-footer-links a')).find(
          (anchor) => anchor.textContent === label
        );

      const trackSubscriptions = (viewModel) => {
        const originalSubscribe = viewModel.subscribe.bind(viewModel);
        const records = [];
        spyOn(viewModel, 'subscribe').and.callFake((listener) => {
          const realUnsubscribe = originalSubscribe(listener);
          const unsubscribe = jasmine
            .createSpy('unsubscribe')
            .and.callFake(() => realUnsubscribe());
          records.push({ listener, unsubscribe });
          return unsubscribe;
        });
        return records;
      };

      let view;
      let viewModel;
      let container;
      let extraViews;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = new FooterViewModel();
        view = new FooterView(viewModel);
        extraViews = [];
      });

      afterEach(() => {
        view?.destroy();
        extraViews.forEach((extraView) => extraView.destroy());
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('keeps the Vender link on /seller/apply when authStore is null or undefined', () => {
        const nullAuthView = new FooterView(viewModel, { authStore: null });
        extraViews.push(nullAuthView);

        expect(findLink(nullAuthView.render(), 'Vende en Q’atu').getAttribute('href')).toBe(
          '/seller/apply'
        );

        const undefinedAuthView = new FooterView(viewModel);
        undefinedAuthView.authStore = undefined;
        extraViews.push(undefinedAuthView);

        expect(findLink(undefinedAuthView.render(), 'Vende en Q’atu').getAttribute('href')).toBe(
          '/seller/apply'
        );
      });

      it('treats a label-only or uppercase vender trigger as the seller link', () => {
        viewModel = new FooterViewModel({
          sections: [
            {
              id: 'sell',
              title: 'Vender',
              links: [
                { label: 'Quiero vender', href: '/ayuda' },
                { label: 'VENDER', href: '/ayuda' },
              ],
            },
          ],
        });
        view = new FooterView(viewModel, { authStore: makeAuth(false) });
        const el = view.render();

        const lowercase = findLink(el, 'Quiero vender');
        const uppercase = findLink(el, 'VENDER');

        expect(lowercase.getAttribute('href')).toBe('/seller/apply');
        expect(lowercase.getAttribute('data-route')).toBe('');
        expect(uppercase.getAttribute('href')).toBe('/seller/apply');
        expect(uppercase.textContent).toBe('VENDER');
      });

      it('leaves external links without a data-route marker', () => {
        viewModel = new FooterViewModel({
          sections: [
            {
              id: 'social',
              title: 'Social',
              links: [{ label: 'Facebook', href: 'https://facebook.com' }],
            },
          ],
        });
        view = new FooterView(viewModel, { authStore: makeAuth(false) });
        const external = findLink(view.render(), 'Facebook');

        expect(external.getAttribute('href')).toBe('https://facebook.com');
        expect(external.hasAttribute('data-route')).toBe(false);
      });

      it('falls back to /about for an empty mottoHref and still marks external motto links', () => {
        const emptyHrefView = new FooterView(
          new FooterViewModel({
            bottomBar: { copyright: 'c', motto: 'Motto', mottoHref: '' },
          })
        );
        extraViews.push(emptyHrefView);
        expect(emptyHrefView.render().querySelector('.q-footer-motto').getAttribute('href')).toBe(
          '/about'
        );

        const customHrefView = new FooterView(
          new FooterViewModel({
            bottomBar: { copyright: 'c', motto: 'Motto', mottoHref: '/legal' },
          })
        );
        extraViews.push(customHrefView);
        expect(customHrefView.render().querySelector('.q-footer-motto').getAttribute('href')).toBe(
          '/legal'
        );

        const externalHrefView = new FooterView(
          new FooterViewModel({
            bottomBar: {
              copyright: 'c',
              motto: 'Motto',
              mottoHref: 'https://example.test/about',
            },
          })
        );
        extraViews.push(externalHrefView);
        const externalMotto = externalHrefView.render().querySelector('.q-footer-motto');

        expect(externalMotto.getAttribute('href')).toBe('https://example.test/about');
        expect(externalMotto.getAttribute('data-route')).toBe('');
      });

      it('renders brand href, aria-label and route marker and prevents brand/link clicks', () => {
        const el = view.render();
        const brand = el.querySelector('.q-brand-link');

        expect(brand.getAttribute('href')).toBe('/');
        expect(brand.getAttribute('aria-label')).toBe("Q'atu inicio");
        expect(brand.getAttribute('data-route')).toBe('');

        const brandClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        brand.dispatchEvent(brandClick);
        expect(brandClick.defaultPrevented).toBe(true);

        const linkClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        findLink(el, 'Productos').dispatchEvent(linkClick);
        expect(linkClick.defaultPrevented).toBe(true);

        const customView = new FooterView(
          new FooterViewModel({
            brand: { logoText: 'Jaqi', logoHref: '/inicio', tagline: 'Etiqueta' },
          })
        );
        extraViews.push(customView);
        const customBrand = customView.render().querySelector('.q-brand-link');

        expect(customBrand.getAttribute('href')).toBe('/inicio');
        expect(customBrand.getAttribute('aria-label')).toBe('Jaqi inicio');
      });

      it('re-renders in place on VM changes with a fresh element and fresh subscription', () => {
        viewModel = new FooterViewModel({
          bottomBar: { copyright: 'c', motto: 'M1', mottoHref: '/m1' },
        });
        const records = trackSubscriptions(viewModel);
        view = new FooterView(viewModel, { authStore: makeAuth(false) });

        const before = document.createElement('span');
        const after = document.createElement('span');
        container.appendChild(before);
        const oldEl = view.mount(container);
        container.appendChild(after);

        expect(records.length).toBe(1);
        expect(records[0].unsubscribe).not.toHaveBeenCalled();

        // Call the captured listener directly: FooterViewModel._notify() iterates a
        // live Set, so re-subscribing from this callback re-enters indefinitely.
        viewModel.bottomBar.mottoHref = '/m2';
        records[0].listener(viewModel);
        const newEl = view.element;

        expect(newEl).not.toBe(oldEl);
        expect(container.contains(oldEl)).toBe(false);
        expect(Array.from(container.children)).toEqual([before, newEl, after]);
        expect(newEl.querySelector('.q-footer-motto').getAttribute('href')).toBe('/m2');
        expect(records[0].unsubscribe).toHaveBeenCalledTimes(1);
        expect(records.length).toBe(2);
        expect(records[1].unsubscribe).not.toHaveBeenCalled();

        viewModel.bottomBar.motto = 'M3';
        records[1].listener(viewModel);

        expect(view.element).not.toBe(newEl);
        expect(Array.from(container.children)).toEqual([before, view.element, after]);
        expect(view.element.querySelector('.q-footer-motto').textContent).toBe('M3');
        expect(records[1].unsubscribe).toHaveBeenCalledTimes(1);
        expect(records.length).toBe(3);
      });

      it('ignores a VM notification while the footer is not mounted', () => {
        const records = trackSubscriptions(viewModel);
        const el = view.render();

        expect(() => viewModel._notify()).not.toThrow();
        expect(view.element).toBe(el);
        expect(container.contains(el)).toBe(false);
        expect(records.length).toBe(1);
      });

      it('unsubscribes on destroy and is safe to destroy twice', () => {
        const records = trackSubscriptions(viewModel);
        const el = view.mount(container);

        expect(records.length).toBe(1);
        expect(viewModel._listeners.size).toBe(1);

        view.destroy();

        expect(records[0].unsubscribe).toHaveBeenCalledTimes(1);
        expect(viewModel._listeners.size).toBe(0);
        expect(view.element).toBeNull();
        expect(container.contains(el)).toBe(false);
        expect(() => view.destroy()).not.toThrow();
        expect(records[0].unsubscribe).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
