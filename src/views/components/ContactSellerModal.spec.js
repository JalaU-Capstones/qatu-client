import { ContactSellerModal } from './ContactSellerModal.js';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ContactSellerModal', () => {
  let modal;
  let onSend;

  const buildModal = (overrides = {}) =>
    new ContactSellerModal({
      sellerName: 'Tejidos Illimani',
      productName: 'Aguayo tradicional',
      onSend,
      ...overrides,
    });

  const textarea = () => document.querySelector('#q-contact-seller-message');
  const sendButton = () => document.querySelector('.q-contact-seller-modal__send');
  const cancelButton = () => document.querySelector('.q-contact-seller-modal__cancel');
  const errorElement = () => document.querySelector('.q-contact-seller-modal__error[role="alert"]');

  const typeMessage = (value) => {
    const field = textarea();
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  beforeEach(() => {
    onSend = jasmine.createSpy('onSend').and.resolveTo({ conversation: { id: 'conv-1' } });
  });

  afterEach(() => {
    if (modal) {
      modal.destroy();
      modal = null;
    }
    document.querySelectorAll('.q-modal').forEach((el) => el.remove());
    document.body.style.overflow = '';
  });

  it('renders the seller title, the optional product context and the character counter', async () => {
    modal = buildModal();
    const openPromise = modal.open();
    await tick();

    expect(document.querySelector('.q-modal__title').textContent).toBe(
      'Contactar a Tejidos Illimani'
    );

    const context = document.querySelector('.q-contact-seller-modal__context');
    expect(context).not.toBeNull();
    expect(context.textContent).toContain('Consulta sobre:');
    expect(context.querySelector('strong').textContent).toBe('Aguayo tradicional');

    const field = textarea();
    expect(field).not.toBeNull();
    expect(field.getAttribute('maxlength')).toBe('2000');
    expect(field.placeholder).toContain('Escribe tu consulta');

    expect(document.querySelector('.q-contact-seller-modal__counter').textContent).toBe('0 / 2000');

    cancelButton().click();
    await openPromise;
  });

  it('omits the product context when productName is empty', async () => {
    modal = buildModal({ productName: '' });
    const openPromise = modal.open();
    await tick();

    expect(document.querySelector('.q-contact-seller-modal__context')).toBeNull();
    expect(document.querySelector('.q-contact-seller-modal__counter').textContent).toBe('0 / 2000');

    cancelButton().click();
    await openPromise;
  });

  it('updates the counter as the user types', async () => {
    modal = buildModal();
    const openPromise = modal.open();
    await tick();

    typeMessage('Hola vendedor');

    expect(document.querySelector('.q-contact-seller-modal__counter').textContent).toBe(
      '13 / 2000'
    );

    cancelButton().click();
    await openPromise;
  });

  it('shows a role="alert" error for an empty message and does not call onSend', async () => {
    modal = buildModal();
    const openPromise = modal.open();
    await tick();

    sendButton().click();
    await tick();

    expect(onSend).not.toHaveBeenCalled();
    expect(document.querySelector('.q-modal')).not.toBeNull();

    const error = errorElement();
    expect(error).not.toBeNull();
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('El mensaje no puede estar vacío.');

    cancelButton().click();
    await openPromise;
  });

  it('rejects a whitespace-only message locally and keeps the modal open', async () => {
    modal = buildModal();
    const openPromise = modal.open();
    await tick();

    typeMessage('    ');
    sendButton().click();
    await tick();

    expect(onSend).not.toHaveBeenCalled();
    expect(document.querySelector('.q-modal')).not.toBeNull();
    expect(errorElement().textContent).toBe('El mensaje no puede estar vacío.');

    cancelButton().click();
    await openPromise;
  });

  it('clears the validation error when the user types again', async () => {
    modal = buildModal();
    const openPromise = modal.open();
    await tick();

    sendButton().click();
    expect(errorElement().hidden).toBe(false);

    typeMessage('Hola');

    expect(errorElement().hidden).toBe(true);
    expect(errorElement().textContent).toBe('');

    cancelButton().click();
    await openPromise;
  });

  it('calls onSend with the trimmed content, closes and resolves { sent: true, result }', async () => {
    const result = { conversation: { id: 'conv-1' }, message: { id: 'msg-1' } };
    onSend = jasmine.createSpy('onSend').and.resolveTo(result);
    modal = buildModal({ onSend });
    const openPromise = modal.open();
    await tick();

    typeMessage('   Hola, ¿está disponible?   ');
    sendButton().click();

    const resolution = await openPromise;

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('Hola, ¿está disponible?');
    expect(document.querySelector('.q-modal')).toBeNull();
    expect(resolution).toEqual({ sent: true, result });
  });

  it('disables the controls and shows "Enviando…" while onSend is in flight', async () => {
    let resolveSend;
    onSend = jasmine
      .createSpy('onSend')
      .and.returnValue(new Promise((resolve) => (resolveSend = resolve)));
    modal = buildModal({ onSend });
    const openPromise = modal.open();
    await tick();

    typeMessage('Hola');
    sendButton().click();
    await tick();

    expect(onSend).toHaveBeenCalledWith('Hola');
    expect(textarea().disabled).toBe(true);
    expect(sendButton().disabled).toBe(true);
    expect(sendButton().textContent).toBe('Enviando…');
    expect(cancelButton().disabled).toBe(true);
    expect(document.querySelector('.q-modal__close').disabled).toBe(true);

    resolveSend({ conversation: { id: 'conv-1' } });
    await openPromise;
  });

  it('shows the rejection message, keeps the modal open and re-enables the controls', async () => {
    const failure = new Error('No se pudo iniciar la conversación (500)');
    onSend = jasmine.createSpy('onSend').and.rejectWith(failure);
    modal = buildModal({ onSend });
    const openPromise = modal.open();
    await tick();

    typeMessage('Hola');
    sendButton().click();
    await tick(10);

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.q-modal')).not.toBeNull();

    const error = errorElement();
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe(failure.message);

    expect(textarea().disabled).toBe(false);
    expect(sendButton().disabled).toBe(false);
    expect(sendButton().textContent).toBe('Enviar');
    expect(cancelButton().disabled).toBe(false);
    expect(document.querySelector('.q-modal__close').disabled).toBe(false);

    cancelButton().click();
    const resolution = await openPromise;

    expect(resolution.sent).toBe(false);
  });

  it('resolves { sent: false } when the user cancels', async () => {
    modal = buildModal();
    const openPromise = modal.open();
    await tick();

    cancelButton().click();
    const resolution = await openPromise;

    expect(resolution.sent).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
    expect(document.querySelector('.q-modal')).toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

  describe('ContactSellerModal (recovered 1)', () => {
    let modal;
    let onSend;

    const buildModal = (overrides = {}) =>
      new ContactSellerModal({
        sellerName: 'Tejidos Illimani',
        productName: 'Aguayo tradicional',
        onSend,
        ...overrides,
      });

    const textarea = () => document.querySelector('#q-contact-seller-message');
    const sendButton = () => document.querySelector('.q-contact-seller-modal__send');
    const cancelButton = () => document.querySelector('.q-contact-seller-modal__cancel');
    const errorElement = () =>
      document.querySelector('.q-contact-seller-modal__error[role="alert"]');

    const typeMessage = (value) => {
      const field = textarea();
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };

    beforeEach(() => {
      onSend = jasmine.createSpy('onSend').and.resolveTo({ conversation: { id: 'conv-1' } });
    });

    afterEach(() => {
      if (modal) {
        modal.destroy();
        modal = null;
      }
      document.querySelectorAll('.q-modal').forEach((el) => el.remove());
      document.body.style.overflow = '';
    });

    it('shows a role="alert" error for an empty message and does not call onSend', async () => {
      modal = buildModal();
      const openPromise = modal.open();
      await tick();

      sendButton().click();
      await tick();

      expect(onSend).not.toHaveBeenCalled();
      expect(document.querySelector('.q-modal')).not.toBeNull();

      const error = errorElement();
      expect(error).not.toBeNull();
      expect(error.hidden).toBe(false);
      expect(error.textContent).toBe('El mensaje no puede estar vacío.');

      cancelButton().click();
      await openPromise;
    });

    it('disables the controls and shows "Enviando…" while onSend is in flight', async () => {
      let resolveSend;
      onSend = jasmine
        .createSpy('onSend')
        .and.returnValue(new Promise((resolve) => (resolveSend = resolve)));
      modal = buildModal({ onSend });
      const openPromise = modal.open();
      await tick();

      typeMessage('Hola');
      sendButton().click();
      await tick();

      expect(onSend).toHaveBeenCalledWith('Hola');
      expect(textarea().disabled).toBe(true);
      expect(sendButton().disabled).toBe(true);
      expect(sendButton().textContent).toBe('Enviando…');
      expect(cancelButton().disabled).toBe(true);
      expect(document.querySelector('.q-modal__close').disabled).toBe(true);

      resolveSend({ conversation: { id: 'conv-1' } });
      await openPromise;
    });
  });

  (() => {
    const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    describe('ContactSellerModal additional branches (recovered 2)', () => {
      let container;
      let modal;
      let onSend;

      const buildModal = (overrides = {}) => new ContactSellerModal({ onSend, ...overrides });
      const textarea = () => document.querySelector('#q-contact-seller-message');
      const sendButton = () => document.querySelector('.q-contact-seller-modal__send');
      const cancelButton = () => document.querySelector('.q-contact-seller-modal__cancel');
      const errorElement = () =>
        document.querySelector('.q-contact-seller-modal__error[role="alert"]');
      const counter = () => document.querySelector('.q-contact-seller-modal__counter');
      const escapeEvent = () =>
        new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
      const typeMessage = (value) => {
        const field = textarea();
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onSend = jasmine.createSpy('onSend').and.resolveTo({ conversation: { id: 'conv-1' } });
        modal = null;
      });

      afterEach(() => {
        modal?.destroy();
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('uses the default seller title, md panel and no product context', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-modal__title').textContent).toBe('Contactar a Vendedor');
        expect(document.querySelector('.q-contact-seller-modal__context')).toBeNull();
        expect(document.querySelector('.q-modal__panel--md')).not.toBeNull();
        expect(modal.sellerName).toBe('Vendedor');
        expect(modal.productName).toBe('');

        cancelButton().click();
        await openPromise;
      });

      it('coerces an empty sellerName and null productName and honors size lg', async () => {
        modal = buildModal({ sellerName: '', productName: null, size: 'lg' });
        const openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-modal__title').textContent).toBe('Contactar a Vendedor');
        expect(document.querySelector('.q-contact-seller-modal__context')).toBeNull();
        expect(document.querySelector('.q-modal__panel--lg')).not.toBeNull();
        expect(modal.sellerName).toBe('Vendedor');
        expect(modal.productName).toBe('');
        expect(modal.size).toBe('lg');

        cancelButton().click();
        await openPromise;
      });

      it('closes on Escape when idle with preventDefault and resolves { sent: false, result: null }', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();

        const event = escapeEvent();
        document.dispatchEvent(event);
        const resolution = await openPromise;

        expect(event.defaultPrevented).toBe(true);
        expect(document.querySelector('.q-modal')).toBeNull();
        expect(resolution).toEqual({ sent: false, result: null });
      });

      it('ignores Escape while sending without preventing default and stays open', async () => {
        let resolveSend;
        onSend = jasmine
          .createSpy('onSend')
          .and.returnValue(new Promise((resolve) => (resolveSend = resolve)));
        modal = buildModal({ onSend });
        const openPromise = modal.open();
        await tick();

        typeMessage('Hola');
        sendButton().click();
        await tick();
        const event = escapeEvent();
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(document.querySelector('.q-modal')).not.toBeNull();

        resolveSend({ conversation: { id: 'c1' } });
        const resolution = await openPromise;
        expect(resolution.sent).toBe(true);
      });

      it('does not react to non-Escape keys', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();

        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          cancelable: true,
          bubbles: true,
        });
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(document.querySelector('.q-modal')).not.toBeNull();
        cancelButton().click();
        await openPromise;
      });

      it('clears the keydown handler and modal reference after open resolves', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();
        cancelButton().click();
        await openPromise;

        expect(modal._onKeydown).toBeNull();
        expect(modal._modal).toBeNull();
        expect(() => document.dispatchEvent(escapeEvent())).not.toThrow();
        expect(document.querySelector('.q-modal')).toBeNull();
      });

      it('ignores Cancel while sending', async () => {
        let resolveSend;
        onSend = jasmine
          .createSpy('onSend')
          .and.returnValue(new Promise((resolve) => (resolveSend = resolve)));
        modal = buildModal({ onSend });
        const openPromise = modal.open();
        await tick();

        typeMessage('Hola');
        sendButton().click();
        await tick();
        expect(cancelButton().disabled).toBe(true);

        cancelButton().disabled = false;
        cancelButton().click();
        expect(document.querySelector('.q-modal')).not.toBeNull();

        resolveSend({ conversation: { id: 'c2' } });
        const resolution = await openPromise;
        expect(resolution.sent).toBe(true);
      });

      it('calls onSend only once for two rapid send attempts', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();

        typeMessage('Hola');
        sendButton().click();
        sendButton().click();
        await modal._submit();

        const resolution = await openPromise;
        expect(onSend).toHaveBeenCalledTimes(1);
        expect(resolution.sent).toBe(true);
      });

      it('rejects messages over 2000 characters with the exact error', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();

        typeMessage('x'.repeat(2001));
        sendButton().click();
        await tick();

        expect(onSend).not.toHaveBeenCalled();
        expect(errorElement().hidden).toBe(false);
        expect(errorElement().textContent).toBe('El mensaje no puede superar los 2000 caracteres.');
        expect(document.querySelector('.q-modal')).not.toBeNull();

        cancelButton().click();
        await openPromise;
      });

      it('uses the fallback error when a rejection has no message', async () => {
        onSend = jasmine.createSpy('onSend').and.returnValue(Promise.reject({}));
        modal = buildModal({ onSend });
        const openPromise = modal.open();
        await tick();

        typeMessage('Hola');
        sendButton().click();
        await tick(10);

        expect(errorElement().textContent).toBe('No se pudo enviar el mensaje.');
        expect(sendButton().disabled).toBe(false);

        cancelButton().click();
        await openPromise;
      });

      it('clears the error on retry and succeeds on the second send', async () => {
        const result = { conversation: { id: 'conv-2' } };
        let attempts = 0;
        onSend = jasmine.createSpy('onSend').and.callFake(() => {
          attempts += 1;
          return attempts === 1
            ? Promise.reject(new Error('Fallo temporal'))
            : Promise.resolve(result);
        });
        modal = buildModal({ onSend });
        const openPromise = modal.open();
        await tick();

        typeMessage('Hola');
        sendButton().click();
        await tick(10);
        expect(errorElement().textContent).toBe('Fallo temporal');
        expect(document.querySelector('.q-modal')).not.toBeNull();

        sendButton().click();
        expect(errorElement().hidden).toBe(true);
        expect(errorElement().textContent).toBe('');

        const resolution = await openPromise;
        expect(onSend).toHaveBeenCalledTimes(2);
        expect(resolution).toEqual({ sent: true, result });
      });

      it('refreshes the character counter when typing clears an error', async () => {
        modal = buildModal();
        const openPromise = modal.open();
        await tick();

        sendButton().click();
        expect(errorElement().hidden).toBe(false);
        expect(counter().textContent).toBe('0 / 2000');

        typeMessage('Hola');
        expect(errorElement().hidden).toBe(true);
        expect(errorElement().textContent).toBe('');
        expect(counter().textContent).toBe('4 / 2000');

        cancelButton().click();
        await openPromise;
      });
    });
  })();
})();
