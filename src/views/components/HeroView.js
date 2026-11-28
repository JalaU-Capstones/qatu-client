import { HeroViewModel } from '../../viewmodels/components/HeroViewModel.js';
import { CategoryIcon } from './CategoryIcon.js';
import { createImageWithFallback } from './ImageWithFallback.js';

/**
 * View component for the Hero banner.
 * Renders title, subtitle, search form, quick links, and decorative visual.
 */
export class HeroView {
  /**
   * @param {HeroViewModel} [viewModel]
   */
  constructor(viewModel = new HeroViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._unsubscribe = null;
    this._searchInput = null;
    this._collage = null;
    this._renderedVisualImages = null;
  }

  /**
   * Builds and returns the DOM element for the hero section.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const section = document.createElement('section');
    section.className = 'q-hero q-ambient';
    section.setAttribute('aria-labelledby', 'q-hero-title');

    // Decorative background blobs
    const pinkBlob = document.createElement('div');
    pinkBlob.className = 'q-ambient__blob q-ambient__blob--pink q-ambient__blob--top-left';
    pinkBlob.setAttribute('aria-hidden', 'true');

    const cyanBlob = document.createElement('div');
    cyanBlob.className = 'q-ambient__blob q-ambient__blob--cyan q-ambient__blob--bottom-right';
    cyanBlob.setAttribute('aria-hidden', 'true');

    section.appendChild(pinkBlob);
    section.appendChild(cyanBlob);

    // Inner container
    const inner = document.createElement('div');
    inner.className = 'q-section-container q-hero__inner';

    // Content container (left column)
    const content = document.createElement('div');
    content.className = 'q-hero__content';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-hero__eyebrow';
    const eyebrowDot = document.createElement('span');
    eyebrowDot.className = 'q-hero__eyebrow-dot';
    eyebrowDot.setAttribute('aria-hidden', 'true');
    const eyebrowText = document.createElement('span');
    eyebrowText.textContent = this.viewModel.eyebrow.toUpperCase();
    eyebrow.append(eyebrowDot, eyebrowText);

    const title = document.createElement('h1');
    title.id = 'q-hero-title';
    title.className = 'q-hero__title';

    const titleMain = document.createElement('span');
    titleMain.className = 'q-hero__title-main';
    titleMain.textContent = this.viewModel.titleMain;

    const titleAccent = document.createElement('span');
    titleAccent.className = 'q-hero__title-accent';
    titleAccent.textContent = ' ' + this.viewModel.titleAccent;

    title.appendChild(titleMain);
    title.appendChild(titleAccent);

    const subtitle = document.createElement('p');
    subtitle.className = 'q-hero__subtitle';
    subtitle.textContent = this.viewModel.subtitle;

    // Search form
    const searchForm = document.createElement('form');
    searchForm.className = 'q-hero__search';
    searchForm.setAttribute('role', 'search');

    const searchIcon = document.createElement('span');
    searchIcon.className = 'q-hero__search-icon';
    searchIcon.setAttribute('aria-hidden', 'true');
    searchIcon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';

    const searchLabel = document.createElement('label');
    searchLabel.htmlFor = 'q-hero-search-input';
    searchLabel.className = 'q-sr-only';
    searchLabel.textContent = 'Buscar productos';

    const searchInput = document.createElement('input');
    searchInput.id = 'q-hero-search-input';
    searchInput.type = 'search';
    searchInput.className = 'q-hero__search-input';
    searchInput.placeholder = this.viewModel.searchPlaceholder;
    searchInput.autocomplete = 'off';
    searchInput.value = this.viewModel.searchValue;

    searchInput.addEventListener('input', (e) => {
      this.viewModel.setSearchValue(e.target.value);
    });

    const searchButton = document.createElement('button');
    searchButton.type = 'submit';
    searchButton.className = 'q-btn q-btn--primary q-hero__search-button';
    searchButton.textContent = this.viewModel.searchButtonLabel;

    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.viewModel.triggerSearch();
    });

    searchForm.append(searchIcon, searchLabel);
    searchForm.appendChild(searchInput);
    searchForm.appendChild(searchButton);

    this._searchInput = searchInput;

    // Quick links
    const quickLinksContainer = document.createElement('div');
    quickLinksContainer.className = 'q-hero__quick-links';

    const quickLinksLabel = document.createElement('span');
    quickLinksLabel.className = 'q-hero__quick-links-label';
    quickLinksLabel.textContent = this.viewModel.quickLinksLabel;
    quickLinksContainer.appendChild(quickLinksLabel);

    this._quickLinksContainer = quickLinksContainer;
    this._renderQuickLinks();

    content.appendChild(eyebrow);
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(searchForm);
    content.appendChild(quickLinksContainer);

    // Visual container (right column)
    const visual = document.createElement('div');
    visual.className = 'q-hero__visual';

    const collage = document.createElement('div');
    collage.className = 'q-hero__collage';
    this._collage = collage;
    this._renderCollage();

    const badge = document.createElement('div');
    badge.className = 'q-hero__badge';

    const badgeValue = document.createElement('span');
    badgeValue.className = 'q-hero__badge-value';
    badgeValue.textContent = this.viewModel.visualBadgeLabel;

    const badgeLabel = document.createElement('span');
    badgeLabel.className = 'q-hero__badge-label';
    badgeLabel.textContent = this.viewModel.visualBadgeSublabel;

    badge.appendChild(badgeValue);
    badge.appendChild(badgeLabel);

    const floatingCard = document.createElement('a');
    floatingCard.className = 'q-hero__floating-card';
    floatingCard.href = this.viewModel.floatingCardHref;
    floatingCard.dataset.route = '';

    const floatingCardLabel = document.createElement('span');
    floatingCardLabel.className = 'q-hero__floating-card-label';
    floatingCardLabel.textContent = this.viewModel.floatingCardLabel;

    const floatingCardCopy = document.createElement('span');
    floatingCardCopy.className = 'q-hero__floating-card-copy';
    floatingCardCopy.appendChild(floatingCardLabel);

    const floatingCardSublabel = document.createElement('span');
    floatingCardSublabel.className = 'q-hero__floating-card-sublabel';
    floatingCardSublabel.textContent = this.viewModel.floatingCardSublabel;
    floatingCardCopy.appendChild(floatingCardSublabel);

    const floatingCardCta = document.createElement('span');
    floatingCardCta.className = 'q-hero__floating-card-cta';
    floatingCardCta.setAttribute('aria-label', this.viewModel.floatingCardCtaLabel);
    floatingCardCta.setAttribute('aria-hidden', 'true');
    floatingCardCta.textContent = '→';

    const floatingIcon = document.createElement('span');
    floatingIcon.className = 'q-hero__floating-card-icon';
    floatingIcon.setAttribute('aria-hidden', 'true');
    floatingIcon.textContent = '✦';

    floatingCard.append(floatingIcon, floatingCardCopy);
    floatingCard.appendChild(floatingCardCta);

    visual.appendChild(collage);
    visual.appendChild(badge);
    visual.appendChild(floatingCard);

    inner.appendChild(content);
    inner.appendChild(visual);
    section.appendChild(inner);

    this.element = section;

    this._unsubscribe = this.viewModel.subscribe(() => {
      this._update();
    });

    return this.element;
  }

  /**
   * Mounts the section to a parent container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Updates reactive input values when ViewModel changes.
   * @private
   */
  _update() {
    if (this._searchInput && this._searchInput.value !== this.viewModel.searchValue) {
      this._searchInput.value = this.viewModel.searchValue;
    }
    if (this._renderedVisualImages !== this.viewModel.visualImages) {
      this._renderCollage();
    }
    this._renderQuickLinks();
  }

