/**
 * AuthMarketingView — marketing panel for the auth pages.
 *
 * Owns the ambient blobs, brand badge, eyebrow, headline, subtitle, and
 * feature list. Does NOT own the login/register form.
 *
 * FE-09c-2 will supply the CSS rules for `.q-auth-marketing*`.
 * The ambient blobs already work via the `.q-ambient` utility in main.css.
 */

const COPY = {
  eyebrow: 'MERCADO LOCAL, HISTORIAS REALES',
  titles: {
    login: 'Qué bueno verte de nuevo.',
    register: 'Crea tu cuenta y compra con propósito.',
  },
  subtitle:
    'Descubre productos únicos de productores, artesanos y negocios locales de toda la región. Compra con propósito y apoya a quienes mantienen vivas sus tradiciones.',
  features: ['Compra segura y local', 'Envíos a toda Bolivia', 'Apoya a emprendedores'],
};

/** @returns {SVGElement} A check-mark SVG icon */
function createCheckIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'q-auth-marketing__check');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '20 6 9 17 4 12');
  svg.appendChild(polyline);
  return svg;
}

export class AuthMarketingView {
  /**
   * @param {Object} [options]
   * @param {'login'|'register'} [options.mode='login']
   */
  constructor({ mode = 'login' } = {}) {
    this.mode = mode;
    this.element = null;
    this._titleEl = null;
  }

  /** @returns {HTMLElement} */
  render() {
    if (this.element) return this.element;

    // Root: <aside class="q-auth-marketing q-ambient">
    const aside = document.createElement('aside');
    aside.className = 'q-auth-marketing q-ambient';

    // Ambient blobs (reuses utility from FE-09b)
    const pinkBlob = document.createElement('div');
    pinkBlob.className = 'q-ambient__blob q-ambient__blob--pink q-ambient__blob--top-left';
    pinkBlob.setAttribute('aria-hidden', 'true');

    const cyanBlob = document.createElement('div');
    cyanBlob.className = 'q-ambient__blob q-ambient__blob--cyan q-ambient__blob--bottom-right';
    cyanBlob.setAttribute('aria-hidden', 'true');

    aside.appendChild(pinkBlob);
    aside.appendChild(cyanBlob);

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'q-auth-marketing__content';

    // Brand badge (decorative, not a link)
    const brand = document.createElement('span');
    brand.className = 'q-auth-marketing__brand q-brand-logo';
    brand.setAttribute('aria-hidden', 'true');
    brand.textContent = "Q'atu";

    // Eyebrow
    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-auth-marketing__eyebrow';
    eyebrow.textContent = COPY.eyebrow;

    // Title (reactive via _titleEl)
    const title = document.createElement('h2');
    title.className = 'q-auth-marketing__title';
    title.textContent = COPY.titles[this.mode] || COPY.titles.login;
    this._titleEl = title;

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'q-auth-marketing__subtitle';
    subtitle.textContent = COPY.subtitle;

    // Feature list
    const featureList = document.createElement('ul');
    featureList.className = 'q-auth-marketing__features';

    COPY.features.forEach((featureText) => {
      const li = document.createElement('li');
      li.className = 'q-auth-marketing__feature';

      li.appendChild(createCheckIcon());

      const span = document.createElement('span');
      span.textContent = featureText;
      li.appendChild(span);

      featureList.appendChild(li);
    });

    content.appendChild(brand);
    content.appendChild(eyebrow);
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(featureList);

    aside.appendChild(content);
    this.element = aside;
    return this.element;
  }

  /**
   * @param {'login'|'register'} mode
   */
  setMode(mode) {
    if (mode !== 'login' && mode !== 'register') return;
    this.mode = mode;
    this._update();
  }

  /**
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
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
    this._titleEl = null;
  }

  /** @private */
  _update() {
    if (!this._titleEl) return;
    this._titleEl.textContent = COPY.titles[this.mode] || COPY.titles.login;
  }
}
