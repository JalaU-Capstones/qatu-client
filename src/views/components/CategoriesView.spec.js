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
    expect(svg.dataset.icon).toBe('watch');
  });

  it('uses the placeholder for unknown categories', async () => {
    viewModel.setCategories([
      { slug: 'unknown-slug', name: 'Unknown', productCount: 0, href: '/categorias/unknown' },
    ]);

    const el = view.render();
    await Promise.resolve();
    await Promise.resolve();
    const svg = el.querySelector('.q-category-card__icon svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('should render each home card with only its icon and name', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-category-card');
    const firstCard = cards[0];

    const iconWrapper = firstCard.querySelector('.q-category-card__icon');
    const name = firstCard.querySelector('.q-category-card__name');

    expect(iconWrapper).not.toBeNull();
    const svg = iconWrapper.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(name).not.toBeNull();
    expect(name.textContent).toBe('Textiles y moda');
    expect(firstCard.querySelector('.q-category-card__count')).toBeNull();
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
    expect(cards[0].querySelector('.q-category-card__count')).toBeNull();

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
        expect(svg.dataset.icon).toBe('palette');
      });

      it('matches the icon for the name-derived "hogar-decoracion" slug', () => {
        viewModel.setCategories([
          { name: 'Hogar & Decoración', productCount: 1, href: '/categorias/hogar-y-decoracion' },
        ]);
        const svg = view.render().querySelector('.q-category-card__icon svg');
        expect(svg.dataset.icon).toBe('lamp');
      });

      it('uses an explicit id slug and an empty name when the category name is missing', () => {
        viewModel.setCategories([{ id: 'hogar', productCount: 7, href: '/categorias/hogar' }]);
        const card = view.render().querySelector('.q-category-card');
        expect(card.querySelector('.q-category-card__name').textContent).toBe('');
        expect(card.querySelector('.q-category-card__icon svg').dataset.icon).toBe('home');
      });

      it('renders distinct local SVGs for common category slugs', () => {
        const slugs = ['books', 'clothing', 'electronics', 'home-garden', 'sports'];
        viewModel.setCategories(
          slugs.map((slug) => ({
            slug,
            name: slug,
            productCount: 1,
            href: `/${slug}`,
          }))
        );

        const svgs = view.render().querySelectorAll('.q-category-card__icon svg');
        expect(svgs.length).toBe(slugs.length);
        expect(new Set(Array.from(svgs, (svg) => svg.dataset.icon)).size).toBe(slugs.length);
        Array.from(svgs).forEach((svg) => {
          expect(svg.innerHTML).not.toBe('');
          expect(svg.getAttribute('width')).toBe('24');
          expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
          expect(svg.getAttribute('stroke-width')).toBe('1.8');
        });
      });

      it('uses the local placeholder for an unknown slug', async () => {
        viewModel.setCategories([
          { slug: 'desconocido', name: 'Otro', productCount: 0, href: '/categorias/otro' },
        ]);
        view.render();
        await Promise.resolve();
        await Promise.resolve();
        const svg = view.render().querySelector('.q-category-card__icon svg');
        expect(svg).not.toBeNull();
      });

      it('uses the category href and the pink modifier when style.color is missing', () => {
        viewModel.categories = [
          { name: 'Sin estilo', slug: 'misterio', productCount: 3, href: '/categorias/sin-estilo' },
        ];
        const card = view.render().querySelector('.q-category-card');
        expect(card.getAttribute('href')).toBe('/categorias/sin-estilo');
        expect(card.classList.contains('q-category-card--pink')).toBe(true);
        expect(card.querySelector('.q-category-card__count')).toBeNull();
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
