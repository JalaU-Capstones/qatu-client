import { RejectSellerApplicationModal } from './RejectSellerApplicationModal.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const buttonWithText = (dialog, label) =>
  [...dialog.querySelectorAll('button')].find((item) => item.textContent.trim() === label);

describe('RejectSellerApplicationModal', () => {
  it('renders the business context, labeled reason field, counter, and actions', async () => {
    const modal = new RejectSellerApplicationModal({
      businessName: 'Taller Illimani',
      onConfirm: jasmine.createSpy('onConfirm').and.resolveTo({ success: true }),
    });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');

    expect(dialog.querySelector('h2').textContent).toBe('Rechazar solicitud');
    expect(dialog.querySelector('strong').textContent).toBe('Taller Illimani');
    expect(dialog.querySelector('label').textContent).toBe('Motivo de rechazo *');

    const textarea = dialog.querySelector('textarea');
    expect(textarea.id).toBe('q-reject-modal-reason');
    expect(textarea.labels[0].htmlFor).toBe(textarea.id);
    expect(textarea.rows).toBe(4);
    expect(textarea.maxLength).toBe(500);
    expect(textarea.getAttribute('aria-describedby')).toBe(
      'q-reject-modal-counter q-reject-modal-error'
    );
    expect(document.activeElement).toBe(textarea);
    expect(dialog.querySelector('#q-reject-modal-counter').textContent).toBe('0 / 500');
    expect(dialog.querySelector('[role="alert"]').hidden).toBeTrue();
    expect(dialog.textContent).toContain('Cancelar');
    expect(dialog.textContent).toContain('Confirmar rechazo');

    buttonWithText(dialog, 'Cancelar').click();
    await expectAsync(pending).toBeResolvedTo({ confirmed: false });
  });

  it('shows a validation error for an empty reason without calling onConfirm', async () => {
    const onConfirm = jasmine.createSpy('onConfirm');
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');

    buttonWithText(dialog, 'Confirmar rechazo').click();
    await tick();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(dialog.querySelector('[role="alert"]').textContent).toBe('El motivo es obligatorio.');
    buttonWithText(dialog, 'Cancelar').click();
    await pending;
  });

  it('blocks reasons longer than 500 characters', async () => {
    const onConfirm = jasmine.createSpy('onConfirm');
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');
    const textarea = dialog.querySelector('textarea');
    textarea.value = 'a'.repeat(501);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(dialog.querySelector('#q-reject-modal-counter').textContent).toBe('501 / 500');
    buttonWithText(dialog, 'Confirmar rechazo').click();
    await tick();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(dialog.querySelector('[role="alert"]').textContent).toBe(
      'El motivo no puede superar 500 caracteres.'
    );
    buttonWithText(dialog, 'Cancelar').click();
    await pending;
  });

  it('confirms a valid trimmed reason and closes the modal on success', async () => {
    const onConfirm = jasmine.createSpy('onConfirm').and.resolveTo({ success: true });
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');
    const textarea = dialog.querySelector('textarea');
    textarea.value = '  Información incompleta  ';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    buttonWithText(dialog, 'Confirmar rechazo').click();

    await expectAsync(pending).toBeResolvedTo({
      confirmed: true,
      reason: 'Información incompleta',
    });

    expect(onConfirm).toHaveBeenCalledWith('Información incompleta');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps the modal open and re-enables actions when onConfirm returns an error', async () => {
    const onConfirm = jasmine
      .createSpy('onConfirm')
      .and.resolveTo({ success: false, error: 'Servicio no disponible' });
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');
    const textarea = dialog.querySelector('textarea');
    textarea.value = 'Información incompleta';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    buttonWithText(dialog, 'Confirmar rechazo').click();
    await tick();

    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(dialog.querySelector('[role="alert"]').textContent).toBe('Servicio no disponible');
    expect(dialog.querySelector('textarea').disabled).toBeFalse();
    expect(buttonWithText(dialog, 'Confirmar rechazo').disabled).toBeFalse();
    expect(buttonWithText(dialog, 'Cancelar').disabled).toBeFalse();

    buttonWithText(dialog, 'Cancelar').click();
    await pending;
  });

  it('does not submit on Enter and allows Ctrl+Enter to confirm', async () => {
    const onConfirm = jasmine.createSpy('onConfirm').and.resolveTo({ success: true });
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');
    const textarea = dialog.querySelector('textarea');
    textarea.value = 'Motivo válido';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBeFalse();
    expect(onConfirm).not.toHaveBeenCalled();

    const ctrlEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(ctrlEnter);
    await expectAsync(pending).toBeResolvedTo({
      confirmed: true,
      reason: 'Motivo válido',
    });
    expect(ctrlEnter.defaultPrevented).toBeTrue();
    expect(onConfirm).toHaveBeenCalledOnceWith('Motivo válido');
  });

  it('ignores Escape while submitting', async () => {
    let resolveConfirm;
    const onConfirm = jasmine.createSpy('onConfirm').and.returnValue(
      new Promise((resolve) => {
        resolveConfirm = resolve;
      })
    );
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const dialog = document.querySelector('[role="dialog"]');
    const textarea = dialog.querySelector('textarea');
    textarea.value = 'Motivo válido';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    buttonWithText(dialog, 'Confirmar rechazo').click();

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);

    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(escape.defaultPrevented).toBeFalse();
    resolveConfirm({ success: true });
    await expectAsync(pending).toBeResolvedTo({ confirmed: true, reason: 'Motivo válido' });
  });

  it('closes as canceled on Escape while idle', async () => {
    const onConfirm = jasmine.createSpy('onConfirm');
    const modal = new RejectSellerApplicationModal({ onConfirm });
    const pending = modal.open();
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(escape);

    await expectAsync(pending).toBeResolvedTo({ confirmed: false });
    expect(escape.defaultPrevented).toBeTrue();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
