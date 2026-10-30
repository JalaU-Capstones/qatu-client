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

    expect(onAddToCart).toHaveBeenCalledWith('prod-99');
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
