import { FeaturedProductsViewModel } from './FeaturedProductsViewModel.js';

describe('FeaturedProductsViewModel', () => {
  let viewModel;

  beforeEach(async () => {
    viewModel = new FeaturedProductsViewModel();
    await viewModel.load();
  });

  it('should initialize with the section copy from the design', () => {
    expect(viewModel.eyebrow).toBe('PRODUCTOS DESTACADOS');
    expect(viewModel.title).toBe('Destacados de la semana');
    expect(viewModel.subtitle).toBe('Seleccionados para ti');
    expect(viewModel.link.label).toBe('Ver catálogo →');
    expect(viewModel.addToCartLabel).toBe('Add to cart');
  });

  describe('loading', () => {
    it('should start idle and empty until load() is called', () => {
      const fresh = new FeaturedProductsViewModel();

      expect(fresh.status).toBe('idle');
      expect(fresh.products).toEqual([]);
      expect(fresh.errorMessage).toBe('');
    });

    it('should be ready right away when products are passed in', () => {
      const withProducts = new FeaturedProductsViewModel({ products: [{ id: 'p1' }] });

      expect(withProducts.status).toBe('ready');
      expect(withProducts.products.length).toBe(1);
    });

    it('should load the 8 featured products from the ProductsApi model', () => {
      expect(viewModel.status).toBe('ready');
      expect(viewModel.products.length).toBe(8);
      expect(viewModel.products[0].name).toBe('Aguayo tradicional de Tarabuco');
      expect(viewModel.errorMessage).toBe('');
    });

    it('should ask the injected model for the products and notify once', async () => {
      const productsApi = {
        getFeaturedProducts: jasmine
          .createSpy('getFeaturedProducts')
          .and.resolveTo([{ id: 'p1', name: 'Uno' }]),
      };
      const custom = new FeaturedProductsViewModel({ productsApi });
      const listener = jasmine.createSpy('listener');
      custom.subscribe(listener);

      await custom.load();

      expect(productsApi.getFeaturedProducts).toHaveBeenCalledTimes(1);
      expect(custom.products).toEqual([{ id: 'p1', name: 'Uno' }]);
      expect(custom.status).toBe('ready');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should expose an error message and no products when the model fails', async () => {
      const productsApi = {
        getFeaturedProducts: jasmine
          .createSpy('getFeaturedProducts')
          .and.rejectWith(new Error('x')),
      };
      const custom = new FeaturedProductsViewModel({ productsApi });
      const listener = jasmine.createSpy('listener');
      custom.subscribe(listener);

      await custom.load();

      expect(custom.status).toBe('error');
      expect(custom.products).toEqual([]);
      expect(custom.errorMessage).toBe('No pudimos cargar los productos destacados.');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should clear a previous error after a successful reload', async () => {
      let shouldFail = true;
      const productsApi = {
        getFeaturedProducts: () =>
          shouldFail ? Promise.reject(new Error('x')) : Promise.resolve([{ id: 'p1' }]),
      };
      const custom = new FeaturedProductsViewModel({ productsApi });

      await custom.load();
      expect(custom.status).toBe('error');

      shouldFail = false;
      await custom.load();
      expect(custom.status).toBe('ready');
      expect(custom.errorMessage).toBe('');
      expect(custom.products.length).toBe(1);
    });

    it('should fall back to an empty list when the model returns invalid data', async () => {
      const custom = new FeaturedProductsViewModel({
        productsApi: { getFeaturedProducts: () => Promise.resolve(null) },
      });

      await custom.load();

      expect(custom.products).toEqual([]);
      expect(custom.status).toBe('ready');
    });
  });

  describe('formatting', () => {
    it('should format the price like the design', () => {
      expect(viewModel.getPriceLabel({ price: 40, currency: 'USD' })).toBe('US$ 40.00');
      expect(viewModel.getPriceLabel({ price: 165, currency: 'USD' })).toBe('US$ 165.00');
      expect(viewModel.getPriceLabel({ price: 6, currency: 'USD' })).toBe('US$ 6.00');
    });

    it('should keep unknown currency codes and omit the symbol when there is none', () => {
      expect(viewModel.getPriceLabel({ price: 10.5, currency: 'BOB' })).toBe('BOB 10.50');
      expect(viewModel.getPriceLabel({ price: 10.5 })).toBe('10.50');
    });

    it('should format the rating, the screen reader rating and the seller line', () => {
      const product = viewModel.products[0];

      expect(viewModel.getRatingLabel(product)).toBe('4.9 (24)');
      expect(viewModel.getRatingLabel({ rating: 5, ratingsCount: 12 })).toBe('5.0 (12)');
      expect(viewModel.getRatingAccessibleLabel(product)).toBe('Calificación 4.9 de 5, 24 reseñas');
      expect(viewModel.getOriginLabel(product)).toBe('Tejidos Illimani · Bolivia');
      expect(viewModel.getOriginLabel({ seller: 'Solo tienda' })).toBe('Solo tienda');
    });
  });

  describe('add to cart', () => {
    it('should call onAddToCart with the product and return true', () => {
      const onAddToCart = jasmine.createSpy('onAddToCart');
      viewModel.onAddToCart = onAddToCart;

      const result = viewModel.addToCart('cafe-especialidad-cusco');

      expect(result).toBe(true);
      expect(onAddToCart).toHaveBeenCalledTimes(1);
      expect(onAddToCart.calls.mostRecent().args[0].name).toBe(
        'Café de especialidad de Cusco 500 g'
      );
    });

    it('should return false and not call onAddToCart for an unknown product', () => {
      const onAddToCart = jasmine.createSpy('onAddToCart');
      viewModel.onAddToCart = onAddToCart;

      expect(viewModel.addToCart('does-not-exist')).toBe(false);
      expect(onAddToCart).not.toHaveBeenCalled();
    });

    it('should not fail when no onAddToCart handler is set', () => {
      expect(() => viewModel.addToCart('cafe-especialidad-cusco')).not.toThrow();
    });
  });

  describe('subscriptions', () => {
    it('should notify subscribers when products change and allow unsubscribing', () => {
      const listener = jasmine.createSpy('listener');
      const unsubscribe = viewModel.subscribe(listener);

      viewModel.setProducts([{ id: 'p1', name: 'Uno', seller: 'Tienda', price: 1 }]);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(viewModel.products.length).toBe(1);

      unsubscribe();
      viewModel.setProducts([]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify each listener once even if it resubscribes while being notified', () => {
      let calls = 0;
      const listener = () => {
        calls += 1;
        unsubscribe();
        unsubscribe = viewModel.subscribe(listener);
      };
      let unsubscribe = viewModel.subscribe(listener);

      viewModel.setProducts([]);

      expect(calls).toBe(1);
    });

    it('should fall back to an empty list when setProducts receives invalid data', () => {
      viewModel.setProducts(null);
      expect(viewModel.products).toEqual([]);
    });
  });
});
