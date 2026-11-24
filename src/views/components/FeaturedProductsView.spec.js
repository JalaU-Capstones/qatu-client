import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';
import { FeaturedProductsView } from './FeaturedProductsView.js';

const FEATURED_PRODUCTS = [
  {
    id: 'p1',
    slug: 'aguayo',
    name: 'Aguayo tradicional',
    seller_id: 'seller-1',
    price: 40,
    currency: 'USD',
    stock: 10,
    state: 'published',
    average_rating: 4.9,
    ratings_count: 24,
    primary_image_path: null,
  },
  {
    id: 'p2',
    slug: 'cafe',
    name: 'Café de especialidad',
    price: 14,
    currency: 'USD',
    stock: 0,
    state: 'published',
    average_rating: undefined,
    primary_image_path: 'https://example.test/coffee.jpg',
  },
];

const createFeaturedApi = () => ({
  getFeaturedProducts: jasmine
    .createSpy('getFeaturedProducts')
    .and.resolveTo(FEATURED_PRODUCTS.map((product) => ({ ...product }))),
});

function makeAuthStore(user = null) {
  const listeners = new Set();
  return {
    getUser: () => user,
    subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
}

describe('FeaturedProductsView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FeaturedProductsViewModel({ productsApi: createFeaturedApi() });
    await viewModel.load();
    view = new FeaturedProductsView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    container.remove();
  });

  it('renders the section heading and one list item per featured product', () => {
    const element = view.render();
    const cards = element.querySelectorAll('[role="listitem"]');

    expect(element.querySelector('h2').textContent).toBe('Destacados de la semana');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Aguayo tradicional');
    expect(cards[1].textContent).toContain('Café de especialidad');
  });

  it('renders formatted price and rating details when available', () => {
    const firstCard = view.render().querySelector('[role="listitem"]');

    expect(firstCard.textContent).toContain('US$ 40.00');
    expect(firstCard.textContent).toContain('4.9');
    expect(firstCard.textContent).toContain('(24)');
    expect(firstCard.querySelector('.product-card__rating')).not.toBeNull();
    expect(firstCard.querySelector('img').src).toContain('product-placeholder.svg');
  });

  it('uses the product photo and hides the rating when no average is provided', () => {
    const secondCard = view.render().querySelectorAll('[role="listitem"]')[1];

    expect(secondCard.querySelector('img').src).toBe('https://example.test/coffee.jpg');
    expect(secondCard.querySelector('.product-card__rating')).toBeNull();
  });

  it('wires add-to-cart and forwards the selected product', async () => {
    const addToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
    viewModel.onAddToCart = addToCart;
    const button = view.render().querySelector('button[aria-label^="Añadir"]');

    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(addToCart).toHaveBeenCalledWith(FEATURED_PRODUCTS[0]);
  });

  it('hides add-to-cart for the current seller and disables out-of-stock products', () => {
    const sellerView = new FeaturedProductsView(viewModel, {
      authStore: makeAuthStore({ id: 'seller-1' }),
    });
    const cards = sellerView.render().querySelectorAll('[role="listitem"]');

    expect(cards[0].querySelector('button[aria-label^="Añadir"]')).toBeNull();
    expect(cards[1].textContent).toContain('Agotado');
    expect(cards[1].querySelector('button[aria-label^="Añadir"]').disabled).toBe(true);
    sellerView.destroy();
  });

  it('updates the visible cards when the ViewModel products change', () => {
    view.mount(container);
    viewModel.setProducts([FEATURED_PRODUCTS[0]]);

    expect(container.querySelectorAll('[role="listitem"]').length).toBe(1);
    expect(container.textContent).toContain('Aguayo tradicional');
  });

  it('shows a loading error instead of the product list', async () => {
    const failingView = new FeaturedProductsView(
      new FeaturedProductsViewModel({
        productsApi: { getFeaturedProducts: () => Promise.reject(new Error('Network error')) },
      })
    );
    failingView.mount(container);
    await failingView.viewModel.load();

    expect(container.textContent).toContain('No pudimos cargar los productos destacados.');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('[role="listitem"]')).toBeNull();
    failingView.destroy();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('FeaturedProductsView additional branches (recovered 1)', () => {
      const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

      const makeProduct = (overrides = {}) => ({
        id: 'p1',
        slug: 'p1',
        name: 'Producto p1',
        seller_id: 'seller-1',
        price: 10,
        currency: 'USD',
        stock: 5,
        state: 'published',
        ...overrides,
      });

      const makeAuthStore = (initialUser = null) => {
        let user = initialUser;
        const listeners = new Set();
        return {
          getUser: () => user,
          setUser: (nextUser) => {
            user = nextUser;
          },
          notify: () => [...listeners].forEach((listener) => listener()),
          subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
          }),
        };
      };

      let view;
      let container;
      let extraViews;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        extraViews = [];
      });

      afterEach(() => {
        view?.destroy();
        extraViews.forEach((extraView) => extraView.destroy());
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('caches render() and does not subscribe until mount()', () => {
        const viewModel = new FeaturedProductsViewModel({ products: [makeProduct()] });
        const authStore = makeAuthStore();
        view = new FeaturedProductsView(viewModel, { authStore });
        const subscribeSpy = spyOn(viewModel, 'subscribe').and.callThrough();

        const first = view.render();

        expect(view.render()).toBe(first);
        expect(subscribeSpy).not.toHaveBeenCalled();
        expect(authStore.subscribe).not.toHaveBeenCalled();
        expect(viewModel._listeners.size).toBe(0);

        expect(view.mount(container)).toBe(first);
        expect(view.element).toBe(first);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        expect(authStore.subscribe).toHaveBeenCalledTimes(1);
      });

      it('mounts twice into the same container once, then moves the element to a new container', () => {
        const viewModel = new FeaturedProductsViewModel({ products: [makeProduct()] });
        const authStore = makeAuthStore();
        view = new FeaturedProductsView(viewModel, { authStore });
        const subscribeSpy = spyOn(viewModel, 'subscribe').and.callThrough();

        const first = view.mount(container);
        expect(view.mount(container)).toBe(first);
        expect(container.querySelectorAll('.q-featured').length).toBe(1);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        expect(authStore.subscribe).toHaveBeenCalledTimes(1);

        view.mount(document.body);
        expect(container.contains(first)).toBe(false);
        expect(document.body.contains(first)).toBe(true);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        expect(authStore.subscribe).toHaveBeenCalledTimes(1);
      });

      it('rebuilds cards on auth notifications so a seller no longer sees add-to-cart', () => {
        const viewModel = new FeaturedProductsViewModel({ products: [makeProduct()] });
        const authStore = makeAuthStore(null);
        view = new FeaturedProductsView(viewModel, { authStore });
        const el = view.mount(container);

        expect(el.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();

        authStore.setUser({ id: 'seller-1' });
        authStore.notify();

        expect(view.element).toBe(el);
        expect(view.element.querySelector('button[aria-label^="Añadir"]')).toBeNull();

        authStore.setUser(null);
        authStore.notify();

        expect(view.element.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();
      });

      it('unsubscribes from both stores, removes the DOM and tolerates a second destroy', () => {
        const viewModel = new FeaturedProductsViewModel({ products: [makeProduct()] });
        const authStore = makeAuthStore();
        const viewModelUnsubscribe = jasmine.createSpy('viewModelUnsubscribe');
        const authUnsubscribe = jasmine.createSpy('authUnsubscribe');
        spyOn(viewModel, 'subscribe').and.returnValue(viewModelUnsubscribe);
        authStore.subscribe.and.returnValue(authUnsubscribe);
        view = new FeaturedProductsView(viewModel, { authStore });

        const el = view.mount(container);
        expect(viewModelUnsubscribe).not.toHaveBeenCalled();
        expect(authUnsubscribe).not.toHaveBeenCalled();

        view.destroy();

        expect(viewModelUnsubscribe).toHaveBeenCalledTimes(1);
        expect(authUnsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(view._authUnsubscribe).toBeNull();
        expect(view.element).toBeNull();
        expect(container.contains(el)).toBe(false);
        expect(() => view.destroy()).not.toThrow();
        expect(viewModelUnsubscribe).toHaveBeenCalledTimes(1);
        expect(authUnsubscribe).toHaveBeenCalledTimes(1);
      });

      it('replaces the heading node without replacing the section on a VM update', () => {
        const viewModel = new FeaturedProductsViewModel({
          products: [makeProduct(), makeProduct({ id: 'p2', slug: 'p2', name: 'Producto p2' })],
        });
        view = new FeaturedProductsView(viewModel);
        const el = view.mount(container);
        const heading = el.querySelector('.q-featured-heading');

        viewModel.setProducts([makeProduct({ id: 'p3', slug: 'p3', name: 'Producto p3' })]);

        expect(view.element).toBe(el);
        expect(el.querySelector('.q-featured-heading')).not.toBe(heading);
        expect(el.textContent).toContain('Producto p3');
        expect(container.querySelectorAll('[role="listitem"]').length).toBe(1);
      });

      it('renders the subtitle only when the ViewModel provides one', () => {
        const withSubtitle = new FeaturedProductsViewModel({
          products: [makeProduct()],
          subtitle: 'Subtítulo destacado',
        });
        view = new FeaturedProductsView(withSubtitle);
        expect(view.render().querySelector('.q-featured-subtitle').textContent).toBe(
          'Subtítulo destacado'
        );

        const withoutSubtitle = new FeaturedProductsView(
          new FeaturedProductsViewModel({ products: [makeProduct()] })
        );
        extraViews.push(withoutSubtitle);
        expect(withoutSubtitle.render().querySelector('.q-featured-subtitle')).toBeNull();
      });

      it('renders a route-marked see-all link, prevents its default click and exposes a list grid', () => {
        view = new FeaturedProductsView(
          new FeaturedProductsViewModel({ products: [makeProduct()] })
        );
        const el = view.render();
        const link = el.querySelector('.q-featured-link');

        expect(link.getAttribute('href')).toBe('/products');
        expect(link.textContent).toBe('Ver catálogo →');
        expect(link.getAttribute('data-route')).toBe('');

        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);
        expect(clickEvent.defaultPrevented).toBe(true);

        const grid = el.querySelector('.q-featured-grid');
        expect(grid.getAttribute('role')).toBe('list');
        expect(grid.querySelectorAll('[role="listitem"]').length).toBe(1);
      });

      it('only hides add-to-cart when both user.id and product.seller_id are present and equal', () => {
        const cases = [
          { user: null, product: makeProduct(), hidden: false },
          { user: { id: 'seller-1' }, product: makeProduct(), hidden: true },
          { user: {}, product: makeProduct(), hidden: false },
          {
            user: { id: 'seller-1' },
            product: makeProduct({ seller_id: undefined }),
            hidden: false,
          },
        ];

        cases.forEach(({ user, product, hidden }) => {
          const caseView = new FeaturedProductsView(
            new FeaturedProductsViewModel({ products: [product] }),
            { authStore: makeAuthStore(user) }
          );
          extraViews.push(caseView);

          const button = caseView.render().querySelector('button[aria-label^="Añadir"]');
          if (hidden) {
            expect(button).toBeNull();
          } else {
            expect(button).not.toBeNull();
          }
        });
      });

      it('forwards add-to-cart clicks as (product id, quantity)', async () => {
        const viewModel = new FeaturedProductsViewModel({ products: [makeProduct()] });
        const addToCartSpy = spyOn(viewModel, 'addToCart').and.resolveTo({ status: 'added' });
        view = new FeaturedProductsView(viewModel, { authStore: makeAuthStore(null) });

        view.render().querySelector('button[aria-label^="Añadir"]').click();
        await tick();

        expect(addToCartSpy).toHaveBeenCalledTimes(1);
        expect(addToCartSpy).toHaveBeenCalledWith('p1', 1);
      });

      it('renders route-marked view links whose click handler is a no-op', () => {
        view = new FeaturedProductsView(
          new FeaturedProductsViewModel({ products: [makeProduct()] })
        );
        const card = view.render().querySelector('[role="listitem"]');
        const links = card.querySelectorAll('.product-card__view-link');

        expect(links.length).toBe(2);
        expect(links[0].getAttribute('href')).toBe('/products/p1');
        expect(links[0].getAttribute('aria-label')).toBe('Ver Producto p1');
        expect(links[0].getAttribute('data-route')).toBe('');

        // The component's onView callback does not preventDefault, so a real click would navigate
        // away and reload the runner. Block the default action locally after recording whether
        // the component itself prevented it.
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        let preventedByComponent;
        const blockNavigation = (event) => {
          preventedByComponent = event.defaultPrevented;
          event.preventDefault();
        };
        links[0].addEventListener('click', blockNavigation);
        links[0].dispatchEvent(clickEvent);
        links[0].removeEventListener('click', blockNavigation);

        expect(preventedByComponent).toBe(false);
        expect(clickEvent.defaultPrevented).toBe(true);
      });

      it('replaces a failed product image with the placeholder exactly once', () => {
        view = new FeaturedProductsView(
          new FeaturedProductsViewModel({
            products: [makeProduct({ primary_image_path: 'https://example.test/p.png' })],
          })
        );
        const image = view.render().querySelector('.product-card__image');

        expect(image.getAttribute('src')).toBe('https://example.test/p.png');

        image.dispatchEvent(new Event('error'));
        expect(image.getAttribute('src')).toContain('product-placeholder.svg');
        expect(image.classList.contains('product-card__image--placeholder')).toBe(true);

        image.dispatchEvent(new Event('error'));
        expect(image.getAttribute('src')).toContain('product-placeholder.svg');
      });

      it('renders an empty grid for empty and loading states instead of a status message', () => {
        const emptyView = new FeaturedProductsView(new FeaturedProductsViewModel({ products: [] }));
        extraViews.push(emptyView);
        const emptyEl = emptyView.render();

        expect(emptyEl.querySelector('.q-featured-grid')).not.toBeNull();
        expect(emptyEl.querySelectorAll('[role="listitem"]').length).toBe(0);
        expect(emptyEl.querySelector('.q-featured-message')).toBeNull();

        const loadingViewModel = new FeaturedProductsViewModel({ products: [] });
        loadingViewModel.status = 'loading';
        const loadingView = new FeaturedProductsView(loadingViewModel);
        extraViews.push(loadingView);
        const loadingEl = loadingView.render();

        expect(loadingEl.querySelector('.q-featured-grid')).not.toBeNull();
        expect(loadingEl.querySelectorAll('[role="listitem"]').length).toBe(0);
        expect(loadingEl.querySelector('.q-featured-message')).toBeNull();
      });
    });
  })();
})();
