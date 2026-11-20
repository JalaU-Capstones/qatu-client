import { ProductsApi } from '../../models/api/ProductsApi.js';
import { formatPrice } from '../../utils/formatCurrency.js';
import { getProductImageUrl } from '../../utils/productImageUrl.js';

const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

function getProductTimestamp(product) {
  return ['published_at', 'created_at', 'updated_at']
    .map((field) => Date.parse(product?.[field] || ''))
    .filter(Number.isFinite)
    .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
}

/**
 * Selects affordable published products for the hero, preferring recent
 * listings and products with usable imagery.
 * @param {Array<Object>} products
 * @param {number} [now=Date.now()]
 * @returns {Array<Object>}
 */
export function selectHeroProducts(products, now = Date.now()) {
  const affordable = (Array.isArray(products) ? products : [])
    .map((product, index) => ({
      product,
      index,
      timestamp: getProductTimestamp(product),
      imageUrl: getProductImageUrl(product),
    }))
    .filter(({ product }) => {
      if (product?.state && product.state !== 'published') return false;
      if (product?.price === null || product?.price === undefined) return false;
      if (typeof product.price === 'string' && product.price.trim() === '') return false;
      const price = Number(product.price);
      return Number.isFinite(price) && price <= 50;
    })
    .filter(({ product }) => typeof product?.slug === 'string' && product.slug.trim() !== '')
    .sort(
      (left, right) =>
        Number(Boolean(right.imageUrl)) - Number(Boolean(left.imageUrl)) ||
        right.timestamp - left.timestamp ||
        left.index - right.index
    );

  const recent = affordable.filter(
    ({ timestamp }) => timestamp >= now - FIFTEEN_DAYS && timestamp <= now
  );
  const selected = [...recent];
  for (const candidate of affordable) {
    if (selected.length >= 3) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.slice(0, 3).map(({ product, imageUrl }) => ({
    src: imageUrl,
    slug: product.slug,
    label: product.name || product.title || 'Producto local',
    price: formatPrice(product.price, product.currency),
  }));
}

export class HeroViewModel {
  constructor(options = {}) {
    this.eyebrow = options.eyebrow || 'Inspirado en nuestras ferias';
    this.titleMain = options.titleMain || 'Lo mejor de Latinoamérica,';
    this.titleAccent = options.titleAccent || 'en un solo lugar.';
    this.subtitle =
      options.subtitle ||
      'Descubre productos únicos de productores, artesanos y negocios locales de toda la región. Compra con propósito y apoya a quienes mantienen vivas sus tradiciones.';
    this.searchPlaceholder = options.searchPlaceholder || '¿Qué estás buscando hoy?';
    this.searchButtonLabel = options.searchButtonLabel || 'Buscar';
    this.quickLinksLabel = options.quickLinksLabel || 'Explora:';
    this.quickLinks = options.quickLinks || [
      { id: 'artesanias', label: 'Artesanías', href: '/categorias/artesanias' },
      { id: 'cafe', label: 'Café', href: '/categorias/cafe' },
      { id: 'textiles', label: 'Textiles', href: '/categorias/textiles' },
      { id: 'cacao', label: 'Cacao', href: '/categorias/cacao' },
      { id: 'tecnologia', label: 'Tecnología', href: '/categorias/tecnologia' },
    ];
    this.productsApi = options.productsApi || new ProductsApi();
    this.visualImages = Array.isArray(options.visualImages) ? options.visualImages : [];
    this.visualBadgeLabel = options.visualBadgeLabel || '100%';
    this.visualBadgeSublabel = options.visualBadgeSublabel || 'LOCAL';
    this.floatingCardLabel = options.floatingCardLabel || 'Hecho en Latinoamérica';
    this.floatingCardSublabel = options.floatingCardSublabel || 'por productores locales';
    this.floatingCardCtaLabel = options.floatingCardCtaLabel || 'Ver más sobre';
    this.floatingCardHref = options.floatingCardHref || '/about';
    this.searchValue = '';
    this.onSearch = options.onSearch || null;
    this._listeners = new Set();
  }

  async loadVisualProducts() {
    try {
      const response = await this.productsApi.getProducts({ page: 1, limit: 100, maxPrice: 50 });
      this.visualImages = selectHeroProducts(response?.data, Date.now());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[HeroViewModel] failed to load hero products:', error?.message || error);
      this.visualImages = [];
    }
    this._notify();
  }

  setSearchValue(value) {
    if (this.searchValue !== value) {
      this.searchValue = value;
      this._notify();
    }
  }

  triggerSearch() {
    if (typeof this.onSearch === 'function') {
      this.onSearch(this.searchValue);
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
