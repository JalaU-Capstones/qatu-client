import { StoresViewModel } from './StoresViewModel.js';

describe('StoresViewModel', () => {
  const sellers = (count) =>
    Array.from({ length: count }, (_, index) => ({
      id: `seller-${index}`,
      username: `seller${index}`,
      fullName: `Vendedor ${index}`,
      productCount: 1,
    }));

  it('loads all sellers, maintains loading state, and exposes the full filtered list', async () => {
    const vm = new StoresViewModel({ sellersApi: { listSellers: async () => sellers(2) } });
    let sawLoading = false;
    vm.subscribe((state) => {
      sawLoading ||= state.isLoading;
    });

    await vm.load();

    expect(sawLoading).toBe(true);
    expect(vm.allSellers.length).toBe(2);
    expect(vm.sellers.length).toBe(2);
    expect(vm.isLoading).toBe(false);
  });

  it('searches username or name without case or accent sensitivity and resets on empty query', async () => {
    const all = [
      { username: 'cafe_altura', fullName: 'Café Altura' },
      { username: 'taller', fullName: 'Taller Illimani' },
    ];
    const vm = new StoresViewModel({ sellersApi: { listSellers: async () => all } });
    await vm.load();

    await vm.search('CAFE');
    expect(vm.sellers).toEqual([all[0]]);
    await vm.search('ILLÍMANI');
    expect(vm.sellers).toEqual([all[1]]);
    await vm.search('');
    expect(vm.sellers).toEqual(all);
  });

  it('paginates by 20 and clamps requested pages', async () => {
    const vm = new StoresViewModel({ sellersApi: { listSellers: async () => sellers(41) } });
    await vm.load();

    expect(vm.pageSize).toBe(20);
    vm.setPage(2);
    expect(vm.paginatedSellers).toEqual(sellers(41).slice(20, 40));
    vm.setPage(99);
    expect(vm.page).toBe(3);
    expect(vm.totalPages).toBe(3);
  });

  it('computes total pages for empty, single, and multiple-page lists', async () => {
    for (const [count, expected] of [
      [0, 1],
      [1, 1],
      [21, 2],
      [40, 2],
    ]) {
      const vm = new StoresViewModel({ sellersApi: { listSellers: async () => sellers(count) } });
      await vm.load();
      expect(vm.totalPages).withContext(`${count} sellers`).toBe(expected);
    }
  });

  it('clears search and page and synchronizes query parameters with history', async () => {
    const original = {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
    };
    const replaceState = spyOn(window.history, 'replaceState').and.callThrough();
    const vm = new StoresViewModel({
      sellersApi: { listSellers: async () => sellers(21) },
      initialQuery: 'cafÉ',
    });
    await vm.load();

    await vm.search(' seller ');
    let updatedUrl = new URL(replaceState.calls.mostRecent().args[2], window.location.origin);
    expect(updatedUrl.searchParams.get('q')).toBe('seller');
    expect(updatedUrl.searchParams.get('random')).toBe('true');
    vm.setPage(2);
    updatedUrl = new URL(replaceState.calls.mostRecent().args[2], window.location.origin);
    expect(updatedUrl.searchParams.get('q')).toBe('seller');
    expect(updatedUrl.searchParams.get('page')).toBe('2');
    vm.clearSearch();
    expect(vm.query).toBe('');
    expect(vm.page).toBe(1);
    updatedUrl = new URL(replaceState.calls.mostRecent().args[2], window.location.origin);
    expect(updatedUrl.searchParams.has('q')).toBe(false);
    expect(updatedUrl.searchParams.has('page')).toBe(false);
    window.history.replaceState(
      original.state,
      '',
      `${original.pathname}${original.search}${original.hash}`
    );
  });
});
