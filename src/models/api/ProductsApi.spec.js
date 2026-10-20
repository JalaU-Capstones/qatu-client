import { ProductsApi } from './ProductsApi.js';

describe('ProductsApi', () => {
  let api;

  beforeEach(() => {
    api = new ProductsApi();
  });

  it('should return the 8 featured products from the design with unique ids', async () => {
    const products = await api.getFeaturedProducts();

    expect(products.length).toBe(8);
    expect(new Set(products.map((product) => product.id)).size).toBe(8);
    expect(products[0].name).toBe('Aguayo tradicional de Tarabuco');
    expect(products[7].name).toBe('Huipil bordado guatemalteco');
  });

  it('should return products with every field the section needs', async () => {
    const products = await api.getFeaturedProducts();

    products.forEach((product) => {
      expect(typeof product.id).toBe('string');
      expect(typeof product.name).toBe('string');
      expect(typeof product.seller).toBe('string');
      expect(typeof product.country).toBe('string');
      expect(typeof product.rating).toBe('number');
      expect(typeof product.ratingsCount).toBe('number');
      expect(typeof product.price).toBe('number');
      expect(product.currency).toBe('USD');
      expect(product.imageUrl).toBeNull();
    });
  });

  it('should not share objects between calls', async () => {
    const first = await api.getFeaturedProducts();
    first[0].name = 'Changed';

    const second = await api.getFeaturedProducts();
    expect(second[0].name).toBe('Aguayo tradicional de Tarabuco');
  });
});
