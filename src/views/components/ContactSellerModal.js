import { ModalView } from './ModalView.js';

const MAX_MESSAGE_LENGTH = 2000;

export class ContactSellerModal {
  /**
   * @param {Object} options
   * @param {string} [options.sellerName='Vendedor']
   * @param {string} [options.productName='']
   * @param {Function} options.onSend Async `(content: string) => Promise<Object>`
   * @param {'sm'|'md'|'lg'} [options.size='md']
   */
  constructor({ sellerName = 'Vendedor', productName = '', onSend, size = 'md' } = {}) {
    this.sellerName = sellerName || 'Vendedor';
    this.productName = productName || '';
    this.onSend = onSend;
    this.size = size;

    this._modal = null;
    this._bodyContainer = null;
    this._footerContainer = null;
    this._textarea = null;
    this._counterEl = null;
    this._errorEl = null;
    this._sendBtn = null;
    this._cancelBtn = null;
    this._onKeydown = null;

    this._content = '';
    this._isSending = false;
    this._sent = false;
    this._result = null;
    this._errorMessage = '';
  }

  /**
   * Opens the modal and resolves when closed.
   * @returns {Promise<{ sent: boolean, result?: Object }>}
   */
  async open() {
    this._bodyContainer = document.createElement('div');
    this._bodyContainer.className = 'q-contact-seller-modal__body';

    this._footerContainer = document.createElement('div');
    this._footerContainer.className = 'q-contact-seller-modal__footer';

    this._buildDom();

    this._modal = new ModalView({
      title: `Contactar a ${this.sellerName}`,
      body: this._bodyContainer,
      footer: this._footerContainer,
      size: this.size,
      closeOnBackdropClick: false,
      closeOnEsc: false,
    });

    this._onKeydown = (e) => {
      if (e.key === 'Escape' && !this._isSending) {
        e.preventDefault();
        this._modal.close();
      }
    };
    document.addEventListener('keydown', this._onKeydown);

    await this._modal.open();

    this.destroy();

    return { sent: this._sent, result: this._result };
  }

  destroy() {
    if (this._onKeydown) {
      document.removeEventListener('keydown', this._onKeydown);
      this._onKeydown = null;
    }
    if (this._modal) {
      this._modal.destroy();
      this._modal = null;
    }
  }

  _buildDom() {
    this._bodyContainer.replaceChildren();
    this._footerContainer.replaceChildren();

    if (this.productName) {
      const context = document.createElement('p');
      context.className = 'q-contact-seller-modal__context';
      context.appendChild(document.createTextNode('Consulta sobre: '));
      const strong = document.createElement('strong');
      strong.textContent = this.productName;
      context.appendChild(strong);
      this._bodyContainer.appendChild(context);
    }

    const field = document.createElement('div');
    field.className = 'q-contact-seller-modal__field';

    const label = document.createElement('label');
    label.className = 'q-contact-seller-modal__label';
    label.htmlFor = 'q-contact-seller-message';
    label.textContent = 'Tu mensaje';

    const textarea = document.createElement('textarea');
    textarea.id = 'q-contact-seller-message';
    textarea.name = 'content';
    textarea.className = 'q-contact-seller-modal__textarea';
    textarea.rows = 4;
    textarea.maxLength = MAX_MESSAGE_LENGTH;
    textarea.placeholder = 'Escribe tu consulta para el vendedor…';
    textarea.value = this._content;
    textarea.addEventListener('input', (e) => {
      this._content = e.target.value;
      if (this._errorMessage) {
        this._errorMessage = '';
        this._syncState();
      } else if (this._counterEl) {
        this._counterEl.textContent = `${this._content.length} / ${MAX_MESSAGE_LENGTH}`;
      }
    });
    this._textarea = textarea;

    const metaRow = document.createElement('div');
    metaRow.className = 'q-contact-seller-modal__meta';

    const counter = document.createElement('span');
    counter.className = 'q-contact-seller-modal__counter';
    counter.textContent = `0 / ${MAX_MESSAGE_LENGTH}`;
    this._counterEl = counter;

    metaRow.appendChild(counter);
    field.append(label, textarea, metaRow);
    this._bodyContainer.appendChild(field);

    const errorEl = document.createElement('p');
    errorEl.className = 'q-contact-seller-modal__error';
    errorEl.setAttribute('role', 'alert');
    errorEl.hidden = true;
    this._errorEl = errorEl;
    this._bodyContainer.appendChild(errorEl);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'q-btn q-btn--outline q-contact-seller-modal__cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      if (this._isSending) return;
      this._modal.close();
    });
    this._cancelBtn = cancelBtn;

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'q-btn q-btn--primary q-contact-seller-modal__send';
    sendBtn.textContent = 'Enviar';
    sendBtn.addEventListener('click', () => void this._submit());
    this._sendBtn = sendBtn;

    this._footerContainer.append(cancelBtn, sendBtn);
  }

  _syncState() {
    if (this._textarea) {
      this._textarea.disabled = this._isSending;
    }
    if (this._counterEl) {
      this._counterEl.textContent = `${this._content.length} / ${MAX_MESSAGE_LENGTH}`;
    }
    if (this._cancelBtn) {
      this._cancelBtn.disabled = this._isSending;
    }
    if (this._sendBtn) {
      this._sendBtn.disabled = this._isSending;
      this._sendBtn.textContent = this._isSending ? 'Enviando…' : 'Enviar';
    }
    if (this._errorEl) {
      this._errorEl.textContent = this._errorMessage;
      this._errorEl.hidden = !this._errorMessage;
    }
    const closeBtn = this._modal?.element?.querySelector('.q-modal__close');
    if (closeBtn) {
      closeBtn.disabled = this._isSending;
    }
  }

  async _submit() {
    if (this._isSending) return;

    const trimmed = this._content.trim();
    if (!trimmed) {
      this._errorMessage = 'El mensaje no puede estar vacío.';
      this._syncState();
      this._textarea?.focus();
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      this._errorMessage = `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`;
      this._syncState();
      return;
    }

    this._isSending = true;
    this._errorMessage = '';
    this._syncState();

    try {
      this._result = await this.onSend(trimmed);
      this._sent = true;
      this._modal.close();
    } catch (err) {
      this._isSending = false;
      this._errorMessage = err?.message || 'No se pudo enviar el mensaje.';
      this._syncState();
    }
  }
}
