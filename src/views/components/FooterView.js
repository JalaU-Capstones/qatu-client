import { authStore as defaultAuthStore } from '../../store/authStore.js';
import { FooterViewModel } from '../../viewmodels/components/FooterViewModel.js';

const SOCIAL_ICON_ORDER = ['instagram', 'facebook', 'tiktok', 'x'];

const SOCIAL_ICON_MARKUP = {
  instagram: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5"></rect>
      <circle cx="12" cy="12" r="4"></circle>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle>
    </svg>
  `,
  facebook: `
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.8-.1-1.7-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5V10H7v3h2.8v8h3.7Z"></path>
    </svg>
  `,
  tiktok: `
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.6 8.2a7 7 0 0 1-4.2-1.4v7.1a5.8 5.8 0 1 1-5-5.7v3.6a2.3 2.3 0 1 0 1.5 2.1V2.8h3.5a7 7 0 0 0 4.2 4.1v1.3Z"></path>
    </svg>
  `,
  x: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="m4 4 16 16M20 4 4 20"></path>
      <path d="M4 4h4l12 16h-4L4 4Z"></path>
    </svg>
  `,
};

/**
 * View component for the Footer.
 * Renders brand description, site navigation links, support links, social links, and legal notice.
 */
export class FooterView {
  /**
   * @param {FooterViewModel} [viewModel]
   * @param {Object} [options]
   * @param {Object} [options.authStore]
   */
  constructor(viewModel = new FooterViewModel(), { authStore = defaultAuthStore } = {}) {
    this.viewModel = viewModel;
    this.authStore = authStore;
    this.element = null;
    this._unsubscribe = null;
  }

  /**
   * Builds and returns the DOM element for the footer.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const footer = document.createElement('footer');
    footer.className = 'q-footer';
    footer.setAttribute('role', 'contentinfo');

    const container = document.createElement('div');
    container.className = 'q-footer-container';

    const grid = document.createElement('div');
    grid.className = 'q-footer-grid';

    // 1. Brand Column
    const brandCol = document.createElement('div');
    brandCol.className = 'q-footer-col q-footer-col-brand';

    const brandLink = document.createElement('a');
    brandLink.className = 'q-brand-logo';
    brandLink.href = this.viewModel.brand.logoHref;
    brandLink.textContent = this.viewModel.brand.logoText;
    brandLink.setAttribute('aria-label', `${this.viewModel.brand.logoText} inicio`);
    brandLink.dataset.route = '';

    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
    });

    const tagline = document.createElement('p');
    tagline.className = 'q-footer-tagline';
    tagline.textContent = this.viewModel.brand.tagline;

    brandCol.appendChild(brandLink);
    brandCol.appendChild(tagline);
    grid.appendChild(brandCol);

    // 2. Link Columns
    this.viewModel.sections.forEach((section) => {
      const col = document.createElement('div');
      col.className = 'q-footer-col';

      const heading = document.createElement('h3');
      heading.className = 'q-footer-heading';
      heading.textContent = section.title;

      const list = document.createElement('ul');
      list.className = 'q-footer-links';

      section.links.forEach((link) => {
        const item = document.createElement('li');
        const anchor = document.createElement('a');
        let href = link.href;
        if (link.label.toLowerCase().includes('vender') || link.href === '/vender') {
          href = this.authStore?.isSeller() ? '/seller/products' : '/seller/apply';
        }
        anchor.href = href;
        anchor.textContent = link.label;
        // Mark internal links so the router can intercept navigation
        if (!href.startsWith('http')) {
          anchor.dataset.route = '';
        }
        anchor.addEventListener('click', (e) => {
          e.preventDefault();
        });
        item.appendChild(anchor);
        list.appendChild(item);
      });

      col.appendChild(heading);
      col.appendChild(list);
      grid.appendChild(col);
    });

    // 3. Social Column
    const socialCol = document.createElement('div');
    socialCol.className = 'q-footer-col q-footer-col-social';

    const socialHeading = document.createElement('h3');
    socialHeading.className = 'q-footer-heading';
    socialHeading.textContent = this.viewModel.social.title;

    const socialGroup = document.createElement('div');
    socialGroup.className = 'q-footer-social';

    const socialItems = [...this.viewModel.social.items];
    if (!socialItems.some((item) => item.id === 'tiktok')) {
      socialItems.push({
        id: 'tiktok',
        href: 'https://www.tiktok.com',
        ariaLabel: 'TikTok',
      });
    }
    socialItems.sort((left, right) => {
      const leftOrder = SOCIAL_ICON_ORDER.indexOf(left.id);
      const rightOrder = SOCIAL_ICON_ORDER.indexOf(right.id);
      return (
        (leftOrder < 0 ? SOCIAL_ICON_ORDER.length : leftOrder) -
        (rightOrder < 0 ? SOCIAL_ICON_ORDER.length : rightOrder)
      );
    });

    socialItems.forEach((item) => {
      const socialLink = document.createElement('a');
      socialLink.className = 'q-footer-social-btn';
      socialLink.href = item.href;
      socialLink.setAttribute('aria-label', item.ariaLabel || item.label);
      socialLink.setAttribute('target', '_blank');
      socialLink.setAttribute('rel', 'noopener noreferrer');
      if (SOCIAL_ICON_MARKUP[item.id]) {
        socialLink.innerHTML = SOCIAL_ICON_MARKUP[item.id];
      } else {
        socialLink.textContent = item.label;
      }
      socialGroup.appendChild(socialLink);
    });

    socialCol.appendChild(socialHeading);
    socialCol.appendChild(socialGroup);
    grid.appendChild(socialCol);

    // 4. Bottom bar
    const bottomBar = document.createElement('div');
    bottomBar.className = 'q-footer-bottom';

    const copyright = document.createElement('span');
    copyright.className = 'q-footer-copyright';
    copyright.textContent = this.viewModel.bottomBar.copyright;

    const motto = document.createElement('span');
    motto.className = 'q-footer-motto';
    motto.textContent = this.viewModel.bottomBar.motto;

    bottomBar.appendChild(copyright);
    bottomBar.appendChild(motto);

    container.appendChild(grid);
    container.appendChild(bottomBar);
    footer.appendChild(container);

    this.element = footer;

    this._unsubscribe = this.viewModel.subscribe(() => {
      // Re-render if full model changes
      if (this.element && this.element.parentNode) {
        const parent = this.element.parentNode;
        const next = this.element.nextSibling;
        this.destroy();
        const newEl = this.render();
        parent.insertBefore(newEl, next);
      }
    });

    return this.element;
  }

  /**
   * Mounts the footer into a container.
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Cleans up event listeners and subscriptions.
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
  }
}
