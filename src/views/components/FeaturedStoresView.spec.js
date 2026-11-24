import { FeaturedStoresViewModel } from '../../viewmodels/components/FeaturedStoresViewModel.js';
import { FeaturedStoresView } from './FeaturedStoresView.js';

describe('FeaturedStoresView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FeaturedStoresViewModel();
    view = new FeaturedStoresView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a section element with class q-featured-stores and .q-section-container', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-featured-stores')).toBe(true);
    expect(el.getAttribute('aria-labelledby')).toBe('q-featured-stores-title');
    expect(el.querySelector('.q-section-container')).not.toBeNull();
  });

  it('should contain header with title and see-all link', () => {
    const el = view.render();
    const title = el.querySelector('#q-featured-stores-title');
    const seeAll = el.querySelector('.q-featured-stores__see-all');

    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Tiendas destacadas');
    expect(seeAll).not.toBeNull();
    expect(seeAll.textContent).toContain('Ver todas');
    expect(seeAll.getAttribute('href')).toBe('/tiendas');
  });

  it('render() does NOT include a .q-featured-stores__subtitle element when subtitle is empty', () => {
    const el = view.render();
    const subtitle = el.querySelector('.q-featured-stores__subtitle');
    expect(subtitle).toBeNull();
  });

  it('eyebrow renders above title in DOM order', () => {
    const el = view.render();
    const eyebrow = el.querySelector('.q-featured-stores__eyebrow');
    const title = el.querySelector('#q-featured-stores-title');

    expect(eyebrow).not.toBeNull();
    expect(eyebrow.textContent).toBe('Conoce a quienes crean');
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should render exactly 3 store cards by default', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    expect(cards.length).toBe(3);
  });

  it('store cards render a pattern header when no image is available', () => {
    viewModel.setStores([
      {
        id: 'sin-imagen',
        name: 'Tienda sin imagen',
        category: 'Artesanías',
        rating: 5,
        reviewCount: 1,
        href: '/tiendas/sin-imagen',
      },
    ]);

    const el = view.render();
    expect(el.querySelector('.q-store-card__header')).not.toBeNull();
  });

  it('should render each store card with initials avatar, name, category, rating with star svg, and CTA button', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    const firstCard = cards[0];

    const avatar = firstCard.querySelector('.q-store-card__avatar');
    const initials = firstCard.querySelector('.q-store-card__initials');
    const name = firstCard.querySelector('.q-store-card__name');
    const category = firstCard.querySelector('.q-store-card__category');
    const rating = firstCard.querySelector('.q-store-card__rating');
    const star = firstCard.querySelector('.q-store-card__star');
    const cta = firstCard.querySelector('.q-store-card__cta');

    expect(avatar).not.toBeNull();
    expect(avatar.querySelector('img')).toBeNull();
    expect(initials).not.toBeNull();
    expect(initials.textContent).toBe('TI');
    expect(name).not.toBeNull();
    expect(name.textContent).toBe('Tejidos Illimani');
    expect(category).not.toBeNull();
    expect(category.textContent).toBe('Textiles artesanales');
    expect(rating).not.toBeNull();
    expect(star.querySelector('svg')).not.toBeNull();
    expect(rating.textContent).toContain('4.8 · 132 ventas');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toBe('Ver tienda');
    expect(cta.getAttribute('href')).toBe('/tiendas/tejidos-illimani');
  });

  it('card root has modifier q-store-card--{accent}', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    expect(cards[0].classList.contains('q-store-card--pink')).toBe(true);
    expect(cards[1].classList.contains('q-store-card--blue')).toBe(true);
    expect(cards[2].classList.contains('q-store-card--purple')).toBe(true);
  });

  it('avatar contains initials text, not an img', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    cards.forEach((card) => {
      const avatar = card.querySelector('.q-store-card__avatar');
      expect(avatar.querySelector('img')).toBeNull();
      const initials = avatar.querySelector('.q-store-card__initials');
      expect(initials).not.toBeNull();
      expect(initials.textContent.length).toBeGreaterThan(0);
      expect(initials.textContent.length).toBeLessThanOrEqual(2);
    });
  });

  it('should prevent default navigation on CTA click', () => {
    const el = view.render();
    const cta = el.querySelector('.q-store-card__cta');
    const clickEvent = new MouseEvent('click', { cancelable: true, bubbles: true });

    cta.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-featured-stores')).not.toBeNull();
  });

  it('should remove the element from DOM on destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-featured-stores')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-featured-stores')).toBeNull();
    expect(view.element).toBeNull();
  });

  it('should re-render only the grid when viewModel.setStores is called', () => {
    const el = view.mount(container);
    const headerBefore = el.querySelector('.q-featured-stores__header');

    viewModel.setStores([
      {
        id: 'nueva',
        name: 'Tienda Test',
        category: 'Categoría Test',
        rating: 5.0,
        reviewCount: 1,
        href: '/tiendas/test',
      },
    ]);

    const cards = el.querySelectorAll('.q-store-card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.q-store-card__name').textContent).toBe('Tienda Test');
    expect(cards[0].querySelector('.q-store-card__category').textContent).toBe('Categoría Test');

    const headerAfter = el.querySelector('.q-featured-stores__header');
    expect(headerAfter).toBe(headerBefore);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('FeaturedStoresView additional branches (recovered 1)', () => {
      const makeStore = (overrides = {}) => ({
        id: 's1',
        name: 'Tienda Uno',
        category: 'Categoría',
        rating: 4,
        reviewCount: 2,
        href: '/tiendas/uno',
        ...overrides,
      });

      let view;
      let viewModel;
      let container;
      let extraViews;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = new FeaturedStoresViewModel();
        view = new FeaturedStoresView(viewModel);
        extraViews = [];
      });

      afterEach(() => {
        view?.destroy();
        extraViews.forEach((extraView) => extraView.destroy());
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('renders the subtitle branch and omits it by default', () => {
        viewModel = new FeaturedStoresViewModel({ subtitle: 'Subtítulo de tiendas' });
        view = new FeaturedStoresView(viewModel);

        expect(view.render().querySelector('.q-featured-stores__subtitle').textContent).toBe(
          'Subtítulo de tiendas'
        );

        const plainView = new FeaturedStoresView(new FeaturedStoresViewModel());
        extraViews.push(plainView);
        expect(plainView.render().querySelector('.q-featured-stores__subtitle')).toBeNull();
      });

      it('uses custom see-all copy and prevents its default click', () => {
        viewModel = new FeaturedStoresViewModel({ seeAllLabel: 'Todas', seeAllHref: '/todas' });
        view = new FeaturedStoresView(viewModel);
        const seeAll = view.render().querySelector('.q-featured-stores__see-all');

        expect(seeAll.getAttribute('href')).toBe('/todas');
        expect(seeAll.textContent).toBe('Todas →');

        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        seeAll.dispatchEvent(clickEvent);
        expect(clickEvent.defaultPrevented).toBe(true);
      });

      it('honors a custom accent and assigns default accents by store index', () => {
        // The ViewModel cycles pink/blue/purple by list index even for a store with a custom accent,
        // so the custom green store still advances the cycle for the stores that follow it.
        viewModel = new FeaturedStoresViewModel({
          stores: [
            makeStore({ id: 'green', name: 'Verde', accent: 'green' }),
            makeStore({ id: 'a', name: 'A' }),
            makeStore({ id: 'b', name: 'B' }),
            makeStore({ id: 'c', name: 'C' }),
            makeStore({ id: 'd', name: 'D' }),
          ],
        });
        view = new FeaturedStoresView(viewModel);
        const cards = view.render().querySelectorAll('.q-store-card');

        expect(cards[0].classList.contains('q-store-card--green')).toBe(true);
        expect(cards[1].classList.contains('q-store-card--blue')).toBe(true);
        expect(cards[2].classList.contains('q-store-card--purple')).toBe(true);
        expect(cards[3].classList.contains('q-store-card--pink')).toBe(true);
        expect(cards[4].classList.contains('q-store-card--blue')).toBe(true);
      });

      it('uses ? initials for a nameless store and leaves its name element empty', () => {
        viewModel = new FeaturedStoresViewModel({
          stores: [makeStore({ name: undefined, initials: undefined })],
        });
        view = new FeaturedStoresView(viewModel);
        const card = view.render().querySelector('.q-store-card');

        expect(card.querySelector('.q-store-card__initials').textContent).toBe('?');
        expect(card.querySelector('.q-store-card__name').textContent).toBe('');
      });

      it('prefers salesCount, keeps zero and falls back to reviewCount or undefined', () => {
        const ratingTextFor = (store) => {
          const extraView = new FeaturedStoresView(
            new FeaturedStoresViewModel({ stores: [store] })
          );
          extraViews.push(extraView);
          return extraView.render().querySelector('.q-store-card__rating > span:last-child')
            .textContent;
        };

        expect(ratingTextFor(makeStore({ salesCount: 7, reviewCount: 2 }))).toBe(' 4 · 7 ventas');
        expect(ratingTextFor(makeStore({ salesCount: 0, reviewCount: 2 }))).toBe(' 4 · 0 ventas');
        expect(ratingTextFor(makeStore({ salesCount: undefined, reviewCount: 3 }))).toBe(
          ' 4 · 3 ventas'
        );
        expect(ratingTextFor(makeStore({ salesCount: undefined, reviewCount: undefined }))).toBe(
          ' 4 · undefined ventas'
        );
      });

      it('renders the exact star path and a route-marked CTA', () => {
        view = new FeaturedStoresView(new FeaturedStoresViewModel({ stores: [makeStore()] }));
        const el = view.render();

        expect(el.querySelector('.q-store-card__star svg path').getAttribute('d')).toBe(
          'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
        );

        const cta = el.querySelector('.q-store-card__cta');
        expect(cta.getAttribute('href')).toBe('/tiendas/uno');
        expect(cta.getAttribute('data-route')).toBe('');
        expect(cta.textContent).toBe('Ver tienda');
      });

      it('caches the rendered element and subscribes only once across render and mount', () => {
        const subscribeSpy = spyOn(viewModel, 'subscribe').and.callThrough();

        const first = view.render();

        expect(view.render()).toBe(first);
        expect(view.mount(container)).toBe(first);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        expect(viewModel._listeners.size).toBe(1);
      });

      it('unsubscribes, clears the grid reference and survives double destroy', () => {
        const unsubscribe = jasmine.createSpy('unsubscribe');
        spyOn(viewModel, 'subscribe').and.returnValue(unsubscribe);

        const el = view.mount(container);
        expect(view._gridElement).not.toBeNull();
        expect(unsubscribe).not.toHaveBeenCalled();

        view.destroy();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(view.element).toBeNull();
        expect(view._gridElement).toBeNull();
        expect(container.contains(el)).toBe(false);
        expect(() => view.destroy()).not.toThrow();
        expect(() => view._update()).not.toThrow();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
