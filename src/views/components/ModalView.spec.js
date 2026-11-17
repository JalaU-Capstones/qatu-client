import { ModalView } from './ModalView.js';

describe('ModalView', () => {
  let modal;
  let testContainer;

  beforeEach(() => {
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    if (modal) {
      modal.destroy();
      modal = null;
    }
    if (testContainer?.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
    // Clean up any stray modals left in document.body
    document.querySelectorAll('.q-modal').forEach((el) => el.remove());
    document.body.style.overflow = '';
  });

  it('1. render() returns element with class="q-modal", role="dialog" on panel, aria-modal="true"', () => {
    modal = new ModalView({ title: 'Test Modal' });
    const el = modal.render();

    expect(el.classList.contains('q-modal')).toBe(true);
    expect(el.getAttribute('role')).toBe('presentation');

    const panel = el.querySelector('.q-modal__panel');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
  });

  it('2. render() is idempotent — calling twice returns the same node', () => {
    modal = new ModalView({ title: 'Test' });
    const first = modal.render();
    const second = modal.render();

    expect(first).toBe(second);
  });

  it('3. title is rendered inside .q-modal__title and aria-labelledby points to it', () => {
    modal = new ModalView({ title: 'Título del Diálogo' });
    const el = modal.render();
    const panel = el.querySelector('.q-modal__panel');
    const titleEl = el.querySelector('.q-modal__title');

    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('Título del Diálogo');
    expect(panel.getAttribute('aria-labelledby')).toBe(titleEl.id);
  });

  it('4. body accepts a string — appears as textContent of .q-modal__body', () => {
    modal = new ModalView({ title: 'Test', body: 'Contenido de texto' });
    const el = modal.render();
    const bodyEl = el.querySelector('.q-modal__body');

    expect(bodyEl).not.toBeNull();
    expect(bodyEl.textContent).toBe('Contenido de texto');
  });

  it('5. body accepts an HTMLElement — the element is a child of .q-modal__body', () => {
    const customContent = document.createElement('form');
    customContent.className = 'custom-form';
    modal = new ModalView({ title: 'Test', body: customContent });
    const el = modal.render();
    const bodyEl = el.querySelector('.q-modal__body');

    expect(bodyEl.querySelector('.custom-form')).toBe(customContent);
  });

  it('6. footer accepts a string and an HTMLElement (one test each)', () => {
    const stringFooterModal = new ModalView({ title: 'T1', footer: 'Footer text' });
    const stringEl = stringFooterModal.render();
    expect(stringEl.querySelector('.q-modal__footer').textContent).toBe('Footer text');
    stringFooterModal.destroy();

    const customBtn = document.createElement('button');
    customBtn.textContent = 'Aceptar';
    const elementFooterModal = new ModalView({ title: 'T2', footer: customBtn });
    const elementEl = elementFooterModal.render();
    expect(elementEl.querySelector('.q-modal__footer button')).toBe(customBtn);
    elementFooterModal.destroy();
  });

  it('7. without title, no .q-modal__header exists and aria-labelledby is absent', () => {
    modal = new ModalView({ body: 'Solo cuerpo' });
    const el = modal.render();
    const panel = el.querySelector('.q-modal__panel');

    expect(el.querySelector('.q-modal__header')).toBeNull();
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('8. open() appends modal to document.body, sets overflow=hidden, and returns a Promise', async () => {
    modal = new ModalView({ title: 'Open Test' });
    const promise = modal.open();

    expect(promise instanceof Promise).toBe(true);
    expect(document.body.contains(modal.element)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    modal.close();
    await promise;
  });

  it('9. close() removes modal, restores overflow, and resolves the open() promise', async () => {
    document.body.style.overflow = 'visible';
    modal = new ModalView({ title: 'Close Test' });

    let resolved = false;
    const promise = modal.open().then(() => {
      resolved = true;
    });

    expect(document.body.style.overflow).toBe('hidden');
    modal.close();
    await promise;

    expect(resolved).toBe(true);
    expect(document.querySelector('.q-modal')).toBeNull();
    expect(document.body.style.overflow).toBe('visible');
  });

  it('10. close() is idempotent — a second close() is a no-op, does not throw', async () => {
    modal = new ModalView({ title: 'Idempotent Close' });
    const promise = modal.open();

    modal.close();
    await promise;

    expect(() => modal.close()).not.toThrow();
  });

  it('11. Esc closes modal and resolves open() promise', async () => {
    modal = new ModalView({ title: 'Esc Test', closeOnEsc: true });
    let resolved = false;
    const promise = modal.open().then(() => {
      resolved = true;
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await promise;

    expect(resolved).toBe(true);
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  it('12. Esc does NOT close when closeOnEsc: false', async () => {
    modal = new ModalView({ title: 'No Esc Test', closeOnEsc: false });
    modal.open();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.querySelector('.q-modal')).not.toBeNull();
    modal.close();
  });

  it('13. backdrop click closes the modal', async () => {
    modal = new ModalView({ title: 'Backdrop Test', closeOnBackdropClick: true });
    let resolved = false;
    const promise = modal.open().then(() => {
      resolved = true;
    });

    const backdrop = modal.element.querySelector('.q-modal__backdrop');
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await promise;

    expect(resolved).toBe(true);
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  it('14. clicking the panel does NOT close the modal', () => {
    modal = new ModalView({ title: 'Panel Click Test' });
    modal.open();

    const panel = modal.element.querySelector('.q-modal__panel');
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('.q-modal')).not.toBeNull();
    modal.close();
  });

  it('15. backdrop click does NOT close when closeOnBackdropClick: false', () => {
    modal = new ModalView({ title: 'Backdrop Disabled', closeOnBackdropClick: false });
    modal.open();

    const backdrop = modal.element.querySelector('.q-modal__backdrop');
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('.q-modal')).not.toBeNull();
    modal.close();
  });

  it('16. close button (.q-modal__close) closes the modal', async () => {
    modal = new ModalView({ title: 'Close Btn Test' });
    let resolved = false;
    const promise = modal.open().then(() => {
      resolved = true;
    });

    const closeBtn = modal.element.querySelector('.q-modal__close');
    closeBtn.click();
    await promise;

    expect(resolved).toBe(true);
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  it('17. focus restore: restores focus to the opener element after close', async () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Opener';
    testContainer.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    modal = new ModalView({ title: 'Focus Restore' });
    const promise = modal.open();

    expect(document.activeElement).not.toBe(opener);

    modal.close();
    await promise;

    expect(document.activeElement).toBe(opener);
  });

  it('18. focus trap: Tab from last focuses first, Shift+Tab from first focuses last', () => {
    const btn1 = document.createElement('button');
    btn1.type = 'button';
    btn1.textContent = 'Btn 1';

    const btn2 = document.createElement('button');
    btn2.type = 'button';
    btn2.textContent = 'Btn 2';

    const bodyWrap = document.createElement('div');
    bodyWrap.append(btn1, btn2);

    // No title so close button is absent; exactly 2 buttons in panel
    modal = new ModalView({ body: bodyWrap });
    modal.open();

    // Tab from last button (btn2)
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false }));
    expect(document.activeElement).toBe(btn1);

    // Shift+Tab from first button (btn1)
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(btn2);

    modal.close();
  });

  it('19. onClose callback fires exactly once when close() is called', () => {
    const onClose = jasmine.createSpy('onClose');
    modal = new ModalView({ title: 'Callback Test', onClose });

    modal.open();
    expect(onClose).not.toHaveBeenCalled();

    modal.close();
    expect(onClose).toHaveBeenCalledTimes(1);

    modal.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('20. destroy() does not throw when called on an unopened modal', () => {
    modal = new ModalView({ title: 'Unopened' });
    expect(() => modal.destroy()).not.toThrow();
  });

  it('21. destroy() after close() does not throw (idempotent teardown)', async () => {
    modal = new ModalView({ title: 'Teardown' });
    const promise = modal.open();
    modal.close();
    await promise;

    expect(() => modal.destroy()).not.toThrow();
  });
});
