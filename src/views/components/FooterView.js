import { FooterViewModel } from '../../viewmodels/components/FooterViewModel.js';

/**
 * View component for the Footer.
 * Renders brand description, site navigation links, support links, social links, and legal notice.
 */
export class FooterView {
  /**
   * @param {FooterViewModel} [viewModel]
   */
  constructor(viewModel = new FooterViewModel()) {
    this.viewModel = viewModel;
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
        anchor.href = link.href;
        anchor.textContent = link.label;
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

    this.viewModel.social.items.forEach((item) => {
      const socialLink = document.createElement('a');
      socialLink.className = 'q-footer-social-btn';
      socialLink.href = item.href;
      socialLink.textContent = item.label;
      socialLink.setAttribute('aria-label', item.ariaLabel || item.label);
      socialLink.setAttribute('target', '_blank');
      socialLink.setAttribute('rel', 'noopener noreferrer');
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
