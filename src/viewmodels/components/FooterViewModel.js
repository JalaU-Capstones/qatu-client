/**
 * ViewModel for Footer component.
 * Manages brand info, categorical links, support links, social channels, and legal notices.
 */
export class FooterViewModel {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.brand = options.brand || {
      logoText: "Q'atu",
      logoHref: '/',
      tagline: 'El mercado de Latinoamérica. Inspirado en nuestros mercados y ferias.',
    };

    this.sections = options.sections || [
      {
        id: 'buying-selling',
        title: 'Comprar y vender',
        links: [
          { label: 'Productos', href: '/productos' },
          { label: 'Categorías', href: '/categorias' },
          { label: 'Tiendas', href: '/tiendas' },
          { label: 'Vender en Q’atu', href: '/vender' },
          { label: 'Centro de ayuda', href: '/ayuda' },
          { label: 'Comisiones', href: '/comisiones' },
        ],
      },
      {
        id: 'support',
        title: 'Ayuda',
        links: [
          { label: 'Preguntas frecuentes', href: '/faq' },
          { label: 'Envíos y devoluciones', href: '/devoluciones' },
          { label: 'Contáctanos', href: '/contacto' },
        ],
      },
    ];

    this.social = options.social || {
      title: 'Síguenos',
      items: [
        { id: 'facebook', label: 'f', href: 'https://facebook.com', ariaLabel: 'Facebook' },
        { id: 'instagram', label: 'ig', href: 'https://instagram.com', ariaLabel: 'Instagram' },
        { id: 'x', label: 'x', href: 'https://x.com', ariaLabel: 'X' },
      ],
    };

    this.bottomBar = options.bottomBar || {
      copyright: '© 2026 Q’atu',
      motto: 'El mercado de Latinoamérica, en un solo lugar.',
    };

    this._listeners = new Set();
  }

  /**
   * Subscribes to changes in ViewModel state.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notifies all listeners of state changes.
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
