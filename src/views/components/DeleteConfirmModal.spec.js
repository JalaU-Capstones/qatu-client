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
    expect(question.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
      'Zapatillas Rojas'
    );
    expect(document.querySelector('.q-delete-confirm-modal__icon-badge svg')).not.toBeNull();

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

    const deleteBtn = document.querySelector('.q-btn--danger');
    deleteBtn.click();
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.q-delete-confirm-modal__confirm').textContent).toContain(
      'Eliminando…'
    );
    // Both buttons should be disabled while in-flight
    const buttons = document.querySelectorAll('.q-delete-confirm-modal__footer button');
    buttons.forEach((btn) => expect(btn.disabled).toBe(true));
    expect(document.querySelector('.q-modal__close').disabled).toBe(true);

    // resolve to unblock
    resolveConfirm({ status: 'success' });
    await openPromise;
  });

  // ─── 4. Success → resolves { confirmed: true } ───────────────────────────

  it('4. success: resolves with { confirmed: true } and closes the modal', async () => {
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-btn--danger').click();
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

    document.querySelector('.q-btn--danger').click();
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

  it('does not treat an unrecognized confirmation result as successful deletion', async () => {
    onConfirm = jasmine.createSpy('onConfirm').and.resolveTo(undefined);
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-btn--danger').click();
    await tick();

    expect(document.querySelector('.q-modal')).not.toBeNull();
    expect(document.querySelector('.q-delete-confirm-modal__error').textContent).toContain(
      'No se pudo completar'
    );
    document.querySelector('.q-delete-confirm-modal__cancel').click();
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

    document.querySelector('.q-btn--danger').click();
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

    const deleteBtn = document.querySelector('.q-btn--danger');
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

    document.querySelector('.q-btn--danger').click();
    await tick();

    const cancelBtn = document.querySelector('.q-btn--outline');
    expect(cancelBtn.disabled).toBe(true);

    resolveConfirm({ status: 'success' });
    await openPromise;
  });

  // ─── 11. Design-system modifier ───────────────────────────────────────────

  it('11. confirm button carries the .q-btn--danger class (not inline style)', async () => {
    modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod A', onConfirm });
    const openPromise = modal.open();
    await tick();

    const confirmBtn = document.querySelector('.q-btn--danger');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn.textContent).toContain('Eliminar');
    expect(confirmBtn.classList.contains('q-btn--danger')).toBe(true);
    // No inline red override
    expect(confirmBtn.style.backgroundColor).toBe('');

    document.querySelector('.q-btn--outline').click();
    await openPromise;
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

  describe('DeleteConfirmModal (recovered 1)', () => {
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
      expect(question.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
        'Zapatillas Rojas'
      );
      expect(document.querySelector('.q-delete-confirm-modal__icon-badge svg')).not.toBeNull();

      const warning = document.querySelector('.q-delete-confirm-modal__warning');
      expect(warning).not.toBeNull();
      expect(warning.textContent).toContain('no se puede deshacer');

      // close to unblock the promise
      document.querySelector('.q-btn--outline').click();
      await openPromise;
    });

    // ─── 2. Cancel resolves { confirmed: false } ─────────────────────────────

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

      const deleteBtn = document.querySelector('.q-btn--danger');
      deleteBtn.click();
      await tick();

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.q-delete-confirm-modal__confirm').textContent).toContain(
        'Eliminando…'
      );
      // Both buttons should be disabled while in-flight
      const buttons = document.querySelectorAll('.q-delete-confirm-modal__footer button');
      buttons.forEach((btn) => expect(btn.disabled).toBe(true));
      expect(document.querySelector('.q-modal__close').disabled).toBe(true);

      // resolve to unblock
      resolveConfirm({ status: 'success' });
      await openPromise;
    });

    // ─── 4. Success → resolves { confirmed: true } ───────────────────────────

    // ─── 5. Error → stays open, shows message, re-enables both buttons ────────

    // ─── 6. Backdrop click does NOT close ─────────────────────────────────────

    // ─── 7. Esc closes when idle ─────────────────────────────────────────────

    // ─── 8. Esc does NOT close while in-flight ───────────────────────────────

    // ─── 9. Double-click guard ───────────────────────────────────────────────

    it('9. second click on "Eliminar" while in-flight is a no-op (onConfirm called once)', async () => {
      let resolveConfirm;
      onConfirm = jasmine
        .createSpy('onConfirm')
        .and.returnValue(new Promise((r) => (resolveConfirm = r)));

      modal = new DeleteConfirmModal({ productId: 'p1', productName: 'Prod', onConfirm });
      const openPromise = modal.open();
      await tick();

      const deleteBtn = document.querySelector('.q-btn--danger');
      deleteBtn.click();
      await tick();
      deleteBtn.click(); // second click — button is disabled; listener also guards
      await tick();

      expect(onConfirm).toHaveBeenCalledTimes(1);

      resolveConfirm({ status: 'success' });
      await openPromise;
    });

    // ─── 10. Cancel is a no-op while in-flight ───────────────────────────────

    // ─── 11. Design-system modifier ───────────────────────────────────────────
  });

  (() => {
    describe('DeleteConfirmModal additional branches (recovered 2)', () => {
      const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

      let modal;
      let container;
      let onConfirm;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onConfirm = jasmine.createSpy('onConfirm').and.resolveTo({ status: 'success' });
      });

      afterEach(() => {
        modal?.destroy();
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('prefers itemName over productName and falls back when itemName is an empty string', async () => {
        modal = new DeleteConfirmModal({
          productId: 'p1',
          productName: 'Producto',
          itemName: 'Categoría',
          onConfirm,
        });
        let openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
          'Categoría'
        );
        document.querySelector('.q-delete-confirm-modal__cancel').click();
        await openPromise;

        modal = new DeleteConfirmModal({
          productId: 'p1',
          productName: 'Producto',
          itemName: '',
          onConfirm,
        });
        openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
          'este producto'
        );
        document.querySelector('.q-delete-confirm-modal__cancel').click();
        await openPromise;
      });

      it('uses the default or custom fallback when neither name is present', async () => {
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        let openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
          'este producto'
        );
        document.querySelector('.q-delete-confirm-modal__cancel').click();
        await openPromise;

        modal = new DeleteConfirmModal({
          productId: 'p1',
          productName: '',
          fallbackItemName: 'ese artículo',
          onConfirm,
        });
        openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
          'ese artículo'
        );
        document.querySelector('.q-delete-confirm-modal__cancel').click();
        await openPromise;
      });

      it('honors custom title, warningText, fallbackItemName, errorFallback and size md', async () => {
        modal = new DeleteConfirmModal({
          productId: 'p1',
          title: 'Eliminar categoría',
          warningText: 'Aviso personalizado',
          fallbackItemName: 'esa categoría',
          errorFallback: 'Fallo personalizado',
          size: 'md',
          onConfirm: jasmine.createSpy('onConfirm').and.rejectWith(undefined),
        });
        const openPromise = modal.open();
        await tick();

        expect(document.querySelector('.q-modal__title').textContent).toBe('Eliminar categoría');
        expect(document.querySelector('.q-delete-confirm-modal__warning').textContent).toBe(
          'Aviso personalizado'
        );
        expect(document.querySelector('.q-delete-confirm-modal__product-name').textContent).toBe(
          'esa categoría'
        );
        expect(document.querySelector('.q-modal__panel--md')).not.toBeNull();
        expect(document.querySelector('.q-modal__panel--sm')).toBeNull();

        document.querySelector('.q-delete-confirm-modal__confirm').click();
        await tick(20);
        expect(document.querySelector('.q-delete-confirm-modal__error').textContent).toBe(
          'Fallo personalizado'
        );
        document.querySelector('.q-delete-confirm-modal__cancel').click();
        await openPromise;
      });

      it('renders the exact alert and trash SVG path data', async () => {
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        const openPromise = modal.open();
        await tick();

        const alertPaths = document.querySelectorAll(
          '.q-delete-confirm-modal__icon-badge svg path'
        );
        expect(alertPaths.length).toBe(2);
        expect(alertPaths[0].getAttribute('d')).toBe(
          'm10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z'
        );
        expect(alertPaths[1].getAttribute('d')).toBe('M12 9v4m0 4h.01');

        const trashPath = document.querySelector('.q-delete-confirm-modal__confirm svg path');
        expect(trashPath.getAttribute('d')).toBe(
          'M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6'
        );

        document.querySelector('.q-delete-confirm-modal__cancel').click();
        await openPromise;
      });

      it('starts with an enabled close button and resolves false when it is clicked', async () => {
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        const openPromise = modal.open();
        await tick();

        const closeButton = document.querySelector('.q-modal__close');
        expect(closeButton.disabled).toBe(false);

        closeButton.click();
        expect(await openPromise).toEqual({ confirmed: false });
        expect(onConfirm).not.toHaveBeenCalled();
        expect(document.body.style.overflow).toBe('');
      });

      it('surfaces Error("Detalle") from a non-success result and re-enables every control', async () => {
        onConfirm = jasmine.createSpy('onConfirm').and.resolveTo({
          status: 'error',
          error: new Error('Detalle'),
        });
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        const openPromise = modal.open();
        await tick();

        document.querySelector('.q-delete-confirm-modal__confirm').click();
        await tick();

        const error = document.querySelector('.q-delete-confirm-modal__error');
        expect(error.getAttribute('role')).toBe('alert');
        expect(error.textContent).toBe('Detalle');
        expect(document.querySelector('.q-modal')).not.toBeNull();
        document.querySelectorAll('.q-delete-confirm-modal__footer button').forEach((button) => {
          expect(button.disabled).toBe(false);
        });
        expect(document.querySelector('.q-modal__close').disabled).toBe(false);
        expect(onConfirm).toHaveBeenCalledTimes(1);

        document.querySelector('.q-delete-confirm-modal__cancel').click();
        expect(await openPromise).toEqual({ confirmed: false });
      });

      it('uses errorFallback for undefined and empty-string rejections', async () => {
        for (const rejection of [undefined, '']) {
          onConfirm = jasmine.createSpy('onConfirm').and.rejectWith(rejection);
          modal = new DeleteConfirmModal({
            productId: 'p1',
            errorFallback: 'Fallo genérico',
            onConfirm,
          });
          const openPromise = modal.open();
          await tick();

          document.querySelector('.q-delete-confirm-modal__confirm').click();
          await tick(20);

          expect(document.querySelector('.q-delete-confirm-modal__error').textContent).toBe(
            'Fallo genérico'
          );
          document.querySelector('.q-delete-confirm-modal__cancel').click();
          await openPromise;
        }
      });

      it('guards in-flight clicks after re-render swaps in freshly disabled buttons', async () => {
        let resolveConfirm;
        onConfirm = jasmine
          .createSpy('onConfirm')
          .and.returnValue(new Promise((resolve) => (resolveConfirm = resolve)));
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        const openPromise = modal.open();
        await tick();

        document.querySelector('.q-delete-confirm-modal__confirm').click();
        await tick();

        // _render() calls replaceChildren(): the original buttons are detached and remain enabled,
        // while the replacement buttons are the ones actually rendered in the disabled state.
        const confirmButton = document.querySelector('.q-delete-confirm-modal__confirm');
        const cancelButton = document.querySelector('.q-delete-confirm-modal__cancel');
        expect(confirmButton.disabled).toBe(true);
        expect(cancelButton.disabled).toBe(true);

        cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await tick();

        expect(document.querySelector('.q-modal')).not.toBeNull();
        expect(onConfirm).toHaveBeenCalledTimes(1);

        resolveConfirm({ status: 'success' });
        expect(await openPromise).toEqual({ confirmed: true });
      });

      it('removes the Escape listener on destroy and ignores later Escape presses', async () => {
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        modal.open();
        await tick();

        const handler = modal._onKeydown;
        expect(typeof handler).toBe('function');
        const removeSpy = spyOn(document, 'removeEventListener').and.callThrough();

        modal.destroy();

        expect(removeSpy).toHaveBeenCalledWith('keydown', handler);
        expect(modal._onKeydown).toBeNull();
        expect(document.querySelector('.q-modal')).toBeNull();
        expect(onConfirm).not.toHaveBeenCalled();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(document.querySelector('.q-modal')).toBeNull();
      });

      it('leaves Escape inert after open() has resolved', async () => {
        modal = new DeleteConfirmModal({ productId: 'p1', onConfirm });
        const removeSpy = spyOn(document, 'removeEventListener').and.callThrough();
        const openPromise = modal.open();
        await tick();

        const handler = modal._onKeydown;
        const innerModal = modal._modal;
        document.querySelector('.q-delete-confirm-modal__cancel').click();
        expect(await openPromise).toEqual({ confirmed: false });

        expect(removeSpy).toHaveBeenCalledWith('keydown', handler);
        expect(modal._onKeydown).toBeNull();

        const closeSpy = spyOn(innerModal, 'close');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(closeSpy).not.toHaveBeenCalled();
        expect(document.querySelector('.q-modal')).toBeNull();
      });
    });
  })();
})();
