import './category-icon.css';

import categoryMap from '../../assets/icons/categories.json';
import categoryPlaceholderUrl from '../../assets/icons/category-placeholder.svg';

const svgCache = new Map();

export function normalizeCategoryKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadPlaceholderSvg() {
  try {
    const response = await fetch(categoryPlaceholderUrl);
    if (response.ok) return await response.text();
  } catch {
    // Return a fallback element below if the asset cannot be loaded.
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41 11 3.82V3H3v8h.82l9.59 9.59a2 2 0 0 0 2.82 0l4.36-4.36a2 2 0 0 0 0-2.82Z"/><circle cx="7" cy="7" r="1"/></svg>';
}

export class CategoryIcon {
  constructor({ name, size = 24, className = '' } = {}) {
    this.name = String(name || '');
    this.size = size;
    this.className = className;
  }

  render() {
    const key = normalizeCategoryKey(this.name);
    const iconName = categoryMap[key];
    const wrapper = document.createElement('span');
    wrapper.className =
      `q-category-icon q-category-icon--${key || 'unknown'}${this.className ? ` ${this.className}` : ''}`.trim();
    wrapper.style.width = `${this.size}px`;
    wrapper.style.height = `${this.size}px`;
    wrapper.setAttribute('role', 'img');
    wrapper.setAttribute('aria-label', this.name);

    const injectSvg = (svgText) => {
      const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const svg = parsed.documentElement;
      if (svg?.nodeName === 'svg') {
        svg.setAttribute('width', String(this.size));
        svg.setAttribute('height', String(this.size));
        svg.setAttribute('aria-hidden', 'true');
        if (svg.hasAttribute('fill') && svg.getAttribute('fill') !== 'none') {
          svg.setAttribute('fill', 'currentColor');
        }
        wrapper.replaceChildren(document.importNode(svg, true));
      }
    };

    if (!iconName) {
      void loadPlaceholderSvg().then(injectSvg);
      return wrapper;
    }

    const cached = svgCache.get(iconName);
    if (cached) {
      injectSvg(cached);
      return wrapper;
    }

    void fetch(`https://api.iconify.design/lucide/${iconName}.svg`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Icon fetch failed: ${response.status}`);
        return response.text();
      })
      .then((svgText) => {
        svgCache.set(iconName, svgText);
        injectSvg(svgText);
      })
      .catch(() => {
        void loadPlaceholderSvg().then(injectSvg);
      });

    return wrapper;
  }
}
