import { FeaturedStoresViewModel } from './FeaturedStoresViewModel.js';

describe('FeaturedStoresViewModel', () => {
  const sellers = (count) =>
    Array.from({ length: count }, (_, index) => ({
      id: `seller-${index}`,
      username: `seller${index}`,
      fullName: `Seller ${index}`,
      productCount: count - index,
    }));

  it('loads only the top three sellers and exposes the /stores CTA', async () => {
    const sellersApi = { listSellers: jasmine.createSpy().and.resolveTo(sellers(5)) };
    const vm = new FeaturedStoresViewModel({ sellersApi });
    let loadingAtNotification = false;
    vm.subscribe((state) => {
      loadingAtNotification ||= state.isLoading;
    });

    await vm.load();

    expect(loadingAtNotification).toBe(true);
    expect(sellersApi.listSellers).toHaveBeenCalled();
    expect(vm.sellers).toEqual(sellers(5).slice(0, 3));
    expect(vm.seeAllHref).toBe('/stores');
  });

  it('sets the expected error and clears sellers when loading fails', async () => {
    const vm = new FeaturedStoresViewModel({
      sellersApi: { listSellers: jasmine.createSpy().and.rejectWith(new Error('offline')) },
    });

    await vm.load();

    expect(vm.errorMessage).toBe('No se pudieron cargar las tiendas.');
    expect(vm.sellers).toEqual([]);
    expect(vm.isLoading).toBe(false);
  });

  it('keeps an empty seller list when the API returns no stores', async () => {
    const vm = new FeaturedStoresViewModel({
      sellersApi: { listSellers: jasmine.createSpy().and.resolveTo([]) },
    });

    await vm.load();

    expect(vm.sellers).toEqual([]);
    expect(vm.errorMessage).toBe('');
  });

  it('does not initialize the obsolete mocked card fields', () => {
    const vm = new FeaturedStoresViewModel({ sellersApi: { listSellers: async () => [] } });

    expect(vm.sellers).toEqual([]);
    expect(vm.initials).toBeUndefined();
    expect(vm.rating).toBeUndefined();
    expect(vm.category).toBeUndefined();
    expect(vm.accent).toBeUndefined();
  });
});
