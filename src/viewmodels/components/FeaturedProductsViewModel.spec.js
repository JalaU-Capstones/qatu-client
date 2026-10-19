import { FeaturedProductsViewModel } from './FeaturedProductsViewModel.js';

describe('FeaturedProductsViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new FeaturedProductsViewModel();
  });

  it('should initialize with the section copy from the design', () => {
    expect(viewModel.eyebrow).toBe('PRODUCTOS DESTACADOS');
    expect(viewModel.title).toBe('Destacados de la semana');
    expect(viewModel.subtitle).toBe('Seleccionados para ti');
    expect(viewModel.link.label).toBe('Ver catálogo →');
    expect(viewModel.addToCartLabel).toBe('Add to cart');
  });

  it('should contain the 8 featured products with unique ids', () => {
    expect(viewModel.products.length).toBe(8);

    const ids = viewModel.products.map((product) => product.id);
    expect(new Set(ids).size).toBe(8);
    expect(viewModel.products[0].name).toBe('Aguayo tradicional de Tarabuco');
    expect(viewModel.products[7].name).toBe('Huipil bordado guatemalteco');
  });

  it('should not share default products between instances', () => {
    const other = new FeaturedProductsViewModel();
    other.products[0].name = 'Changed';
    expect(viewModel.products[0].name).toBe('Aguayo tradicional de Tarabuco');
  });

  it('should format the price like the design', () => {
    expect(viewModel.getPriceLabel({ price: 40, currency: 'USD' })).toBe('US$ 40.00');
    expect(viewModel.getPriceLabel({ price: 165, currency: 'USD' })).toBe('US$ 165.00');
    expect(viewModel.getPriceLabel({ price: 6, currency: 'USD' })).toBe('US$ 6.00');
  });

  it('should keep unknown currency codes and omit the symbol when there is none', () => {
    expect(viewModel.getPriceLabel({ price: 10.5, currency: 'BOB' })).toBe('BOB 10.50');
    expect(viewModel.getPriceLabel({ price: 10.5 })).toBe('10.50');
  });

  it('should format the rating and the seller line', () => {
    const product = viewModel.products[0];
    expect(viewModel.getRatingLabel(product)).toBe('4.9 (24)');
    expect(viewModel.getRatingLabel({ rating: 5, ratingsCount: 12 })).toBe('5.0 (12)');
    expect(viewModel.getOriginLabel(product)).toBe('Tejidos Illimani · Bolivia');
    expect(viewModel.getOriginLabel({ seller: 'Solo tienda' })).toBe('Solo tienda');
  });

  it('should call onAddToCart with the product and return true', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    viewModel.onAddToCart = onAddToCart;

    const result = viewModel.addToCart('cafe-especialidad-cusco');

    expect(result).toBe(true);
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart.calls.mostRecent().args[0].name).toBe('Café de especialidad de Cusco 500 g');
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
