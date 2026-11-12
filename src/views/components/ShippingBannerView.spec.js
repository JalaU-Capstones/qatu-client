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
    expect(title.textContent).toBe('Envío gratis sobre US$ 50');
  });

  it('render includes the CTA link with the correct href and label', () => {
    const el = view.render();
    const link = el.querySelector('.q-shipping-banner__link');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/products');
    expect(link.textContent).toContain('A toda Latinoamérica');
    expect(link.textContent).toContain('Compra ahora');
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
