import { authStore } from '../../store/authStore.js';
import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';
import { HeroViewModel } from '../../viewmodels/components/HeroViewModel.js';
import { HomeView } from './HomeView.js';

describe('HomeView', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should mount home content sections without creating header, footer, or main', () => {
    const view = new HomeView();
    view.mount(container);

    // Content-only: no shell elements
    expect(container.querySelector('header, .q-header')).toBeNull();
    expect(container.querySelector('footer, .q-footer')).toBeNull();
    expect(container.querySelector('main')).toBeNull();

    // Home content sections are present
    expect(container.querySelector('.q-hero, .q-hero-banner, [class*="hero"]')).not.toBeNull();
    expect(container.querySelector('.q-home')).not.toBeNull();
    expect(container.querySelectorAll('.q-home > section').length).toBe(5);

    view.destroy();
  });

  it('should not mutate container.className', () => {
    container.className = 'q-main';
    const view = new HomeView();
    view.mount(container);
    expect(container.className).toBe('q-main');
    view.destroy();
  });

  it('should fire onAddToCart callback when passed in constructor', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    const view = new HomeView({ onAddToCart });
    view.mount(container);

    // Trigger the onAddToCart via the viewModel directly (simulates cart button click)
    if (view._featuredProducts && view._featuredProducts.viewModel) {
      view._featuredProducts.viewModel.onAddToCart();
    }

    expect(onAddToCart).toHaveBeenCalled();
    view.destroy();
  });

  it('constructor accepts onAddToCart and forwards it to the FeaturedProductsViewModel', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    const view = new HomeView({ onAddToCart });
    view.mount(container);

    const product = { id: 'prod-99', name: 'Alpaca Sweater' };
    view._featuredProducts.viewModel.onAddToCart(product);

    expect(onAddToCart).toHaveBeenCalledWith(product, 1);
    view.destroy();
  });

  it('should default onAddToCart to a no-op when not provided', () => {
    const view = new HomeView();
    view.mount(container);

    // Should not throw when onAddToCart fires without a callback
    expect(() => {
      if (view._featuredProducts && view._featuredProducts.viewModel) {
        view._featuredProducts.viewModel.onAddToCart();
      }
    }).not.toThrow();

    view.destroy();
  });

  it('should forward hero search to onSearch', () => {
    const onSearch = jasmine.createSpy('onSearch');
    const view = new HomeView({ onSearch });
    view.mount(container);

    view._hero.viewModel.onSearch('phone');

    expect(onSearch).toHaveBeenCalledWith('phone');
    view.destroy();
  });

  it('should call destroy on all child views when destroy() is called', () => {
    const view = new HomeView();
    view.mount(container);

    const spyHero = spyOn(view._hero, 'destroy').and.callThrough();
    const spyCategories = spyOn(view._categories, 'destroy').and.callThrough();
    const spyFeaturedProducts = spyOn(view._featuredProducts, 'destroy').and.callThrough();
    const spyStores = spyOn(view._stores, 'destroy').and.callThrough();

    view.destroy();

    expect(spyHero).toHaveBeenCalled();
    expect(spyCategories).toHaveBeenCalled();
    expect(spyFeaturedProducts).toHaveBeenCalled();
    expect(spyStores).toHaveBeenCalled();
  });

  it('should null out all child references after destroy()', () => {
    const view = new HomeView();
    view.mount(container);
    view.destroy();

    expect(view._hero).toBeNull();
    expect(view._categories).toBeNull();
    expect(view._featuredProducts).toBeNull();
    expect(view._stores).toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('HomeView additional branches (recovered 1)', () => {
      let container;
      let view;

      const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

      function mountView(options = {}) {
        view = new HomeView(options);
        view.mount(container);
        return view;
      }

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        spyOn(HeroViewModel.prototype, 'loadVisualProducts').and.resolveTo();
        spyOn(FeaturedProductsViewModel.prototype, 'load').and.resolveTo();
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
        authStore.clearSession();
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      it('forwards an injected productsApi to the hero view model', () => {
        const productsApi = { getProducts: jasmine.createSpy('getProducts') };
        mountView({ productsApi });

        expect(view._hero.viewModel.productsApi).toBe(productsApi);
        expect(view._hero.viewModel.api).toBeUndefined();
        expect(productsApi.getProducts).not.toHaveBeenCalled();
      });

      it('uses the default callbacks with their documented return values', async () => {
        mountView();

        expect(view.onSearch('phone')).toBeUndefined();
        expect(view._hero.viewModel.onSearch('phone')).toBeUndefined();
        const result = await view._featuredProducts.viewModel.onAddToCart({ id: 'p1' });
        expect(result).toEqual({ status: 'added' });
      });

      it('starts the hero visual load and the featured-products load during mount', () => {
        mountView();

        expect(HeroViewModel.prototype.loadVisualProducts).toHaveBeenCalledTimes(1);
        expect(FeaturedProductsViewModel.prototype.load).toHaveBeenCalledTimes(1);
        expect(view._hero.viewModel instanceof HeroViewModel).toBe(true);
        expect(view._featuredProducts.viewModel instanceof FeaturedProductsViewModel).toBe(true);
      });

      it('mounts exactly five content sections in the documented order', () => {
        mountView();

        expect(view.element.className).toBe('q-home');
        expect(container.firstElementChild).toBe(view.element);
        expect(
          Array.from(container.querySelectorAll('.q-home > section')).map((s) => s.className)
        ).toEqual([
          'q-hero q-ambient',
          'q-categories',
          'q-featured',
          'q-section-container',
          'q-featured-stores',
        ]);
      });

      it('wires the hero search form to the injected onSearch callback', () => {
        const onSearch = jasmine.createSpy('onSearch');
        mountView({ onSearch });

        const input = container.querySelector('#q-hero-search-input');
        input.value = '  poncho  ';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        container
          .querySelector('.q-hero__search')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(onSearch).toHaveBeenCalledOnceWith('  poncho  ');
      });

      it('wires a featured-product add-to-cart button to the injected callback', async () => {
        const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
        mountView({ onAddToCart });
        const product = {
          id: 'p1',
          name: 'Manta',
          slug: 'manta',
          price: 40,
          currency: 'BOB',
          average_rating: 4,
          ratings_count: 2,
        };
        view._featuredProducts.viewModel.setProducts([product]);

        const button = container.querySelector('.product-card__add-button');
        expect(button).not.toBeNull();
        button.click();
        await tick();

        expect(onAddToCart).toHaveBeenCalledOnceWith(product, 1);
      });

      it('destroys the shipping banner with all children and clears every reference', () => {
        mountView();
        const destroySpies = [
          spyOn(view._hero, 'destroy').and.callThrough(),
          spyOn(view._categories, 'destroy').and.callThrough(),
          spyOn(view._featuredProducts, 'destroy').and.callThrough(),
          spyOn(view._shippingBanner, 'destroy').and.callThrough(),
          spyOn(view._stores, 'destroy').and.callThrough(),
        ];

        view.destroy();

        destroySpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
        expect(view._hero).toBeNull();
        expect(view._categories).toBeNull();
        expect(view._featuredProducts).toBeNull();
        expect(view._shippingBanner).toBeNull();
        expect(view._stores).toBeNull();
        expect(view.element).toBeNull();
        expect(container.children.length).toBe(0);

        view.destroy();
        expect(view._hero).toBeNull();
        expect(view._shippingBanner).toBeNull();
        expect(view.element).toBeNull();
        expect(container.children.length).toBe(0);
      });

      it('duplicates the section tree and leaves the first tree behind when mounted twice', () => {
        mountView();
        const firstChildren = [
          view._hero,
          view._categories,
          view._featuredProducts,
          view._shippingBanner,
          view._stores,
        ];
        view.mount(container);

        const homes = container.querySelectorAll('.q-home');
        expect(homes.length).toBe(2);
        expect(container.querySelectorAll('.q-hero').length).toBe(2);
        expect(view.element).toBe(homes[1]);
        expect(view._hero).not.toBe(firstChildren[0]);

        view.destroy();
        expect(container.querySelectorAll('.q-home').length).toBe(1);

        firstChildren.forEach((child) => child.destroy());
      });
    });
  })();
})();
