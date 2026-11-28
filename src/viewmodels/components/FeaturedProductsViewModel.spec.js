import { ProductsApi } from '../../models/api/ProductsApi.js';
import { FeaturedProductsViewModel } from './FeaturedProductsViewModel.js';

/** Contract-shaped products (OpenAPI Product schema, list endpoint). */
const FEATURED_PRODUCTS = [
  {
    id: 'aguayo-tradicional-tarabuco',
    name: 'Aguayo tradicional de Tarabuco',
    slug: 'aguayo-tradicional-tarabuco',
    seller: { full_name: 'Tejidos Illimani' },
    price: 40,
    currency: 'USD',
    stock: 10,
    state: 'published',
    average_rating: 4.9,
    ratings_count: 24,
    primary_image_path: null,
  },
  {
    id: 'cafe-especialidad-cusco',
    name: 'Café de especialidad de Cusco 500 g',
    slug: 'cafe-especialidad-cusco',
    seller: { full_name: 'Café Altura Cusco' },
    price: 14,
    currency: 'USD',
    stock: 20,
    state: 'published',
    average_rating: 4.8,
    ratings_count: 18,
    primary_image_path: null,
  },
  {
    id: 'jarron-barro-negro-oaxaca',
    name: 'Jarrón de barro negro de Oaxaca',
    slug: 'jarron-barro-negro-oaxaca',
    seller: { full_name: 'Barro Negro Oaxaca' },
    price: 38,
    currency: 'USD',
    stock: 5,
    state: 'published',
    average_rating: 5.0,
    ratings_count: 12,
    primary_image_path: null,
  },
  {
    id: 'bolso-cuero-artesanal',
    name: 'Bolso de cuero artesanal',
    slug: 'bolso-cuero-artesanal',
    seller: { full_name: 'Pampa Cuero' },
    price: 85,
    currency: 'USD',
    stock: 3,
    state: 'published',
    average_rating: 4.7,
    ratings_count: 31,
    primary_image_path: null,
  },
  {
    id: 'audifonos-inalambricos-anc-pro',
    name: 'Audífonos inalámbricos ANC Pro',
    slug: 'audifonos-inalambricos-anc-pro',
    seller: { full_name: 'Andes Tech' },
    price: 165,
    currency: 'USD',
    stock: 8,
    state: 'published',
    average_rating: 4.6,
    ratings_count: 46,
    primary_image_path: null,
  },
  {
    id: 'chocolate-cacao-esmeraldas',
    name: 'Chocolate 70% cacao de Esmeraldas',
    slug: 'chocolate-cacao-esmeraldas',
    seller: { full_name: 'Cacao Esmeraldas' },
    price: 6,
    currency: 'USD',
    stock: 40,
    state: 'published',
    average_rating: 4.9,
    ratings_count: 27,
    primary_image_path: null,
  },
  {
    id: 'mochila-trekking-45l',
    name: 'Mochila de trekking 45 L',
    slug: 'mochila-trekking-45l',
    seller: { full_name: 'Sabores del Eje' },
    price: 92,
    currency: 'USD',
    stock: 7,
    state: 'published',
    average_rating: 4.8,
    ratings_count: 15,
    primary_image_path: null,
  },
  {
    id: 'huipil-bordado-guatemalteco',
    name: 'Huipil bordado guatemalteco',
    slug: 'huipil-bordado-guatemalteco',
    seller: { full_name: 'Telar Maya' },
    price: 65,
    currency: 'USD',
    stock: 15,
    state: 'published',
    average_rating: 4.9,
    ratings_count: 9,
    primary_image_path: null,
  },
];

const createFeaturedApi = () => ({
  getFeaturedProducts: jasmine
    .createSpy('getFeaturedProducts')
    .and.resolveTo(FEATURED_PRODUCTS.map((product) => ({ ...product }))),
});

