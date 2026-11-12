export class HeroViewModel {
  constructor(options = {}) {
    this.eyebrow = options.eyebrow || 'Inspirado en nuestra tierra';
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
    this.visualImageUrl = options.visualImageUrl || 'https://picsum.photos/seed/qatu-hero/900/700';
    this.visualBadgeLabel = options.visualBadgeLabel || '100%';
    this.visualBadgeSublabel = options.visualBadgeSublabel || 'único';
    this.floatingCardLabel = options.floatingCardLabel || 'Hecho en Latinoamérica';
    this.floatingCardCtaLabel = options.floatingCardCtaLabel || 'Ver más sobre';
    this.floatingCardHref = options.floatingCardHref || '/nosotros';
    this.searchValue = '';
    this.onSearch = options.onSearch || null;
    this._listeners = new Set();
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
