import { DeleteConfirmModal } from './DeleteConfirmModal.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('DeleteConfirmModal', () => {
  let modal;
  let onConfirm;

  beforeEach(() => {
    onConfirm = jasmine.createSpy('onConfirm').and.resolveTo({ status: 'success' });
  });

  afterEach(() => {
    if (modal) {
      modal.destroy();
      modal = null;
    }
    document.querySelectorAll('.q-modal').forEach((el) => el.remove());
    document.body.style.overflow = '';
  });

  // ─── 1. Title and body copy ──────────────────────────────────────────────

  it('1. open() builds modal with title "Eliminar producto" and product name in body', async () => {
    modal = new DeleteConfirmModal({
      productId: 'p1',
      productName: 'Zapatillas Rojas',
      onConfirm,
    });
    const openPromise = modal.open();
    await tick();

    const titleEl = document.querySelector('.q-modal__title');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('Eliminar producto');

    const question = document.querySelector('.q-delete-confirm-modal__question');
    expect(question).not.toBeNull();
    expect(question.textContent).toContain('Zapatillas Rojas');

    const warning = document.querySelector('.q-delete-confirm-modal__warning');
    expect(warning).not.toBeNull();
    expect(warning.textContent).toContain('no se puede deshacer');

    // close to unblock the promise
    document.querySelector('.q-btn--outline').click();
    await openPromise;
  });

  // ─── 2. Cancel resolves { confirmed: false } ─────────────────────────────

  it('2. clicking Cancel resolves with { confirmed: false } and does not call onConfirm', async () => {
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    const cancelBtn = document.querySelector('.q-btn--outline');
    cancelBtn.click();
    const result = await openPromise;

    expect(result).toEqual({ confirmed: false });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ─── 3. "Eliminar" calls onConfirm once and disables both buttons ─────────

  it('3. clicking "Eliminar" calls onConfirm once and disables both buttons while in-flight', async () => {
    // onConfirm is a promise that we control
    let resolveConfirm;
    onConfirm = jasmine
      .createSpy('onConfirm')
      .and.returnValue(new Promise((r) => (resolveConfirm = r)));

    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    const deleteBtn = document.querySelector('.q-btn--primary');
    deleteBtn.click();
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Both buttons should be disabled while in-flight
    const buttons = document.querySelectorAll('.q-delete-confirm-modal__footer button');
    buttons.forEach((btn) => expect(btn.disabled).toBe(true));

    // resolve to unblock
    resolveConfirm({ status: 'success' });
    await openPromise;
  });

  // ─── 4. Success → resolves { confirmed: true } ───────────────────────────

  it('4. success: resolves with { confirmed: true } and closes the modal', async () => {
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-btn--primary').click();
    const result = await openPromise;

    expect(result).toEqual({ confirmed: true });
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  // ─── 5. Error → stays open, shows message, re-enables both buttons ────────

  it('5. error: stays open, shows error text, re-enables both buttons', async () => {
    onConfirm = jasmine.createSpy('onConfirm').and.rejectWith(new Error('Error de red'));

    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-btn--primary').click();
    await tick(20);

    // Modal still open
    expect(document.querySelector('.q-modal')).not.toBeNull();

    // Error text visible
    const errEl = document.querySelector('.q-delete-confirm-modal__error');
    expect(errEl).not.toBeNull();
    expect(errEl.textContent).toContain('Error de red');

    // Both buttons re-enabled
    const buttons = document.querySelectorAll('.q-delete-confirm-modal__footer button');
    buttons.forEach((btn) => expect(btn.disabled).toBe(false));

    // Clean up
    document.querySelector('.q-btn--outline').click();
    await openPromise;
  });

  // ─── 6. Backdrop click does NOT close ─────────────────────────────────────

  it('6. backdrop click does NOT close the modal', async () => {
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    const backdrop = document.querySelector('.q-modal__backdrop');
    if (backdrop) backdrop.click();
    await tick();

    // Modal still open
    expect(document.querySelector('.q-modal')).not.toBeNull();

    // Clean up
    document.querySelector('.q-btn--outline').click();
    await openPromise;
  });

  // ─── 7. Esc closes when idle ─────────────────────────────────────────────

  it('7. Esc closes the modal when idle', async () => {
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const result = await openPromise;

    expect(result).toEqual({ confirmed: false });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ─── 8. Esc does NOT close while in-flight ───────────────────────────────

  it('8. Esc does NOT close the modal while onConfirm is in-flight', async () => {
    let resolveConfirm;
    onConfirm = jasmine
      .createSpy('onConfirm')
      .and.returnValue(new Promise((r) => (resolveConfirm = r)));

    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-btn--primary').click();
    await tick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tick();

    // Modal still open (Esc ignored while in-flight)
    expect(document.querySelector('.q-modal')).not.toBeNull();

    resolveConfirm({ status: 'success' });
    await openPromise;
  });

  // ─── 9. Double-click guard ───────────────────────────────────────────────

  it('9. second click on "Eliminar" while in-flight is a no-op (onConfirm called once)', async () => {
    let resolveConfirm;
    onConfirm = jasmine
      .createSpy('onConfirm')
      .and.returnValue(new Promise((r) => (resolveConfirm = r)));

    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    const deleteBtn = document.querySelector('.q-btn--primary');
    deleteBtn.click();
    await tick();
    deleteBtn.click(); // second click — button is disabled; listener also guards
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);

    resolveConfirm({ status: 'success' });
    await openPromise;
  });

  // ─── 10. Cancel is a no-op while in-flight ───────────────────────────────

  it('10. Cancel button is disabled while onConfirm is in-flight', async () => {
    let resolveConfirm;
    onConfirm = jasmine
      .createSpy('onConfirm')
      .and.returnValue(new Promise((r) => (resolveConfirm = r)));

    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-btn--primary').click();
    await tick();

    const cancelBtn = document.querySelector('.q-btn--outline');
    expect(cancelBtn.disabled).toBe(true);

    resolveConfirm({ status: 'success' });
    await openPromise;
  });
});
