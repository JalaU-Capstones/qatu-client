import { CategoriesViewModel } from '../../viewmodels/components/CategoriesViewModel.js';
import { CategoriesView } from './CategoriesView.js';

describe('CategoriesView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new CategoriesViewModel();
    view = new CategoriesView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a section element with class q-categories and .q-section-container', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-categories')).toBe(true);
    expect(el.getAttribute('aria-labelledby')).toBe('q-categories-title');
    expect(el.querySelector('.q-section-container')).not.toBeNull();
  });

  it('should contain header with title, and see-all link; no subtitle by default', () => {
    const el = view.render();
    const title = el.querySelector('#q-categories-title');
    const subtitle = el.querySelector('.q-categories__subtitle');
    const seeAll = el.querySelector('.q-categories__see-all');

    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Explora por categoría');
    expect(subtitle).toBeNull();
    expect(seeAll).not.toBeNull();
    expect(seeAll.textContent).toContain('Ver todas');
    expect(seeAll.getAttribute('href')).toBe('/categorias');
  });

  it('should render exactly 6 category cards by default', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-category-card');
    expect(cards.length).toBe(6);
  });

  it('renders a themed SVG icon per category', () => {
    view.mount(container);

    const icons = container.querySelectorAll('.q-category-card__icon svg');
    expect(icons.length).toBe(viewModel.categories.length);
    expect(new Set(Array.from(icons, (icon) => icon.innerHTML)).size).toBeGreaterThan(1);
  });

  it('prefers iconSlug to the category slug', () => {
    viewModel.setCategories([
      {
        slug: 'textiles',
        iconSlug: 'accesorios',
        name: 'Textiles',
        productCount: 0,
        href: '/categorias/textiles',
      },
    ]);

    const svg = view.render().querySelector('.q-category-card__icon svg');
    expect(svg.querySelector('path').getAttribute('d')).toBe(
      'M5 10h14l-1.2 9.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 10z'
    );
  });

  it('uses the default icon for unknown categories', () => {
    viewModel.setCategories([
      { slug: 'unknown-slug', name: 'Unknown', productCount: 0, href: '/categorias/unknown' },
    ]);

    const el = view.render();
    const svg = el.querySelector('.q-category-card__icon svg');
    expect(svg).not.toBeNull();
    expect(svg.querySelector('path').getAttribute('d')).toBe('M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z');
  });

  it('should render each card with name, svg icon, and formatted product count', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-category-card');
    const firstCard = cards[0];

    const iconWrapper = firstCard.querySelector('.q-category-card__icon');
    const name = firstCard.querySelector('.q-category-card__name');
    const count = firstCard.querySelector('.q-category-card__count');

    expect(iconWrapper).not.toBeNull();
    const svg = iconWrapper.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(name).not.toBeNull();
    expect(name.textContent).toBe('Textiles y moda');
    expect(count).not.toBeNull();
    expect(count.textContent).toBe('248 productos');
  });

  it('should apply modifier class q-category-card--{color} matching category.style.color', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-category-card');
    cards.forEach((card, idx) => {
      const cat = viewModel.categories[idx];
      expect(card.classList.contains(`q-category-card--${cat.style.color}`)).toBe(true);
    });
  });

  it('should render eyebrow above the title in DOM order', () => {
    const el = view.render();
    const eyebrow = el.querySelector('.q-categories__eyebrow');
    const title = el.querySelector('.q-categories__title');

    expect(eyebrow).not.toBeNull();
    expect(eyebrow.textContent).toBe('Encuentra tu próximo favorito');
    expect(title).not.toBeNull();
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should prevent default navigation on card click', () => {
    const el = view.render();
    const card = el.querySelector('.q-category-card');
    const clickEvent = new MouseEvent('click', { cancelable: true, bubbles: true });

    card.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-categories')).not.toBeNull();
  });

  it('should remove the element from DOM on destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-categories')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-categories')).toBeNull();
    expect(view.element).toBeNull();
  });

  it('should re-render only the grid when viewModel.setCategories is called', () => {
    const el = view.mount(container);
    const headerBefore = el.querySelector('.q-categories__header');

    viewModel.setCategories([
      { id: 'musica', name: 'Música', productCount: 42, href: '/categorias/musica' },
      { id: 'libros', name: 'Libros', productCount: 15, href: '/categorias/libros' },
    ]);

    const cards = el.querySelectorAll('.q-category-card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.q-category-card__name').textContent).toBe('Música');
    expect(cards[0].querySelector('.q-category-card__count').textContent).toBe('42 productos');

    const headerAfter = el.querySelector('.q-categories__header');
    expect(headerAfter).toBe(headerBefore);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('CategoriesView additional branches (recovered 1)', () => {
      let container;
      let viewModel;
      let view;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = new CategoriesViewModel();
        view = new CategoriesView(viewModel);
      });

      afterEach(() => {
        view?.destroy();
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('renders .q-categories__subtitle only when the view model provides a subtitle', () => {
        expect(view.render().querySelector('.q-categories__subtitle')).toBeNull();
        view.destroy();

        const subtitleView = new CategoriesView(
          new CategoriesViewModel({ subtitle: 'Productos hechos a mano en Bolivia' })
        );
        const subtitle = subtitleView.render().querySelector('.q-categories__subtitle');
        expect(subtitle).not.toBeNull();
        expect(subtitle.textContent).toBe('Productos hechos a mano en Bolivia');
        expect(subtitle.parentElement.classList.contains('q-categories__title-group')).toBe(true);
        subtitleView.destroy();
      });

      it('prevents default navigation on the see-all link', () => {
        const seeAll = view.render().querySelector('.q-categories__see-all');
        expect(seeAll.getAttribute('href')).toBe('/categorias');
        const event = new MouseEvent('click', { cancelable: true, bubbles: true });
        seeAll.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      });

      it('derives the artesanias icon slug from the accented category name alone', () => {
        viewModel.setCategories([
          { name: 'Artesanías', productCount: 1, href: '/categorias/artesanias' },
        ]);
        const svg = view.render().querySelector('.q-category-card__icon svg');
        // The DOM serializer writes explicit closing tags even when the source uses self-closing ones.
        expect(svg.innerHTML).toBe(
          '<circle cx="12" cy="12" r="9"></circle><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"></circle><path d="M15 15a2 2 0 1 1 4 0v2a2 2 0 0 1-2 2h-1"></path>'
        );
      });

      it('falls back to the default icon for the name-derived "hogar-decoracion" slug', () => {
        viewModel.setCategories([
          { name: 'Hogar & Decoración', productCount: 1, href: '/categorias/hogar-y-decoracion' },
        ]);
        const svg = view.render().querySelector('.q-category-card__icon svg');
        expect(svg.querySelector('path').getAttribute('d')).toBe(
          'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'
        );
      });

      it('uses an explicit id slug and an empty name when the category name is missing', () => {
        viewModel.setCategories([{ id: 'hogar', productCount: 7, href: '/categorias/hogar' }]);
        const card = view.render().querySelector('.q-category-card');
        expect(card.querySelector('.q-category-card__name').textContent).toBe('');
        expect(card.querySelector('.q-category-card__icon svg path').getAttribute('d')).toBe(
          'M3 11l9-7 9 7v8a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-8z'
        );
      });

      it('maps every known slug to its exact icon markup', () => {
        const expected = {
          accesorios:
            '<path d="M5 10h14l-1.2 9.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 10z"></path><path d="M9 10V7a3 3 0 0 1 6 0v3"></path>',
          artesanias:
            '<circle cx="12" cy="12" r="9"></circle><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"></circle><path d="M15 15a2 2 0 1 1 4 0v2a2 2 0 0 1-2 2h-1"></path>',
          deportes:
            '<circle cx="12" cy="12" r="9"></circle><path d="M12 3v18M3 12h18M6 6c4 4 8 4 12 0M6 18c4-4 8-4 12 0"></path>',
          electronica:
            '<rect x="4" y="5" width="16" height="11" rx="2"></rect><path d="M2 19h20l-1.5-3h-17z"></path>',
          hogar: '<path d="M3 11l9-7 9 7v8a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-8z"></path>',
          textiles:
            '<circle cx="12" cy="12" r="9"></circle><path d="M12 3c-2.5 3-2.5 15 0 18M12 3c2.5 3 2.5 15 0 18M3.5 9c3 2 14 2 17 0M3.5 15c3-2 14-2 17 0"></path>',
        };
        viewModel.setCategories(
          Object.keys(expected).map((slug) => ({
            slug,
            name: slug,
            productCount: 1,
            href: `/${slug}`,
          }))
        );

        const svgs = view.render().querySelectorAll('.q-category-card__icon svg');
        expect(svgs.length).toBe(Object.keys(expected).length);
        Object.values(expected).forEach((markup, index) => {
          expect(svgs[index].innerHTML).toBe(markup);
          expect(svgs[index].getAttribute('width')).toBe('24');
          expect(svgs[index].getAttribute('viewBox')).toBe('0 0 24 24');
          expect(svgs[index].getAttribute('stroke-width')).toBe('1.8');
        });
      });

      it('uses the default sparkle icon for an unknown slug', () => {
        viewModel.setCategories([
          { slug: 'desconocido', name: 'Otro', productCount: 0, href: '/categorias/otro' },
        ]);
        const svg = view.render().querySelector('.q-category-card__icon svg');
        expect(svg.innerHTML).toBe('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"></path>');
      });

      it('uses the category href and the pink modifier when style.color is missing', () => {
        viewModel.categories = [
          { name: 'Sin estilo', slug: 'misterio', productCount: 3, href: '/categorias/sin-estilo' },
        ];
        const card = view.render().querySelector('.q-category-card');
        expect(card.getAttribute('href')).toBe('/categorias/sin-estilo');
        expect(card.classList.contains('q-category-card--pink')).toBe(true);
        expect(card.querySelector('.q-category-card__count').textContent).toBe('3 productos');
      });

      it('caches render, subscribes once and clears _gridElement on destroy', () => {
        const realSubscribe = CategoriesViewModel.prototype.subscribe.bind(viewModel);
        const unsubscribeSpy = jasmine.createSpy('unsubscribe');
        const subscribeSpy = spyOn(viewModel, 'subscribe').and.callFake((listener) => {
          const realUnsubscribe = realSubscribe(listener);
          return () => {
            unsubscribeSpy();
            realUnsubscribe();
          };
        });

        const first = view.render();
        expect(view.render()).toBe(first);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        view.mount(container);
        view.mount(container);
        expect(container.querySelectorAll('section.q-categories').length).toBe(1);
        expect(view._gridElement).not.toBeNull();

        viewModel.setCategories([
          { slug: 'deportes', name: 'Deportes', productCount: 1, href: '/d' },
        ]);
        expect(first.querySelectorAll('.q-category-card').length).toBe(1);

        view.destroy();
        expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
        expect(view.element).toBeNull();
        expect(view._gridElement).toBeNull();
        expect(() => view.destroy()).not.toThrow();
        expect(view._gridElement).toBeNull();
        expect(() => viewModel.setCategories([])).not.toThrow();
      });
    });
  })();
})();
