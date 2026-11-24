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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('ModalView (recovered 1)', () => {
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
  });

  (() => {
    const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    describe('ModalView additional branches (recovered 2)', () => {
      let container;
      let modal;
      let modals;
      let originalConsoleError;

      const track = (instance) => {
        modals.push(instance);
        return instance;
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        modals = [];
        modal = null;
        originalConsoleError = globalThis.console.error;
      });

      afterEach(() => {
        modals.forEach((instance) => instance.destroy());
        modals = [];
        modal = null;
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        globalThis.console.error = originalConsoleError;
        container.remove();
      });

      it('normalizes falsy titles to an empty string', () => {
        [null, undefined, 0, false, ''].forEach((title) => {
          const instance = track(new ModalView({ title }));
          expect(instance.title).toBe('');
        });
      });

      it('keeps only callable onClose callbacks', () => {
        expect(track(new ModalView({ onClose: 'not a function' })).onClose).toBeNull();
        expect(track(new ModalView({ onClose: 42 })).onClose).toBeNull();
        const onClose = jasmine.createSpy('onClose');
        expect(track(new ModalView({ onClose })).onClose).toBe(onClose);
      });

      it('falls back to the md panel size for an unsupported size', () => {
        modal = track(new ModalView({ title: 'x', size: 'xl' }));

        expect(modal.size).toBe('md');
        expect(
          modal.render().querySelector('.q-modal__panel').classList.contains('q-modal__panel--md')
        ).toBe(true);
      });

      it('still closes on Escape and backdrop click when the flags are numeric zero', async () => {
        modal = track(new ModalView({ title: 'Esc', closeOnEsc: 0 }));
        expect(modal.closeOnEsc).toBe(true);
        const escapePromise = modal.open();
        const escapeEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escapeEvent);
        expect(escapeEvent.defaultPrevented).toBe(true);
        await escapePromise;
        expect(document.querySelector('.q-modal')).toBeNull();

        modal = track(new ModalView({ title: 'Backdrop', closeOnBackdropClick: 0 }));
        expect(modal.closeOnBackdropClick).toBe(true);
        const backdropPromise = modal.open();
        modal.element
          .querySelector('.q-modal__backdrop')
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await backdropPromise;
        expect(document.querySelector('.q-modal')).toBeNull();
      });

      it('gives two modals distinct title and body ids referenced by aria attributes', () => {
        const first = track(new ModalView({ title: 'A', body: 'a' }));
        const second = track(new ModalView({ title: 'B', body: 'b' }));

        expect(first._titleId).not.toBe(second._titleId);
        expect(first._bodyId).not.toBe(second._bodyId);

        const firstEl = first.render();
        const secondEl = second.render();
        expect(firstEl.querySelector('.q-modal__title').id).toBe(first._titleId);
        expect(secondEl.querySelector('.q-modal__title').id).toBe(second._titleId);
        expect(firstEl.querySelector('.q-modal__body').id).toBe(first._bodyId);
        expect(secondEl.querySelector('.q-modal__body').id).toBe(second._bodyId);
        expect(firstEl.querySelector('.q-modal__panel').getAttribute('aria-labelledby')).toBe(
          first._titleId
        );
        expect(firstEl.querySelector('.q-modal__panel').getAttribute('aria-describedby')).toBe(
          first._bodyId
        );
        expect(secondEl.querySelector('.q-modal__panel').getAttribute('aria-describedby')).toBe(
          second._bodyId
        );
      });

      it('marks the backdrop and makes the panel programmatically focusable and described', () => {
        modal = track(new ModalView({ title: 'x', body: 'contenido' }));
        const el = modal.render();

        expect(el.querySelector('.q-modal__backdrop').getAttribute('data-modal-backdrop')).toBe('');
        expect(el.querySelector('.q-modal__panel').getAttribute('tabindex')).toBe('-1');
        expect(el.querySelector('.q-modal__panel').getAttribute('aria-describedby')).toBe(
          modal._bodyId
        );
        expect(el.querySelector('.q-modal__body').id).toBe(modal._bodyId);
      });

      it('renders null and undefined bodies empty and a numeric body as text', () => {
        const nullBody = track(new ModalView({ body: null }));
        const undefinedBody = track(new ModalView({ body: undefined }));
        const numericBody = track(new ModalView({ body: 42 }));

        expect(nullBody.render().querySelector('.q-modal__body').textContent).toBe('');
        expect(undefinedBody.render().querySelector('.q-modal__body').textContent).toBe('');
        expect(numericBody.render().querySelector('.q-modal__body').textContent).toBe('42');
      });

      it('omits the footer for every falsy value', () => {
        [null, undefined, '', 0, false].forEach((footer) => {
          const instance = track(new ModalView({ title: 'x', footer }));
          expect(instance.render().querySelector('.q-modal__footer')).toBeNull();
        });
      });

      it('returns the same promise and creates a single modal when open is called twice', async () => {
        modal = track(new ModalView({ title: 'x' }));
        const first = modal.open();
        const second = modal.open();

        expect(second).toBe(first);
        expect(document.querySelectorAll('.q-modal').length).toBe(1);
        modal.close();
        await first;
        expect(document.querySelectorAll('.q-modal').length).toBe(0);
      });

      it('falls back focus to the panel when there are no focusables and reports none after destroy', () => {
        modal = track(new ModalView({ body: 'solo texto' }));
        modal.open();

        expect(modal._getFocusables().length).toBe(0);
        expect(document.activeElement).toBe(modal._panel);

        modal.close();
        expect(modal._getFocusables()).toEqual([]);
      });

      it('prevents the default Tab and focuses the panel when there are no focusables', () => {
        modal = track(new ModalView({ body: 'solo texto' }));
        modal.open();

        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(modal._panel);
        modal.close();
      });

      it('wraps Shift+Tab from the panel to the last focusable', () => {
        const first = document.createElement('button');
        const last = document.createElement('button');
        const body = document.createElement('div');
        body.append(first, last);
        modal = track(new ModalView({ body }));
        modal.open();

        modal._panel.focus();
        expect(document.activeElement).toBe(modal._panel);

        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(last);
        modal.close();
      });

      it('does not prevent Tab from a middle focusable', () => {
        const first = document.createElement('button');
        const middle = document.createElement('button');
        const last = document.createElement('button');
        const body = document.createElement('div');
        body.append(first, middle, last);
        modal = track(new ModalView({ body }));
        modal.open();

        middle.focus();
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(middle);
        modal.close();
      });

      it('does not prevent Escape when closeOnEsc is false', async () => {
        modal = track(new ModalView({ title: 'x', closeOnEsc: false }));
        const promise = modal.open();

        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(document.querySelector('.q-modal')).not.toBeNull();
        modal.close();
        await promise;
      });

      it('closes without throwing when the opener has been detached', async () => {
        const opener = document.createElement('button');
        container.appendChild(opener);
        opener.focus();
        modal = track(new ModalView({ title: 'x' }));
        const promise = modal.open();

        expect(modal._opener).toBe(opener);
        opener.remove();

        expect(() => modal.close()).not.toThrow();
        expect(modal._opener).toBeNull();
        await promise;
      });

      it('logs a throwing onClose callback and still resolves and removes the modal', async () => {
        const boom = new Error('boom');
        const onClose = jasmine.createSpy('onClose').and.callFake(() => {
          throw boom;
        });
        const consoleErrorSpy = spyOn(globalThis.console, 'error');
        modal = track(new ModalView({ title: 'x', onClose }));
        const promise = modal.open();

        modal.close();
        await promise;

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledOnceWith(
          '[ModalView] onClose callback error:',
          boom
        );
        expect(document.querySelector('.q-modal')).toBeNull();
      });

      it('restores overflow and detaches the keydown handler on destroy while leaving the promise pending', async () => {
        document.body.style.overflow = 'visible';
        const onClose = jasmine.createSpy('onClose');
        modal = track(new ModalView({ title: 'x', onClose }));
        let resolved = false;
        modal.open().then(() => {
          resolved = true;
        });

        expect(document.body.style.overflow).toBe('hidden');
        modal.destroy();

        expect(document.body.style.overflow).toBe('visible');
        expect(modal._isOpen).toBe(false);
        expect(modal.element).toBeNull();
        expect(document.querySelector('.q-modal')).toBeNull();

        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
        expect(onClose).not.toHaveBeenCalled();

        await tick();
        expect(resolved).toBe(false);
      });
    });
  })();
})();
