import { ProductDetailViewModel } from './ProductDetailViewModel.js';

const createProduct = (overrides = {}) => ({
  id: 'p1',
  name: 'Aguayo tradicional',
  seller: 'Tejidos Illimani',
  country: 'Bolivia',
  rating: 4.8,
  ratingsCount: 24,
  price: 40,
  currency: 'USD',
  imageUrl: null,
  category: 'Textiles',
  stock: 10,
  description: 'Pieza tejida a mano.',
  attributes: [{ label: 'Material', value: 'Lana de oveja' }],
  gallery: [{ label: 'Vista frontal' }, { label: 'Detalle' }, { label: 'Reverso' }],
  reviews: [{ author: 'María', rating: 5, date: '12 sep 2026', comment: 'Excelente.' }],
  sellerSince: 2018,
  sellerSales: 320,
  ...overrides,
});

const createSimilar = () => [
  createProduct({ id: 'p2', name: 'Huipil', price: 65 }),
  createProduct({ id: 'p3', name: 'Bolso', price: 85 }),
  createProduct({ id: 'p4', name: 'Mochila', price: 92 }),
];

const createApi = ({
  product = createProduct(),
  similar = createSimilar(),
  error = null,
} = {}) => ({
  getProductById: jasmine
    .createSpy('getProductById')
    .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(product))),
  getSimilarProducts: jasmine
    .createSpy('getSimilarProducts')
    .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(similar))),
});

const createCartStore = () => ({
  addItem: jasmine
    .createSpy('addItem')
    .and.callFake((product, quantity) => Promise.resolve({ ...product, quantity })),
});

describe('ProductDetailViewModel', () => {
  let api;
  let cartStore;
  let vm;

  beforeEach(() => {
    api = createApi();
    cartStore = createCartStore();
    vm = new ProductDetailViewModel({ productsApi: api, cartStore });
  });

  it('starts idle with no product', () => {
    expect(vm.status).toBe('idle');
    expect(vm.product).toBeNull();
    expect(vm.similarProducts).toEqual([]);
    expect(vm.quantity).toBe(1);
  });

  it('load() fetches the product and three recommendations', async () => {
    await vm.load('p1');

    expect(api.getProductById).toHaveBeenCalledWith('p1');
    expect(api.getSimilarProducts).toHaveBeenCalledWith('p1', 3);
    expect(vm.status).toBe('ready');
    expect(vm.product.id).toBe('p1');
    expect(vm.similarProducts.length).toBe(3);
    expect(vm.quantity).toBe(1);
    expect(vm.activeTab).toBe('description');
    expect(vm.selectedImage).toBe(0);
  });

  it('load() sets not-found when the product does not exist', async () => {
    api = createApi({ product: null });
    vm = new ProductDetailViewModel({ productsApi: api, cartStore });

    await vm.load('missing');

    expect(vm.status).toBe('not-found');
    expect(vm.product).toBeNull();
  });

  it('load() sets error when the API rejects', async () => {
    api = createApi({ error: new Error('Network down') });
    vm = new ProductDetailViewModel({ productsApi: api, cartStore });

    await vm.load('p1');

    expect(vm.status).toBe('error');
    expect(vm.errorMessage).toBe('Network down');
  });

  it('notifies subscribers during load', async () => {
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    await vm.load('p1');

    expect(listener.calls.count()).toBeGreaterThanOrEqual(2);
  });

  it('setQuantity clamps between 1 and the available stock', () => {
    vm.product = createProduct({ stock: 4 });
    vm.status = 'ready';

    vm.setQuantity(3);
    expect(vm.quantity).toBe(3);

    vm.setQuantity(0);
    expect(vm.quantity).toBe(1);

    vm.setQuantity(99);
    expect(vm.quantity).toBe(4);
  });

  it('incrementQuantity and decrementQuantity respect the bounds', () => {
    vm.product = createProduct({ stock: 2 });
    vm.status = 'ready';

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
    await vm.load('p1');

    vm.setSelectedImage(2);
    expect(vm.selectedImage).toBe(2);
    expect(vm.getSelectedImageLabel()).toBe('Reverso');

    vm.setSelectedImage(99);
    expect(vm.selectedImage).toBe(2);

    vm.setSelectedImage(-1);
    expect(vm.selectedImage).toBe(0);
  });

  it('formats price, rating, seller and stock labels', async () => {
    await vm.load('p1');

    expect(vm.getPriceLabel()).toBe('US$ 40.00');
    expect(vm.getRatingLabel()).toBe('4.8 (24 reseñas)');
    expect(vm.getSellerLine()).toBe('Tejidos Illimani · Bolivia');
    expect(vm.getSellerInitials()).toBe('TI');
    expect(vm.getStockLabel()).toBe('10 disponibles');
    expect(vm.getStarsFilled()).toEqual([true, true, true, true, true]);
  });

  it('uses the low-stock and out-of-stock labels', () => {
    vm.product = createProduct({ stock: 3 });
    expect(vm.getStockLabel()).toBe('Últimas 3 unidades');

    vm.product = createProduct({ stock: 0 });
    expect(vm.getStockLabel()).toBe('Agotado');
    expect(vm.isOutOfStock()).toBe(true);
  });

  it('addToCart writes the product and selected quantity to the cart', async () => {
    await vm.load('p1');
    vm.setQuantity(2);

    const result = await vm.addToCart();

    expect(result.status).toBe('added');
    expect(cartStore.addItem).toHaveBeenCalledWith(vm.product, 2);
    expect(vm.feedback).toContain('2 unidades');
    expect(vm.isAdding).toBe(false);
  });

  it('addToCart does not add an out-of-stock product', async () => {
    vm.product = createProduct({ stock: 0 });
    vm.status = 'ready';

    const result = await vm.addToCart();

    expect(result.status).toBe('error');
    expect(cartStore.addItem).not.toHaveBeenCalled();
  });

  it('addToCart reports an error when the store rejects', async () => {
    cartStore.addItem.and.returnValue(Promise.reject(new Error('Storage full')));
    vm = new ProductDetailViewModel({ productsApi: api, cartStore });
    await vm.load('p1');

    const result = await vm.addToCart();

    expect(result.status).toBe('error');
    expect(vm.feedback).toBe('No pudimos añadir el producto al carrito.');
    expect(vm.isAdding).toBe(false);
  });
});
