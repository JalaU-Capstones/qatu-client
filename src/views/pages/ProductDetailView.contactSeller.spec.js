import { ProductDetailView } from './ProductDetailView.js';

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
    unpublishProduct: jasmine.createSpy('unpublishProduct').and.resolveTo({ status: 'success' }),
    deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo({ status: 'success' }),
    contactSeller: jasmine
      .createSpy('contactSeller')
      .and.resolveTo({ conversation: { id: 'conv-1' }, message: { id: 'msg-1' } }),
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

describe('ProductDetailView contact seller', () => {
  let container;
  let viewModel;
  let view;

  const mountView = ({ user = null, authenticated = false, onAuthRequired = null } = {}) => {
    const authStore = createAuthStore({ user, authenticated });
    view = new ProductDetailView({ viewModel, authStore, onAuthRequired });
    view.mount(container);
    return authStore;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = createMockViewModel();
  });

  afterEach(async () => {
    document.querySelector('.q-contact-seller-modal__cancel')?.click();
    await tick(10);
    document.querySelectorAll('.q-modal').forEach((el) => el.remove());
    document.body.style.overflow = '';
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

  it('asks a guest to authenticate and does not open the modal', async () => {
    const onAuthRequired = jasmine.createSpy('onAuthRequired');
    mountView({ onAuthRequired });

    container.querySelector('.q-product-detail__contact-seller').click();
    await tick();

    expect(onAuthRequired).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.q-modal')).toBeNull();
    expect(document.body.querySelector('.q-contact-seller-modal__textarea')).toBeNull();
  });

  it('opens the contact modal for an authenticated buyer', async () => {
    const onAuthRequired = jasmine.createSpy('onAuthRequired');
    mountView({ user: { id: 'buyer-1' }, authenticated: true, onAuthRequired });

    container.querySelector('.q-product-detail__contact-seller').click();
    await tick();

    expect(onAuthRequired).not.toHaveBeenCalled();

    const modalTextarea = document.body.querySelector('.q-contact-seller-modal__textarea');
    expect(modalTextarea).not.toBeNull();
    expect(modalTextarea.id).toBe('q-contact-seller-message');
    expect(document.querySelector('.q-modal__title').textContent).toBe(
      'Contactar a Tejidos Illimani'
    );

    document.querySelector('.q-contact-seller-modal__cancel').click();
    await tick();
  });

  it('delegates the modal submission to viewModel.contactSeller', async () => {
    mountView({ user: { id: 'buyer-1' }, authenticated: true });

    container.querySelector('.q-product-detail__contact-seller').click();
    await tick();

    const field = document.body.querySelector('#q-contact-seller-message');
    field.value = '  Hola, ¿está disponible?  ';
    field.dispatchEvent(new Event('input', { bubbles: true }));

    document.querySelector('.q-contact-seller-modal__send').click();
    await tick(10);

    expect(viewModel.contactSeller).toHaveBeenCalledWith('Hola, ¿está disponible?');
    expect(document.querySelector('.q-modal')).toBeNull();
  });
});
