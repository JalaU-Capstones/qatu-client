let modalCounter = 0;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class ModalView {
  /**
   * @param {Object} [options]
   * @param {string} [options.title]         Dialog title (aria-labelledby)
   * @param {HTMLElement|string} [options.body]  Content: HTMLElement or text
   * @param {HTMLElement|string} [options.footer] Optional footer (buttons)
   * @param {Function} [options.onClose]     Called once when the modal closes
   * @param {'sm'|'md'|'lg'} [options.size='md']
   * @param {boolean} [options.closeOnBackdropClick=true]
   * @param {boolean} [options.closeOnEsc=true]
   */
  constructor({
    title = '',
    body = null,
    footer = null,
    onClose = null,
    size = 'md',
    closeOnBackdropClick = true,
    closeOnEsc = true,
  } = {}) {
    this.title = title || '';
    this.body = body;
    this.footer = footer;
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.size = ['sm', 'md', 'lg'].includes(size) ? size : 'md';
    this.closeOnBackdropClick = closeOnBackdropClick !== false;
    this.closeOnEsc = closeOnEsc !== false;

    modalCounter += 1;
    this._titleId = `q-modal-title-${modalCounter}`;
    this._bodyId = `q-modal-body-${modalCounter}`;

    this.element = null;
    this._panel = null;
    this._backdrop = null;
    this._closeBtn = null;

    this._isOpen = false;
    this._openPromise = null;
    this._resolveOpen = null;
    this._opener = null;
    this._previousOverflow = '';

    this._handleKeydown = this._onKeydown.bind(this);
  }

  /**
   * Builds the DOM element. Idempotent — calling twice returns the same element.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) return this.element;

    const modal = document.createElement('div');
    modal.className = 'q-modal';
    modal.setAttribute('role', 'presentation');

    const backdrop = document.createElement('div');
    backdrop.className = 'q-modal__backdrop';
    backdrop.dataset.modalBackdrop = '';
    backdrop.addEventListener('click', () => {
      if (this.closeOnBackdropClick) {
        this.close();
      }
    });
    this._backdrop = backdrop;
    modal.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.className = `q-modal__panel q-modal__panel--${this.size}`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');
    panel.setAttribute('aria-describedby', this._bodyId);

    if (this.title) {
      panel.setAttribute('aria-labelledby', this._titleId);

      const header = document.createElement('header');
      header.className = 'q-modal__header';

      const titleEl = document.createElement('h2');
      titleEl.className = 'q-modal__title';
      titleEl.id = this._titleId;
      titleEl.textContent = this.title;

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'q-modal__close';
      closeBtn.setAttribute('aria-label', 'Cerrar');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => this.close());
      this._closeBtn = closeBtn;

      header.appendChild(titleEl);
      header.appendChild(closeBtn);
      panel.appendChild(header);
    }

    const bodyEl = document.createElement('div');
    bodyEl.className = 'q-modal__body';
    bodyEl.id = this._bodyId;

    if (this.body instanceof HTMLElement) {
      bodyEl.appendChild(this.body);
    } else if (this.body !== null && this.body !== undefined) {
      bodyEl.textContent = String(this.body);
    }
    panel.appendChild(bodyEl);

    if (this.footer) {
      const footerEl = document.createElement('footer');
      footerEl.className = 'q-modal__footer';
      if (this.footer instanceof HTMLElement) {
        footerEl.appendChild(this.footer);
      } else {
        footerEl.textContent = String(this.footer);
      }
      panel.appendChild(footerEl);
    }

    this._panel = panel;
    modal.appendChild(panel);

    this.element = modal;
    return modal;
  }

  /**
   * Mounts the modal into document.body, applies scroll lock, traps focus,
   * attaches Esc/backdrop listeners.
   * @returns {Promise<void>} resolves when the modal closes
   */
  open() {
    if (this._isOpen) return this._openPromise;
    this._isOpen = true;

    const el = this.render();
    document.body.appendChild(el);

    this._previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    this._opener = document.activeElement;

    document.addEventListener('keydown', this._handleKeydown);

    const focusables = this._getFocusables();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else if (this._panel) {
      this._panel.focus();
    }

    this._openPromise = new Promise((resolve) => {
      this._resolveOpen = resolve;
    });

    return this._openPromise;
  }

  /**
   * Closes the modal, restores focus, releases scroll lock, resolves the
   * open() promise. Idempotent — calling twice is a no-op after the first.
   */
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;

    document.removeEventListener('keydown', this._handleKeydown);

    document.body.style.overflow = this._previousOverflow || '';

    if (
      this._opener &&
      typeof this._opener.focus === 'function' &&
      document.body.contains(this._opener)
    ) {
      this._opener.focus();
    }
    this._opener = null;

    if (typeof this.onClose === 'function') {
      try {
        this.onClose();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ModalView] onClose callback error:', err);
      }
    }

    if (this._resolveOpen) {
      const resolve = this._resolveOpen;
      this._resolveOpen = null;
      resolve();
    }

    this.destroy();
  }

  /**
   * Removes the element from the DOM. Does NOT resolve the open() promise
   * (use close() for that). Called by close() internally.
   */
  destroy() {
    document.removeEventListener('keydown', this._handleKeydown);
    if (this._isOpen) {
      document.body.style.overflow = this._previousOverflow || '';
      this._isOpen = false;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this._panel = null;
    this._backdrop = null;
    this._closeBtn = null;
  }

  /**
   * @returns {HTMLElement[]}
   * @private
   */
  _getFocusables() {
    if (!this._panel) return [];
    return Array.from(this._panel.querySelectorAll(FOCUSABLE_SELECTOR));
  }

  /**
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeydown(e) {
    if (e.key === 'Escape') {
      if (this.closeOnEsc) {
        e.preventDefault();
        this.close();
      }
      return;
    }

    if (e.key === 'Tab') {
      const focusables = this._getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        if (this._panel) this._panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === this._panel) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }
}
