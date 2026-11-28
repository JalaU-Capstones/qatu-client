import { ShippingBannerViewModel } from '../../viewmodels/components/ShippingBannerViewModel.js';
import { ShippingBannerView } from './ShippingBannerView.js';

describe('ShippingBannerView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new ShippingBannerViewModel();
    view = new ShippingBannerView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('render returns a .q-section-container wrapping a .q-shipping-banner.q-ambient', () => {
    const el = view.render();
    expect(el.classList.contains('q-section-container')).toBe(true);
    const banner = el.querySelector('.q-shipping-banner');
    expect(banner).not.toBeNull();
    expect(banner.classList.contains('q-ambient')).toBe(true);
  });

  it('render includes 2 .q-ambient__blob children', () => {
    const el = view.render();
    const blobs = el.querySelectorAll('.q-ambient__blob');
    expect(blobs.length).toBe(2);
  });

  it('render includes the title text', () => {
    const el = view.render();
    const title = el.querySelector('.q-shipping-banner__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Envío gratis');
    expect(el.querySelector('.q-shipping-banner__subtitle').textContent).toBe(
      'en compras desde US$ 50'
    );
    expect(el.querySelector('.q-shipping-banner__icon').textContent).toBe('+');
  });

  it('render includes the CTA link with the correct href and label', () => {
    const el = view.render();
    const link = el.querySelector('.q-shipping-banner__link');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/products');
    expect(link.textContent).toContain('A toda Latinoamérica');
    expect(link.textContent).toContain('Compra segura');
  });

  it('mount appends to the container', () => {
    view.mount(container);
    expect(container.querySelector('.q-shipping-banner')).not.toBeNull();
  });

  it('destroy removes the element', () => {
    view.mount(container);
    expect(container.querySelector('.q-shipping-banner')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-shipping-banner')).toBeNull();
    expect(view.element).toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('ShippingBannerView additional branches (recovered 1)', () => {
      let container;
      let view = null;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        view?.destroy();
        container.remove();
      });

      it('creates a default ShippingBannerViewModel and the exact default aria-label', () => {
        view = new ShippingBannerView();
        expect(view.viewModel).toBeInstanceOf(ShippingBannerViewModel);

        const banner = view.render().querySelector('.q-shipping-banner');
        expect(banner.getAttribute('aria-label')).toBe('Envío gratis, en compras desde US$ 50');
      });

      it('renders custom view-model copy and CTA without mutating the default view model', () => {
        const custom = new ShippingBannerViewModel({
          title: 'Envío gratis',
          subtitle: 'desde US$ 20',
          ctaLabel: 'Ver más',
          ctaLink: 'Explorar',
          ctaHref: '/ofertas',
        });
        view = new ShippingBannerView(custom);
        const element = view.render();
        const banner = element.querySelector('.q-shipping-banner');

        expect(banner.getAttribute('aria-label')).toBe('Envío gratis, desde US$ 20');
        expect(element.querySelector('.q-shipping-banner__title').textContent).toBe('Envío gratis');
        expect(element.querySelector('.q-shipping-banner__subtitle').textContent).toBe(
          'desde US$ 20'
        );

        const link = element.querySelector('.q-shipping-banner__link');
        expect(link.getAttribute('href')).toBe('/ofertas');
        expect(link.textContent).toBe('Ver más · Explorar →');
        expect(link.querySelector('.q-shipping-banner__cta').textContent).toBe('Explorar →');
        expect(new ShippingBannerViewModel().subtitle).toBe('en compras desde US$ 50');
      });

      it('caches render output and returns the same node from mount', () => {
        view = new ShippingBannerView();
        const first = view.render();

        expect(view.render()).toBe(first);
        expect(view.mount(container)).toBe(first);
        expect(view.render()).toBe(first);
        expect(container.querySelectorAll('.q-section-container').length).toBe(1);
      });

      it('renders both ambient blobs with exact classes and aria-hidden', () => {
        view = new ShippingBannerView();
        const banner = view.render().querySelector('.q-shipping-banner');
        const [pink, cyan, inner] = banner.children;

        expect(banner.children.length).toBe(3);
        expect(pink.className).toBe(
          'q-ambient__blob q-ambient__blob--pink q-ambient__blob--top-left'
        );
        expect(pink.getAttribute('aria-hidden')).toBe('true');
        expect(cyan.className).toBe(
          'q-ambient__blob q-ambient__blob--cyan q-ambient__blob--bottom-right'
        );
        expect(cyan.getAttribute('aria-hidden')).toBe('true');
        expect(inner.className).toBe('q-shipping-banner__inner');
      });

      it('keeps the inner, copy, icon and text structure in exact DOM order', () => {
        view = new ShippingBannerView();
        const banner = view.render().querySelector('.q-shipping-banner');
        const inner = banner.children[2];
        const [copy, link] = inner.children;
        const [icon, text] = copy.children;
        const [title, subtitle] = text.children;

        expect(inner.children.length).toBe(2);
        expect(copy.className).toBe('q-shipping-banner__copy');
        expect(link.className).toBe('q-shipping-banner__link');
        expect(copy.children.length).toBe(2);
        expect(icon.className).toBe('q-shipping-banner__icon');
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(icon.textContent).toBe('+');
        expect(text.className).toBe('q-shipping-banner__text');
        expect(text.children.length).toBe(2);
        expect(title.className).toBe('q-shipping-banner__title');
        expect(title.textContent).toBe('Envío gratis');
        expect(subtitle.className).toBe('q-shipping-banner__subtitle');
        expect(subtitle.textContent).toBe('en compras desde US$ 50');
      });

      it('builds the CTA from a text node plus the exact span and route metadata', () => {
        view = new ShippingBannerView();
        const link = view.render().querySelector('.q-shipping-banner__link');
        const cta = link.querySelector('.q-shipping-banner__cta');

        expect(link.getAttribute('href')).toBe('/products');
        expect(link.dataset.route).toBe('');
        expect(link.childNodes.length).toBe(2);
        expect(link.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
        expect(link.childNodes[0].textContent).toBe('A toda Latinoamérica · ');
        expect(cta.tagName.toLowerCase()).toBe('span');
        expect(cta.textContent).toBe('Compra segura →');
        expect(link.textContent).toBe('A toda Latinoamérica · Compra segura →');
      });

      it('destroy is safe before render, detached and twice, and permits a fresh render', () => {
        view = new ShippingBannerView();
        const first = view.render();

        view.destroy();
        expect(view.element).toBeNull();
        expect(() => view.destroy()).not.toThrow();

        const second = view.render();
        expect(second).not.toBe(first);
        view.mount(container);
        expect(container.querySelector('.q-shipping-banner')).not.toBeNull();
        view.destroy();
        expect(container.querySelector('.q-shipping-banner')).toBeNull();

        const untouched = new ShippingBannerView();
        expect(() => untouched.destroy()).not.toThrow();
        view = untouched;
      });
    });
  })();
})();
