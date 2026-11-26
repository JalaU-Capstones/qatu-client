import { ProductDetailViewModel } from './ProductDetailViewModel.js';

/**
 * Contract-shaped product fixture (GET /v1/products/{id}):
 * `average_rating`, `ratings_count`, `seller.full_name`, `images[].path`,
 * `attributes` as a map.
 */
const createProduct = (overrides = {}) => ({
  id: 'p1',
  name: 'Aguayo tradicional',
  slug: 'aguayo-tradicional',
  seller: { full_name: 'Tejidos Illimani' },
  category: { name: 'Textiles' },
  price: 40,
  currency: 'USD',
  stock: 10,
  state: 'published',
  average_rating: 4.8,
  ratings_count: 24,
  primary_image_path: 'https://cdn.qatu.test/p1-main.jpg',
  images: [
    { path: 'https://cdn.qatu.test/p1-1.jpg', position: 1, label: 'Vista frontal' },
    { path: 'https://cdn.qatu.test/p1-2.jpg', position: 2, label: 'Detalle' },
    { path: 'https://cdn.qatu.test/p1-3.jpg', position: 3, label: 'Reverso' },
  ],
  attributes: {
    Material: 'Lana de oveja',
    Origen: 'La Paz, Bolivia',
  },
  reviews: [{ author: 'María', rating: 5, date: '12 sep 2026', comment: 'Excelente.' }],
  ...overrides,
});

const createSimilar = () => [
  createProduct({ id: 'p2', name: 'Huipil', price: 65, slug: 'huipil' }),
  createProduct({ id: 'p3', name: 'Bolso', price: 85, slug: 'bolso' }),
  createProduct({ id: 'p4', name: 'Mochila', price: 92, slug: 'mochila' }),
];

const createApi = ({
  product = createProduct(),
  similar = createSimilar(),
  error = null,
} = {}) => ({
  getProductBySlug: jasmine
    .createSpy('getProductBySlug')
    .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(product))),
  getProductById: jasmine
    .createSpy('getProductById')
    .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(product))),
  getSimilarProducts: jasmine
    .createSpy('getSimilarProducts')
    .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(similar))),
  unpublishProduct: jasmine.createSpy('unpublishProduct').and.resolveTo({ data: {} }),
  deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo(undefined),
});

const createCartService = ({ result = { status: 'added' } } = {}) => ({
  addToCart: jasmine.createSpy('addToCart').and.callFake(() => Promise.resolve(result)),
});

