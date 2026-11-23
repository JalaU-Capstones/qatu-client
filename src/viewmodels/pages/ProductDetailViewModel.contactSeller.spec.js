import { ProductDetailViewModel } from './ProductDetailViewModel.js';

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
  category: { name: 'Textiles' },
  description: 'Pieza tejida a mano.',
  ...overrides,
});

const createApi = () => ({
  createOrGetConversation: jasmine
    .createSpy('createOrGetConversation')
    .and.resolveTo({ data: { id: 'conv-1', seller_id: 'seller-10' }, meta: {}, created: true }),
  sendMessage: jasmine
    .createSpy('sendMessage')
    .and.resolveTo({ data: { id: 'msg-1', content: 'Hola' }, meta: {} }),
});

const createViewModel = ({ product = createProduct(), conversationsApi = createApi() } = {}) => {
  const vm = new ProductDetailViewModel({
    productsApi: {
      getProductBySlug: jasmine.createSpy('getProductBySlug'),
      getSimilarProducts: jasmine.createSpy('getSimilarProducts'),
    },
    cartService: { addToCart: jasmine.createSpy('addToCart') },
    conversationsApi,
  });
  vm.product = product;
  return { vm, conversationsApi };
};

describe('ProductDetailViewModel contactSeller', () => {
  it('creates/reuses the conversation first, then sends the trimmed message', async () => {
    const { vm, conversationsApi } = createViewModel();
    const callOrder = [];

    conversationsApi.createOrGetConversation.and.callFake(async () => {
      callOrder.push('createOrGetConversation');
      return { data: { id: 'conv-1', seller_id: 'seller-10' }, meta: {}, created: true };
    });
    conversationsApi.sendMessage.and.callFake(async () => {
      callOrder.push('sendMessage');
      return { data: { id: 'msg-1', content: 'Hola, ¿está disponible?' }, meta: {} };
    });

    const result = await vm.contactSeller('   Hola, ¿está disponible?   ');

    expect(callOrder).toEqual(['createOrGetConversation', 'sendMessage']);
    expect(conversationsApi.createOrGetConversation).toHaveBeenCalledWith({
      sellerId: 'seller-10',
      productId: 'p1',
    });
    expect(conversationsApi.sendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Hola, ¿está disponible?',
    });
    expect(result).toEqual({
      conversation: { id: 'conv-1', seller_id: 'seller-10' },
      message: { id: 'msg-1', content: 'Hola, ¿está disponible?' },
    });
  });

  it('sets the success feedback and notifies subscribers', async () => {
    const { vm } = createViewModel();
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    await vm.contactSeller('Hola');

    expect(vm.feedback).toBe('Mensaje enviado al vendedor.');
    expect(listener).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(vm);
  });

  it('rejects when no product is loaded and does not call the API', async () => {
    const { vm, conversationsApi } = createViewModel({ product: null });
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    await expectAsync(vm.contactSeller('Hola')).toBeRejectedWithError(
      'No se encontró información del vendedor.'
    );

    expect(conversationsApi.createOrGetConversation).not.toHaveBeenCalled();
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects when the product has no seller_id', async () => {
    const { vm, conversationsApi } = createViewModel({
      product: createProduct({ seller_id: null }),
    });

    await expectAsync(vm.contactSeller('Hola')).toBeRejectedWithError(
      'No se encontró información del vendedor.'
    );

    expect(conversationsApi.createOrGetConversation).not.toHaveBeenCalled();
  });

  it('rejects an empty message without creating a conversation', async () => {
    const { vm, conversationsApi } = createViewModel();

    await expectAsync(vm.contactSeller('')).toBeRejectedWithError(
      'El mensaje no puede estar vacío.'
    );

    expect(conversationsApi.createOrGetConversation).not.toHaveBeenCalled();
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
    expect(vm.feedback).toBe('');
  });

  it('rejects a whitespace-only message without calling the API', async () => {
    const { vm, conversationsApi } = createViewModel();

    await expectAsync(vm.contactSeller('    \n\t ')).toBeRejectedWithError(
      'El mensaje no puede estar vacío.'
    );

    expect(conversationsApi.createOrGetConversation).not.toHaveBeenCalled();
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
  });

  it('propagates API failures and leaves the success feedback unset', async () => {
    const { vm, conversationsApi } = createViewModel();
    conversationsApi.sendMessage.and.rejectWith(new Error('No se pudo enviar el mensaje (403)'));

    await expectAsync(vm.contactSeller('Hola')).toBeRejectedWithError(
      'No se pudo enviar el mensaje (403)'
    );

    expect(conversationsApi.createOrGetConversation).toHaveBeenCalledTimes(1);
    expect(vm.feedback).toBe('');
  });
});
