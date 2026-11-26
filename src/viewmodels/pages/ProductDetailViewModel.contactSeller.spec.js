import { ProductDetailViewModel } from './ProductDetailViewModel.js';

const createProduct = (overrides = {}) => ({
  id: 'p1',
  seller_id: 'seller-10',
  seller: { id: 'seller-10' },
  ...overrides,
});

const createViewModel = ({
  authenticated = true,
  product = createProduct(),
  conversationsApi = {
    createOrGetConversation: jasmine
      .createSpy('createOrGetConversation')
      .and.resolveTo({ data: { id: 'conv-1' }, meta: {}, created: true }),
  },
} = {}) => {
  const router = { navigate: jasmine.createSpy('navigate') };
  const authRedirectStore = { setReturnTo: jasmine.createSpy('setReturnTo') };
  const vm = new ProductDetailViewModel({
    productsApi: {},
    cartService: {},
    conversationsApi,
    authStore: { isAuthenticated: () => authenticated },
    authRedirectStore,
    router,
  });
  vm.product = product;
  return { vm, conversationsApi, authRedirectStore, router };
};

describe('ProductDetailViewModel contactSeller', () => {
  it('redirects unauthenticated users to login and stores the current location', async () => {
    const { vm, conversationsApi, authRedirectStore, router } = createViewModel({
      authenticated: false,
    });

    await expectAsync(vm.contactSeller()).toBeResolvedTo({ redirected: true });

    expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith(
      window.location.pathname + window.location.search
    );
    expect(router.navigate).toHaveBeenCalledWith('/login');
    expect(conversationsApi.createOrGetConversation).not.toHaveBeenCalled();
  });

  it('creates or reuses a conversation for the product seller', async () => {
    const { vm, conversationsApi } = createViewModel();

    const result = await vm.contactSeller();

    expect(conversationsApi.createOrGetConversation).toHaveBeenCalledWith({
      sellerId: 'seller-10',
      productId: 'p1',
    });
    expect(result).toEqual({ conversationId: 'conv-1', created: true });
  });

  it('uses the nested seller id and rejects when no seller is available', async () => {
    const product = createProduct({ seller_id: null, seller: { id: 'nested-seller' } });
    const { vm, conversationsApi } = createViewModel({ product });

    await vm.contactSeller();
    expect(conversationsApi.createOrGetConversation).toHaveBeenCalledWith({
      sellerId: 'nested-seller',
      productId: 'p1',
    });

    vm.product = createProduct({ seller_id: null, seller: { id: null } });
    await expectAsync(vm.contactSeller()).toBeRejectedWithError('Vendedor no disponible');
  });

  it('propagates conversation API failures', async () => {
    const conversationsApi = {
      createOrGetConversation: jasmine
        .createSpy('createOrGetConversation')
        .and.rejectWith(new Error('No se pudo crear la conversación')),
    };
    const { vm } = createViewModel({ conversationsApi });

    await expectAsync(vm.contactSeller()).toBeRejectedWithError('No se pudo crear la conversación');
  });
});
