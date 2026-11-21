import { ModalView } from './ModalView.js';

function createIcon(name) {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');

  if (name === 'trash') {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', 'M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6');
    icon.appendChild(path);
  } else {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute(
      'd',
      'm10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z'
    );
    const mark = document.createElementNS(namespace, 'path');
    mark.setAttribute('d', 'M12 9v4m0 4h.01');
    icon.append(path, mark);
  }
  return icon;
}

export class DeleteConfirmModal {
  /**
   * Modal that asks the user to confirm deletion of a product.
   *
   * Design decisions:
   * - closeOnBackdropClick: false (data-loss risk mid-flight)
   * - closeOnEsc: true when idle; ignored while onConfirm is in-flight
   * - Uses .q-btn--danger for the destructive button (token: --q-color-red-56)
   *
   * @param {Object} options
   * @param {string} options.productId
   * @param {string} options.productName          Used in the confirm copy
   * @param {Function} options.onConfirm          Async; called on "Eliminar" click.
   *   Should delegate to SellerProductsViewModel.deleteProduct(productId).
   * @param {'sm'|'md'} [options.size='sm']
   */
  constructor({ productId, productName, onConfirm, size = 'sm' } = {}) {
    this.productId = productId;
    this.productName = productName;
    this.onConfirm = onConfirm;
    this.size = size;

    this._modal = null;
    this._bodyContainer = null;
    this._footerContainer = null;
    this._onKeydown = null;

    // in-flight state
    this._isDeleting = false;
    this._confirmed = false;
    this._errorMessage = '';
  }

  /**
   * Opens the confirmation modal.
   * Resolves with { confirmed: boolean } when the modal is closed.
   * @returns {Promise<{ confirmed: boolean }>}
   */
  async open() {
    this._bodyContainer = document.createElement('div');
    this._bodyContainer.className = 'q-delete-confirm-modal__body';

    this._footerContainer = document.createElement('div');
    this._footerContainer.className = 'q-delete-confirm-modal__footer';

    this._modal = new ModalView({
      title: 'Eliminar producto',
      body: this._bodyContainer,
      footer: this._footerContainer,
      size: this.size,
      closeOnBackdropClick: false,
      closeOnEsc: false, // we handle Esc manually to block it while in-flight
    });

    // Manual Esc handler: allow close only when idle
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && !this._isDeleting) {
        e.preventDefault();
        this._modal.close();
      }
    };
    document.addEventListener('keydown', this._onKeydown);

    this._render();

    await this._modal.open();

    this.destroy();

    return { confirmed: this._confirmed };
  }

  /**
   * Cleans up listeners and modal DOM.
   */
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

  /**
   * @private
   */
  _render() {
    if (!this._bodyContainer || !this._footerContainer) return;
    this._renderBody();
    this._renderFooter();
    const closeButton = this._modal?.element?.querySelector('.q-modal__close');
    if (closeButton) closeButton.disabled = this._isDeleting;
  }

  /**
   * @private
   */
  _renderBody() {
    this._bodyContainer.replaceChildren();

    const summary = document.createElement('div');
    summary.className = 'q-delete-confirm-modal__summary';
    const badge = document.createElement('span');
    badge.className = 'q-delete-confirm-modal__icon-badge';
    badge.appendChild(createIcon('alert'));
    const copy = document.createElement('div');
    copy.className = 'q-delete-confirm-modal__copy';
    const p1 = document.createElement('p');
    p1.className = 'q-delete-confirm-modal__question';
    p1.appendChild(document.createTextNode('¿Quieres eliminar '));
    const name = document.createElement('strong');
    name.className = 'q-delete-confirm-modal__product-name';
    name.textContent = this.productName || 'este producto';
    p1.append(name, document.createTextNode('?'));

    const p2 = document.createElement('p');
    p2.className = 'q-delete-confirm-modal__warning';
    p2.textContent = 'La eliminación es permanente y no se puede deshacer.';

    copy.append(p1, p2);
    summary.append(badge, copy);
    this._bodyContainer.appendChild(summary);

    if (this._errorMessage) {
      const errEl = document.createElement('p');
      errEl.className = 'q-delete-confirm-modal__error';
      errEl.setAttribute('role', 'alert');
      errEl.textContent = this._errorMessage;
      this._bodyContainer.appendChild(errEl);
    }
  }

  /**
   * @private
   */
  _renderFooter() {
    this._footerContainer.replaceChildren();

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'q-btn q-btn--outline q-delete-confirm-modal__cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.disabled = this._isDeleting;
    cancelBtn.addEventListener('click', () => {
      if (this._isDeleting) return;
      this._modal.close();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'q-btn q-btn--danger q-delete-confirm-modal__confirm';
    deleteBtn.append(
      createIcon('trash'),
      document.createTextNode(this._isDeleting ? 'Eliminando…' : 'Eliminar')
    );
    deleteBtn.disabled = this._isDeleting;
    deleteBtn.addEventListener('click', async () => {
      if (this._isDeleting) return; // double-click guard
      this._isDeleting = true;
      this._errorMessage = '';
      this._render();

      try {
        const result = await this.onConfirm();
        if (result?.status !== 'success') {
          throw result?.error || new Error('No se pudo completar la eliminación.');
        }
        this._confirmed = true;
        this._modal.close();
      } catch (err) {
        this._isDeleting = false;
        this._errorMessage = err?.message || 'Error al eliminar el producto.';
        this._render();
      }
    });

    this._footerContainer.append(cancelBtn, deleteBtn);
  }
}
