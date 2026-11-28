import { ModalView } from './ModalView.js';

export class RejectSellerApplicationModal {
  constructor({ businessName = 'esta solicitud', onConfirm } = {}) {
    this.businessName = businessName;
    this.onConfirm = onConfirm;

    this._reason = '';
    this._isSubmitting = false;
    this._errorMessage = '';
    this._confirmed = false;
    this._modal = null;
    this._bodyContainer = null;
    this._footerContainer = null;
    this._onKeydown = null;
  }

  async open() {
    this._bodyContainer = document.createElement('div');
    this._footerContainer = document.createElement('div');
    this._footerContainer.className = 'q-reject-modal__footer';

    this._modal = new ModalView({
      title: 'Rechazar solicitud',
      body: this._bodyContainer,
      footer: this._footerContainer,
      size: 'sm',
      closeOnBackdropClick: false,
      closeOnEsc: false,
    });

    this._onKeydown = (event) => {
      if (event.key === 'Escape' && !this._isSubmitting) {
        event.preventDefault();
        this._modal.close();
      }
    };
    document.addEventListener('keydown', this._onKeydown);

    this._renderBody();
    this._renderFooter();

    const openPromise = this._modal.open();
    this._bodyContainer.querySelector('#q-reject-modal-reason')?.focus();
    await openPromise;

    this.destroy();
    return this._confirmed
      ? { confirmed: true, reason: this._reason.trim() }
      : { confirmed: false };
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

  _renderBody() {
    const context = document.createElement('p');
    context.className = 'q-reject-modal__context';
    const businessName = document.createElement('strong');
    businessName.textContent = this.businessName;
    context.append(
      document.createTextNode('Estás rechazando la solicitud de '),
      businessName,
      document.createTextNode('.')
    );

    const field = document.createElement('div');
    field.className = 'q-reject-modal__field';

    const label = document.createElement('label');
    label.htmlFor = 'q-reject-modal-reason';
    label.textContent = 'Motivo de rechazo *';

    const textarea = document.createElement('textarea');
    textarea.id = 'q-reject-modal-reason';
    textarea.rows = 4;
    textarea.maxLength = 500;
    textarea.placeholder = 'Explica brevemente el motivo del rechazo…';
    textarea.setAttribute('aria-describedby', 'q-reject-modal-counter q-reject-modal-error');
    textarea.addEventListener('input', () => {
      this._reason = textarea.value;
      counter.textContent = `${this._reason.length} / 500`;
      if (this._errorMessage) this._showError('');
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this._submit();
      }
    });

    const counter = document.createElement('span');
    counter.id = 'q-reject-modal-counter';
    counter.className = 'q-reject-modal__counter';
    counter.textContent = '0 / 500';

    const error = document.createElement('p');
    error.id = 'q-reject-modal-error';
    error.className = 'q-reject-modal__error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    field.append(label, textarea, counter, error);
    this._bodyContainer.append(context, field);
  }

  _renderFooter() {
    this._footerContainer.replaceChildren();

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'q-btn q-btn--outline';
    cancelButton.textContent = 'Cancelar';
    cancelButton.disabled = this._isSubmitting;
    cancelButton.addEventListener('click', () => {
      if (!this._isSubmitting) this._modal.close();
    });

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'q-btn q-btn--danger';
    confirmButton.textContent = this._isSubmitting ? 'Rechazando…' : 'Confirmar rechazo';
    confirmButton.disabled = this._isSubmitting;
    confirmButton.addEventListener('click', () => void this._submit());

    this._footerContainer.append(cancelButton, confirmButton);
    const closeButton = this._modal?.element?.querySelector('.q-modal__close');
    if (closeButton) closeButton.disabled = this._isSubmitting;
  }

  _showError(message) {
    this._errorMessage = message;
    const error = this._bodyContainer?.querySelector('#q-reject-modal-error');
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  async _submit() {
    if (this._isSubmitting) return;
    const reason = this._reason.trim();
    if (!reason) {
      this._showError('El motivo es obligatorio.');
      this._bodyContainer.querySelector('#q-reject-modal-reason')?.focus();
      return;
    }
    if (reason.length > 500) {
      this._showError('El motivo no puede superar 500 caracteres.');
      this._bodyContainer.querySelector('#q-reject-modal-reason')?.focus();
      return;
    }

    this._isSubmitting = true;
    this._renderFooter();
    const textarea = this._bodyContainer.querySelector('#q-reject-modal-reason');
    if (textarea) textarea.disabled = true;

    try {
      const result = await this.onConfirm(reason);
      if (result?.success !== true) {
        this._isSubmitting = false;
        this._showError(result?.error || 'No se pudo rechazar la solicitud.');
        this._renderFooter();
        if (textarea) {
          textarea.disabled = false;
          textarea.focus();
        }
        return;
      }

      this._confirmed = true;
      this._reason = reason;
      this._modal.close();
    } catch (error) {
      this._isSubmitting = false;
      this._showError(error?.message || 'No se pudo rechazar la solicitud.');
      this._renderFooter();
      if (textarea) {
        textarea.disabled = false;
        textarea.focus();
      }
    }
  }
}
