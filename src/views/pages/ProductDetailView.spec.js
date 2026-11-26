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

// Recovered coverage from backup/pre-rebase-tests
(() => {
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
      getReviews: () => [
        { author: 'María', rating: 5, date: '12 sep 2026', comment: 'Excelente.' },
      ],
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

  describe('ProductDetailView (recovered 1)', () => {
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
      viewModel.addToCart = jasmine
        .createSpy('addToCart')
        .and.resolveTo({ status: 'auth-required' });
      view = new ProductDetailView({ viewModel, onAuthRequired });
      view.mount(container);

      container.querySelector('.q-product-detail__buy-now').click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onAuthRequired).toHaveBeenCalled();
    });
  });

  (() => {
    const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    const createProduct = (overrides = {}) => ({
      id: 'p1',
      name: 'Aguayo tradicional',
      slug: 'aguayo-tradicional',
      seller_id: 'seller-10',
      state: 'published',
      seller: 'Tejidos Illimani',
      country: 'Bolivia',
      average_rating: 4.8,
      ratings_count: 24,
      price: 40,
      currency: 'USD',
      stock: 10,
      description: 'Pieza tejida a mano.',
      category: { name: 'Textiles' },
      attributes: [{ label: 'Material', value: 'Lana de oveja' }],
      gallery: [{ label: 'Vista frontal' }],
      reviews: [{ author: 'María', rating: 5, date: '12 sep 2026', comment: 'Excelente.' }],
      ...overrides,
    });

    const createAuthStore = ({ user = null, authenticated = false } = {}) => {
      const listeners = new Set();
      return {
        getUser: () => user,
        isAuthenticated: () => authenticated,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        fire() {
          listeners.forEach((listener) => listener());
        },
      };
    };

    const createMockViewModel = (overrides = {}) => {
      const listeners = new Set();
      const vm = {
        status: 'ready',
        product: createProduct(),
        errorMessage: '',
        similarProducts: [
          createProduct({
            id: 'p2',
            name: 'Huipil',
            slug: 'huipil',
            price: 65,
            seller_id: 'seller-20',
          }),
        ],
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
        unpublishProduct: jasmine
          .createSpy('unpublishProduct')
          .and.resolveTo({ status: 'success' }),
        contactSeller: jasmine
          .createSpy('contactSeller')
          .and.resolveTo({ conversationId: 'conv-1', created: true }),
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
        getReviews: () => [
          { author: 'María', rating: 5, date: '12 sep 2026', comment: 'Excelente.' },
        ],
        getStarsForRating: () => [true, true, true, true, true],
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        notify() {
          listeners.forEach((listener) => listener(vm));
        },
        listenerCount: () => listeners.size,
        ...overrides,
      };
      return vm;
    };

    describe('ProductDetailView additional branches (recovered 2)', () => {
      let container;
      let viewModel;
      let authStore;
      let view;

      const mountView = (options = {}) => {
        view = new ProductDetailView({ viewModel, authStore, ...options });
        return view.mount(container);
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = createMockViewModel();
        authStore = createAuthStore();
        view = new ProductDetailView({ viewModel, authStore });
      });

      afterEach(() => {
        view?.destroy();
        container.remove();
      });

      it('uses constructor defaults: null state, idle loading text and breadcrumb fallback', () => {
        const defaultView = new ProductDetailView();
        expect(defaultView.productSlug).toBeNull();
        expect(defaultView.onBuyNow).toBeNull();
        expect(defaultView.onAuthRequired).toBeNull();
        expect(defaultView.onEditProduct).toBeNull();
        expect(defaultView.onDeleteProduct).toBeNull();
        expect(defaultView.onAddToCart).toBeNull();
        expect(defaultView.onNavigate).toBeNull();
        expect(defaultView.element).toBeNull();
        expect(defaultView._unsubscribe).toBeNull();
        expect(defaultView._authUnsubscribe).toBeNull();
        expect(defaultView.viewModel.status).toBe('idle');

        const el = defaultView.render();
        expect(el.className).toBe('q-product-detail');
        expect(el.getAttribute('aria-label')).toBe('Detalle del producto');
        expect(el.querySelector('.q-product-detail__message--loading').textContent).toBe(
          'Cargando producto…'
        );
        expect(el.querySelector('.q-breadcrumb__current').textContent).toBe('Producto');
        defaultView.destroy();
      });

      it('render() is idempotent and _renderContent() is a no-op before render', () => {
        expect(() => view._renderContent()).not.toThrow();
        expect(view.element).toBeNull();

        const first = view.render();
        expect(view.render()).toBe(first);
        view.mount(container);
        expect(container.querySelectorAll('.q-product-detail').length).toBe(1);
        expect(view.render()).toBe(first);
      });

      it('does not call load() when no product slug is supplied', () => {
        mountView();
        expect(viewModel.load).not.toHaveBeenCalled();
      });

      it('destroy() before mount and twice afterwards is safe', () => {
        const detached = new ProductDetailView({ viewModel, authStore });
        expect(() => {
          detached.destroy();
          detached.destroy();
        }).not.toThrow();
        expect(detached.element).toBeNull();

        detached.mount(container);
        detached.destroy();
        detached.destroy();
        expect(container.querySelector('.q-product-detail')).toBeNull();
      });

      it('renders the idle status with the loading text and status role', () => {
        viewModel.status = 'idle';
        mountView();

        const message = container.querySelector('.q-product-detail__message--loading');
        expect(message.textContent).toBe('Cargando producto…');
        expect(message.getAttribute('role')).toBe('status');
        expect(container.querySelector('.q-product-detail__layout')).toBeNull();
      });

      it('uses the exact fallback error text when errorMessage is absent', () => {
        viewModel.status = 'error';
        viewModel.errorMessage = undefined;
        mountView();

        const message = container.querySelector('.q-product-detail__message--error');
        expect(message.textContent).toBe('No pudimos cargar la información del producto.');
        expect(message.getAttribute('role')).toBe('alert');
        expect(container.querySelector('.q-product-detail__state-title').textContent).toBe(
          'Algo salió mal'
        );
      });

      it('treats an unknown status as ready', () => {
        viewModel.status = 'unexpected';
        mountView();

        expect(container.querySelector('.q-product-detail__title').textContent).toBe(
          'Aguayo tradicional'
        );
        expect(container.querySelector('.q-product-detail__layout')).not.toBeNull();
      });

      it('renders breadcrumb links, separators and current-page metadata', () => {
        mountView();

        const nav = container.querySelector('.q-breadcrumb');
        expect(nav.getAttribute('aria-label')).toBe('Migas de pan');
        const links = nav.querySelectorAll('a.q-breadcrumb__link');
        expect(links[0].getAttribute('href')).toBe('/');
        expect(links[1].getAttribute('href')).toBe('/products');
        links.forEach((link) => expect(link.dataset.route).toBe(''));

        const separators = nav.querySelectorAll('.q-breadcrumb__separator');
        expect(separators.length).toBe(2);
        separators.forEach((separator) => {
          expect(separator.textContent).toBe('/');
          expect(separator.getAttribute('aria-hidden')).toBe('true');
        });

        const current = nav.querySelector('.q-breadcrumb__current');
        expect(current.textContent).toBe('Aguayo tradicional');
        expect(current.getAttribute('aria-current')).toBe('page');

        viewModel.status = 'loading';
        viewModel.product = null;
        viewModel.notify();
        expect(container.querySelector('.q-breadcrumb__current').textContent).toBe('Producto');
      });

      it('falls back to PRODUCTOS when the product category is missing', () => {
        viewModel.product = createProduct({ category: null });
        mountView();

        expect(container.querySelector('.q-product-detail__context').textContent).toBe('PRODUCTOS');
      });

      it('exposes gallery thumbnails with aria state and selected styling', () => {
        mountView();

        const group = container.querySelector('.q-product-detail__thumbnails');
        expect(group.getAttribute('role')).toBe('group');
        expect(group.getAttribute('aria-label')).toBe('Vistas del producto');
        const thumbnails = group.querySelectorAll('.q-product-detail__thumbnail');
        expect(Array.from(thumbnails, (button) => button.getAttribute('aria-label'))).toEqual([
          'Ver Vista frontal',
          'Ver Detalle',
          'Ver Reverso',
        ]);
        expect(Array.from(thumbnails, (button) => button.getAttribute('aria-pressed'))).toEqual([
          'true',
          'false',
          'false',
        ]);
        expect(thumbnails[0].classList.contains('is-selected')).toBe(true);
        expect(thumbnails[1].classList.contains('is-selected')).toBe(false);

        viewModel.selectedImage = 2;
        viewModel.notify();
        const updated = container.querySelectorAll('.q-product-detail__thumbnail');
        expect(Array.from(updated, (button) => button.getAttribute('aria-pressed'))).toEqual([
          'false',
          'false',
          'true',
        ]);
        expect(updated[2].classList.contains('is-selected')).toBe(true);
      });

      it('renders the Imagen principal placeholder for an empty gallery', () => {
        viewModel.getGallery = () => [];
        viewModel.getSelectedImageLabel = () => 'Imagen principal';
        mountView();

        expect(container.querySelectorAll('.q-product-detail__thumbnail').length).toBe(0);
        const placeholder = container.querySelector('.q-product-detail__image-placeholder--large');
        expect(placeholder).not.toBeNull();
        expect(placeholder.querySelector('.q-product-detail__image-label').textContent).toBe(
          'Imagen principal'
        );
      });

      it('uses an empty alt and the Imagen del producto placeholder on a large image error', () => {
        viewModel.getGallery = () => [{ path: 'https://cdn.qatu.test/blank.jpg', label: '' }];
        mountView();

        const photo = container.querySelector('.q-product-detail__image-photo--large');
        expect(photo.getAttribute('alt')).toBe('');
        photo.dispatchEvent(new Event('error'));

        expect(container.querySelector('.q-product-detail__image-photo--large')).toBeNull();
        const placeholder = container.querySelector('.q-product-detail__image-placeholder--large');
        expect(placeholder).not.toBeNull();
        expect(placeholder.querySelector('.q-product-detail__image-label').textContent).toBe(
          'Imagen del producto'
        );
        expect(
          placeholder.querySelector('.q-product-detail__image-mark img').getAttribute('width')
        ).toBe('160');
      });

      it('marks out-of-stock products with the is-out-of-stock class', () => {
        viewModel.isOutOfStock = () => true;
        viewModel.getStockLabel = () => 'Agotado';
        mountView();

        const stock = container.querySelector('.q-product-detail__stock');
        expect(stock.textContent).toBe('Agotado');
        expect(stock.classList.contains('is-out-of-stock')).toBe(true);
      });

      it('renders five stars with the exact filled mapping', () => {
        viewModel.getStarsFilled = () => [true, false, true, false, true];
        mountView();

        const stars = container.querySelectorAll(
          '.q-product-detail__rating .q-product-detail__star'
        );
        expect(stars.length).toBe(5);
        expect(Array.from(stars, (star) => star.classList.contains('is-filled'))).toEqual([
          true,
          false,
          true,
          false,
          true,
        ]);
        expect(
          container.querySelector('.q-product-detail__stars').getAttribute('aria-hidden')
        ).toBe('true');
        expect(stars[0].querySelector('path').getAttribute('d')).toBe(
          'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
        );
      });

      it('exposes add feedback with role=status and the exact shipping text', () => {
        viewModel.feedback = 'Añadiste 2 unidades al carrito.';
        mountView();

        const feedback = container.querySelector('.q-product-detail__feedback');
        expect(feedback.getAttribute('role')).toBe('status');
        expect(feedback.textContent).toBe('Añadiste 2 unidades al carrito.');
        expect(container.querySelector('.q-product-detail__shipping').textContent).toBe(
          'Envío gratis en compras sobre US$ 50.'
        );
      });

      it('shows Añadiendo… and disables purchase controls while adding', () => {
        viewModel.isAdding = true;
        mountView();

        const add = container.querySelector('.q-product-detail__add');
        expect(add.textContent).toBe('Añadiendo…');
        expect(add.disabled).toBe(true);
        expect(container.querySelector('.q-product-detail__buy-now').disabled).toBe(true);

        viewModel.isAdding = false;
        viewModel.notify();
        expect(container.querySelector('.q-product-detail__add').textContent).toBe(
          'Agregar al carrito'
        );
      });

      it('handles add-to-cart error and undefined results with or without callbacks', async () => {
        const onAuthRequired = jasmine.createSpy('onAuthRequired');
        viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo({ status: 'error' });
        mountView({ onAuthRequired });

        container.querySelector('.q-product-detail__add').click();
        await tick();
        expect(onAuthRequired).not.toHaveBeenCalled();

        viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo(undefined);
        viewModel.notify();
        view.destroy();
        mountView();
        container.querySelector('.q-product-detail__add').click();
        await tick();
        expect(viewModel.addToCart).toHaveBeenCalled();
      });

      it('handles buy-now error and auth-required results without callbacks', async () => {
        const onBuyNow = jasmine.createSpy('onBuyNow');
        const onAuthRequired = jasmine.createSpy('onAuthRequired');
        viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo({ status: 'error' });
        mountView({ onBuyNow, onAuthRequired });

        container.querySelector('.q-product-detail__buy-now').click();
        await tick();
        expect(onBuyNow).not.toHaveBeenCalled();
        expect(onAuthRequired).not.toHaveBeenCalled();

        view.destroy();
        viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo({
          status: 'auth-required',
        });
        mountView();
        container.querySelector('.q-product-detail__buy-now').click();
        await tick();
        expect(viewModel.addToCart).toHaveBeenCalled();
      });

      it('characterizes the unguarded result.status in buy-now when addToCart resolves undefined', async () => {
        const originalAddEventListener = HTMLElement.prototype.addEventListener;
        let buyClickHandler = null;
        HTMLElement.prototype.addEventListener = function (type, listener, options) {
          if (type === 'click' && this.classList?.contains('q-product-detail__buy-now')) {
            buyClickHandler = listener;
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
        try {
          mountView();
        } finally {
          HTMLElement.prototype.addEventListener = originalAddEventListener;
        }

        viewModel.addToCart = jasmine.createSpy('addToCart').and.resolveTo(undefined);
        expect(buyClickHandler).toEqual(jasmine.any(Function));
        // The handler is async, so invoking it returns the promise that rejects on
        // result.status; expectAsync must receive that promise, not the function.
        await expectAsync(buyClickHandler()).toBeRejectedWithError(TypeError);
      });

      it('renders owner action buttons with their exact icon paths', () => {
        viewModel.product = createProduct({ seller_id: 'seller-10' });
        mountView({
          authStore: createAuthStore({ user: { id: 'seller-10' }, authenticated: true }),
        });

        const expected = {
          edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z'],
          unpublish: [
            'M3 5.5h18v14H3z',
            'M3 9h5l2 3h4l2-3h5',
            'M12 2.5v6',
            'm9.5 6 2.5 2.5L14.5 6',
          ],
          delete: ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6', 'M10 11v5', 'M14 11v5'],
        };
        const labels = { edit: 'Editar', unpublish: 'Despublicar', delete: 'Eliminar' };
        Object.entries(expected).forEach(([action, paths]) => {
          const button = container.querySelector(`.q-product-detail__owner-button--${action}`);
          expect(button.getAttribute('aria-label')).toBe(labels[action]);
          const icon = button.querySelector('svg');
          expect(icon.getAttribute('viewBox')).toBe('0 0 24 24');
          expect(icon.getAttribute('aria-hidden')).toBe('true');
          expect(
            Array.from(icon.querySelectorAll('path'), (path) => path.getAttribute('d'))
          ).toEqual(paths);
        });
      });

      it('renders owner busy/unpublished labels and disables the buttons', () => {
        viewModel.product = createProduct({ seller_id: 'seller-10' });
        mountView({
          authStore: createAuthStore({ user: { id: 'seller-10' }, authenticated: true }),
        });

        viewModel.isUnpublishing = true;
        viewModel.isDeleting = true;
        viewModel.notify();
        let unpublish = container.querySelector('.q-product-detail__owner-button--unpublish');
        let remove = container.querySelector('.q-product-detail__owner-button--delete');
        expect(unpublish.textContent).toBe('Despublicando…');
        expect(unpublish.getAttribute('aria-label')).toBe('Despublicando…');
        expect(unpublish.disabled).toBe(true);
        expect(remove.textContent).toBe('Eliminando…');
        expect(remove.disabled).toBe(true);

        viewModel.isUnpublishing = false;
        viewModel.product = createProduct({ seller_id: 'seller-10', state: 'unpublished' });
        viewModel.notify();
        unpublish = container.querySelector('.q-product-detail__owner-button--unpublish');
        expect(unpublish.textContent).toBe('Despublicado');
        expect(unpublish.disabled).toBe(true);
      });

      it('renders alert owner feedback without a products link and tolerates missing callbacks', () => {
        viewModel.product = createProduct({ seller_id: 'seller-10' });
        mountView({
          authStore: createAuthStore({ user: { id: 'seller-10' }, authenticated: true }),
        });

        viewModel.ownerActionFeedback = 'No pudimos despublicar el producto.';
        viewModel.ownerActionFeedbackType = 'alert';
        viewModel.notify();
        let notice = container.querySelector('.q-product-detail__owner-feedback');
        expect(notice.getAttribute('role')).toBe('alert');
        expect(notice.classList.contains('q-product-detail__owner-feedback--alert')).toBe(true);
        expect(notice.textContent).toBe('No pudimos despublicar el producto.');
        expect(notice.querySelector('a')).toBeNull();

        viewModel.ownerActionFeedbackType = 'status';
        viewModel.notify();
        notice = container.querySelector('.q-product-detail__owner-feedback');
        expect(notice.querySelector('a').getAttribute('href')).toBe('/seller/products');

        expect(() => {
          container.querySelector('.q-product-detail__owner-button--edit').click();
          container.querySelector('.q-product-detail__owner-button--delete').click();
        }).not.toThrow();
        expect(viewModel.unpublishProduct).not.toHaveBeenCalled();
      });

      it('renders tab ids, aria state, tabIndex and panel wiring', () => {
        mountView();

        const tabs = container.querySelectorAll('.q-product-detail__tab');
        expect(Array.from(tabs, (tab) => tab.id)).toEqual([
          'q-product-tab-description',
          'q-product-tab-features',
          'q-product-tab-reviews',
        ]);
        expect(tabs[0].getAttribute('role')).toBe('tab');
        expect(tabs[0].getAttribute('aria-selected')).toBe('true');
        expect(tabs[0].tabIndex).toBe(0);
        expect(tabs[0].classList.contains('is-active')).toBe(true);
        expect(tabs[1].getAttribute('aria-selected')).toBe('false');
        expect(tabs[1].tabIndex).toBe(-1);
        expect(tabs[1].getAttribute('aria-controls')).toBe('q-product-panel-features');

        const panel = container.querySelector('.q-product-detail__panel');
        expect(panel.id).toBe('q-product-panel-description');
        expect(panel.getAttribute('role')).toBe('tabpanel');
        expect(panel.getAttribute('aria-labelledby')).toBe('q-product-tab-description');

        tabs[1].click();
        expect(viewModel.setTab).toHaveBeenCalledWith('features');
      });

      it('renders feature attributes as dt/dd rows', () => {
        viewModel.activeTab = 'features';
        mountView();

        const list = container.querySelector('.q-product-detail__attributes');
        expect(list.querySelector('dt').textContent).toBe('Material');
        expect(list.querySelector('dd').textContent).toBe('Lana de oveja');
      });

      it('renders review author, date, comment and stars', () => {
        viewModel.activeTab = 'reviews';
        viewModel.getStarsForRating = () => [true, true, true, true, false];
        mountView();

        const review = container.querySelector('.q-product-detail__review');
        expect(review.querySelector('strong').textContent).toBe('María');
        expect(review.querySelector('.q-product-detail__review-date').textContent).toBe(
          '12 sep 2026'
        );
        expect(review.querySelector('.q-product-detail__review-comment').textContent).toBe(
          'Excelente.'
        );
        expect(review.querySelectorAll('.q-product-detail__star.is-filled').length).toBe(4);
        expect(container.querySelector('.q-product-detail__panel').id).toBe(
          'q-product-panel-reviews'
        );
      });

      it('falls back to the description panel for an unknown active tab', () => {
        viewModel.activeTab = 'mystery';
        mountView();

        const panel = container.querySelector('.q-product-detail__panel');
        expect(panel.id).toBe('q-product-panel-mystery');
        expect(panel.querySelector('.q-product-detail__description').textContent).toBe(
          'Pieza tejida a mano.'
        );
        expect(container.querySelector('.q-product-detail__tab.is-active')).toBeNull();
      });

      it('renders seller card metadata and hides contact when seller_id is missing', () => {
        viewModel.product = createProduct({ seller_id: null });
        viewModel.getStockLabel = () => '';
        mountView({ authStore: createAuthStore({ user: { id: 'buyer-1' }, authenticated: true }) });

        const card = container.querySelector('.q-product-detail__seller-card');
        expect(card.getAttribute('aria-label')).toBe('Sobre Tejidos Illimani');
        const avatar = card.querySelector('.q-product-detail__seller-avatar');
        expect(avatar.textContent).toBe('TI');
        expect(avatar.getAttribute('aria-hidden')).toBe('true');
        expect(card.querySelector('.q-product-detail__seller-stats').textContent).toBe(
          'Producto publicado en la tienda'
        );
        expect(card.querySelector('.q-product-detail__contact-seller')).toBeNull();
        expect(card.querySelector('.q-product-detail__seller-link').getAttribute('href')).toBe(
          '/products'
        );
      });

      it('renders the similar-products empty message', () => {
        viewModel.similarProducts = [];
        mountView();

        expect(container.querySelector('.q-product-detail__similar-empty').textContent).toBe(
          'No hay recomendaciones disponibles por ahora.'
        );
        expect(container.querySelector('.q-product-detail__similar-grid')).toBeNull();
      });

      it('omits the rating block for similar products without a rating', () => {
        viewModel.similarProducts = [
          createProduct({
            id: 'p9',
            name: 'Sin rating',
            slug: 'sin-rating',
            average_rating: null,
            ratings_count: 0,
          }),
        ];
        mountView();

        const card = container.querySelector('.q-product-detail__similar-grid > li');
        expect(card.querySelector('.q-product-card-rating')).toBeNull();
        expect(card.querySelector('.q-product-card-rating-value')).toBeNull();
      });

      it('applies the documented seller-line precedence to similar cards', () => {
        viewModel.similarProducts = [
          createProduct({ id: 'a', seller: 'Texto directo', seller_name: 'Ignorado' }),
          createProduct({
            id: 'b',
            seller: { full_name: 'Nombre completo', store_name: 'Tienda B', username: 'userb' },
          }),
          createProduct({
            id: 'c',
            seller: { store_name: 'Tienda C', username: 'userc', name: 'Nombre C' },
          }),
          createProduct({
            id: 'd',
            seller: null,
            seller_name: 'Vendedor producto',
            category: { name: 'Categoría D' },
          }),
          createProduct({
            id: 'e',
            seller: null,
            seller_name: '',
            store_name: '',
            category: null,
            category_name: 'Categoría E',
          }),
          createProduct({
            id: 'f',
            seller: null,
            seller_name: '',
            store_name: '',
            category: null,
            category_name: '',
          }),
        ];
        mountView();

        const lines = Array.from(
          container.querySelectorAll('.q-product-detail__similar-grid > li'),
          (card) => card.querySelector('.q-product-card-seller')?.textContent
        );
        expect(lines).toEqual([
          'Texto directo',
          'Nombre completo',
          'Tienda C',
          'Vendedor producto',
          'Categoría E',
          undefined,
        ]);
      });

      it('encodes the product id when a similar product has no slug', () => {
        viewModel.similarProducts = [createProduct({ id: 'p/special 1', slug: null })];
        mountView();

        const link = container.querySelector('.q-product-card-title-link');
        expect(link.getAttribute('href')).toBe('/products/p%2Fspecial%201');
        expect(link.dataset.route).toBe('');
      });

      it('hides the cart action on similar products owned by the current user', () => {
        viewModel.similarProducts = [
          createProduct({ id: 'own', seller_id: 'buyer-1' }),
          createProduct({ id: 'other', seller_id: 'seller-20' }),
        ];
        mountView({ authStore: createAuthStore({ user: { id: 'buyer-1' }, authenticated: true }) });

        const cards = container.querySelectorAll('.q-product-detail__similar-grid > li');
        expect(cards[0].querySelector('.q-product-card-action')).toBeNull();
        expect(cards[1].querySelector('.q-product-card-action')).not.toBeNull();
      });

      it('propagates stock and state to similar cards while the default variant hides badges', () => {
        viewModel.similarProducts = [
          createProduct({ id: 'draft', state: 'unpublished', stock: 5, badge: 'Destacado' }),
          createProduct({ id: 'soldout', state: 'published', stock: 0, tag: 'Oferta' }),
        ];
        mountView();

        const cards = container.querySelectorAll('.q-product-detail__similar-grid > li');
        const draftAction = cards[0].querySelector('.q-product-card-action');
        expect(draftAction.disabled).toBe(true);
        expect(draftAction.textContent).toBe('No disponible');
        const soldOutAction = cards[1].querySelector('.q-product-card-action');
        expect(soldOutAction.disabled).toBe(true);
        expect(soldOutAction.textContent).toBe('Sin stock');
        expect(container.querySelector('.q-product-card-new-badge')).toBeNull();
      });

      it('calls the real unsubscribe callbacks on destroy and stops re-rendering', () => {
        const vmListeners = new Set();
        const authListeners = new Set();
        let vmUnsubscribed = 0;
        let authUnsubscribed = 0;
        viewModel.subscribe = (listener) => {
          vmListeners.add(listener);
          return () => {
            vmUnsubscribed += 1;
            vmListeners.delete(listener);
          };
        };
        const localAuthStore = {
          getUser: () => null,
          isAuthenticated: () => false,
          subscribe: (listener) => {
            authListeners.add(listener);
            return () => {
              authUnsubscribed += 1;
              authListeners.delete(listener);
            };
          },
        };

        view = new ProductDetailView({ viewModel, authStore: localAuthStore });
        const renderSpy = spyOn(view, '_renderContent').and.callThrough();
        view.mount(container);
        expect(vmListeners.size).toBe(1);
        expect(authListeners.size).toBe(1);

        renderSpy.calls.reset();
        view.destroy();
        expect(vmUnsubscribed).toBe(1);
        expect(authUnsubscribed).toBe(1);
        expect(view._unsubscribe).toBeNull();
        expect(view._authUnsubscribe).toBeNull();

        viewModel.product = createProduct({ name: 'Cambio' });
        viewModel.notify();
        authListeners.forEach((listener) => listener());
        expect(renderSpy).not.toHaveBeenCalled();
        expect(container.querySelector('.q-product-detail')).toBeNull();
      });

      it('delegates guest handling to the view model without opening a modal', async () => {
        mountView({ authStore: createAuthStore({ authenticated: false }) });

        container.querySelector('.q-product-detail__contact-seller').click();
        await tick();
        expect(viewModel.contactSeller).toHaveBeenCalled();
        expect(container.querySelector('.q-modal')).toBeNull();
      });

      it('navigates to the active conversation after successful creation', async () => {
        const onNavigate = jasmine.createSpy('onNavigate');
        mountView({
          authStore: createAuthStore({ user: { id: 'buyer-1' }, authenticated: true }),
          onNavigate,
        });

        container.querySelector('.q-product-detail__contact-seller').click();
        await tick();
        expect(viewModel.contactSeller).toHaveBeenCalledWith();
        expect(onNavigate).toHaveBeenCalledWith('/conversations?active=conv-1');
        expect(container.querySelector('.q-modal')).toBeNull();
      });

      it('shows an inline error when creating the conversation fails', async () => {
        viewModel.contactSeller = jasmine
          .createSpy('contactSeller')
          .and.rejectWith(new Error('No se pudo iniciar la conversación.'));
        mountView({
          authStore: createAuthStore({ user: { id: 'buyer-1' }, authenticated: true }),
        });

        container.querySelector('.q-product-detail__contact-seller').click();
        await tick(10);

        const errorEl = container.querySelector('.q-product-detail__contact-error[role="alert"]');
        expect(errorEl.textContent).toBe('No se pudo iniciar la conversación.');
      });

      it('characterizes non-idempotent mount: repeated mount re-subscribes and reloads', () => {
        const listeners = new Set();
        let vmUnsubscribed = 0;
        viewModel.subscribe = jasmine.createSpy('subscribe').and.callFake((listener) => {
          listeners.add(listener);
          return () => {
            vmUnsubscribed += 1;
            listeners.delete(listener);
          };
        });

        view = new ProductDetailView({
          viewModel,
          authStore,
          productSlug: 'aguayo-tradicional',
        });
        view.mount(container);
        view.mount(container);

        expect(viewModel.load).toHaveBeenCalledTimes(2);
        expect(viewModel.subscribe).toHaveBeenCalledTimes(2);
        expect(listeners.size).toBe(2);
        expect(container.querySelectorAll('.q-product-detail').length).toBe(1);

        view.destroy();
        expect(vmUnsubscribed).toBe(1);
        expect(listeners.size).toBe(1);
      });
    });
  })();

  (() => {
    const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    const createProduct = (overrides = {}) => ({
      id: 'p1',
      name: 'Aguayo tradicional',
      slug: 'aguayo-tradicional',
      seller_id: 'seller-10',
      seller: { full_name: 'Tejidos Illimani' },
      price: 40,
      currency: 'USD',
      stock: 10,
      state: 'published',
      average_rating: 4.8,
      ratings_count: 24,
      category: { name: 'Textiles' },
      description: 'Pieza tejida a mano.',
      ...overrides,
    });

    const createMockViewModel = ({ product = createProduct() } = {}) => {
      const listeners = new Set();
      const vm = {
        status: 'ready',
        product,
        similarProducts: [],
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
        unpublishProduct: jasmine
          .createSpy('unpublishProduct')
          .and.resolveTo({ status: 'success' }),
        deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo({ status: 'success' }),
        contactSeller: jasmine
          .createSpy('contactSeller')
          .and.resolveTo({ conversationId: 'conv-1', created: true }),
        isOutOfStock: () => false,
        getMaxQuantity: () => 10,
        getPriceLabel: () => 'US$ 40.00',
        getRatingLabel: () => '4.8 (24 reseñas)',
        getStarsFilled: () => [true, true, true, true, true],
        getSellerLine: () => 'Tejidos Illimani',
        getSellerInitials: () => 'TI',
        getSellerLocation: () => 'Textiles',
        getStockLabel: () => '10 disponibles',
        getGallery: () => [],
        getSelectedImageLabel: () => 'Imagen principal',
        getAttributes: () => [],
        getReviews: () => [],
        getStarsForRating: () => [true, true, true, true, true],
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
      return vm;
    };

    const createAuthStore = ({ user = null, authenticated = false } = {}) => ({
      getUser: () => user,
      isAuthenticated: () => authenticated,
      subscribe: () => () => {},
    });

    describe('ProductDetailView contact seller (recovered 3)', () => {
      let container;
      let viewModel;
      let view;

      const mountView = ({ user = null, authenticated = false, onNavigate = null } = {}) => {
        const authStore = createAuthStore({ user, authenticated });
        view = new ProductDetailView({ viewModel, authStore, onNavigate });
        view.mount(container);
        return authStore;
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = createMockViewModel();
      });

      afterEach(() => {
        if (view) {
          view.destroy();
          view = null;
        }
        if (container?.parentNode) {
          container.parentNode.removeChild(container);
        }
      });

      it('renders the contact button for a guest', () => {
        mountView();

        const button = container.querySelector('.q-product-detail__contact-seller');
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('Contactar vendedor');
        expect(button.classList.contains('q-btn')).toBe(true);
        expect(
          container.querySelector('.q-product-detail__seller-link').classList.contains('q-btn')
        ).toBe(true);
      });

      it('renders the contact button for an authenticated buyer', () => {
        mountView({ user: { id: 'buyer-1' }, authenticated: true });

        const button = container.querySelector('.q-product-detail__contact-seller');
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('Contactar vendedor');
      });

      it('hides the contact button when the authenticated user is the product owner', () => {
        mountView({ user: { id: 'seller-10' }, authenticated: true });

        expect(container.querySelector('.q-product-detail__contact-seller')).toBeNull();
      });

      it('delegates guest redirection to the view model and does not open a modal', async () => {
        viewModel.contactSeller.and.resolveTo({ redirected: true });
        const onNavigate = jasmine.createSpy('onNavigate');
        mountView({ onNavigate });

        container.querySelector('.q-product-detail__contact-seller').click();
        await tick();

        expect(viewModel.contactSeller).toHaveBeenCalled();
        expect(onNavigate).not.toHaveBeenCalled();
        expect(container.querySelector('.q-modal')).toBeNull();
      });

      it('navigates to the created conversation without opening a modal', async () => {
        const onNavigate = jasmine.createSpy('onNavigate');
        mountView({ user: { id: 'buyer-1' }, authenticated: true, onNavigate });

        container.querySelector('.q-product-detail__contact-seller').click();
        await tick();

        expect(viewModel.contactSeller).toHaveBeenCalledWith();
        expect(onNavigate).toHaveBeenCalledWith('/conversations?active=conv-1');
        expect(document.querySelector('.q-modal')).toBeNull();
      });
    });
  })();
})();
