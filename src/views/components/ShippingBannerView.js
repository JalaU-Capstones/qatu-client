import { ShippingBannerViewModel } from '../../viewmodels/components/ShippingBannerViewModel.js';

/**
 * Shipping banner displayed between Featured Products and Featured Stores.
 * Uses the `.q-ambient` utility for the decorative background.
 */
export class ShippingBannerView {
  /**
   * @param {ShippingBannerViewModel} [viewModel]
   */
  constructor(viewModel = new ShippingBannerViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
  }

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-section-container';

    const banner = document.createElement('aside');
    banner.className = 'q-shipping-banner q-ambient';
    banner.setAttribute('aria-label', this.viewModel.title);

    const pinkBlob = document.createElement('div');
    pinkBlob.className = 'q-ambient__blob q-ambient__blob--pink q-ambient__blob--top-left';
    pinkBlob.setAttribute('aria-hidden', 'true');

    const cyanBlob = document.createElement('div');
    cyanBlob.className = 'q-ambient__blob q-ambient__blob--cyan q-ambient__blob--bottom-right';
    cyanBlob.setAttribute('aria-hidden', 'true');

    banner.appendChild(pinkBlob);
    banner.appendChild(cyanBlob);

    const inner = document.createElement('div');
    inner.className = 'q-shipping-banner__inner';

    const title = document.createElement('p');
    title.className = 'q-shipping-banner__title';
    title.textContent = this.viewModel.title;

    const link = document.createElement('a');
    link.className = 'q-shipping-banner__link';
    link.href = this.viewModel.ctaHref;
    link.dataset.route = '';
    link.innerHTML = `${this.viewModel.ctaLabel} · <span class="q-shipping-banner__cta">${this.viewModel.ctaLink} →</span>`;

    inner.appendChild(title);
    inner.appendChild(link);
    banner.appendChild(inner);
    section.appendChild(banner);

    this.element = section;
    return this.element;
  }

  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