const listProductsResponse = (data) =>
  new Response(JSON.stringify({ data, meta: {} }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('FeaturedProductsViewModel', () => {
  let viewModel;

  beforeEach(async () => {
    viewModel = new FeaturedProductsViewModel({ productsApi: createFeaturedApi() });
    await viewModel.load();
  });

  it('should initialize with the section copy from the design', () => {
    expect(viewModel.eyebrow).toBe('Seleccionados para ti');
    expect(viewModel.title).toBe('Destacados de la semana');
    expect(viewModel.subtitle).toBe('');
    expect(viewModel.link.label).toBe('Ver catálogo →');
    expect(viewModel.addToCartLabel).toBe('Añadir');
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

    it('loads weekly-sales-ranked products returned by ProductsApi', async () => {
      const products = [
        { id: 'p1', weekly_sales: 1, updated_at: '2026-11-19T00:00:00Z' },
        { id: 'p2', weekly_sales: 4, updated_at: '2026-11-16T00:00:00Z' },
      ];
      const productsApi = new ProductsApi({
        apiFetchFn: () => Promise.resolve(listProductsResponse(products)),
        authStore: { isAuthenticated: () => false },
      });
      const custom = new FeaturedProductsViewModel({ productsApi });

      await custom.load();

      expect(custom.products.map((product) => product.id)).toEqual(['p2', 'p1']);
      expect(custom.status).toBe('ready');
    });

    it('loads all-zero-order products newest updated first', async () => {
      const products = [
        { id: 'old', updated_at: '2026-11-10T00:00:00Z' },
        { id: 'new', updated_at: '2026-11-19T00:00:00Z' },
      ];
      const productsApi = new ProductsApi({
        apiFetchFn: () => Promise.resolve(listProductsResponse(products)),
        authStore: { isAuthenticated: () => false },
      });
      const custom = new FeaturedProductsViewModel({ productsApi });

      await custom.load();

      expect(custom.products.map((product) => product.id)).toEqual(['new', 'old']);
    });

    it('keeps the home section available if order data is unauthorized', async () => {
      const products = [{ id: 'p1', updated_at: '2026-11-19T00:00:00Z' }];
      const productsApi = new ProductsApi({
        apiFetchFn: () => Promise.resolve(listProductsResponse(products)),
        ordersApi: {
          listOrders: () =>
            Promise.reject(Object.assign(new Error('Unauthorized'), { statusCode: 401 })),
        },
        authStore: { isAuthenticated: () => true },
      });
      const custom = new FeaturedProductsViewModel({ productsApi });

      await custom.load();

      expect(custom.products).toEqual(products);
      expect(custom.status).toBe('ready');
      expect(custom.errorMessage).toBe('');
    });
  });

  describe('formatting', () => {
    it('should format the price like the design', () => {
      expect(viewModel.getPriceLabel({ price: 40, currency: 'USD' })).toBe('US$ 40.00');
      expect(viewModel.getPriceLabel({ price: 165, currency: 'USD' })).toBe('US$ 165.00');
      expect(viewModel.getPriceLabel({ price: 6, currency: 'USD' })).toBe('US$ 6.00');
    });

    it('should format the currency using the storefront convention', () => {
      expect(viewModel.getPriceLabel({ price: 10.5, currency: 'BOB' })).toBe('Bs 10.50');
      expect(viewModel.getPriceLabel({ price: 10.5 })).toBe('US$ 10.50');
    });

    it('should format the rating, the screen reader rating and the seller line', () => {
      const product = viewModel.products[0];

      expect(viewModel.getRatingLabel(product)).toBe('4.9 (24)');
      expect(viewModel.getRatingLabel({ average_rating: 5, ratings_count: 12 })).toBe('5.0 (12)');
      expect(viewModel.getRatingAccessibleLabel(product)).toBe('Calificación 4.9 de 5, 24 reseñas');
      // The list endpoint does not populate a seller; only a present
      // full_name/username is rendered.
      expect(viewModel.getOriginLabel(product)).toBe('Tejidos Illimani');
      expect(viewModel.getOriginLabel({ seller: 'Solo tienda' })).toBe('Solo tienda');
      expect(viewModel.getOriginLabel({ seller: { username: 'telarmaya' } })).toBe('telarmaya');
      expect(viewModel.getOriginLabel({ seller: {} })).toBe('');
      expect(viewModel.getOriginLabel({})).toBe('');
    });
  });

  describe('card helpers', () => {
    describe('getStarsFilled', () => {
      it('should return 5 booleans', () => {
        const result = viewModel.getStarsFilled({ average_rating: 3 });
        expect(result.length).toBe(5);
      });

      it('should fill the first N stars for a rating of N', () => {
        expect(viewModel.getStarsFilled({ average_rating: 4 })).toEqual([
          true,
          true,
          true,
          true,
          false,
        ]);
      });

      it('should fill the fifth star from a halfway rating (4.5)', () => {
        expect(viewModel.getStarsFilled({ average_rating: 4.5 })).toEqual([
          true,
          true,
          true,
          true,
          true,
        ]);
      });

      it('should return all false for a rating of 0', () => {
        expect(viewModel.getStarsFilled({ average_rating: 0 })).toEqual([
          false,
          false,
          false,
          false,
          false,
        ]);
      });
    });

    describe('getImageUrl', () => {
      it('should prioritize primary_image_path over gallery images', () => {
        expect(
          viewModel.getImageUrl({
            primary_image_path: 'https://cdn/p1.jpg',
            images: [{ url: 'https://cdn/gallery.jpg' }],
          })
        ).toBe('https://cdn/p1.jpg');
      });

      it('should use the gallery image when primary_image_path is empty', () => {
        expect(
          viewModel.getImageUrl({
            primary_image_path: ' ',
            images: [{ url: '  ', image_path: 'product-images/p1.jpg' }],
          })
        ).toContain('/product-images/p1.jpg');
      });

      it('should return null when the product has no image', () => {
        expect(viewModel.getImageUrl({})).toBeNull();
        expect(viewModel.getImageUrl({ primary_image_path: null })).toBeNull();
      });
    });

    describe('isNewProduct', () => {
      it('should honour an explicit product.isNew = true', () => {
        const product = { id: 'x', isNew: true };
        expect(viewModel.isNewProduct(product)).toBe(true);
      });

      it('should honour an explicit product.isNew = false', () => {
        const product = { id: viewModel.products[0].id, isNew: false };
        expect(viewModel.isNewProduct(product)).toBe(false);
      });

      it('should fall back to index < 2 when isNew is not set', () => {
        expect(viewModel.isNewProduct(viewModel.products[0])).toBe(true);
        expect(viewModel.isNewProduct(viewModel.products[1])).toBe(true);
        expect(viewModel.isNewProduct(viewModel.products[2])).toBe(false);
      });
    });
  });

  describe('add to cart', () => {
    it('should call onAddToCart with the product and return its result', async () => {
      const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
      viewModel.onAddToCart = onAddToCart;

      const result = await viewModel.addToCart('cafe-especialidad-cusco');

      expect(result).toEqual({ status: 'added' });
      expect(onAddToCart).toHaveBeenCalledTimes(1);
      expect(onAddToCart.calls.mostRecent().args[0].name).toBe(
        'Café de especialidad de Cusco 500 g'
      );
    });

    it('addToCart returns Promise<{ status: "not-found" }> when productId is unknown', async () => {
      const onAddToCart = jasmine.createSpy('onAddToCart');
      viewModel.onAddToCart = onAddToCart;

      const res = await viewModel.addToCart('does-not-exist');
      expect(res).toEqual({ status: 'not-found' });
      expect(onAddToCart).not.toHaveBeenCalled();
    });

    it('addToCart calls onAddToCart with the full product object', async () => {
      const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
      viewModel.onAddToCart = onAddToCart;

      await viewModel.addToCart('aguayo-tradicional-tarabuco');
      expect(onAddToCart).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'aguayo-tradicional-tarabuco',
          name: 'Aguayo tradicional de Tarabuco',
        })
      );
    });

    it('addToCart returns the promise value from onAddToCart', async () => {
      const customResult = { status: 'error', error: new Error('fail') };
      viewModel.onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo(customResult);

      const result = await viewModel.addToCart('aguayo-tradicional-tarabuco');
      expect(result).toBe(customResult);
    });

    it('addToCart returns { status: "added" } when onAddToCart is not set', async () => {
      viewModel.onAddToCart = null;
      const result = await viewModel.addToCart('cafe-especialidad-cusco');
      expect(result).toEqual({ status: 'added' });
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  /** Contract-shaped products (OpenAPI Product schema, list endpoint). */
  const FEATURED_PRODUCTS = [
    {
      id: 'aguayo-tradicional-tarabuco',
      name: 'Aguayo tradicional de Tarabuco',
      slug: 'aguayo-tradicional-tarabuco',
      seller: { full_name: 'Tejidos Illimani' },
      price: 40,
      currency: 'USD',
      stock: 10,
      state: 'published',
      average_rating: 4.9,
      ratings_count: 24,
      primary_image_path: null,
    },
    {
      id: 'cafe-especialidad-cusco',
      name: 'Café de especialidad de Cusco 500 g',
      slug: 'cafe-especialidad-cusco',
      seller: { full_name: 'Café Altura Cusco' },
      price: 14,
      currency: 'USD',
      stock: 20,
      state: 'published',
      average_rating: 4.8,
      ratings_count: 18,
      primary_image_path: null,
    },
    {
      id: 'jarron-barro-negro-oaxaca',
      name: 'Jarrón de barro negro de Oaxaca',
      slug: 'jarron-barro-negro-oaxaca',
      seller: { full_name: 'Barro Negro Oaxaca' },
      price: 38,
      currency: 'USD',
      stock: 5,
      state: 'published',
      average_rating: 5.0,
      ratings_count: 12,
      primary_image_path: null,
    },
    {
      id: 'bolso-cuero-artesanal',
      name: 'Bolso de cuero artesanal',
      slug: 'bolso-cuero-artesanal',
      seller: { full_name: 'Pampa Cuero' },
      price: 85,
      currency: 'USD',
      stock: 3,
      state: 'published',
      average_rating: 4.7,
      ratings_count: 31,
      primary_image_path: null,
    },
    {
      id: 'audifonos-inalambricos-anc-pro',
      name: 'Audífonos inalámbricos ANC Pro',
      slug: 'audifonos-inalambricos-anc-pro',
      seller: { full_name: 'Andes Tech' },
      price: 165,
      currency: 'USD',
      stock: 8,
      state: 'published',
      average_rating: 4.6,
      ratings_count: 46,
      primary_image_path: null,
    },
    {
      id: 'chocolate-cacao-esmeraldas',
      name: 'Chocolate 70% cacao de Esmeraldas',
      slug: 'chocolate-cacao-esmeraldas',
      seller: { full_name: 'Cacao Esmeraldas' },
      price: 6,
      currency: 'USD',
      stock: 40,
      state: 'published',
      average_rating: 4.9,
      ratings_count: 27,
      primary_image_path: null,
    },
    {
      id: 'mochila-trekking-45l',
      name: 'Mochila de trekking 45 L',
      slug: 'mochila-trekking-45l',
      seller: { full_name: 'Sabores del Eje' },
      price: 92,
      currency: 'USD',
      stock: 7,
      state: 'published',
      average_rating: 4.8,
      ratings_count: 15,
      primary_image_path: null,
    },
    {
      id: 'huipil-bordado-guatemalteco',
      name: 'Huipil bordado guatemalteco',
      slug: 'huipil-bordado-guatemalteco',
      seller: { full_name: 'Telar Maya' },
      price: 65,
      currency: 'USD',
      stock: 15,
      state: 'published',
      average_rating: 4.9,
      ratings_count: 9,
      primary_image_path: null,
    },
  ];

  const createFeaturedApi = () => ({
    getFeaturedProducts: jasmine
      .createSpy('getFeaturedProducts')
      .and.resolveTo(FEATURED_PRODUCTS.map((product) => ({ ...product }))),
  });

  describe('FeaturedProductsViewModel (recovered 1)', () => {
    let viewModel;

    beforeEach(async () => {
      viewModel = new FeaturedProductsViewModel({ productsApi: createFeaturedApi() });
      await viewModel.load();
    });

    describe('add to cart (recovered 2)', () => {
      it('addToCart returns Promise<{ status: "not-found" }> when productId is unknown', async () => {
        const onAddToCart = jasmine.createSpy('onAddToCart');
        viewModel.onAddToCart = onAddToCart;

        const res = await viewModel.addToCart('does-not-exist');
        expect(res).toEqual({ status: 'not-found' });
        expect(onAddToCart).not.toHaveBeenCalled();
      });

      it('addToCart returns { status: "added" } when onAddToCart is not set', async () => {
        viewModel.onAddToCart = null;
        const result = await viewModel.addToCart('cafe-especialidad-cusco');
        expect(result).toEqual({ status: 'added' });
      });
    });
  });

  (() => {
    describe('FeaturedProductsViewModel additional branches (recovered 3)', () => {
      let api;
      let disposers;
      let vm;

      beforeEach(() => {
        api = {
          getFeaturedProducts: jasmine
            .createSpy('getFeaturedProducts')
            .and.resolveTo([{ id: 'p1' }]),
        };
        vm = new FeaturedProductsViewModel({ productsApi: api });
        disposers = [];
      });

      afterEach(() => {
        disposers.forEach((unsubscribe) => unsubscribe());
      });

      it('accepts every custom section option including the image and error labels', () => {
        const link = { label: 'Todo el catalogo', href: '/catalogo' };
        const custom = new FeaturedProductsViewModel({
          eyebrow: 'Elegidos',
          title: 'Novedades',
          subtitle: 'Hecho a mano',
          link,
          addToCartLabel: 'Comprar',
          imagePlaceholderLabel: 'Sin foto',
          loadErrorMessage: 'No cargaron los productos',
          productsApi: api,
        });

        expect(custom.eyebrow).toBe('Elegidos');
        expect(custom.title).toBe('Novedades');
        expect(custom.subtitle).toBe('Hecho a mano');
        expect(custom.link).toBe(link);
        expect(custom.addToCartLabel).toBe('Comprar');
        expect(custom.imagePlaceholderLabel).toBe('Sin foto');
        expect(custom.loadErrorMessage).toBe('No cargaron los productos');
      });

      it('falls back to defaults for falsy option values', () => {
        const custom = new FeaturedProductsViewModel({
          eyebrow: '',
          title: '',
          subtitle: '',
          link: null,
          addToCartLabel: '',
          imagePlaceholderLabel: '',
          loadErrorMessage: '',
          productsApi: api,
        });

        expect(custom.eyebrow).toBe('Seleccionados para ti');
        expect(custom.title).toBe('Destacados de la semana');
        expect(custom.subtitle).toBe('');
        expect(custom.link).toEqual({ label: 'Ver catálogo →', href: '/products' });
        expect(custom.addToCartLabel).toBe('Añadir');
        expect(custom.imagePlaceholderLabel).toBe('Imagen del producto');
        expect(custom.loadErrorMessage).toBe('No pudimos cargar los productos destacados.');
      });

      it('uses the initial products truthiness to decide between idle and ready', () => {
        const nullProducts = new FeaturedProductsViewModel({ products: null });
        const emptyProducts = new FeaturedProductsViewModel({ products: [] });
        const nonArray = new FeaturedProductsViewModel({ products: 'not-an-array' });

        expect(nullProducts.status).toBe('idle');
        expect(nullProducts.products).toEqual([]);
        expect(emptyProducts.status).toBe('ready');
        expect(emptyProducts.products).toEqual([]);
        expect(nonArray.status).toBe('ready');
        expect(nonArray.products).toEqual([]);
      });

      it('exposes the loading status synchronously and notifies only after load settles', async () => {
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));

        const pending = vm.load();
        expect(vm.status).toBe('loading');
        expect(vm.errorMessage).toBe('');
        expect(listener).not.toHaveBeenCalled();

        await pending;
        expect(vm.status).toBe('ready');
        expect(vm.products).toEqual([{ id: 'p1' }]);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.calls.mostRecent().args[0]).toBe(vm);
      });

      it('treats non-array API data as an empty successful list', async () => {
        api.getFeaturedProducts.and.resolveTo({ products: [{ id: 'p1' }] });

        await vm.load();

        expect(vm.status).toBe('ready');
        expect(vm.products).toEqual([]);
        expect(vm.errorMessage).toBe('');
      });

      it('uses the custom load error message and resets it with setProducts', async () => {
        vm.loadErrorMessage = 'No cargaron los productos';
        api.getFeaturedProducts.and.rejectWith(new Error('offline'));

        await vm.load();
        expect(vm.status).toBe('error');
        expect(vm.products).toEqual([]);
        expect(vm.errorMessage).toBe('No cargaron los productos');

        vm.setProducts([{ id: 'p2' }]);
        expect(vm.status).toBe('ready');
        expect(vm.errorMessage).toBe('');
        expect(vm.products).toEqual([{ id: 'p2' }]);

        vm.setProducts(42);
        expect(vm.products).toEqual([]);
        expect(vm.status).toBe('ready');
      });

      it('formats null prices and characterizes a null product argument', () => {
        expect(vm.getPriceLabel({ price: null, currency: null })).toBe('0.00');
        expect(vm.getPriceLabel({ price: undefined, currency: undefined })).toBe('US$ 0.00');
        expect(() => vm.getPriceLabel(null)).toThrowError(TypeError);
      });

      it('keeps one decimal place in rating labels and uses a 4.5 star threshold', () => {
        for (const rating of [4.2, 4.4, 4.6]) {
          const product = { average_rating: rating, ratings_count: 7 };
          expect(vm.getRatingLabel(product)).toBe(`${rating.toFixed(1)} (7)`);
          expect(vm.getRatingAccessibleLabel(product)).toBe(
            `Calificación ${rating.toFixed(1)} de 5, 7 reseñas`
          );
        }

        expect(vm.getStarsFilled({ average_rating: 4.2 })).toEqual([true, true, true, true, false]);
        expect(vm.getStarsFilled({ average_rating: 4.4 })).toEqual([true, true, true, true, false]);
        expect(vm.getStarsFilled({ average_rating: 4.6 })).toEqual([true, true, true, true, true]);
      });

      it('returns an empty origin label for null and empty sellers', () => {
        expect(vm.getOriginLabel({ seller: null })).toBe('');
        expect(vm.getOriginLabel({ seller: '' })).toBe('');
        expect(vm.getOriginLabel({ seller: { full_name: '', username: '' } })).toBe('');
        expect(vm.getOriginLabel({ seller: { full_name: 'Tienda', username: 'user' } })).toBe(
          'Tienda'
        );
      });

      it('returns null for undefined image paths', () => {
        expect(vm.getImageUrl(undefined)).toBeNull();
        expect(vm.getImageUrl(null)).toBeNull();
      });

      it('ignores string isNew values and a missing id in the index fallback', () => {
        vm.setProducts([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);

        expect(vm.isNewProduct({ id: 'p1', isNew: 'true' })).toBe(true);
        expect(vm.isNewProduct({ id: 'p3', isNew: 'true' })).toBe(false);
        expect(vm.isNewProduct({ id: 'p1', isNew: 'false' })).toBe(true);
        expect(vm.isNewProduct({ isNew: 'true' })).toBe(false);
        expect(vm.isNewProduct({})).toBe(false);
        expect(vm.isNewProduct({ id: 'p2', isNew: false })).toBe(false);
      });

      it('treats undefined, null and false add-to-cart callbacks as absent', async () => {
        vm.setProducts([{ id: 'p1', name: 'One' }]);

        for (const callback of [undefined, null, false]) {
          vm.onAddToCart = callback;
          await expectAsync(vm.addToCart('p1')).toBeResolvedTo({ status: 'added' });
        }

        for (const result of [undefined, null, false]) {
          vm.onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo(result);
          await expectAsync(vm.addToCart('p1')).toBeResolvedTo({ status: 'added' });
        }
      });

      it('propagates add-to-cart rejections and treats non-string ids as not found', async () => {
        vm.setProducts([{ id: 'p1', name: 'One' }]);
        const error = new Error('cart boom');
        vm.onAddToCart = jasmine.createSpy('onAddToCart').and.rejectWith(error);

        await expectAsync(vm.addToCart('p1')).toBeRejectedWithError('cart boom');

        for (const id of [123, null, undefined, {}]) {
          await expectAsync(vm.addToCart(id)).toBeResolvedTo({ status: 'not-found' });
        }
        expect(vm.onAddToCart).toHaveBeenCalledTimes(1);
      });

      it('stops notifying after unsubscribe across reloads', async () => {
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);
        disposers.push(unsubscribe);

        await vm.load();
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();
        await vm.load();
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
