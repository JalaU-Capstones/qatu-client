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
