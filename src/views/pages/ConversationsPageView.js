import { ConversationsApi } from '../../models/api/ConversationsApi.js';
import { ProductsApi } from '../../models/api/ProductsApi.js';
import { ProfilesApi } from '../../models/api/ProfilesApi.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';
import { ConversationsViewModel } from '../../viewmodels/pages/ConversationsViewModel.js';
import { ProductCard } from '../components/ProductCard.js';

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

export class ConversationsPageView {
  constructor({
    viewModel = null,
    conversationsApi = new ConversationsApi(),
    profilesApi = new ProfilesApi(),
    productsApi = new ProductsApi(),
    authStore = defaultAuthStore,
    onNavigate = null,
  } = {}) {
    const initialActiveId = new URLSearchParams(window.location.search).get('active');
    this.viewModel =
      viewModel ||
      new ConversationsViewModel({
        conversationsApi,
        profilesApi,
        productsApi,
        authStore,
        onNavigate,
        initialActiveId,
      });
    this.element = null;
    this._unsubscribe = null;
    this._lastScrollKey = null;
  }

  render() {
    if (this.element) return this.element;

    const page = document.createElement('section');
    page.className = 'q-conversations-page';
    page.setAttribute('aria-label', 'Mensajes');

    const shell = document.createElement('div');
    shell.className = 'q-section-container q-conversations-page__shell';

    const listPanel = document.createElement('aside');
    listPanel.className = 'q-conversations-list';
    listPanel.setAttribute('aria-label', 'Lista de conversaciones');

    const listHeader = document.createElement('header');
    listHeader.className = 'q-conversations-list__header';
    const listTitle = document.createElement('h1');
    listTitle.textContent = 'Mensajes';
    listHeader.appendChild(listTitle);

    const listContent = document.createElement('div');
    listContent.className = 'q-conversations-list__content';
    listContent.setAttribute('aria-live', 'polite');
    listPanel.append(listHeader, listContent);

    const chatPanel = document.createElement('main');
    chatPanel.className = 'q-conversations-chat';
    chatPanel.setAttribute('aria-label', 'Conversación activa');

    shell.append(listPanel, chatPanel);
    page.appendChild(shell);
    this.element = page;
    return page;
  }

  mount(container) {
    container.appendChild(this.render());
    this._unsubscribe = this.viewModel.subscribe(() => this._update());
    this._update();
    void this.viewModel.loadConversations();
    return this.element;
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') this._unsubscribe();
    this._unsubscribe = null;
    this.viewModel.destroy?.();
    this.element?.remove();
    this.element = null;
  }

  _update() {
    if (!this.element) return;
    this.element.dataset.active = String(Boolean(this.viewModel.activeId));

    const listContent = this.element.querySelector('.q-conversations-list__content');
    const chatPanel = this.element.querySelector('.q-conversations-chat');
    if (!listContent || !chatPanel) return;

    this._renderConversationList(listContent);
    this._renderChat(chatPanel);

    const lastMessage = this.viewModel.messages.at(-1);
    const scrollKey = `${this.viewModel.activeId || ''}:${lastMessage?.id || lastMessage?.created_at || ''}`;
    if (
      this.viewModel.activeId &&
      !this.viewModel.isMessagesLoading &&
      scrollKey !== this._lastScrollKey
    ) {
      const messageArea = chatPanel.querySelector('.q-conversations-chat__messages');
      if (messageArea) messageArea.scrollTop = messageArea.scrollHeight;
      this._lastScrollKey = scrollKey;
    }
  }

