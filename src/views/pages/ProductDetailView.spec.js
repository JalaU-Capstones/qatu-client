import { ProductDetailView } from './ProductDetailView.js';

const createProduct = (overrides = {}) => ({
  id: 'p1',
  name: 'Aguayo tradicional',
  seller_id: 'seller-10',
  state: 'published',
  seller: 'Tejidos Illimani',
  country: 'Bolivia',
  rating: 4.8,
  ratingsCount: 24,
  price: 40,
  currency: 'USD',
  imageUrl: null,
  category: { name: 'Textiles' },
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
  createProduct({ id: 'p2', name: 'Huipil', slug: 'huipil', price: 65 }),
  createProduct({ id: 'p3', name: 'Bolso', slug: 'bolso', price: 85 }),
  createProduct({ id: 'p4', name: 'Mochila', slug: 'mochila', price: 92 }),
];

const createMockViewModel = (overrides = {}) => {
  const listeners = new Set();
  const vm = {
    status: 'ready',
    product: createProduct(),
    similarProducts: createSimilar(),
    quantity: 1,
    activeTab: 'description',
    selectedImage: 0,
    isAdding: false,
    feedback: '',
    isUnpublishing: false,
    isDeleting: false,
    ownerActionFeedback: '',
    ownerActionFeedbackType: 'status',
    tabs: [
      { id: 'description', label: 'Descripción' },
      { id: 'features', label: 'Características' },
      { id: 'reviews', label: 'Reseñas' },
    ],
    load: jasmine.createSpy('load'),
    setQuantity: jasmine.createSpy('setQuantity'),
    setTab: jasmine.createSpy('setTab'),
    setSelectedImage: jasmine.createSpy('setSelectedImage'),
    addToCart: jasmine.createSpy('addToCart').and.resolveTo({ status: 'added' }),
    deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo({ status: 'success' }),
    unpublishProduct: jasmine.createSpy('unpublishProduct').and.callFake(async () => {
      vm.product = { ...vm.product, state: 'unpublished' };
      vm.ownerActionFeedback =
        'Producto despublicado. Ya no está disponible en el endpoint público products/{id}.';
      vm.notify();
      return { status: 'success' };
    }),
    isOutOfStock: () => false,
    getMaxQuantity: () => 10,
    getPriceLabel: () => 'US$ 40.00',
    getRatingLabel: () => '4.8 (24 reseñas)',
    getStarsFilled: () => [true, true, true, true, true],
    getSellerLine: () => 'Tejidos Illimani',
    getSellerInitials: () => 'TI',
    getSellerLocation: () => 'Textiles',
    getStockLabel: () => '10 disponibles',
    getGallery: () => [
      { path: 'https://cdn.qatu.test/p1-1.jpg', label: 'Vista frontal' },
      { path: 'https://cdn.qatu.test/p1-2.jpg', label: 'Detalle' },
      { path: 'https://cdn.qatu.test/p1-3.jpg', label: 'Reverso' },
    ],
    getSelectedImageLabel: () => 'Vista frontal',
    getAttributes: () => [{ label: 'Material', value: 'Lana de oveja' }],
    getReviews: () => [{ author: 'María', rating: 5, date: '12 sep 2026', comment: 'Excelente.' }],
    getStarsForRating: () => [true, true, true, true, true],
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      listeners.forEach((listener) => listener(vm));
    },
    ...overrides,
  };
  return vm;
};

