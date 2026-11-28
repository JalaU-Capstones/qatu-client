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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('HeroViewModel additional branches (recovered 1)', () => {
      const DAY = 24 * 60 * 60 * 1000;
      const now = Date.parse('2026-11-20T12:00:00.000Z');
      let unsubscribes;

      const product = (overrides = {}) => ({
        slug: 'default-slug',
        name: 'Default',
        price: 10,
        currency: 'USD',
        published_at: new Date(now - 2 * DAY).toISOString(),
        ...overrides,
      });

      const slugsOf = (products) => selectHeroProducts(products, now).map(({ slug }) => slug);

      const track = (unsubscribe) => {
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      };

      beforeEach(() => {
        unsubscribes = [];
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      });

      it('returns no heroes for null, non-array and empty inputs', () => {
        expect(slugsOf(null)).toEqual([]);
        expect(slugsOf(undefined)).toEqual([]);
        expect(slugsOf('products')).toEqual([]);
        expect(slugsOf({})).toEqual([]);
        expect(slugsOf([])).toEqual([]);
      });

      it('excludes non-published states but keeps falsy ones', () => {
        const products = [
          product({ slug: 'draft', state: 'draft' }),
          product({ slug: 'unpublished', state: 'unpublished' }),
          product({ slug: 'archived', state: 'archived' }),
          product({ slug: 'no-state' }),
          product({ slug: 'empty-state', state: '' }),
          product({ slug: 'zero-state', state: 0 }),
        ];

        expect(slugsOf(products)).toEqual(['no-state', 'empty-state', 'zero-state']);
      });

      it('drops null, blank and non-finite prices while keeping zero and the 50 boundary', () => {
        const products = [
          product({ slug: 'null-price', price: null }),
          product({ slug: 'undefined-price', price: undefined }),
          product({ slug: 'empty-price', price: '' }),
          product({ slug: 'spaces-price', price: '   ' }),
          product({ slug: 'text-price', price: 'abc' }),
          product({ slug: 'nan-price', price: Number.NaN }),
          product({ slug: 'infinite-price', price: Number.POSITIVE_INFINITY }),
          product({ slug: 'zero-price', price: 0 }),
          product({ slug: 'string-price', price: '50' }),
          product({ slug: 'negative-price', price: -5 }),
        ];

        expect(slugsOf(products)).toEqual(['zero-price', 'string-price', 'negative-price']);
      });

      it('requires a non-blank string slug and returns it unchanged', () => {
        const noSlug = {
          name: 'No slug',
          price: 10,
          published_at: new Date(now - DAY).toISOString(),
        };
        const products = [
          noSlug,
          product({ slug: null }),
          product({ slug: 123 }),
          product({ slug: '' }),
          product({ slug: '   ' }),
          product({ slug: 'valid-one' }),
          product({ slug: '  padded  ' }),
        ];

        expect(slugsOf(products)).toEqual(['valid-one', '  padded  ']);
      });

      it('uses the latest of published_at, created_at and updated_at as the timestamp', () => {
        const products = [
          product({
            slug: 'created-only',
            published_at: undefined,
            created_at: new Date(now - DAY).toISOString(),
          }),
          product({
            slug: 'updated-only',
            published_at: undefined,
            updated_at: new Date(now - 2 * DAY).toISOString(),
          }),
          product({
            slug: 'newer-update-wins',
            published_at: new Date(now - 10 * DAY).toISOString(),
            created_at: new Date(now - 9 * DAY).toISOString(),
            updated_at: new Date(now - DAY / 2).toISOString(),
          }),
        ];

        const slugs = slugsOf(products);

        expect(slugs.length).toBe(3);
        expect(slugs[0]).toBe('newer-update-wins');
        expect(slugs).toContain('created-only');
        expect(slugs).toContain('updated-only');
      });

      it('excludes invalid, future and numeric-epoch timestamps from the recent set', () => {
        const recent = ['v1', 'v2', 'v3'].map((slug, index) =>
          product({ slug, published_at: new Date(now - (index + 1) * DAY).toISOString() })
        );
        const invalid = product({ slug: 'invalid-date', published_at: 'not-a-date' });
        const future = product({ slug: 'future', published_at: new Date(now + DAY).toISOString() });
        const epoch = product({ slug: 'epoch', published_at: now });

        expect(slugsOf([...recent, invalid, future, epoch])).toEqual(['v1', 'v2', 'v3']);
        expect(slugsOf([invalid, future, epoch])).toEqual(['future', 'invalid-date', 'epoch']);
      });

      it('drops an otherwise recent product when a secondary timestamp is in the future', () => {
        const recent = ['v1', 'v2', 'v3'].map((slug, index) =>
          product({ slug, published_at: new Date(now - (index + 1) * DAY).toISOString() })
        );
        const futureUpdate = product({
          slug: 'future-update',
          published_at: new Date(now - DAY).toISOString(),
          updated_at: new Date(now + DAY).toISOString(),
        });

        expect(slugsOf([...recent, futureUpdate])).toEqual(['v1', 'v2', 'v3']);
        expect(slugsOf([futureUpdate])).toEqual(['future-update']);
      });

      it('breaks equal-timestamp ties by index after preferring products with an image', () => {
        const sameTime = new Date(now - 2 * DAY).toISOString();
        const tied = ['first', 'second', 'third', 'fourth'].map((slug) =>
          product({ slug, published_at: sameTime })
        );

        expect(slugsOf(tied)).toEqual(['first', 'second', 'third']);

        const withImage = product({
          slug: 'older-with-image',
          published_at: new Date(now - 10 * DAY).toISOString(),
          primary_image_path: 'https://cdn.example/older.jpg',
        });
        const newer = product({
          slug: 'newer-no-image',
          published_at: new Date(now - DAY).toISOString(),
        });

        expect(selectHeroProducts([newer, withImage], now)[0].src).toBe(
          'https://cdn.example/older.jpg'
        );
      });

      it('keeps only the three best matches and maps their display fields', () => {
        const products = ['a', 'b', 'c', 'd', 'e'].map((slug, index) =>
          product({
            slug,
            price: index + 1,
            published_at: new Date(now - (5 - index) * DAY).toISOString(),
          })
        );

        expect(selectHeroProducts(products, now)).toEqual([
          { src: null, slug: 'e', label: 'Default', price: 'US$ 5.00' },
          { src: null, slug: 'd', label: 'Default', price: 'US$ 4.00' },
          { src: null, slug: 'c', label: 'Default', price: 'US$ 3.00' },
        ]);
      });

      it('falls back from name to title to Producto local and formats the currency', () => {
        const selected = selectHeroProducts(
          [
            product({
              slug: 'with-title',
              name: '',
              title: 'Título',
              price: 20,
              currency: 'PEN',
              primary_image_path: 'https://cdn.example/titulo.jpg',
            }),
            product({
              slug: 'generic',
              name: undefined,
              title: undefined,
              price: 21,
              currency: 'EUR',
            }),
          ],
          now
        );

        expect(selected).toEqual([
          {
            src: 'https://cdn.example/titulo.jpg',
            slug: 'with-title',
            label: 'Título',
            price: 'S/ 20.00',
          },
          { src: null, slug: 'generic', label: 'Producto local', price: '€ 21.00' },
        ]);
      });

      it('accepts custom visual copy and visualImages with empty-string fallbacks', () => {
        const visualImages = [
          { src: 'custom.jpg', slug: 'custom', label: 'Custom', price: 'US$ 1.00' },
        ];
        const vm = new HeroViewModel({
          subtitle: 'Custom subtitle',
          searchButtonLabel: 'Go',
          visualImages,
          visualBadgeSublabel: 'HECHO AQUÍ',
          floatingCardSublabel: 'artesanos locales',
        });

        expect(vm.subtitle).toBe('Custom subtitle');
        expect(vm.searchButtonLabel).toBe('Go');
        expect(vm.visualImages).toBe(visualImages);
        expect(vm.visualBadgeSublabel).toBe('HECHO AQUÍ');
        expect(vm.floatingCardSublabel).toBe('artesanos locales');

        const fallback = new HeroViewModel({
          subtitle: '',
          searchButtonLabel: '',
          visualBadgeSublabel: '',
          floatingCardSublabel: '',
          visualImages: 'not-an-array',
        });
        expect(fallback.subtitle).toContain('Descubre productos únicos');
        expect(fallback.searchButtonLabel).toBe('Buscar');
        expect(fallback.visualBadgeSublabel).toBe('LOCAL');
        expect(fallback.floatingCardSublabel).toBe('por productores locales');
        expect(fallback.visualImages).toEqual([]);
      });

      it('stores non-string search values verbatim and notifies', () => {
        const vm = new HeroViewModel();
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        vm.setSearchValue(123);
        expect(vm.searchValue).toBe(123);
        vm.setSearchValue(null);
        expect(vm.searchValue).toBeNull();
        expect(listener.calls.count()).toBe(2);
        expect(listener.calls.argsFor(0)[0]).toBe(vm);
      });

      it('passes the raw search value to onSearch without trimming', () => {
        const onSearch = jasmine.createSpy('onSearch');
        const vm = new HeroViewModel({ onSearch });

        vm.setSearchValue('  café con leche  ');
        vm.triggerSearch();

        expect(onSearch).toHaveBeenCalledWith('  café con leche  ');
      });

      it('loads API products with the fixed query and notifies subscribers', async () => {
        const getProducts = jasmine.createSpy('getProducts').and.resolveTo({
          data: [
            {
              slug: 'hero-1',
              title: 'Hero uno',
              price: 12,
              currency: 'PEN',
              published_at: new Date().toISOString(),
              primary_image_path: 'https://cdn.example/hero.jpg',
            },
            {
              slug: 'hero-2',
              name: 'Hero dos',
              price: 25,
              published_at: new Date().toISOString(),
            },
          ],
        });
        const vm = new HeroViewModel({ productsApi: { getProducts } });
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        await vm.loadVisualProducts();

        expect(getProducts).toHaveBeenCalledWith({ page: 1, limit: 100, maxPrice: 50 });
        expect(vm.visualImages).toEqual([
          {
            src: 'https://cdn.example/hero.jpg',
            slug: 'hero-1',
            label: 'Hero uno',
            price: 'S/ 12.00',
          },
          { src: null, slug: 'hero-2', label: 'Hero dos', price: 'US$ 25.00' },
        ]);
        expect(listener.calls.count()).toBe(1);
        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('keeps visualImages empty when the API response has no data array', async () => {
        const getProducts = jasmine.createSpy('getProducts').and.resolveTo({});
        const vm = new HeroViewModel({
          productsApi: { getProducts },
          visualImages: [{ src: 'stale.jpg' }],
        });

        await vm.loadVisualProducts();
        expect(vm.visualImages).toEqual([]);

        getProducts.and.resolveTo({ data: null });
        await vm.loadVisualProducts();
        expect(vm.visualImages).toEqual([]);
      });

      it('warns with the raw error when it has no message and clears visualImages', async () => {
        const getProducts = jasmine.createSpy('getProducts').and.rejectWith('sin mensaje');
        const warn = spyOn(console, 'warn');
        const vm = new HeroViewModel({
          productsApi: { getProducts },
          visualImages: [{ src: 'stale.jpg' }],
        });
        const listener = jasmine.createSpy('listener');
        track(vm.subscribe(listener));

        await vm.loadVisualProducts();

        expect(warn.calls.count()).toBe(1);
        expect(warn).toHaveBeenCalledWith(
          '[HeroViewModel] failed to load hero products:',
          'sin mensaje'
        );
        expect(vm.visualImages).toEqual([]);
        expect(listener).toHaveBeenCalledWith(vm);

        getProducts.and.rejectWith({ code: 'NO_MESSAGE' });
        await vm.loadVisualProducts();
        expect(warn).toHaveBeenCalledWith('[HeroViewModel] failed to load hero products:', {
          code: 'NO_MESSAGE',
        });
      });

      it('stops notifying after unsubscribe, including from loadVisualProducts', async () => {
        const getProducts = jasmine.createSpy('getProducts').and.resolveTo({ data: [] });
        const vm = new HeroViewModel({ productsApi: { getProducts } });
        const listener = jasmine.createSpy('listener');
        const unsubscribe = track(vm.subscribe(listener));

        await vm.loadVisualProducts();
        expect(listener.calls.count()).toBe(1);

        unsubscribe();
        await vm.loadVisualProducts();
        expect(listener.calls.count()).toBe(1);
      });
    });
  })();
})();