describe('ProductDetailViewModel', () => {
  let api;
  let cartService;
  let vm;

  beforeEach(() => {
    api = createApi();
    cartService = createCartService();
    vm = new ProductDetailViewModel({ productsApi: api, cartService });
  });

  it('starts idle with no product', () => {
    expect(vm.status).toBe('idle');
    expect(vm.product).toBeNull();
    expect(vm.similarProducts).toEqual([]);
    expect(vm.quantity).toBe(1);
    expect(vm.activeTab).toBe('description');
  });

  it('load() resolves the product by slug and three recommendations', async () => {
    await vm.load('aguayo-tradicional');

    expect(api.getProductBySlug).toHaveBeenCalledWith('aguayo-tradicional');
    expect(api.getSimilarProducts).toHaveBeenCalledWith('p1', 3);
    expect(vm.status).toBe('ready');
    expect(vm.product.slug).toBe('aguayo-tradicional');
    expect(vm.similarProducts.length).toBe(3);
    expect(vm.quantity).toBe(1);
    expect(vm.activeTab).toBe('description');
    expect(vm.selectedImage).toBe(0);
  });

  it('load() resolves UUID product routes directly by ID', async () => {
    const productId = 'c1111111-1111-4111-8111-111111111111';
    api = createApi({ product: createProduct({ id: productId }) });
    vm = new ProductDetailViewModel({ productsApi: api, cartService });

    await vm.load(productId);

    expect(api.getProductById).toHaveBeenCalledWith(productId);
    expect(api.getProductBySlug).not.toHaveBeenCalled();
    expect(vm.status).toBe('ready');
    expect(vm.product.id).toBe(productId);
  });

  it('load() sets not-found when the product does not exist', async () => {
    api = createApi({ product: null });
    vm = new ProductDetailViewModel({ productsApi: api, cartService });

    await vm.load('missing');

    expect(vm.status).toBe('not-found');
    expect(vm.product).toBeNull();
  });

  it('load() sets error when the API rejects', async () => {
    api = createApi({ error: new Error('Network down') });
    vm = new ProductDetailViewModel({ productsApi: api, cartService });

    await vm.load('aguayo-tradicional');

    expect(vm.status).toBe('error');
    expect(vm.errorMessage).toBe('Network down');
  });

  it('notifies subscribers during load', async () => {
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    await vm.load('aguayo-tradicional');

    expect(listener.calls.count()).toBeGreaterThanOrEqual(2);
  });

  it('setQuantity clamps between 1 and the available stock', async () => {
    await vm.load('aguayo-tradicional');
    vm.product = createProduct({ stock: 4 });

    vm.setQuantity(3);
    expect(vm.quantity).toBe(3);

    vm.setQuantity(0);
    expect(vm.quantity).toBe(1);

    vm.setQuantity(99);
    expect(vm.quantity).toBe(4);
  });

  it('incrementQuantity and decrementQuantity respect the bounds', async () => {
    await vm.load('aguayo-tradicional');
    vm.product = createProduct({ stock: 2 });

    vm.incrementQuantity();
    expect(vm.quantity).toBe(2);

    vm.incrementQuantity();
    expect(vm.quantity).toBe(2);

    vm.decrementQuantity();
    expect(vm.quantity).toBe(1);

    vm.decrementQuantity();
    expect(vm.quantity).toBe(1);
  });

  it('setTab updates a valid tab and ignores unknown tabs', () => {
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    vm.setTab('features');
    expect(vm.activeTab).toBe('features');
    expect(listener).toHaveBeenCalled();

    listener.calls.reset();
    vm.setTab('unknown');
    expect(vm.activeTab).toBe('features');
    expect(listener).not.toHaveBeenCalled();
  });

  it('setSelectedImage updates the gallery index within bounds', async () => {
    await vm.load('aguayo-tradicional');

    vm.setSelectedImage(2);
    expect(vm.selectedImage).toBe(2);
    expect(vm.getSelectedImageLabel()).toBe('Reverso');

    vm.setSelectedImage(99);
    expect(vm.selectedImage).toBe(2);

    vm.setSelectedImage(-1);
    expect(vm.selectedImage).toBe(0);
  });

  it('formats price, rating, seller and stock labels from the contract fields', async () => {
    await vm.load('aguayo-tradicional');

    expect(vm.getPriceLabel()).toBe('US$ 40.00');
    expect(vm.getRatingLabel()).toBe('4.8 (24 reseñas)');
    expect(vm.getSellerLine()).toBe('Tejidos Illimani');
    expect(vm.getSellerInitials()).toBe('TI');
    expect(vm.getSellerLocation()).toBe('Textiles');
    expect(vm.getStockLabel()).toBe('10 disponibles');
    expect(vm.getStarsFilled()).toEqual([true, true, true, true, true]);
  });

  it('falls back to seller username and to the Vendedor default', async () => {
    vm.product = createProduct({ seller: { username: 'illimani_bolivia' } });
    expect(vm.getSellerLine()).toBe('illimani_bolivia');
    expect(vm.getSellerInitials()).toBe('I');

    vm.product = createProduct({ seller: {} });
    expect(vm.getSellerLine()).toBe('Vendedor');
    expect(vm.getSellerInitials()).toBe('V');
  });

  it('reports out-of-stock and max quantity', async () => {
    vm.product = createProduct({ stock: 0 });
    expect(vm.getStockLabel()).toBe('Agotado');
    expect(vm.isOutOfStock()).toBe(true);
    expect(vm.getMaxQuantity()).toBe(1);

    vm.product = createProduct({ stock: 12 });
    expect(vm.isOutOfStock()).toBe(false);
    expect(vm.getMaxQuantity()).toBe(12);
  });

  it('getGallery normalizes the contract images and falls back to the primary image', async () => {
    await vm.load('aguayo-tradicional');

    expect(vm.getGallery()).toEqual([
      { path: 'https://cdn.qatu.test/p1-1.jpg', label: 'Vista frontal' },
      { path: 'https://cdn.qatu.test/p1-2.jpg', label: 'Detalle' },
      { path: 'https://cdn.qatu.test/p1-3.jpg', label: 'Reverso' },
    ]);

    vm.product = createProduct({
      images: [],
      primary_image_path: 'https://cdn.qatu.test/p1-main.jpg',
    });
    expect(vm.getGallery()).toEqual([
      { path: 'https://cdn.qatu.test/p1-main.jpg', label: 'Imagen del producto' },
    ]);

    vm.product = createProduct({ images: [], primary_image_path: null });
    expect(vm.getGallery()).toEqual([]);
  });

  it('getAttributes flattens the contract attributes map', async () => {
    await vm.load('aguayo-tradicional');

    expect(vm.getAttributes()).toEqual([
      { label: 'Material', value: 'Lana de oveja' },
      { label: 'Origen', value: 'La Paz, Bolivia' },
    ]);

    vm.product = createProduct({ attributes: null });
    expect(vm.getAttributes()).toEqual([]);
  });

  it('getReviews returns the contract reviews list', async () => {
    await vm.load('aguayo-tradicional');
    expect(vm.getReviews().length).toBe(1);
  });

  it('addToCart delegates to cartService with the product id and quantity', async () => {
    await vm.load('aguayo-tradicional');
    vm.setQuantity(2);

    const result = await vm.addToCart();

    expect(result.status).toBe('added');
    expect(cartService.addToCart).toHaveBeenCalledWith(vm.product.id, 2);
    expect(vm.feedback).toContain('2 unidades');
    expect(vm.isAdding).toBe(false);
  });

  it('addToCart surfaces the auth-required union for guests', async () => {
    cartService = createCartService({ result: { status: 'auth-required' } });
    vm = new ProductDetailViewModel({ productsApi: api, cartService });
    await vm.load('aguayo-tradicional');

    const result = await vm.addToCart();

    expect(result.status).toBe('auth-required');
    expect(vm.feedback).toContain('Inicia sesión');
    expect(vm.isAdding).toBe(false);
  });

  it('addToCart does not add an out-of-stock product', async () => {
    vm.product = createProduct({ stock: 0 });

    const result = await vm.addToCart();

    expect(result.status).toBe('error');
    expect(cartService.addToCart).not.toHaveBeenCalled();
  });

  it('addToCart reports an error when the service rejects', async () => {
    cartService = createCartService({ result: Promise.reject(new Error('Storage full')) });
    vm = new ProductDetailViewModel({ productsApi: api, cartService });
    await vm.load('aguayo-tradicional');

    const result = await vm.addToCart();

    expect(result.status).toBe('error');
    expect(vm.feedback).toBe('No pudimos añadir el producto al carrito.');
    expect(vm.isAdding).toBe(false);
  });

  it('unpublishProduct calls the API and exposes the public-endpoint notice', async () => {
    await vm.load('aguayo-tradicional');

    const result = await vm.unpublishProduct();

    expect(result.status).toBe('success');
    expect(api.unpublishProduct).toHaveBeenCalledWith('p1');
    expect(vm.product.state).toBe('unpublished');
    expect(vm.ownerActionFeedback).toContain('endpoint público products/{id}');
    expect(vm.ownerActionFeedbackType).toBe('status');
    expect(vm.isUnpublishing).toBe(false);
  });

  it('unpublishProduct surfaces API errors and prevents duplicate mutations', async () => {
    await vm.load('aguayo-tradicional');
    api.unpublishProduct.and.rejectWith(new Error('No autorizado'));

    const result = await vm.unpublishProduct();

    expect(result.status).toBe('error');
    expect(api.unpublishProduct).toHaveBeenCalledTimes(1);
    expect(vm.ownerActionFeedback).toBe('No autorizado');
    expect(vm.ownerActionFeedbackType).toBe('alert');
    expect(vm.isUnpublishing).toBe(false);
  });

  it('does not unpublish a product that is not published', async () => {
    vm.product = createProduct({ state: 'unpublished' });

    const result = await vm.unpublishProduct();

    expect(result.status).toBe('error');
    expect(api.unpublishProduct).not.toHaveBeenCalled();
  });

  it('deleteProduct deletes the loaded product and reports failures', async () => {
    await vm.load('aguayo-tradicional');

    expect((await vm.deleteProduct()).status).toBe('success');
    expect(api.deleteProduct).toHaveBeenCalledWith('p1');

    api.deleteProduct.and.rejectWith(new Error('No autorizado'));
    const result = await vm.deleteProduct();
    expect(result.status).toBe('error');
    expect(result.error.message).toBe('No autorizado');
    expect(vm.isDeleting).toBe(false);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const createProduct = (overrides = {}) => ({
      id: 'p1',
      name: 'Aguayo tradicional',
      slug: 'aguayo-tradicional',
      seller_id: 'seller-1',
      seller: { full_name: 'Tejidos Illimani' },
      category: { name: 'Textiles' },
      price: 40,
      currency: 'USD',
      stock: 10,
      state: 'published',
      average_rating: 4.8,
      ratings_count: 24,
      primary_image_path: 'https://cdn.qatu.test/main.jpg',
      images: [
        { path: 'https://cdn.qatu.test/1.jpg', label: 'Vista frontal' },
        { path: 'https://cdn.qatu.test/2.jpg', label: 'Detalle' },
        { path: 'https://cdn.qatu.test/3.jpg', label: 'Reverso' },
      ],
      attributes: { Material: 'Lana' },
      reviews: [{ author: 'María' }],
      ...overrides,
    });

    const createApi = ({
      product = createProduct(),
      similar = [{ id: 'p2' }],
      productError = null,
      similarError = null,
    } = {}) => ({
      getProductBySlug: jasmine
        .createSpy('getProductBySlug')
        .and.callFake(() =>
          productError ? Promise.reject(productError) : Promise.resolve(product)
        ),
      getSimilarProducts: jasmine
        .createSpy('getSimilarProducts')
        .and.callFake(() =>
          similarError ? Promise.reject(similarError) : Promise.resolve(similar)
        ),
      unpublishProduct: jasmine.createSpy('unpublishProduct').and.resolveTo({ data: {} }),
      deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo(undefined),
    });

    const createCartService = ({ result = { status: 'added' }, error = null } = {}) => ({
      addToCart: jasmine
        .createSpy('addToCart')
        .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(result))),
    });

    const createViewModel = ({
      product,
      similar,
      productError,
      similarError,
      cartResult,
      cartError,
      authenticated = true,
    } = {}) => {
      const resolvedProduct = product === undefined ? createProduct() : product;
      const api = createApi({ product: resolvedProduct, similar, productError, similarError });
      const cartService = createCartService({ result: cartResult, error: cartError });
      const conversationsApi = {
        createOrGetConversation: jasmine
          .createSpy('createOrGetConversation')
          .and.resolveTo({ data: { id: 'conv-1' }, created: true }),
        sendMessage: jasmine.createSpy('sendMessage').and.resolveTo({ data: { id: 'msg-1' } }),
      };
      const router = { navigate: jasmine.createSpy('navigate') };
      const authRedirectStore = { setReturnTo: jasmine.createSpy('setReturnTo') };
      const authStore = { isAuthenticated: () => authenticated };
      const vm = new ProductDetailViewModel({
        productsApi: api,
        cartService,
        conversationsApi,
        authStore,
        authRedirectStore,
        router,
      });
      vm.product = resolvedProduct;
      return { vm, api, cartService, conversationsApi, authStore, authRedirectStore, router };
    };

    describe('ProductDetailViewModel additional branches (recovered 1)', () => {
      it('load coerces a non-array recommendations response to an empty list', async () => {
        for (const similar of [null, { data: [] }, 42, 'nope']) {
          const { vm, api } = createViewModel({ similar });

          await vm.load('aguayo-tradicional');

          expect(api.getSimilarProducts).toHaveBeenCalledWith('p1', 3);
          expect(vm.similarProducts).toEqual([]);
          expect(vm.status).toBe('ready');
        }

        const { vm, api } = createViewModel();
        api.getSimilarProducts.and.resolveTo(undefined);
        await vm.load('aguayo-tradicional');
        expect(vm.similarProducts).toEqual([]);
      });

      it('load maps non-Error rejections to the generic product message', async () => {
        const byProduct = createViewModel({ productError: 'boom' });
        await byProduct.vm.load('aguayo-tradicional');
        expect(byProduct.vm.status).toBe('error');
        expect(byProduct.vm.errorMessage).toBe('No pudimos cargar la información del producto.');
        expect(byProduct.vm.product).toBeNull();

        const bySimilar = createViewModel({ similarError: { reason: 'bad' } });
        await bySimilar.vm.load('aguayo-tradicional');
        expect(bySimilar.vm.status).toBe('error');
        expect(bySimilar.vm.errorMessage).toBe('No pudimos cargar la información del producto.');
      });

      it('load fails when only the recommendations request rejects', async () => {
        const { vm } = createViewModel({ similarError: new Error('Similares caídos') });

        await vm.load('aguayo-tradicional');

        expect(vm.status).toBe('error');
        expect(vm.errorMessage).toBe('Similares caídos');
        expect(vm.product).toBeNull();
        expect(vm.similarProducts).toEqual([]);
      });

      it('load clears error and owner feedback on a successful reload', async () => {
        const { vm, api } = createViewModel({ similarError: new Error('primero') });
        await vm.load('aguayo-tradicional');
        vm.ownerActionFeedback = 'feedback anterior';
        vm.ownerActionFeedbackType = 'alert';

        api.getSimilarProducts.and.resolveTo([{ id: 'p2' }]);
        await vm.load('aguayo-tradicional');

        expect(vm.status).toBe('ready');
        expect(vm.errorMessage).toBe('');
        expect(vm.ownerActionFeedback).toBe('');
        expect(vm.ownerActionFeedbackType).toBe('alert');
      });

      it('setTab ignores the active tab and unknown tabs without notifying', () => {
        const { vm } = createViewModel();
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        vm.setTab('description');
        expect(listener).not.toHaveBeenCalled();

        vm.setTab('features');
        expect(vm.activeTab).toBe('features');
        expect(listener).toHaveBeenCalledTimes(1);

        listener.calls.reset();
        vm.setTab('features');
        vm.setTab('unknown');
        expect(listener).not.toHaveBeenCalled();
      });

      it('setSelectedImage leaves the index untouched when the gallery is empty', () => {
        const { vm } = createViewModel({
          product: createProduct({ images: [], primary_image_path: null }),
        });
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);
        vm.selectedImage = 2;

        vm.setSelectedImage(0);

        expect(vm.selectedImage).toBe(2);
        expect(listener).not.toHaveBeenCalled();
      });

      it('setSelectedImage floors fractional indexes and coerces invalid indexes to zero', () => {
        const { vm } = createViewModel();

        vm.setSelectedImage(1.9);
        expect(vm.selectedImage).toBe(1);

        vm.setSelectedImage('abc');
        expect(vm.selectedImage).toBe(0);

        vm.setSelectedImage(null);
        expect(vm.selectedImage).toBe(0);

        vm.setSelectedImage(undefined);
        expect(vm.selectedImage).toBe(0);
      });

      it('setQuantity maps non-finite input to one and clamps to the stock floor', () => {
        const { vm } = createViewModel();

        vm.setQuantity('abc');
        expect(vm.quantity).toBe(1);

        vm.setQuantity(2.9);
        expect(vm.quantity).toBe(2);

        vm.setQuantity(Number.POSITIVE_INFINITY);
        expect(vm.quantity).toBe(1);
      });

      it('addToCart refuses to run without a product or while already adding', async () => {
        const { vm, cartService } = createViewModel();
        vm.product = null;

        const withoutProduct = await vm.addToCart();
        expect(withoutProduct.status).toBe('error');
        expect(withoutProduct.error.message).toBe('Producto no disponible');

        vm.product = createProduct();
        vm.isAdding = true;
        const whileAdding = await vm.addToCart();

        expect(whileAdding.status).toBe('error');
        expect(whileAdding.error.message).toBe('Producto no disponible');
        expect(cartService.addToCart).not.toHaveBeenCalled();
        expect(vm.feedback).toBe('');
        expect(vm.isAdding).toBeTrue();
      });

      it('addToCart reports a generic failure for an unrecognized service result', async () => {
        const { vm } = createViewModel({ cartResult: { status: 'mystery' } });

        const result = await vm.addToCart();

        expect(result).toEqual({ status: 'mystery' });
        expect(vm.feedback).toBe('No pudimos añadir el producto al carrito.');
        expect(vm.isAdding).toBeFalse();
      });

      it('addToCart uses the singular message for a single unit', async () => {
        const { vm, cartService } = createViewModel();

        const result = await vm.addToCart();

        expect(result.status).toBe('added');
        expect(cartService.addToCart).toHaveBeenCalledWith('p1', 1);
        expect(vm.feedback).toBe('Añadiste 1 unidad al carrito.');
      });

      it('addToCart returns non-Error rejections unchanged with generic feedback', async () => {
        const { vm } = createViewModel({ cartError: 'storage-down' });

        const result = await vm.addToCart();

        expect(result).toEqual({ status: 'error', error: 'storage-down' });
        expect(vm.feedback).toBe('No pudimos añadir el producto al carrito.');
        expect(vm.isAdding).toBeFalse();
      });

      it('isOutOfStock currently treats missing or non-numeric stock as available', async () => {
        for (const stock of [undefined, 'abc', Number.NaN]) {
          const { vm, cartService } = createViewModel({ product: createProduct({ stock }) });

          expect(vm.isOutOfStock()).toBeFalse();
          expect((await vm.addToCart()).status).toBe('added');
          expect(cartService.addToCart).toHaveBeenCalledWith('p1', 1);
        }
      });

      it('unpublishProduct refuses to run without a product or while already unpublishing', async () => {
        const { vm, api } = createViewModel();

        vm.product = null;
        expect((await vm.unpublishProduct()).status).toBe('error');

        vm.product = createProduct();
        vm.isUnpublishing = true;
        const result = await vm.unpublishProduct();

        expect(result.status).toBe('error');
        expect(result.error.message).toBe('El producto no se puede despublicar.');
        expect(api.unpublishProduct).not.toHaveBeenCalled();
        expect(vm.isUnpublishing).toBeTrue();
      });

      it('unpublishProduct falls back to a generic message for non-Error failures', async () => {
        const { vm, api } = createViewModel();
        api.unpublishProduct.and.rejectWith('not-an-error');

        const result = await vm.unpublishProduct();

        expect(result.status).toBe('error');
        expect(vm.ownerActionFeedback).toBe('No pudimos despublicar el producto.');
        expect(vm.ownerActionFeedbackType).toBe('alert');
        expect(vm.isUnpublishing).toBeFalse();
      });

      it('deleteProduct refuses when no product is loaded or a deletion is in flight', async () => {
        const { vm, api } = createViewModel();
        vm.product = null;

        const missing = await vm.deleteProduct();
        expect(missing.status).toBe('error');
        expect(missing.error.message).toBe('El producto no se puede eliminar.');

        vm.isDeleting = true;
        const busy = await vm.deleteProduct();
        expect(busy.status).toBe('error');
        expect(busy.error.message).toBe('El producto no se puede eliminar.');
        expect(api.deleteProduct).not.toHaveBeenCalled();
        expect(vm.isDeleting).toBeTrue();
      });

      it('deleteProduct returns a non-Error rejection unchanged and resets the flag', async () => {
        const { vm, api } = createViewModel();
        api.deleteProduct.and.rejectWith('denied');

        const result = await vm.deleteProduct();

        expect(result).toEqual({ status: 'error', error: 'denied' });
        expect(vm.isDeleting).toBeFalse();
      });

      it('redirects guests to login and remembers the current URL', async () => {
        const { vm, conversationsApi, authRedirectStore, router } = createViewModel({
          authenticated: false,
        });

        const result = await vm.contactSeller();

        expect(result).toEqual({ redirected: true });
        expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith(
          window.location.pathname + window.location.search
        );
        expect(router.navigate).toHaveBeenCalledWith('/login');
        expect(conversationsApi.createOrGetConversation).not.toHaveBeenCalled();
      });

      it('creates a conversation for an authenticated buyer and returns its id', async () => {
        const { vm, conversationsApi } = createViewModel();
        conversationsApi.createOrGetConversation.and.resolveTo({
          data: { id: 'conv-1' },
          created: true,
        });

        const result = await vm.contactSeller();

        expect(conversationsApi.createOrGetConversation).toHaveBeenCalledWith({
          sellerId: 'seller-1',
          productId: 'p1',
        });
        expect(result).toEqual({ conversationId: 'conv-1', created: true });
        expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
      });

      it('supports a seller id nested on the product and reports missing sellers', async () => {
        const { vm, conversationsApi } = createViewModel({
          product: createProduct({ seller_id: null, seller: { id: 'nested-seller' } }),
        });

        await vm.contactSeller();
        expect(conversationsApi.createOrGetConversation).toHaveBeenCalledWith({
          sellerId: 'nested-seller',
          productId: 'p1',
        });

        const missingSeller = createViewModel({
          product: createProduct({ seller_id: null, seller: { id: null } }),
        });
        await expectAsync(missingSeller.vm.contactSeller()).toBeRejectedWithError(
          'Vendedor no disponible'
        );
      });

      it('propagates conversation-creation failures', async () => {
        const { vm, conversationsApi } = createViewModel();
        conversationsApi.createOrGetConversation.and.rejectWith(
          new Error('No se pudo crear la conversación')
        );

        await expectAsync(vm.contactSeller()).toBeRejectedWithError(
          'No se pudo crear la conversación'
        );

        expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
      });

      it('getters return safe fallbacks when no product is loaded', () => {
        const { vm } = createViewModel();
        vm.product = null;

        expect(vm.getPriceLabel()).toBe('');
        expect(vm.getRatingLabel()).toBe('');
        expect(vm.getStarsFilled()).toEqual([false, false, false, false, false]);
        expect(vm.getSellerLine()).toBe('Vendedor');
        expect(vm.getSellerInitials()).toBe('V');
        expect(vm.getSellerLocation()).toBe('');
        expect(vm.getStockLabel()).toBe('');
        expect(vm.getGallery()).toEqual([]);
        expect(vm.getSelectedImageLabel()).toBe('Imagen principal');
        expect(vm.getAttributes()).toEqual([]);
        expect(vm.getReviews()).toEqual([]);
        expect(vm.isOutOfStock()).toBeTrue();
        expect(vm.getMaxQuantity()).toBe(1);
      });

      it('rating getters normalize missing fields and half-star thresholds', () => {
        const { vm } = createViewModel({
          product: createProduct({ average_rating: null, ratings_count: 0 }),
        });

        expect(vm.getRatingLabel()).toBe('0.0 (0 reseñas)');
        expect(vm.getStarsFilled()).toEqual([false, false, false, false, false]);

        vm.product = createProduct({ average_rating: '4.75', ratings_count: 3 });
        expect(vm.getRatingLabel()).toBe('4.8 (3 reseñas)');
        expect(vm.getStarsForRating(4.5)).toEqual([true, true, true, true, true]);
        expect(vm.getStarsForRating(4.49)).toEqual([true, true, true, true, false]);
        expect(vm.getStarsForRating(-1)).toEqual([false, false, false, false, false]);
        expect(vm.getStarsForRating(6)).toEqual([true, true, true, true, true]);
      });

      it('stock and max-quantity getters normalize missing, non-numeric and fractional values', () => {
        const { vm } = createViewModel({ product: createProduct({ stock: undefined }) });
        expect(vm.getStockLabel()).toBe('Agotado');
        expect(vm.getMaxQuantity()).toBe(1);

        vm.product = createProduct({ stock: 'abc' });
        expect(vm.getStockLabel()).toBe('Agotado');
        expect(vm.getMaxQuantity()).toBe(1);

        vm.product = createProduct({ stock: 4.9 });
        expect(vm.getStockLabel()).toBe('4.9 disponibles');
        expect(vm.getMaxQuantity()).toBe(4);

        vm.product = createProduct({ stock: Number.POSITIVE_INFINITY });
        expect(vm.getMaxQuantity()).toBe(1);
      });

      it('getGallery handles non-array images and malformed entries', () => {
        const { vm } = createViewModel({
          product: createProduct({ images: 'not-an-array', primary_image_path: null }),
        });
        expect(vm.getGallery()).toEqual([]);

        vm.product = createProduct({
          images: [null, { path: 123 }, { label: '' }, { path: 'x.jpg', label: 'Detalle' }],
          primary_image_path: null,
        });
        expect(vm.getGallery()).toEqual([
          { path: null, label: 'Vista 1' },
          { path: null, label: 'Vista 2' },
          { path: null, label: 'Vista 3' },
          { path: 'x.jpg', label: 'Detalle' },
        ]);
        expect(vm.getSelectedImageLabel()).toBe('Vista 1');

        vm.selectedImage = 99;
        expect(vm.getSelectedImageLabel()).toBe('Imagen principal');
      });

      it('getAttributes and getReviews ignore incompatible shapes and stringify nested values', () => {
        const { vm } = createViewModel({
          product: createProduct({ attributes: ['a'], reviews: 'not-an-array' }),
        });
        expect(vm.getAttributes()).toEqual([]);
        expect(vm.getReviews()).toEqual([]);

        vm.product = createProduct({
          attributes: { Texto: 'lana', Numero: 3, Nulo: null, Objeto: { a: 1 }, Arreglo: [1, 2] },
          reviews: [{ id: 'r1' }],
        });
        expect(vm.getAttributes()).toEqual([
          { label: 'Texto', value: 'lana' },
          { label: 'Numero', value: '3' },
          { label: 'Nulo', value: '' },
          { label: 'Objeto', value: '{"a":1}' },
          { label: 'Arreglo', value: '[1,2]' },
        ]);
        expect(vm.getReviews()).toEqual([{ id: 'r1' }]);

        vm.product = createProduct({ attributes: 'texto' });
        expect(vm.getAttributes()).toEqual([]);
      });

      it('seller getters currently leave whitespace-only names blank', () => {
        const { vm } = createViewModel({
          product: createProduct({
            seller: { full_name: '   ', username: 'vendedor' },
            category: null,
          }),
        });

        expect(vm.getSellerLine()).toBe('   ');
        expect(vm.getSellerInitials()).toBe('');
        expect(vm.getSellerLocation()).toBe('');
      });

      it('subscribe returns an unsubscribe callback that stops notifications', () => {
        const { vm } = createViewModel();
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);

        vm.setTab('features');
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();
        vm.setTab('reviews');
        vm.setSelectedImage(1);

        expect(vm.activeTab).toBe('reviews');
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
