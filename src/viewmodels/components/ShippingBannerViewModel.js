/**
 * ViewModel for the shipping banner shown between Featured Products and Featured Stores.
 * Copy-only (no interactivity beyond the CTA link). Kept as a VM for MVVM consistency.
 */
export class ShippingBannerViewModel {
  /**
   * @param {Object} [options]
   * @param {string} [options.title]
   * @param {string} [options.ctaLabel]
   * @param {string} [options.ctaLink]
   * @param {string} [options.ctaHref]
   */
  constructor(options = {}) {
    this.title = options.title || 'Envío gratis sobre US$ 50';
    this.ctaLabel = options.ctaLabel || 'A toda Latinoamérica';
    this.ctaLink = options.ctaLink || 'Compra ahora';
    this.ctaHref = options.ctaHref || '/products';
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((l) => l(this));
  }
}
