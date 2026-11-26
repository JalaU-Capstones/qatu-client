import { ProductDetailView } from './ProductDetailView.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ProductDetailView contact seller flow', () => {
  let container;
  let view;
  let viewModel;
  let onNavigate;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onNavigate = jasmine.createSpy('onNavigate');
    viewModel = {
      status: 'ready',
      product: {
        id: 'product-1',
        name: 'Aguayo tradicional',
        slug: 'aguayo-tradicional',
        seller_id: 'seller-1',
        seller: { full_name: 'Tejidos Illimani' },
        price: 40,
        currency: 'USD',
        stock: 5,
        state: 'published',
      },
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
      tabs: [{ id: 'description', label: 'Descripción' }],
      load: jasmine.createSpy('load'),
      setQuantity: jasmine.createSpy('setQuantity'),
      setTab: jasmine.createSpy('setTab'),
      setSelectedImage: jasmine.createSpy('setSelectedImage'),
      addToCart: jasmine.createSpy('addToCart').and.resolveTo({ status: 'added' }),
      unpublishProduct: jasmine.createSpy('unpublishProduct').and.resolveTo({ status: 'success' }),
      deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo({ status: 'success' }),
      contactSeller: jasmine
        .createSpy('contactSeller')
        .and.resolveTo({ conversationId: 'conv-1', created: true }),
      isOutOfStock: () => false,
      getMaxQuantity: () => 5,
      getPriceLabel: () => 'US$ 40.00',
      getRatingLabel: () => '',
      getStarsFilled: () => [false, false, false, false, false],
      getSellerLine: () => 'Tejidos Illimani',
      getSellerInitials: () => 'TI',
      getSellerLocation: () => '',
      getStockLabel: () => '5 disponibles',
      getGallery: () => [],
      getSelectedImageLabel: () => 'Imagen principal',
      getAttributes: () => [],
      getReviews: () => [],
      getStarsForRating: () => [false, false, false, false, false],
      subscribe: () => () => {},
    };
  });

  afterEach(() => {
    view?.destroy();
    container.remove();
  });

  it('creates a conversation then navigates to it without opening a modal', async () => {
    view = new ProductDetailView({
      viewModel,
      onNavigate,
      authStore: {
        getUser: () => ({ id: 'buyer-1' }),
        isAuthenticated: () => true,
        subscribe: () => () => {},
      },
    });
    view.mount(container);

    container.querySelector('.q-product-detail__contact-seller').click();
    await tick();

    expect(viewModel.contactSeller).toHaveBeenCalledWith();
    expect(onNavigate).toHaveBeenCalledWith('/conversations?active=conv-1');
    expect(document.querySelector('.q-modal')).toBeNull();
  });
});
