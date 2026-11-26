import { CategoriesViewModel } from './categories.js';

describe('PublicCategoriesViewModel', () => {
  it('loads all categories and handles an empty response', async () => {
    const categoriesApi = {
      getCategoriesWithCounts: jasmine
        .createSpy('getCategoriesWithCounts')
        .and.resolveTo([{ id: '1', name: 'Hogar', slug: 'hogar', product_count: null }]),
    };
    const vm = new CategoriesViewModel({ categoriesApi });

    await vm.loadCategories();
    expect(vm.categories.length).toBe(1);

    categoriesApi.getCategoriesWithCounts.and.resolveTo([]);
    await vm.loadCategories();
    expect(vm.categories).toEqual([]);
  });
});
