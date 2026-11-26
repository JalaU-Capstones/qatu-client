import { ConversationsViewModel } from '../../viewmodels/pages/ConversationsViewModel.js';
import { ConversationsPageView } from './ConversationsPageView.js';

const BUYER_ID = 'buyer-1';
const SELLER_ID = 'seller-1';
const PRODUCT = {
  id: 'product-1',
  slug: 'aguayo',
  name: 'Aguayo tradicional',
  price: 40,
  currency: 'USD',
  primary_image_path: null,
  state: 'published',
};

const makeConversation = (overrides = {}) => ({
  id: 'conv-1',
  buyer_id: BUYER_ID,
  seller_id: SELLER_ID,
  product_id: PRODUCT.id,
  product: PRODUCT,
  last_message_at: '2026-11-18T11:30:00.000Z',
  last_message_preview: 'Sí, tenemos disponibilidad.',
  ...overrides,
});

const makeMessage = (overrides = {}) => ({
  id: 'message-1',
  conversation_id: 'conv-1',
  sender_id: SELLER_ID,
  content: 'Sí, tenemos disponibilidad.',
  created_at: '2026-11-18T11:30:00.000Z',
  ...overrides,
});

describe('ConversationsPageView', () => {
  let container;
  let view;
  let viewModel;
  let conversationsApi;
  let profilesApi;
  let onNavigate;

  const mountView = async ({ rows = [makeConversation()], profile = {} } = {}) => {
    conversationsApi = {
      listConversations: jasmine
        .createSpy('listConversations')
        .and.resolveTo({ data: rows, meta: {} }),
      listMessages: jasmine
        .createSpy('listMessages')
        .and.resolveTo({ data: [makeMessage()], meta: {} }),
      sendMessage: jasmine.createSpy('sendMessage').and.resolveTo({
        data: makeMessage({
          id: 'message-2',
          sender_id: BUYER_ID,
          content: 'Gracias',
          created_at: '2026-11-18T11:31:00.000Z',
        }),
        meta: {},
      }),
    };
    profilesApi = {
      getById: jasmine.createSpy('getById').and.callFake(async (id) => ({
        data: {
          id,
          username: id,
          full_name: id === SELLER_ID ? 'Taller Illimani' : 'Camila Morales',
          avatar_path: id === SELLER_ID ? profile.avatar_path || null : null,
        },
      })),
    };
    onNavigate = jasmine.createSpy('onNavigate');
    viewModel = new ConversationsViewModel({
      conversationsApi,
      profilesApi,
      productsApi: { getProductById: jasmine.createSpy('getProductById').and.resolveTo(null) },
      authStore: { getUser: () => ({ id: BUYER_ID }) },
      onNavigate,
    });
    view = new ConversationsPageView({ viewModel, onNavigate });
    view.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  it('renders conversation name, product name, and last message preview', async () => {
    await mountView();

    const item = container.querySelector('.q-conversations-list__item');
    expect(item.textContent).toContain('Taller Illimani');
    expect(item.textContent).toContain('Aguayo tradicional');
    expect(item.textContent).toContain('Sí, tenemos disponibilidad.');
  });

  it('renders the empty state when there are no conversations', async () => {
    await mountView({ rows: [] });

    expect(container.textContent).toContain('No tienes conversaciones todavía.');
    expect(container.textContent).toContain(
      'Explora productos y contacta a un vendedor para empezar.'
    );
  });

  it('renders the product card for an active conversation and omits the strip without a product', async () => {
    await mountView();
    await viewModel.selectConversation('conv-1');

    expect(container.querySelector('.q-conversations-chat__product')).not.toBeNull();
    expect(container.querySelector('.product-card--compact')).not.toBeNull();
    expect(container.querySelector('.product-card__add-button')).toBeNull();
    expect(container.querySelector('.q-conversations-chat__identity h1').textContent).toBe(
      'Aguayo tradicional'
    );
    expect(container.querySelector('.q-conversations-chat__identity p').textContent).toBe(
      'Taller Illimani'
    );

    view.destroy();
    view = null;
    await mountView({ rows: [makeConversation({ product: null, product_id: null })] });
    await viewModel.selectConversation('conv-1');

    expect(container.querySelector('.q-conversations-chat__product')).toBeNull();
    expect(container.querySelector('.q-conversations-chat__identity h1').textContent).toBe(
      'Taller Illimani'
    );
  });

  it('submits on Enter and preserves Shift+Enter for a newline', async () => {
    await mountView();
    await viewModel.selectConversation('conv-1');

    let textarea = container.querySelector('.q-conversations-chat__composer textarea');
    const newline = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(newline);
    expect(newline.defaultPrevented).toBeFalse();
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();

    textarea.value = 'Gracias';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea = container.querySelector('.q-conversations-chat__composer textarea');
    const submit = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(submit);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submit.defaultPrevented).toBeTrue();
    expect(conversationsApi.sendMessage).toHaveBeenCalledWith('conv-1', { content: 'Gracias' });
  });

  it('preserves composer focus when sending triggers view-model notifications', async () => {
    await mountView();
    await viewModel.selectConversation('conv-1');

    const textarea = container.querySelector('.q-conversations-chat__composer__input');
    textarea.value = 'hola mundo';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange(2, 6);

    await viewModel.sendMessage();

    const next = container.querySelector('.q-conversations-chat__composer__input');
    expect(next).not.toBeNull();
    expect(document.activeElement).toBe(next);
    expect(next.value).toBe('');
  });

  it('back button clears the selected conversation', async () => {
    await mountView();
    await viewModel.selectConversation('conv-1');

    container.querySelector('.q-conversations-chat__back').click();

    expect(viewModel.activeId).toBeNull();
  });

  it('renders an image avatar when available and an SVG fallback otherwise', async () => {
    await mountView({ profile: { avatar_path: 'https://cdn.example/seller.png' } });

    expect(container.querySelector('.q-conversations-list__avatar img').src).toBe(
      'https://cdn.example/seller.png'
    );

    view.destroy();
    view = null;
    await mountView();
    expect(container.querySelector('.q-conversations-list__avatar svg')).not.toBeNull();
  });

  it('disables the Enviar button while a message is being sent', async () => {
    await mountView();
    await viewModel.selectConversation('conv-1');
    let resolveSend;
    conversationsApi.sendMessage.and.returnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      })
    );
    viewModel.setInputValue('En proceso');
    const pending = viewModel.sendMessage();

    expect(container.querySelector('.q-conversations-chat__composer button').disabled).toBeTrue();
    resolveSend({ data: makeMessage({ id: 'message-2' }), meta: {} });
    await pending;
  });
});
