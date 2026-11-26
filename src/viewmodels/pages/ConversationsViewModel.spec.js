import { ConversationsViewModel } from './ConversationsViewModel.js';

const BUYER_ID = 'buyer-1';
const SELLER_ID = 'seller-1';

const conversation = (overrides = {}) => ({
  id: 'conv-1',
  buyer_id: BUYER_ID,
  seller_id: SELLER_ID,
  product_id: null,
  last_message_at: '2026-11-18T11:30:00.000Z',
  last_message_preview: 'Último mensaje',
  ...overrides,
});

const message = (id, senderId, createdAt, content = id) => ({
  id,
  conversation_id: 'conv-1',
  sender_id: senderId,
  content,
  created_at: createdAt,
});

describe('ConversationsViewModel', () => {
  let conversationsApi;
  let profilesApi;
  let productsApi;
  let authStore;
  let vm;

  const createViewModel = (options = {}) => {
    conversationsApi = {
      listConversations: jasmine
        .createSpy('listConversations')
        .and.resolveTo({ data: [conversation()], meta: {} }),
      listMessages: jasmine.createSpy('listMessages').and.resolveTo({ data: [], meta: {} }),
      sendMessage: jasmine.createSpy('sendMessage').and.resolveTo({
        data: message('m-new', BUYER_ID, '2026-11-18T11:40:00.000Z', 'Hola'),
        meta: {},
      }),
    };
    profilesApi = {
      getById: jasmine.createSpy('getById').and.callFake(async (id) => ({
        data: { id, username: id, full_name: `Nombre ${id}`, avatar_path: null },
      })),
    };
    productsApi = {
      getProductById: jasmine.createSpy('getProductById').and.resolveTo(null),
    };
    authStore = { getUser: () => ({ id: BUYER_ID }) };
    vm = new ConversationsViewModel({
      conversationsApi,
      profilesApi,
      productsApi,
      authStore,
      ...options,
    });
    return vm;
  };

  afterEach(() => vm?.destroy());

  it('maps the other party as the seller when the current user is the buyer', async () => {
    createViewModel();

    await vm.loadConversations();

    expect(conversationsApi.listConversations).toHaveBeenCalledWith({ page: 1, limit: 30 });
    expect(vm.conversations[0].otherId).toBe(SELLER_ID);
    expect(vm.conversations[0].product_id).toBeNull();
    expect(vm.conversations[0].last_message_at).toBe('2026-11-18T11:30:00.000Z');
  });

  it('maps the other party as the buyer when the current user is the seller', async () => {
    createViewModel({ authStore: { getUser: () => ({ id: SELLER_ID }) } });

    await vm.loadConversations();

    expect(vm.conversations[0].otherId).toBe(BUYER_ID);
  });

  it('caches a sender profile across a conversation and repeated messages', async () => {
    createViewModel();
    conversationsApi.listMessages.and.resolveTo({
      data: [
        message('m2', SELLER_ID, '2026-11-18T11:05:00.000Z'),
        message('m1', SELLER_ID, '2026-11-18T11:00:00.000Z'),
      ],
      meta: {},
    });
    await vm.loadConversations();

    await vm.selectConversation('conv-1');

    expect(profilesApi.getById.calls.count()).toBe(1);
    expect(profilesApi.getById).toHaveBeenCalledWith(SELLER_ID);
  });

  it('loads selected messages sorted oldest to newest', async () => {
    createViewModel();
    conversationsApi.listMessages.and.resolveTo({
      data: [
        message('m2', SELLER_ID, '2026-11-18T11:05:00.000Z'),
        message('m1', BUYER_ID, '2026-11-18T11:00:00.000Z'),
      ],
      meta: {},
    });
    await vm.loadConversations();

    await vm.selectConversation('conv-1');

    expect(vm.messages.map((item) => item.id)).toEqual(['m1', 'm2']);
  });

  it('blocks empty messages without calling the API', async () => {
    createViewModel();
    vm.activeId = 'conv-1';
    vm.setInputValue('  \n ');

    await vm.sendMessage();

    expect(vm.sendError).toBe('El mensaje no puede estar vacío.');
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
  });

  it('updates composer text without notifying subscribers', () => {
    createViewModel();
    const subscriber = jasmine.createSpy('subscriber');
    vm.subscribe(subscriber);
    vm.sendError = 'Previous error';

    vm.setInputValue('a');

    expect(vm.inputValue).toBe('a');
    expect(vm.sendError).toBe('');
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('appends a sent message, clears the input, and refreshes the list', async () => {
    createViewModel();
    await vm.loadConversations();
    const subscriber = jasmine.createSpy('subscriber');
    vm.subscribe(subscriber);
    vm.activeId = 'conv-1';
    vm.activeConversation = vm.conversations[0];
    vm.messages = [message('m-old', BUYER_ID, '2026-11-18T11:00:00.000Z')];
    vm.setInputValue('  Hola  ');

    await vm.sendMessage();

    expect(conversationsApi.sendMessage).toHaveBeenCalledWith('conv-1', { content: 'Hola' });
    expect(vm.messages.map((item) => item.id)).toEqual(['m-old', 'm-new']);
    expect(vm.inputValue).toBe('');
    expect(conversationsApi.listConversations.calls.count()).toBe(2);
    expect(subscriber).toHaveBeenCalledWith(vm);
  });

  it('keeps the input and surfaces an API error when sending fails', async () => {
    createViewModel();
    vm.activeId = 'conv-1';
    vm.setInputValue('No perder');
    conversationsApi.sendMessage.and.rejectWith(new Error('Servicio no disponible'));

    await vm.sendMessage();

    expect(vm.inputValue).toBe('No perder');
    expect(vm.sendError).toBe('Servicio no disponible');
    expect(vm.isSending).toBeFalse();
  });

  it('opens the initial conversation when it exists in the list', async () => {
    createViewModel({ initialActiveId: 'conv-1' });
    conversationsApi.listMessages.and.resolveTo({
      data: [message('m1', SELLER_ID, '2026-11-18T11:00:00.000Z')],
      meta: {},
    });

    await vm.loadConversations();

    expect(vm.activeId).toBe('conv-1');
    expect(vm.messages.length).toBe(1);
  });

  it('keeps the list available when a participant profile cannot be loaded', async () => {
    createViewModel();
    spyOn(console, 'warn');
    profilesApi.getById.and.rejectWith(new Error('No encontrado'));

    await vm.loadConversations();

    expect(vm.conversations.length).toBe(1);
    expect(vm.profiles.get(SELLER_ID)).toEqual({
      id: SELLER_ID,
      displayName: 'Usuario',
      avatarUrl: null,
    });
    expect(vm.isListLoading).toBeFalse();
  });
});
