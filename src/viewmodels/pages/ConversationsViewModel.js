import { ConversationsApi } from '../../models/api/ConversationsApi.js';
import { ProductsApi } from '../../models/api/ProductsApi.js';
import { ProfilesApi } from '../../models/api/ProfilesApi.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';

const errorMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

export class ConversationsViewModel {
  constructor({
    conversationsApi = new ConversationsApi(),
    profilesApi = new ProfilesApi(),
    productsApi = new ProductsApi(),
    authStore = defaultAuthStore,
    router = null,
    onNavigate = null,
    initialActiveId = null,
  } = {}) {
    this.conversationsApi = conversationsApi;
    this.profilesApi = profilesApi;
    this.productsApi = productsApi;
    this.authStore = authStore;
    this.router = router;
    this.onNavigate = onNavigate;
    this.initialActiveId = initialActiveId;

    this.conversations = [];
    this.activeId = null;
    this.activeConversation = null;
    this.messages = [];
    this.isListLoading = false;
    this.isMessagesLoading = false;
    this.isSending = false;
    this.errorMessage = '';
    this.sendError = '';
    this.inputValue = '';
    this.profiles = new Map();

    this._listeners = new Set();
    this._profileRequests = new Map();
    this._destroyed = false;
  }

  get activeProduct() {
    return this.activeConversation?.product || null;
  }

  get activeOtherParty() {
    return this.profiles.get(this.activeConversation?.otherId) || null;
  }

  async loadConversations() {
    this.isListLoading = true;
    this.errorMessage = '';
    this._notify();

    try {
      const { data = [] } = await this.conversationsApi.listConversations({
        page: 1,
        limit: 30,
      });
      const myId = this.authStore.getUser?.()?.id || this.authStore.user?.id;

      this.conversations = (Array.isArray(data) ? data : []).map((row) => ({
        ...row,
        otherId: row.buyer_id === myId ? row.seller_id : row.buyer_id,
        product_id: row.product_id || row.product?.id || null,
        product: row.product || row.product_summary || null,
        last_message_at: row.last_message_at || null,
        lastMessagePreview:
          row.last_message_preview || row.last_message?.content || row.lastMessagePreview || '',
      }));

      await Promise.all(
        this.conversations.map((conversation) => this._enrichConversation(conversation))
      );

      if (this.activeId) {
        this.activeConversation =
          this.conversations.find((conversation) => conversation.id === this.activeId) || null;
      }

      const initialConversation = this.initialActiveId
        ? this.conversations.find((conversation) => conversation.id === this.initialActiveId)
        : null;
      this.initialActiveId = null;
      this.isListLoading = false;
      this._notify();

      if (initialConversation) {
        await this.selectConversation(initialConversation.id);
      }
    } catch (error) {
      this.isListLoading = false;
      this.errorMessage = errorMessage(error, 'No se pudieron cargar las conversaciones.');
      // eslint-disable-next-line no-console
      console.warn(`[ConversationsViewModel] failed to load conversations: ${this.errorMessage}`);
      this._notify();
    }
  }

  async _enrichConversation(conversation) {
    const tasks = [this._ensureProfile(conversation.otherId)];

    if (!conversation.product && conversation.product_id) {
      tasks.push(
        this.productsApi
          .getProductById(conversation.product_id)
          .then((product) => {
            conversation.product = product || null;
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.warn(
              `[ConversationsViewModel] failed to load product ${conversation.product_id}: ${errorMessage(error, 'Unknown error')}`
            );
          })
      );
    }

    if (!conversation.lastMessagePreview) {
      tasks.push(
        this.conversationsApi
          .listMessages(conversation.id, { page: 1, limit: 50 })
          .then(({ data = [] }) => {
            const latestMessage = [...data].sort(
              (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)
            );
            conversation.lastMessagePreview = latestMessage.at(-1)?.content || '';
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.warn(
              `[ConversationsViewModel] failed to load preview for ${conversation.id}: ${errorMessage(error, 'Unknown error')}`
            );
          })
      );
    }

    await Promise.all(tasks);
  }

  async selectConversation(id) {
    if (!id) {
      this.activeId = null;
      this.activeConversation = null;
      this.messages = [];
      this.sendError = '';
      this._notify();
      return;
    }

    const conversation = this.conversations.find((row) => row.id === id);
    if (!conversation) return;

    this.activeId = id;
    this.activeConversation = conversation;
    this.messages = [];
    this.sendError = '';
    this._notify();
    await this.loadMessages(id);
  }

  async loadMessages(id) {
    this.isMessagesLoading = true;
    this._notify();

    try {
      const { data = [] } = await this.conversationsApi.listMessages(id, {
        page: 1,
        limit: 50,
      });
      this.messages = [...data].sort(
        (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)
      );
      await Promise.all(
        [...new Set(this.messages.map((message) => message.sender_id).filter(Boolean))].map(
          (senderId) => this._ensureProfile(senderId)
        )
      );
    } catch (error) {
      this.messages = [];
      this.errorMessage = errorMessage(error, 'No se pudieron cargar los mensajes.');
      // eslint-disable-next-line no-console
      console.warn(`[ConversationsViewModel] failed to load messages: ${this.errorMessage}`);
    } finally {
      this.isMessagesLoading = false;
      this._notify();
    }
  }

  async sendMessage() {
    const content = this.inputValue.trim();
    if (!content) {
      this.sendError = 'El mensaje no puede estar vacío.';
      this._notify();
      return;
    }
    if (!this.activeId || this.isSending) return;

    this.isSending = true;
    this.sendError = '';
    this._notify();

    try {
      const response = await this.conversationsApi.sendMessage(this.activeId, { content });
      if (!response?.data) throw new Error('No se pudo enviar el mensaje.');

      this.messages = [...this.messages, response.data].sort(
        (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)
      );
      this.inputValue = '';
      if (this.activeConversation) {
        this.activeConversation.lastMessagePreview = response.data.content;
        this.activeConversation.last_message_at = response.data.created_at;
      }
      this._notify();
      await this.loadConversations();
    } catch (error) {
      this.sendError = errorMessage(error, 'No se pudo enviar el mensaje.');
      // eslint-disable-next-line no-console
      console.warn(`[ConversationsViewModel] failed to send message: ${this.sendError}`);
    } finally {
      this.isSending = false;
      this._notify();
    }
  }

  setInputValue(value) {
    this.inputValue = String(value ?? '');
    this.sendError = '';
    this._notify();
  }

  async _ensureProfile(userId) {
    if (!userId) return null;
    if (this.profiles.has(userId)) return this.profiles.get(userId);
    if (this._profileRequests.has(userId)) return this._profileRequests.get(userId);

    const request = this.profilesApi
      .getById(userId)
      .then(({ data }) => ({
        id: userId,
        displayName: data?.full_name || data?.username || 'Usuario',
        avatarUrl: data?.avatar_path || null,
      }))
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.warn(
          `[ConversationsViewModel] failed to load profile ${userId}: ${errorMessage(error, 'Unknown error')}`
        );
        return { id: userId, displayName: 'Usuario', avatarUrl: null };
      })
      .then((profile) => {
        this.profiles.set(userId, profile);
        this._profileRequests.delete(userId);
        return profile;
      });

    this._profileRequests.set(userId, request);
    return request;
  }

  navigate(path) {
    if (typeof this.onNavigate === 'function') this.onNavigate(path);
    else this.router?.navigate(path);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    this._destroyed = true;
    this._listeners.clear();
    this._profileRequests.clear();
  }

  _notify() {
    if (this._destroyed) return;
    [...this._listeners].forEach((listener) => listener(this));
  }
}
