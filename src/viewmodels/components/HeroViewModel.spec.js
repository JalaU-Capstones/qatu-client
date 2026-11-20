import { HeroViewModel, selectHeroProducts } from './HeroViewModel.js';

describe('HeroViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new HeroViewModel();
  });

  it('should initialize with default options', () => {
    expect(viewModel.eyebrow).toBe('Inspirado en nuestras ferias');
    expect(viewModel.titleMain).toBe('Lo mejor de Latinoamérica,');
    expect(viewModel.titleAccent).toBe('en un solo lugar.');
    expect(viewModel.subtitle).toContain('Descubre productos únicos');
    expect(viewModel.searchPlaceholder).toBe('¿Qué estás buscando hoy?');
    expect(viewModel.searchButtonLabel).toBe('Buscar');
    expect(viewModel.quickLinksLabel).toBe('Explora:');
    expect(viewModel.quickLinks.length).toBe(5);
    expect(viewModel.visualBadgeLabel).toBe('100%');
    expect(viewModel.visualBadgeSublabel).toBe('LOCAL');
    expect(viewModel.floatingCardLabel).toBe('Hecho en Latinoamérica');
    expect(viewModel.floatingCardCtaLabel).toBe('Ver más sobre');
    expect(viewModel.floatingCardHref).toBe('/about');
    expect(viewModel.visualImages).toEqual([]);
    expect(viewModel.searchValue).toBe('');
    expect(viewModel.onSearch).toBeNull();
  });

  it('should allow custom options in constructor', () => {
    const customVM = new HeroViewModel({
      eyebrow: 'Custom Eyebrow',
      titleMain: 'Custom Main',
      titleAccent: 'Custom Accent',
      subtitle: 'Custom Subtitle',
      searchPlaceholder: 'Search here...',
      searchButtonLabel: 'Go',
      quickLinksLabel: 'Tags:',
      quickLinks: [{ id: 'test', label: 'Test', href: '/test' }],
      visualBadgeLabel: '50%',
      floatingCardLabel: 'Made Locally',
    });

    expect(customVM.eyebrow).toBe('Custom Eyebrow');
    expect(customVM.titleMain).toBe('Custom Main');
    expect(customVM.titleAccent).toBe('Custom Accent');
    expect(customVM.quickLinks.length).toBe(1);
    expect(customVM.visualBadgeLabel).toBe('50%');
    expect(customVM.floatingCardLabel).toBe('Made Locally');
  });

  it('should update searchValue and notify subscribers on setSearchValue', () => {
    const listener = jasmine.createSpy('listener');
    viewModel.subscribe(listener);

    viewModel.setSearchValue('café');

    expect(viewModel.searchValue).toBe('café');
    expect(listener).toHaveBeenCalledWith(viewModel);
    expect(listener.calls.count()).toBe(1);
  });

  it('should not notify subscribers when setSearchValue is called with the same value', () => {
    viewModel.setSearchValue('artesanías');

    const listener = jasmine.createSpy('listener');
    viewModel.subscribe(listener);

    viewModel.setSearchValue('artesanías');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should call onSearch callback with current searchValue on triggerSearch', () => {
    const onSearchSpy = jasmine.createSpy('onSearch');
    const vm = new HeroViewModel({ onSearch: onSearchSpy });

    vm.setSearchValue('textiles');
    vm.triggerSearch();

    expect(onSearchSpy).toHaveBeenCalledWith('textiles');
  });

  it('should not throw on triggerSearch when onSearch is not provided', () => {
    expect(() => {
      viewModel.triggerSearch();
    }).not.toThrow();
  });

  it('should unsubscribe listener when returned function is called', () => {
    const listener = jasmine.createSpy('listener');
    const unsubscribe = viewModel.subscribe(listener);

    viewModel.setSearchValue('poncho');
    expect(listener.calls.count()).toBe(1);

    unsubscribe();

    viewModel.setSearchValue('chullo');
    expect(listener.calls.count()).toBe(1);
  });

  it('selects products priced at most 50 and published within 15 days, preferring images', () => {
    const now = Date.parse('2026-11-20T12:00:00.000Z');
    const product = (slug, price, daysAgo, image = null) => ({
      slug,
      name: slug,
      price,
      currency: 'USD',
      published_at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      primary_image_path: image,
    });
    const products = [
      product('exact-price-limit', '50', 2, 'https://cdn.example/limit.jpg'),
      product('recent-no-image', 12, 1),
      product('recent-image', 20, 15, 'https://cdn.example/recent.jpg'),
      product('too-expensive', 50.01, 1, 'https://cdn.example/expensive.jpg'),
      product('too-old', 20, 15 + 1 / 24, 'https://cdn.example/old.jpg'),
    ];

    const selected = selectHeroProducts(products, now);

    expect(selected.length).toBe(3);
    expect(selected.map(({ slug }) => slug)).toContain('exact-price-limit');
    expect(selected.map(({ slug }) => slug)).toContain('recent-image');
    expect(selected.map(({ slug }) => slug)).toContain('recent-no-image');
    expect(selected.map(({ slug }) => slug)).not.toContain('too-expensive');
    expect(selected.map(({ slug }) => slug)).not.toContain('too-old');
    expect(selected[0].src).toContain('limit.jpg');
  });

  it('uses affordable products as graceful fill-ins when fewer than three are recent', () => {
    const now = Date.parse('2026-11-20T12:00:00.000Z');
    const selected = selectHeroProducts(
      [
        {
          slug: 'recent',
          name: 'Recent',
          price: 10,
          published_at: new Date(now - 2 * 86400000).toISOString(),
        },
        {
          slug: 'older-with-image',
          name: 'Older',
          price: 50,
          published_at: new Date(now - 20 * 86400000).toISOString(),
          images: [{ path: 'https://cdn.example/older.jpg' }],
        },
        {
          slug: 'older-too-expensive',
          name: 'Expensive',
          price: 51,
          published_at: new Date(now - 20 * 86400000).toISOString(),
        },
      ],
      now
    );

    expect(selected.map(({ slug }) => slug)).toEqual(['recent', 'older-with-image']);
    expect(selected[1].src).toContain('older.jpg');
  });

  it('loads API products and keeps an empty fallback on network failure', async () => {
    const productsApi = {
      getProducts: jasmine.createSpy('getProducts').and.rejectWith(new Error('offline')),
    };
    const warn = spyOn(console, 'warn');
    const vm = new HeroViewModel({ productsApi });

    await vm.loadVisualProducts();

    expect(productsApi.getProducts).toHaveBeenCalledWith({ page: 1, limit: 100, maxPrice: 50 });
    expect(vm.visualImages).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});
