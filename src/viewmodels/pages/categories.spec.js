import { CategoriesViewModel } from './categories.js';

describe('PublicCategoriesViewModel', () => {
  it('counts products by category id or slug and handles an empty response', async () => {
    const categoriesApi = {
      getCategories: jasmine.createSpy('getCategories').and.resolveTo({
        data: [
          { id: '1', name: 'Hogar', slug: 'hogar', description: 'Decoración del hogar' },
          { id: '2', name: 'Moda', slug: 'moda', description: '' },
        ],
      }),
    };
    const productsApi = {
      getProducts: jasmine.createSpy('getProducts').and.resolveTo({
        data: [
          { id: 'p1', category_id: '1' },
          { id: 'p2', category_id: '1' },
          { id: 'p3', category_slug: 'moda' },
        ],
      }),
    };
    const vm = new CategoriesViewModel({ categoriesApi, productsApi });

    await vm.loadCategories();
    expect(productsApi.getProducts).toHaveBeenCalledWith({ limit: 100 });
    expect(vm.categories.map(({ product_count }) => product_count)).toEqual([2, 1]);
    expect(vm.categories[0].description).toBe('Decoración del hogar');

    categoriesApi.getCategories.and.resolveTo({ data: [] });
    await vm.loadCategories();
    expect(vm.categories).toEqual([]);
  });
});
