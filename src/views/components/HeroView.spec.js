import { Router } from '../../router/Router.js';
import { HeroViewModel } from '../../viewmodels/components/HeroViewModel.js';
import { HeroView } from './HeroView.js';

describe('HeroView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new HeroViewModel();
    view = new HeroView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a section element with class q-hero and aria-labelledby', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-hero')).toBe(true);
    expect(el.getAttribute('aria-labelledby')).toBe('q-hero-title');
  });

  it('should render the expected eyebrow, title, and subtitle', () => {
    const el = view.render();
    const eyebrow = el.querySelector('.q-hero__eyebrow');
    const title = el.querySelector('#q-hero-title');
    const subtitle = el.querySelector('.q-hero__subtitle');

    expect(eyebrow).not.toBeNull();
    expect(eyebrow.textContent).toBe('INSPIRADO EN NUESTRAS FERIAS');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Lo mejor de Latinoamérica, en un solo lugar.');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toContain('Descubre productos únicos');
  });

  it('renders the hero H1 with the .q-hero__title class', () => {
    const el = view.render();
    const title = el.querySelector('h1');

    expect(title).not.toBeNull();
    expect(title.classList.contains('q-hero__title')).toBe(true);
  });

  it('should render title as two spans: .q-hero__title-main and .q-hero__title-accent', () => {
    const el = view.render();
    const title = el.querySelector('#q-hero-title');
    const titleMain = title.querySelector('.q-hero__title-main');
    const titleAccent = title.querySelector('.q-hero__title-accent');

    expect(titleMain).not.toBeNull();
    expect(titleAccent).not.toBeNull();
    expect(titleMain.textContent).toBe('Lo mejor de Latinoamérica,');
  });

  it('should render .q-hero__title-accent textContent with leading space', () => {
    const el = view.render();
    const titleAccent = el.querySelector('.q-hero__title-accent');
    expect(titleAccent.textContent).toBe(' en un solo lugar.');
  });

  it('should render the search input with correct placeholder and button', () => {
    const el = view.render();
    const input = el.querySelector('.q-hero__search-input');
    const button = el.querySelector('.q-hero__search-button');

    expect(input).not.toBeNull();
    expect(input.getAttribute('placeholder')).toBe('¿Qué estás buscando hoy?');
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Buscar');
  });

  it('should call onSearch with the current input value when search form is submitted', () => {
    const onSearchSpy = jasmine.createSpy('onSearch');
    const customVM = new HeroViewModel({ onSearch: onSearchSpy });
    const customView = new HeroView(customVM);
    const el = customView.render();

    const input = el.querySelector('.q-hero__search-input');
    const form = el.querySelector('.q-hero__search');

    input.value = 'sombreros';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(customVM.searchValue).toBe('sombreros');

    const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(onSearchSpy).toHaveBeenCalledWith('sombreros');

    customView.destroy();
  });

  it('should render exactly 5 quick links in the expected order', () => {
    const el = view.render();
    const links = el.querySelectorAll('.q-hero__quick-link');

    expect(links.length).toBe(5);
    const expectedLabels = ['Artesanías', 'Café', 'Textiles', 'Cacao', 'Tecnología'];
    links.forEach((link, idx) => {
      expect(link.textContent).toBe(expectedLabels[idx]);
    });
  });

  it('should prevent default navigation on quick link click', () => {
    const el = view.render();
    const link = el.querySelector('.q-hero__quick-link');
    const clickEvent = new MouseEvent('click', {
      cancelable: true,
      bubbles: true,
    });

    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('should render the floating card with label and CTA', () => {
    const el = view.render();
    const floatingCard = el.querySelector('.q-hero__floating-card');
    const label = el.querySelector('.q-hero__floating-card-label');
    const cta = el.querySelector('.q-hero__floating-card-cta');

    expect(floatingCard).not.toBeNull();
    expect(label).not.toBeNull();
    expect(label.textContent).toBe('Hecho en Latinoamérica');
    expect(cta).not.toBeNull();
    expect(el.querySelector('.q-hero__floating-card-sublabel').textContent).toBe(
      'por productores locales'
    );
    expect(cta.textContent).toBe('→');
    expect(cta.getAttribute('aria-label')).toBe('Ver más sobre');
    expect(floatingCard.getAttribute('href')).toBe('/about');
    expect(floatingCard.hasAttribute('data-route')).toBe(true);
  });

  it('renders three clean placeholder cards until API products are available', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-hero__collage-card');

    expect(cards.length).toBe(3);
    cards.forEach((card) => {
      expect(card.tagName.toLowerCase()).toBe('article');
      expect(card.querySelector('img').src).toContain('product-placeholder.svg');
    });
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-hero')).not.toBeNull();
  });

  it('should remove the element from DOM on destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-hero')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-hero')).toBeNull();
    expect(view.element).toBeNull();
  });

  it('should update input value when viewModel.setSearchValue is called', () => {
    const el = view.render();
    const input = el.querySelector('.q-hero__search-input');

    viewModel.setSearchValue('artesanías');
    expect(input.value).toBe('artesanías');
  });

  it('renders the product placeholder when a collage image fails to load', () => {
    const customVM = new HeroViewModel({
      visualImages: [
        {
          src: 'https://invalid.example/broken.jpg',
          slug: 'broken-product',
          label: 'Producto',
          price: 'US$ 10.00',
        },
      ],
    });
    const customView = new HeroView(customVM);
    const el = customView.render();
    const img = el.querySelector('.q-hero__collage-card--coffee .q-hero__visual-img');
    expect(img).not.toBeNull();

    img.dispatchEvent(new Event('error'));

    const fallback = el.querySelector('.q-hero__collage-card--coffee img');
    expect(fallback.src).toContain('product-placeholder.svg');
    customView.destroy();
  });

  it('navigates hero product cards to their product detail and the floating card to /about', () => {
    const originalPath = window.location.pathname;
    viewModel.visualImages = [
      {
        src: 'https://cdn.example/poncho.jpg',
        slug: 'poncho-andino',
        label: 'Poncho andino',
        price: 'US$ 35.00',
      },
    ];
    const router = new Router();
    const detailRoute = jasmine.createSpy('detailRoute');
    const aboutRoute = jasmine.createSpy('aboutRoute');
    router.addRoute('/products/:slug', detailRoute);
    router.addRoute('/about', aboutRoute);
    router.start();
    const el = view.mount(container);

    el.querySelector('.q-hero__collage-card--coffee').click();
    expect(detailRoute).toHaveBeenCalledWith('/products/poncho-andino', { slug: 'poncho-andino' });

    el.querySelector('.q-hero__floating-card').click();
    expect(aboutRoute).toHaveBeenCalledWith('/about', {});

    router.destroy();
    window.history.replaceState({}, '', originalPath);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const NO_BACKEND = { getProducts: () => Promise.resolve({ data: [], meta: {} }) };

    describe('HeroView additional branches (recovered 1)', () => {
      let container;
      let viewModel;
      let view;
      let views;

      const makeVM = (options = {}) => new HeroViewModel({ productsApi: NO_BACKEND, ...options });

      const makeView = (vm) => {
        const created = new HeroView(vm);
        views.push(created);
        return created;
      };

      const product = (overrides = {}) => ({
        src: 'https://cdn.example/poncho.jpg',
        slug: 'poncho-andino',
        label: 'Poncho andino',
        price: 'US$ 35.00',
        ...overrides,
      });

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        views = [];
        viewModel = makeVM();
        view = makeView(viewModel);
      });

      afterEach(() => {
        views.forEach((created) => created.destroy());
        views = [];
        view = null;
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('prefills the search input when setSearchValue is called before render', () => {
        viewModel.setSearchValue('cafe');
        const input = view.render().querySelector('.q-hero__search-input');

        expect(input.value).toBe('cafe');
      });

      it('renders one separator between each of the five default quick links', () => {
        const el = view.render();
        const links = el.querySelectorAll('.q-hero__quick-link');
        const separators = el.querySelectorAll('.q-hero__quick-link-sep');

        expect(links.length).toBe(5);
        expect(separators.length).toBe(4);
        separators.forEach((sep) => {
          expect(sep.textContent).toBe('·');
          expect(sep.getAttribute('aria-hidden')).toBe('true');
        });
        expect(el.querySelector('.q-hero__quick-links').firstElementChild.className).toBe(
          'q-hero__quick-links-label'
        );
      });

      it('renders the label without links or separators when quickLinks is empty', () => {
        const localView = makeView(makeVM({ quickLinks: [] }));
        const el = localView.render();

        expect(el.querySelector('.q-hero__quick-links-label')).not.toBeNull();
        expect(el.querySelectorAll('.q-hero__quick-link').length).toBe(0);
        expect(el.querySelectorAll('.q-hero__quick-link-sep').length).toBe(0);
      });

      it('uses each quickLink href verbatim', () => {
        const localView = makeView(
          makeVM({ quickLinks: [{ label: 'Café', href: '/categorias/cafe' }] })
        );
        const link = localView.render().querySelector('.q-hero__quick-link');

        expect(link.getAttribute('href')).toBe('/categorias/cafe');
        expect(view.render().querySelector('.q-hero__quick-link').getAttribute('href')).toBe(
          '/categorias/artesanias'
        );
      });

      it('pads a single image with two placeholder articles using the exact copy', () => {
        const localView = makeView(makeVM({ visualImages: [product()] }));
        const cards = localView.render().querySelectorAll('.q-hero__collage-card');

        expect(cards.length).toBe(3);
        expect(cards[0].tagName.toLowerCase()).toBe('a');
        expect(cards[1].tagName.toLowerCase()).toBe('article');
        expect(cards[2].tagName.toLowerCase()).toBe('article');
        expect(cards[1].querySelector('.q-hero__collage-caption').textContent).toBe(
          'Producto local · Descubre piezas únicas'
        );
        expect(cards[2].querySelector('.q-hero__collage-caption').textContent).toBe(
          'Producto local · Descubre piezas únicas'
        );
        expect(cards[1].querySelector('img').alt).toBe('');
      });

      it('renders only the first three of more than three visual images', () => {
        const visualImages = ['one', 'two', 'three', 'four', 'five'].map((slug) =>
          product({ slug, label: slug })
        );
        const localView = makeView(makeVM({ visualImages }));
        const cards = localView.render().querySelectorAll('.q-hero__collage-card');

        expect(cards.length).toBe(3);
        expect(
          Array.from(cards).map(
            (card) => card.querySelector('.q-hero__collage-caption').textContent
          )
        ).toEqual(['one · US$ 35.00', 'two · US$ 35.00', 'three · US$ 35.00']);
        expect(cards[0].className).toContain('q-hero__collage-card--coffee');
        expect(cards[1].className).toContain('q-hero__collage-card--bag');
        expect(cards[2].className).toContain('q-hero__collage-card--pottery');
        expect(localView.element.innerHTML).not.toContain('>four ·');
      });

      it('renders a valid image with its exact src, alt and class plus the caption', () => {
        const localView = makeView(makeVM({ visualImages: [product()] }));
        const card = localView.render().querySelector('.q-hero__collage-card--coffee');
        const img = card.querySelector('img');

        expect(img.getAttribute('src')).toBe('https://cdn.example/poncho.jpg');
        expect(img.getAttribute('alt')).toBe('Poncho andino');
        expect(img.className).toBe('q-hero__visual-img');
        expect(card.querySelector('.q-hero__collage-caption').textContent).toBe(
          'Poncho andino · US$ 35.00'
        );
      });

      it('keeps the visual-img class and uses the label as alt for a missing src', () => {
        const localView = makeView(
          makeVM({
            visualImages: [
              product({ src: null, slug: 'sin-imagen', label: 'Sin imagen', price: 'US$ 1.00' }),
            ],
          })
        );
        const card = localView.render().querySelector('.q-hero__collage-card--coffee');
        const img = card.querySelector('img');

        expect(img.className).toBe('q-hero__visual-img');
        expect(img.alt).toBe('Sin imagen');
        expect(img.getAttribute('src')).toContain('product-placeholder.svg');
      });

      it('retains the q-hero__visual-img class on the error fallback', () => {
        const localView = makeView(
          makeVM({ visualImages: [product({ src: 'https://invalid.example/broken.jpg' })] })
        );
        const el = localView.render();
        const img = el.querySelector('.q-hero__collage-card--coffee .q-hero__visual-img');

        img.dispatchEvent(new Event('error'));

        const fallback = el.querySelector('.q-hero__collage-card--coffee img.q-hero__visual-img');
        expect(fallback).not.toBeNull();
        expect(fallback.getAttribute('src')).toContain('product-placeholder.svg');
      });

      it('encodes an accented slug in href and builds the aria-label from label and price', () => {
        const localView = makeView(
          makeVM({
            visualImages: [
              product({
                slug: 'café con leche',
                label: 'Café con leche',
                price: 'US$ 5.00',
              }),
            ],
          })
        );
        const card = localView.render().querySelector('.q-hero__collage-card--coffee');

        expect(card.tagName.toLowerCase()).toBe('a');
        expect(card.getAttribute('href')).toBe('/products/caf%C3%A9%20con%20leche');
        expect(card.getAttribute('aria-label')).toBe('Café con leche · US$ 5.00');
        expect(card.hasAttribute('data-route')).toBe(true);
      });

      it('never uses the extra position because the collage always has exactly three items', () => {
        const localView = makeView(makeVM({ visualImages: [product()] }));
        const cards = localView.render().querySelectorAll('.q-hero__collage-card');

        expect(Array.from(cards).map((card) => card.className)).toEqual([
          'q-hero__collage-card q-hero__collage-card--coffee',
          'q-hero__collage-card q-hero__collage-card--bag',
          'q-hero__collage-card q-hero__collage-card--pottery',
        ]);
        expect(localView.render().querySelector('[class*="--extra"]')).toBeNull();
      });

      it('re-renders the collage for a new visualImages array but not for in-place mutation', () => {
        const vm = makeVM({ visualImages: [product()] });
        const localView = makeView(vm);
        vm.setSearchValue('inicial');
        const el = localView.render();
        expect(el.querySelector('.q-hero__collage-caption').textContent).toBe(
          'Poncho andino · US$ 35.00'
        );

        const nextImages = [
          product({
            slug: 'nuevo',
            label: 'Nuevo',
            price: 'US$ 2.00',
            src: 'https://cdn.example/new.jpg',
          }),
        ];
        vm.visualImages = nextImages;
        vm.setSearchValue('otra');

        expect(localView._renderedVisualImages).toBe(nextImages);
        const rerenderedCard = el.querySelector('.q-hero__collage-card--coffee');
        expect(rerenderedCard.querySelector('.q-hero__collage-caption').textContent).toBe(
          'Nuevo · US$ 2.00'
        );

        vm.visualImages.push(product({ slug: 'ignorado', label: 'Ignorado' }));
        vm.setSearchValue('tercera');

        expect(localView._renderedVisualImages).toBe(nextImages);
        expect(el.querySelector('.q-hero__collage-card--coffee')).toBe(rerenderedCard);
        expect(el.querySelectorAll('.q-hero__collage-card').length).toBe(3);
      });

      it('caches the rendered element across repeated render calls', () => {
        const el = view.render();

        expect(view.render()).toBe(el);
        viewModel.setSearchValue('cambio');
        expect(view.render()).toBe(el);
      });

      it('unsubscribes and nulls every cached ref on destroy, including a second destroy', () => {
        view.render();
        const realUnsubscribe = view._unsubscribe;
        const unsubscribe = jasmine.createSpy('unsubscribe').and.callFake(realUnsubscribe);
        view._unsubscribe = unsubscribe;

        view.destroy();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(view.element).toBeNull();
        expect(view._searchInput).toBeNull();
        expect(view._collage).toBeNull();
        expect(view._renderedVisualImages).toBeNull();
        expect(() => view.destroy()).not.toThrow();
        expect(() => viewModel.setSearchValue('despues')).not.toThrow();
      });
    });
  })();
})();