  _renderConversationList(container) {
    container.replaceChildren();

    if (this.viewModel.isListLoading && this.viewModel.conversations.length === 0) {
      for (let index = 0; index < 6; index += 1) {
        const skeleton = document.createElement('div');
        skeleton.className = 'q-conversations-list__skeleton';
        skeleton.setAttribute('aria-hidden', 'true');
        container.appendChild(skeleton);
      }
      return;
    }

    if (this.viewModel.errorMessage && this.viewModel.conversations.length === 0) {
      const error = document.createElement('div');
      error.className = 'q-conversations-list__error';
      error.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = this.viewModel.errorMessage;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'q-btn q-btn--outline';
      retry.textContent = 'Reintentar';
      retry.addEventListener('click', () => this.viewModel.loadConversations());
      error.append(message, retry);
      container.appendChild(error);
      return;
    }

    if (this.viewModel.conversations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'q-conversations-list__empty';
      const message = document.createElement('p');
      message.textContent = 'No tienes conversaciones todavía.';
      const hint = document.createElement('p');
      hint.textContent = 'Explora productos y contacta a un vendedor para empezar.';
      empty.append(message, hint);
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'q-conversations-list__items';
    this.viewModel.conversations.forEach((conversation) => {
      const profile = this.viewModel.profiles.get(conversation.otherId);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'q-conversations-list__item';
      if (conversation.id === this.viewModel.activeId) item.classList.add('is-selected');
      item.setAttribute('aria-pressed', String(conversation.id === this.viewModel.activeId));
      item.addEventListener('click', () => this.viewModel.selectConversation(conversation.id));

      item.appendChild(this._renderAvatar(profile, 'q-conversations-list__avatar', 40));

      const content = document.createElement('span');
      content.className = 'q-conversations-list__item-content';
      const name = document.createElement('span');
      name.className = 'q-conversations-list__name';
      name.textContent = profile?.displayName || 'Usuario';
      const product = document.createElement('span');
      product.className = 'q-conversations-list__product-name';
      product.textContent = conversation.product?.name || '';
      const preview = document.createElement('span');
      preview.className = 'q-conversations-list__preview';
      preview.textContent = conversation.lastMessagePreview || '';
      content.append(name, product, preview);

      const timestamp = document.createElement('time');
      timestamp.className = 'q-conversations-list__timestamp';
      timestamp.dateTime = conversation.last_message_at || '';
      timestamp.textContent = formatTimestamp(conversation.last_message_at);

      item.append(content, timestamp);
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  _renderAvatar(profile, className, size) {
    const avatar = document.createElement('span');
    avatar.className = className;
    avatar.setAttribute('aria-hidden', 'true');
    if (profile?.avatarUrl) {
      const image = document.createElement('img');
      image.src = profile.avatarUrl;
      image.alt = '';
      image.width = size;
      image.height = size;
      avatar.appendChild(image);
      return avatar;
    }

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.7');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.innerHTML = '<circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>';
    avatar.appendChild(icon);
    return avatar;
  }

  _renderChat(container) {
    container.replaceChildren();

    if (!this.viewModel.activeId || !this.viewModel.activeConversation) {
      const empty = document.createElement('div');
      empty.className = 'q-conversations-chat__empty';
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '1.6');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML =
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';
      const title = document.createElement('h2');
      title.textContent = 'Selecciona una conversación';
      const subtitle = document.createElement('p');
      subtitle.textContent = 'Los mensajes se mostrarán aquí.';
      empty.append(icon, title, subtitle);
      container.appendChild(empty);
      return;
    }

    const otherParty = this.viewModel.activeOtherParty;
    const product = this.viewModel.activeProduct;
    const header = document.createElement('header');
    header.className = 'q-conversations-chat__header';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'q-conversations-chat__back';
    back.setAttribute('aria-label', 'Volver a la lista de conversaciones');
    back.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
    back.addEventListener('click', () => this.viewModel.selectConversation(null));

    const identity = document.createElement('div');
    identity.className = 'q-conversations-chat__identity';
    const title = document.createElement('h1');
    title.textContent = product?.name || otherParty?.displayName || 'Usuario';
    const subtitle = document.createElement('p');
    subtitle.textContent = otherParty?.displayName || 'Usuario';
    identity.append(title, subtitle);
    header.append(back, identity);
    container.appendChild(header);

    if (product) {
      const productStrip = document.createElement('section');
      productStrip.className = 'q-conversations-chat__product';
      const productLabel = document.createElement('h2');
      productLabel.textContent = 'Producto de esta conversación';
      const card = new ProductCard({
        product,
        variant: 'compact',
        hideAddToCart: true,
        onView: (selectedProduct) =>
          this.viewModel.navigate(
            `/products/${encodeURIComponent(selectedProduct.slug || selectedProduct.id)}`
          ),
      }).render();
      card.classList.add('q-conversations-chat__product-card');
      card.querySelectorAll('a.product-card__view-link').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
      });
      productStrip.append(productLabel, card);
      container.appendChild(productStrip);
    }

    const messages = document.createElement('div');
    messages.className = 'q-conversations-chat__messages';
    messages.setAttribute('aria-live', 'polite');
    if (this.viewModel.isMessagesLoading && this.viewModel.messages.length === 0) {
      const loading = document.createElement('p');
      loading.className = 'q-conversations-chat__loading';
      loading.textContent = 'Cargando mensajes…';
      messages.appendChild(loading);
    } else {
      this.viewModel.messages.forEach((message) =>
        messages.appendChild(this._renderMessage(message))
      );
    }
    container.appendChild(messages);

    if (this.viewModel.errorMessage && !this.viewModel.isListLoading) {
      const messageError = document.createElement('p');
      messageError.className = 'q-conversations-chat__error';
      messageError.setAttribute('role', 'alert');
      messageError.textContent = this.viewModel.errorMessage;
      container.appendChild(messageError);
    }
    container.appendChild(this._renderComposer());
  }

  _renderMessage(message) {
    const isMine =
      message.sender_id ===
      (this.viewModel.authStore.getUser?.()?.id || this.viewModel.authStore.user?.id);
    const profile = this.viewModel.profiles.get(message.sender_id);
    const row = document.createElement('article');
    row.className = `q-msg ${isMine ? 'q-msg--mine' : 'q-msg--other'}`;

    if (!isMine) row.appendChild(this._renderAvatar(profile, 'q-msg__avatar', 32));

    const body = document.createElement('div');
    body.className = 'q-msg__body';
    if (!isMine) {
      const name = document.createElement('p');
      name.className = 'q-msg__name';
      name.textContent = profile?.displayName || 'Usuario';
      body.appendChild(name);
    }
    const bubble = document.createElement('p');
    bubble.className = 'q-msg__bubble';
    bubble.textContent = message.content || '';
    const timestamp = document.createElement('time');
    timestamp.className = 'q-msg__timestamp';
    timestamp.dateTime = message.created_at || '';
    timestamp.textContent = formatTimestamp(message.created_at);
    body.append(bubble, timestamp);
    row.appendChild(body);
    return row;
  }

  _renderComposer() {
    const composer = document.createElement('form');
    composer.className = 'q-conversations-chat__composer';
    composer.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.viewModel.sendMessage();
    });

    if (this.viewModel.sendError) {
      const error = document.createElement('p');
      error.className = 'q-conversations-chat__error';
      error.setAttribute('role', 'alert');
      error.textContent = this.viewModel.sendError;
      composer.appendChild(error);
    }

    const row = document.createElement('div');
    row.className = 'q-conversations-chat__composer-row';
    const textarea = document.createElement('textarea');
    textarea.rows = 1;
    textarea.maxLength = 2000;
    textarea.value = this.viewModel.inputValue;
    textarea.disabled = this.viewModel.isSending;
    textarea.setAttribute('aria-label', 'Escribe un mensaje');
    textarea.addEventListener('input', (event) => this.viewModel.setInputValue(event.target.value));
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void this.viewModel.sendMessage();
      }
    });

    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'q-btn q-btn--primary';
    send.textContent = 'Enviar';
    send.disabled = this.viewModel.isSending;
    row.append(textarea, send);
    composer.appendChild(row);
    return composer;
  }
}
