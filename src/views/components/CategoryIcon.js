import './category-icon.css';

import categoryMap from '../../assets/icons/categories.json';
import categoryPlaceholderUrl from '../../assets/icons/category-placeholder.svg';

const ICON_CONTENT = {
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  shirt: '<path d="m16 4 4 3-2 4-3-2v11H9V9l-3 2-2-4 4-3a6 6 0 0 0 8 0Z"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  dumbbell: '<path d="m6.5 6.5 11 11m-14-7 4-4m9 13 4-4M3 9l2-2m14 14 2-2M2 12l4-4m12 12 4-4"/>',
  'book-open':
    '<path d="M12 7v14m0-14C9 4 5 4 2 5v14c3-1 7-1 10 2m0-14c3-3 7-3 10-2v14c-3-1-7-1-10 2"/>',
  armchair:
    '<path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M4 10a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2M5 18v3m14-3v3"/>',
  utensils: '<path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3m-3 7v11m10-18v18m0-18a4 4 0 0 1 4 4v4h-4"/>',
  'gamepad-2':
    '<path d="M6 9h12a4 4 0 0 1 3.8 5l-1 4a2 2 0 0 1-3.3 1l-2.2-2H8.7l-2.2 2a2 2 0 0 1-3.3-1l-1-4A4 4 0 0 1 6 9Z"/><path d="M8 12v4m-2-2h4m6-1h.01M18 15h.01"/>',
  sparkles:
    '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"/>',
  wrench:
    '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3 3.7-3.7Z"/>',
  'paw-print':
    '<circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="4" cy="14" r="2"/><circle cx="20" cy="14" r="2"/><path d="M7 19c0-2.5 2.2-5 5-5s5 2.5 5 5c0 2-2 2-5 1s-5 1-5-1Z"/>',
  apple:
    '<path d="M12 7c-2-3-5-2-5-2m5 2c2-3 5-2 5-2M12 7c-6-4-10 1-8 7 1 4 4 7 8 6 4 1 7-2 8-6 2-6-2-11-8-7Z"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3 1.8 1.8 0 0 1 1.4-3h1.6A3.5 3.5 0 0 0 21 11.2C20.6 6.6 16.7 3 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="15.5" cy="8" r=".8"/>',
  music:
    '<path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Zm12-2a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z"/>',
  laptop: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20l-2-4H4l-2 4Z"/>',
  footprints:
    '<path d="M8 3c-2 0-3 3-2 6s3 4 4 2 0-8-2-8Zm8 6c-2 0-3 3-2 6s3 4 4 2 0-8-2-8ZM5 14c-2 1-3 4-2 6s4 1 6-1m10-1c2 1 3 3 2 5s-4 1-6-1"/>',
  gem: '<path d="m6 3-4 6 10 12L22 9l-4-6H6Zm-4 6h20M6 3l2 6 4 12 4-12 2-6"/>',
  'heart-pulse':
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3 12h5l2-3 3 6 2-3h6"/>',
  baby: '<circle cx="12" cy="9" r="6"/><path d="M9 9h.01M15 9h.01M9 13a4 4 0 0 0 6 0m-9 9a6 6 0 0 1 12 0"/>',
  'flower-2':
    '<path d="M12 12c-3-3-3-7 0-9 3 2 3 6 0 9Zm0 0c3-3 7-3 9 0-2 3-6 3-9 0Zm0 0c3 3 3 7 0 9-3-2-3-6 0-9Zm0 0c-3 3-7 3-9 0 2-3 6-3 9 0Zm0 0v9m-4 0h8"/>',
  coffee:
    '<path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm13 2h2a2 2 0 0 1 0 4h-2M7 3v2m4-2v2m4-2v2"/>',
  car: '<path d="m5 11 2-6h10l2 6m-15 0h16l2 4v4h-3v-3H5v3H2v-4l2-4Zm2 0h10"/><circle cx="6" cy="15" r="1"/><circle cx="18" cy="15" r="1"/>',
  watch:
    '<path d="M8 3h8l1 5H7l1-5Zm-1 13h10l-1 5H8l-1-5Z"/><rect x="5" y="8" width="14" height="8" rx="3"/><path d="M12 10v2l2 1"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18m-11 0v2h4v-2"/>',
  camera:
    '<path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10H2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
  mountain: '<path d="m3 20 7-13 4 7 2-3 5 9H3Z"/><path d="m8 11 2 2 2-2"/>',
  lamp: '<path d="M9 18h6m-5 3h4m-2-3V9m-7 0h14l-2-6H9L7 9Z"/>',
  'cup-soda': '<path d="M5 3h14l-2 18H7L5 3Zm1 5h12m-9 4h.01M13 4l4 4"/>',
  wine: '<path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm4 9v9m-4 0h8"/>',
  bike: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="m6 16 4-8 5 8H6m4-8h4m1 0h2"/>',
};

const ICON_ALIASES = {
  'briefcase-business': 'briefcase',
  'notebook-tabs': 'book-open',
  'gamepad-2': 'gamepad-2',
  'settings-2': 'wrench',
  'spray-can': 'sparkles',
  refrigerator: 'home',
  paintbrush: 'palette',
  guitar: 'music',
  hammer: 'wrench',
  tent: 'home',
  heart: 'heart-pulse',
};

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
  constructor({ name, key = '', size = 24, className = '' } = {}) {
    this.name = String(name || '');
    this.key = String(key || '');
    this.size = size;
    this.className = className;
  }

  render() {
    const nameKey = normalizeCategoryKey(this.name);
    const key = normalizeCategoryKey(this.key || this.name);
    const iconName =
      categoryMap[key] ||
      categoryMap[nameKey] ||
      Object.entries(categoryMap).find(([mapKey]) => {
        return (
          nameKey === mapKey ||
          nameKey.startsWith(`${mapKey}-`) ||
          nameKey.endsWith(`-${mapKey}`) ||
          nameKey.includes(`-${mapKey}-`)
        );
      })?.[1];
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

    const localIcon = ICON_CONTENT[iconName] || ICON_CONTENT[ICON_ALIASES[iconName]];
    if (localIcon) {
      injectSvg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${localIcon}</svg>`
      );
      wrapper.querySelector('svg').setAttribute('data-icon', iconName);
      return wrapper;
    }

    void loadPlaceholderSvg().then(injectSvg);

    return wrapper;
  }
}