describe('ProductDetailView', () => {
  let container;
  let viewModel;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = createMockViewModel();
    view = new ProductDetailView({ viewModel });
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('renders the product information, gallery, tabs, seller and recommendations', () => {
    view.mount(container);

    expect(container.querySelector('section.q-product-detail')).not.toBeNull();
    expect(container.querySelector('.q-breadcrumb')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__context').textContent).toBe(
      'PRODUCTOS / Textiles'
    );
    expect(container.querySelector('.q-product-detail__title').textContent).toBe(
      'Aguayo tradicional'
    );
    expect(container.querySelector('.q-product-detail__price').textContent).toBe('US$ 40.00');
    expect(container.querySelector('.q-product-detail__stock').textContent).toBe('10 disponibles');
    expect(container.querySelector('.q-product-detail__short-description').textContent).toBe(
      'Pieza tejida a mano.'
    );
    expect(container.querySelectorAll('.q-product-detail__thumbnail').length).toBe(3);
    expect(container.querySelector('.q-quantity-selector')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__add').textContent).toBe(
      'Agregar al carrito'
    );
    expect(container.querySelectorAll('.q-product-detail__tab')[0].textContent).toBe('Descripción');
    expect(container.querySelectorAll('.q-product-detail__tab').length).toBe(3);
    expect(container.querySelector('.q-product-detail__seller-card')).not.toBeNull();
    expect(container.querySelectorAll('.q-product-detail__similar-grid > li').length).toBe(3);
  });

  it('renders the loading state', () => {
    viewModel.status = 'loading';
    view.mount(container);

    expect(container.querySelector('.q-product-detail__message--loading').textContent).toContain(
      'Cargando producto'
    );
    expect(container.querySelector('.q-product-detail__layout')).toBeNull();
  });

  it('renders the not-found state with a link back to the catalog', () => {
    viewModel.status = 'not-found';
    view.mount(container);

    expect(container.querySelector('.q-product-detail__state-title').textContent).toBe(
      'Producto no encontrado'
    );
    const link = container.querySelector('.q-product-detail__state-link');
    expect(link.getAttribute('href')).toBe('/products');
    expect(link.dataset.route).toBe('');
  });

  it('renders the error state', () => {
    viewModel.status = 'error';
    viewModel.errorMessage = 'No pudimos cargar el producto.';
    view.mount(container);

    const message = container.querySelector('.q-product-detail__message--error');
    expect(message.textContent).toBe('No pudimos cargar el producto.');
    expect(message.getAttribute('role')).toBe('alert');
  });

  it('clicking the quantity controls calls setQuantity', () => {
    viewModel.quantity = 2;
    view.mount(container);

    container.querySelector('.q-quantity-selector__btn--increase').click();
    expect(viewModel.setQuantity).toHaveBeenCalledWith(3);

    container.querySelector('.q-quantity-selector__btn--decrease').click();
    expect(viewModel.setQuantity).toHaveBeenCalledWith(2);
  });

  it('clicking "Agregar al carrito" calls addToCart', () => {
    view.mount(container);
    container.querySelector('.q-product-detail__add').click();

    expect(viewModel.addToCart).toHaveBeenCalled();
  });

  it('clicking "Comprar ahora" adds the product and then calls onBuyNow', async () => {
    const onBuyNow = jasmine.createSpy('onBuyNow');
    view = new ProductDetailView({ viewModel, onBuyNow });
    view.mount(container);

    container.querySelector('.q-product-detail__buy-now').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(viewModel.addToCart).toHaveBeenCalled();
    expect(onBuyNow).toHaveBeenCalled();
  });

  it('clicking "Comprar ahora" as a guest triggers the auth-required callback', async () => {
    const onAuthRequired = jasmine.createSpy('onAuthRequired');
    viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo({ status: 'auth-required' });
    view = new ProductDetailView({ viewModel, onAuthRequired });
    view.mount(container);

    container.querySelector('.q-product-detail__buy-now').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onAuthRequired).toHaveBeenCalled();
  });

  it('clicking a tab calls setTab', () => {
    view.mount(container);

    const tabs = container.querySelectorAll('.q-product-detail__tab');
    tabs[1].click();
    expect(viewModel.setTab).toHaveBeenCalledWith('features');
  });

  it('clicking a thumbnail calls setSelectedImage', () => {
    view.mount(container);

    const thumbnails = container.querySelectorAll('.q-product-detail__thumbnail');
    thumbnails[2].click();
    expect(viewModel.setSelectedImage).toHaveBeenCalledWith(2);
  });

  it('renders the active tab content', () => {
    viewModel.activeTab = 'features';
    view.mount(container);

    expect(container.querySelector('.q-product-detail__attributes')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__attributes dt').textContent).toBe(
      'Material'
    );

    viewModel.activeTab = 'reviews';
    viewModel.notify();
    expect(container.querySelector('.q-product-detail__review')).not.toBeNull();
  });

  it('recommendation cards link to each product detail by slug', () => {
    view.mount(container);

    const cards = container.querySelectorAll('.q-product-detail__similar-grid > li');
    const links = Array.from(cards, (card) => card.querySelector('a'));
    expect(links.length).toBe(3);
    expect(links[0].getAttribute('href')).toBe('/products/huipil');
    expect(links[1].getAttribute('href')).toBe('/products/bolso');
    expect(links[2].getAttribute('href')).toBe('/products/mochila');
  });

  it('renders recommendation products with catalog cards and the placeholder image', () => {
    viewModel.similarProducts = createSimilar().map((product, index) => ({
      ...product,
      primary_image_path: index === 0 ? null : `/products/${product.id}.jpg`,
      average_rating: 4.5,
      ratings_count: 12,
    }));
    view.mount(container);

    const grid = container.querySelector('.q-product-detail__similar-grid');
    const cards = grid.querySelectorAll('.q-product-card--default');
    expect(grid.classList.contains('q-catalog__grid')).toBe(true);
    expect(cards.length).toBe(3);
    expect(cards[0].querySelector('.q-product-card-price').textContent).toBe('US$ 65.00');
    expect(cards[0].querySelector('.q-product-card-rating-value').textContent).toBe('4.5 (12)');
    expect(cards[0].querySelector('.q-product-card-placeholder-img').src).toContain(
      'product-placeholder.svg'
    );
    expect(cards[1].querySelector('.q-product-card-photo').getAttribute('src')).toContain(
      '/products/p3.jpg'
    );
  });

  it('adds a recommendation to cart through the supplied cart handler', async () => {
    const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
    view = new ProductDetailView({ viewModel, onAddToCart });
    view.mount(container);

    container.querySelector('.q-product-card-action').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onAddToCart).toHaveBeenCalledWith(viewModel.similarProducts[0], 1);
  });

  it('renders the real gallery photos when the frames have an image_path', () => {
    view.mount(container);

    expect(container.querySelectorAll('.q-product-detail__image-frame').length).toBe(4); // 1 main + 3 thumbs
    const mainPhoto = container.querySelector('.q-product-detail__image-photo--large');
    expect(mainPhoto).not.toBeNull();
    expect(mainPhoto.getAttribute('src')).toBe('https://cdn.qatu.test/p1-1.jpg');
    expect(mainPhoto.getAttribute('alt')).toBe('Vista frontal');
  });

  it('adding to the cart as a guest triggers the onAuthRequired callback', async () => {
    const onAuthRequired = jasmine.createSpy('onAuthRequired');
    viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo({ status: 'auth-required' });
    view = new ProductDetailView({ viewModel, onAuthRequired });
    view.mount(container);

    container.querySelector('.q-product-detail__add').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onAuthRequired).toHaveBeenCalled();
  });

  it('mount() loads the requested product slug', () => {
    view = new ProductDetailView({ viewModel, productSlug: 'aguayo-tradicional' });
    view.mount(container);

    expect(viewModel.load).toHaveBeenCalledWith('aguayo-tradicional');
  });

  it('disables the purchase controls when the product is out of stock', () => {
    viewModel.isOutOfStock = () => true;
    viewModel.getMaxQuantity = () => 1;
    viewModel.getStockLabel = () => 'Agotado';
    view.mount(container);

    const add = container.querySelector('.q-product-detail__add');
    const buy = container.querySelector('.q-product-detail__buy-now');
    expect(add.textContent).toBe('Agotado');
    expect(add.disabled).toBe(true);
    expect(buy.disabled).toBe(true);
    expect(container.querySelector('.q-quantity-selector__input').disabled).toBe(true);
  });

  it('shows feedback after adding a product', () => {
    viewModel.feedback = 'Añadiste 1 unidad al carrito.';
    view.mount(container);

    expect(container.querySelector('.q-product-detail__feedback').textContent).toBe(
      'Añadiste 1 unidad al carrito.'
    );
  });

  it('destroy() removes the section and unsubscribes', () => {
    view.mount(container);
    expect(container.querySelector('.q-product-detail')).not.toBeNull();

    view.destroy();

    expect(container.querySelector('.q-product-detail')).toBeNull();
  });

  it('renders a single-image gallery when product.images is absent', () => {
    viewModel.getGallery = () => [
      { path: 'https://cdn.qatu.test/only.jpg', label: 'Imagen del producto' },
    ];
    viewModel.selectedImage = 0;
    view.mount(container);

    expect(container.querySelectorAll('.q-product-detail__thumbnail').length).toBe(1);
    expect(
      container.querySelector('.q-product-detail__image-photo--large').getAttribute('src')
    ).toBe('https://cdn.qatu.test/only.jpg');
  });

  it('renders the reviews empty state when product has no reviews', () => {
    viewModel.getReviews = () => [];
    viewModel.activeTab = 'reviews';
    view.mount(container);

    expect(container.querySelector('.q-product-detail__reviews-empty').textContent).toBe(
      'Todavía no hay reseñas para este producto.'
    );
    expect(container.querySelector('.q-product-detail__review')).toBeNull();
  });

  it('renders the seller card with the Vendedor fallback when seller is not expanded', () => {
    viewModel.getSellerLine = () => 'Vendedor';
    viewModel.getSellerLocation = () => '';
    view.mount(container);

    expect(container.querySelector('.q-product-detail__seller-name').textContent).toBe('Vendedor');
    expect(container.querySelector('.q-product-detail__seller-location')).toBeNull();
  });

  // ─── authStore / own product (C5) ────────────────────────────────────────

  function makeAuthStore(user = null) {
    const authListeners = new Set();
    return {
      getUser: () => user,
      subscribe: jasmine.createSpy('subscribe').and.callFake((fn) => {
        authListeners.add(fn);
        return () => authListeners.delete(fn);
      }),
      _fire() {
        authListeners.forEach((fn) => fn());
      },
    };
  }

  it('C5-1: guest viewing any product can browse the detail and sees guarded purchase controls', () => {
    const authStore = makeAuthStore(null);
    const v = new ProductDetailView({ viewModel, authStore });
    v.mount(container);

    expect(container.querySelector('.q-product-detail__add')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__buy-now')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__feedback')).toBeNull();
    expect(container.querySelectorAll('.q-product-detail__tab').length).toBe(3);
    expect(container.querySelector('.q-product-detail__similar')).not.toBeNull();
    v.destroy();
  });

  it('buyer viewing another seller product sees stock and purchase controls', () => {
    viewModel.product = createProduct({ seller_id: 'seller-99' });
    const authStore = makeAuthStore({ id: 'buyer-10', username: 'comprador' });
    const v = new ProductDetailView({ viewModel, authStore });
    v.mount(container);

    expect(container.querySelector('.q-product-detail__stock').textContent).toBe('10 disponibles');
    expect(container.querySelector('.q-quantity-selector')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__add')).not.toBeNull();
    expect(container.querySelector('.q-product-detail__buy-now')).not.toBeNull();
    v.destroy();
  });

  it('C5-2: product owner sees dedicated edit, unpublish and delete actions', () => {
    viewModel.product = createProduct({ seller_id: 'seller-10' });
    const authStore = makeAuthStore({ id: 'seller-10', username: 'yo' });
    const onEditProduct = jasmine.createSpy('onEditProduct');
    const onDeleteProduct = jasmine.createSpy('onDeleteProduct');
    const v = new ProductDetailView({ viewModel, authStore });
    v.onEditProduct = onEditProduct;
    v.onDeleteProduct = onDeleteProduct;
    v.mount(container);

    expect(container.querySelector('.q-product-detail__add')).toBeNull();
    expect(container.querySelector('.q-product-detail__buy-now')).toBeNull();
    expect(container.querySelector('.q-product-detail__owner-actions')).not.toBeNull();
    const edit = container.querySelector('.q-product-detail__owner-button--edit');
    const unpublish = container.querySelector('.q-product-detail__owner-button--unpublish');
    const remove = container.querySelector('.q-product-detail__owner-button--delete');
    expect(edit.querySelector('svg').getAttribute('stroke-width')).toBe('1.75');
    edit.click();
    unpublish.click();
    remove.click();
    expect(onEditProduct).toHaveBeenCalledWith('p1');
    expect(viewModel.unpublishProduct).toHaveBeenCalled();
    expect(onDeleteProduct).toHaveBeenCalledWith('p1');
    v.destroy();
  });

  it('product owner delete action delegates to the confirmation flow without deleting directly', () => {
    viewModel.product = createProduct({ seller_id: 'seller-10' });
    const authStore = makeAuthStore({ id: 'seller-10' });
    const onDeleteProduct = jasmine.createSpy('onDeleteProduct');
    const v = new ProductDetailView({ viewModel, authStore, onDeleteProduct });
    v.mount(container);

    container.querySelector('.q-product-detail__owner-button--delete').click();

    expect(onDeleteProduct).toHaveBeenCalledWith('p1');
    expect(viewModel.deleteProduct).not.toHaveBeenCalled();
    v.destroy();
  });

  it('product owner sees an unpublish success alert with direct seller-products navigation', async () => {
    viewModel.product = createProduct({ seller_id: 'seller-10' });
    const authStore = makeAuthStore({ id: 'seller-10', username: 'yo' });
    const v = new ProductDetailView({ viewModel, authStore });
    v.mount(container);

    container.querySelector('.q-product-detail__owner-button--unpublish').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const alert = container.querySelector('.q-product-detail__owner-feedback');
    expect(alert.getAttribute('role')).toBe('status');
    expect(alert.textContent).toContain('endpoint público products/{id}');
    const link = alert.querySelector('a');
    expect(link.getAttribute('href')).toBe('/seller/products');
    expect(link.dataset.route).toBe('');
    v.destroy();
  });

  it('authStore change after render re-renders owner controls when user becomes the seller', () => {
    viewModel.product = createProduct({ seller_id: 'seller-10' });
    let currentUser = null;
    const authListeners = new Set();
    const authStore = {
      getUser: () => currentUser,
      subscribe: (fn) => {
        authListeners.add(fn);
        return () => authListeners.delete(fn);
      },
    };
    const v = new ProductDetailView({ viewModel, authStore });
    v.mount(container);

    // Initially guest → buttons show
    expect(container.querySelector('.q-product-detail__add')).not.toBeNull();

    // Login as the product's seller
    currentUser = { id: 'seller-10', username: 'yo' };
    authListeners.forEach((fn) => fn());

    // Purchase actions are replaced by the seller toolbar
    expect(container.querySelector('.q-product-detail__add')).toBeNull();
    expect(container.querySelector('.q-product-detail__owner-actions')).not.toBeNull();
    v.destroy();
  });

  it('C5-5: destroy() unsubscribes from authStore', () => {
    const authStore = makeAuthStore(null);
    const v = new ProductDetailView({ viewModel, authStore });
    v.mount(container);

    expect(authStore.subscribe).toHaveBeenCalled();
    const unsubSpy = jasmine.createSpy('unsub');
    v._authUnsubscribe = unsubSpy;
    v.destroy();

    expect(unsubSpy).toHaveBeenCalled();
  });

  it('renders fallback placeholder when image path is missing', () => {
    viewModel.getGallery = () => [
      { path: null, label: 'Sin imagen' },
      { path: null, label: 'Vista lateral' },
    ];
    view.mount(container);

    const mainPlaceholder = container.querySelector('.q-product-detail__image-placeholder--large');
    const mainMark = mainPlaceholder.querySelector('.q-product-detail__image-mark img');
    expect(mainMark.getAttribute('width')).toBe('160');
    expect(mainMark.getAttribute('height')).toBe('160');
    expect(mainPlaceholder.querySelector('.q-product-detail__image-label').textContent).toBe(
      'Sin imagen'
    );

    const thumbnailPlaceholder = container.querySelector(
      '.q-product-detail__thumbnail .q-product-detail__image-placeholder'
    );
    const thumbnailMark = thumbnailPlaceholder.querySelector('.q-product-detail__image-mark img');
    expect(thumbnailMark.getAttribute('width')).toBe('56');
    expect(thumbnailMark.getAttribute('height')).toBe('56');
  });
});
