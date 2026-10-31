import { ProductDetailViewModel } from './ProductDetailViewModel.js';

/**
 * Contract-shaped product fixture (GET /v1/products/{id}):
 * `average_rating`, `ratings_count`, `seller.full_name`, `images[].image_path`,
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
    { image_path: 'https://cdn.qatu.test/p1-1.jpg', position: 1, label: 'Vista frontal' },
    { image_path: 'https://cdn.qatu.test/p1-2.jpg', position: 2, label: 'Detalle' },
    { image_path: 'https://cdn.qatu.test/p1-3.jpg', position: 3, label: 'Reverso' },
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
  getSimilarProducts: jasmine
    .createSpy('getSimilarProducts')
    .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(similar))),
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
    expect(vm.activeTab).toBe('features');
  });

  it('load() resolves the product by slug and three recommendations', async () => {
    await vm.load('aguayo-tradicional');

    expect(api.getProductBySlug).toHaveBeenCalledWith('aguayo-tradicional');
    expect(api.getSimilarProducts).toHaveBeenCalledWith('p1', 3);
    expect(vm.status).toBe('ready');
    expect(vm.product.slug).toBe('aguayo-tradicional');
    expect(vm.similarProducts.length).toBe(3);
    expect(vm.quantity).toBe(1);
    expect(vm.activeTab).toBe('features');
    expect(vm.selectedImage).toBe(0);
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

    vm.setTab('description');
    expect(vm.activeTab).toBe('description');
    expect(listener).toHaveBeenCalled();

    listener.calls.reset();
    vm.setTab('unknown');
    expect(vm.activeTab).toBe('description');
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
});