  _renderQuickLinks() {
    if (!this._quickLinksContainer) return;
    this._quickLinksContainer.replaceChildren();

    const label = document.createElement('span');
    label.className = 'q-hero__quick-links-label';
    label.textContent = this.viewModel.quickLinksLabel;
    this._quickLinksContainer.appendChild(label);

    if (this.viewModel.isCategoriesLoading) {
      for (let index = 0; index < 5; index += 1) {
        const skeleton = document.createElement('span');
        skeleton.className = 'q-hero__quick-link q-hero__quick-link--loading';
        skeleton.setAttribute('aria-hidden', 'true');
        this._quickLinksContainer.appendChild(skeleton);
      }
      return;
    }

    this.viewModel.quickLinks.forEach((link, index) => {
      const a = document.createElement('a');
      a.className = 'q-hero__quick-link';
      a.href = link.href;
      a.dataset.route = '';
      a.appendChild(new CategoryIcon({ name: link.label, size: 16 }).render());
      const text = document.createElement('span');
      text.textContent = link.label;
      a.appendChild(text);
      this._quickLinksContainer.appendChild(a);

      if (index < this.viewModel.quickLinks.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'q-hero__quick-link-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '·';
        this._quickLinksContainer.appendChild(sep);
      }
    });
  }

  _renderCollage() {
    if (!this._collage) return;
    const positions = ['coffee', 'bag', 'pottery'];
    const products = this.viewModel.visualImages;
    const items = products.slice(0, 3);
    while (items.length < 3) {
      items.push({
        src: null,
        label: 'Producto local',
        price: 'Descubre piezas únicas',
      });
    }

    this._collage.replaceChildren();
    items.forEach((product, index) => {
      const position = positions[index] || 'extra';
      const card = document.createElement(product.slug ? 'a' : 'article');
      card.className = `q-hero__collage-card q-hero__collage-card--${position}`;
      if (product.slug) {
        card.href = `/products/${encodeURIComponent(product.slug)}`;
        card.dataset.route = '';
        card.setAttribute('aria-label', `${product.label} · ${product.price}`);
      }

      const image = createImageWithFallback({
        src: product.src,
        alt: product.slug ? product.label : '',
        imageClassName: 'q-hero__visual-img',
        placeholderImageClassName: 'q-hero__visual-img',
      });

      const caption = document.createElement('span');
      caption.className = 'q-hero__collage-caption';
      caption.textContent = `${product.label} · ${product.price}`;
      card.append(image, caption);
      this._collage.appendChild(card);
    });
    this._renderedVisualImages = products;
  }

  /**
   * Cleans up subscriptions and removes element from DOM.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this._searchInput = null;
    this._collage = null;
    this._renderedVisualImages = null;
  }
}
