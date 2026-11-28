import { AuthMarketingView } from './AuthMarketingView.js';

describe('AuthMarketingView', () => {
  let view;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    view = new AuthMarketingView();
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('render() returns an <aside> with class q-auth-marketing and q-ambient', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('aside');
    expect(el.classList.contains('q-auth-marketing')).toBe(true);
    expect(el.classList.contains('q-ambient')).toBe(true);
  });

  it('render() includes 2 .q-ambient__blob children (pink + cyan)', () => {
    const el = view.render();
    const blobs = el.querySelectorAll('.q-ambient__blob');
    expect(blobs.length).toBe(2);
    expect(blobs[0].classList.contains('q-ambient__blob--pink')).toBe(true);
    expect(blobs[1].classList.contains('q-ambient__blob--cyan')).toBe(true);
  });

  it('renders the shared brand logo in the marketing panel', () => {
    const logo = view.render().querySelector('.q-auth-marketing__brand');
    expect(logo.classList.contains('q-brand-logo-svg')).toBe(true);
    expect(logo.getAttribute('aria-hidden')).toBe('true');
    expect(logo.querySelector('text').textContent).toBe('Q’atu');
  });

  it('render() includes the eyebrow text "MERCADO LOCAL, HISTORIAS REALES"', () => {
    const el = view.render();
    const eyebrow = el.querySelector('.q-auth-marketing__eyebrow');
    expect(eyebrow).not.toBeNull();
    expect(eyebrow.textContent).toBe('MERCADO LOCAL, HISTORIAS REALES');
  });

  it('render() includes 3 .q-auth-marketing__feature items with the expected labels', () => {
    const el = view.render();
    const features = el.querySelectorAll('.q-auth-marketing__feature');
    expect(features.length).toBe(3);
    const labels = Array.from(features).map((f) => f.querySelector('span').textContent);
    expect(labels).toContain('Compra segura y local');
    expect(labels).toContain('Envíos a toda Bolivia');
    expect(labels).toContain('Apoya a emprendedores');
  });

  it('render() shows the login title when constructed with mode: "login" (default)', () => {
    const el = view.render();
    const title = el.querySelector('.q-auth-marketing__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Qué bueno verte de nuevo.');
  });

  it('render() shows the register title when constructed with mode: "register"', () => {
    const registerView = new AuthMarketingView({ mode: 'register' });
    const el = registerView.render();
    const title = el.querySelector('.q-auth-marketing__title');
    expect(title.textContent).toBe('Crea tu cuenta y compra con propósito.');
    registerView.destroy();
  });

  it('setMode("register") updates the title textContent in an already-rendered view', () => {
    const el = view.render();
    view.setMode('register');
    const title = el.querySelector('.q-auth-marketing__title');
    expect(title.textContent).toBe('Crea tu cuenta y compra con propósito.');
  });

  it('setMode("login") after "register" reverts to the login title', () => {
    const el = view.render();
    view.setMode('register');
    view.setMode('login');
    const title = el.querySelector('.q-auth-marketing__title');
    expect(title.textContent).toBe('Qué bueno verte de nuevo.');
  });

  it('setMode("bogus") is a no-op (title unchanged)', () => {
    const el = view.render();
    view.setMode('bogus');
    const title = el.querySelector('.q-auth-marketing__title');
    expect(title.textContent).toBe('Qué bueno verte de nuevo.');
  });

  it('mount(container) appends the aside to the container', () => {
    view.mount(container);
    expect(container.querySelector('aside.q-auth-marketing')).not.toBeNull();
  });

  it('destroy() removes the aside from the container and nulls element', () => {
    view.mount(container);
    expect(container.querySelector('aside.q-auth-marketing')).not.toBeNull();
    view.destroy();
    expect(container.querySelector('aside.q-auth-marketing')).toBeNull();
    expect(view.element).toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('AuthMarketingView (recovered 1)', () => {
    let view;
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      view = new AuthMarketingView();
    });

    afterEach(() => {
      view.destroy();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('render() includes the eyebrow text "MERCADO LOCAL, HISTORIAS REALES"', () => {
      const el = view.render();
      const eyebrow = el.querySelector('.q-auth-marketing__eyebrow');
      expect(eyebrow).not.toBeNull();
      expect(eyebrow.textContent).toBe('MERCADO LOCAL, HISTORIAS REALES');
    });

    it('render() shows the login title when constructed with mode: "login" (default)', () => {
      const el = view.render();
      const title = el.querySelector('.q-auth-marketing__title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('Qué bueno verte de nuevo.');
    });

    it('render() shows the register title when constructed with mode: "register"', () => {
      const registerView = new AuthMarketingView({ mode: 'register' });
      const el = registerView.render();
      const title = el.querySelector('.q-auth-marketing__title');
      expect(title.textContent).toBe('Crea tu cuenta y compra con propósito.');
      registerView.destroy();
    });

    it('setMode("register") updates the title textContent in an already-rendered view', () => {
      const el = view.render();
      view.setMode('register');
      const title = el.querySelector('.q-auth-marketing__title');
      expect(title.textContent).toBe('Crea tu cuenta y compra con propósito.');
    });

    it('setMode("login") after "register" reverts to the login title', () => {
      const el = view.render();
      view.setMode('register');
      view.setMode('login');
      const title = el.querySelector('.q-auth-marketing__title');
      expect(title.textContent).toBe('Qué bueno verte de nuevo.');
    });

    it('setMode("bogus") is a no-op (title unchanged)', () => {
      const el = view.render();
      view.setMode('bogus');
      const title = el.querySelector('.q-auth-marketing__title');
      expect(title.textContent).toBe('Qué bueno verte de nuevo.');
    });
  });

  (() => {
    describe('AuthMarketingView additional branches (recovered 2)', () => {
      let container;
      let view;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        view = new AuthMarketingView();
      });

      afterEach(() => {
        view?.destroy();
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('falls back to the login title for an unknown mode while keeping this.mode unchanged', () => {
        const bogusView = new AuthMarketingView({ mode: 'bogus' });
        const title = bogusView.render().querySelector('.q-auth-marketing__title');
        expect(bogusView.mode).toBe('bogus');
        expect(title.textContent).toBe('Qué bueno verte de nuevo.');
        bogusView.destroy();
      });

      it('accepts setMode before render and renders with the newly selected mode', () => {
        expect(() => view.setMode('register')).not.toThrow();
        expect(view.mode).toBe('register');
        expect(view.render().querySelector('.q-auth-marketing__title').textContent).toBe(
          'Crea tu cuenta y compra con propósito.'
        );
      });

      it('memoizes render and never duplicates the aside when mounted twice', () => {
        const first = view.render();
        expect(view.render()).toBe(first);
        view.mount(container);
        view.mount(container);
        expect(container.querySelectorAll('aside.q-auth-marketing').length).toBe(1);
      });

      it('nulls _titleEl on destroy and stays safe before render and on double destroy', () => {
        expect(() => view.destroy()).not.toThrow();
        expect(view.element).toBeNull();
        expect(view._titleEl).toBeNull();
        expect(() => view.destroy()).not.toThrow();

        const el = view.render();
        expect(view._titleEl).not.toBeNull();
        expect(() => view.setMode('register')).not.toThrow();
        expect(el.querySelector('.q-auth-marketing__title').textContent).toBe(
          'Crea tu cuenta y compra con propósito.'
        );

        view.destroy();
        expect(view.element).toBeNull();
        expect(view._titleEl).toBeNull();
        expect(() => view.setMode('login')).not.toThrow();
      });

      it('renders check SVGs with exact viewBox, stroke-width and polyline points', () => {
        const checks = view.render().querySelectorAll('svg.q-auth-marketing__check');
        expect(checks.length).toBe(3);
        const svg = checks[0];
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg.getAttribute('stroke-width')).toBe('2.5');
        expect(svg.getAttribute('stroke-linecap')).toBe('round');
        expect(svg.getAttribute('stroke-linejoin')).toBe('round');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.querySelector('polyline').getAttribute('points')).toBe('20 6 9 17 4 12');
      });

      it('hides both ambient blobs and positions them top-left and bottom-right', () => {
        const blobs = view.render().querySelectorAll('.q-ambient__blob');
        expect(blobs.length).toBe(2);
        expect(blobs[0].classList.contains('q-ambient__blob--top-left')).toBe(true);
        expect(blobs[1].classList.contains('q-ambient__blob--bottom-right')).toBe(true);
        blobs.forEach((blob) => expect(blob.getAttribute('aria-hidden')).toBe('true'));
      });

      it('wraps content, renders the exact subtitle and returns the mounted element', () => {
        const el = view.render();
        const content = el.querySelector('.q-auth-marketing__content');
        expect(content).not.toBeNull();
        expect(content.querySelector('.q-auth-marketing__subtitle').textContent).toBe(
          'Descubre productos únicos de productores, artesanos y negocios locales de toda la región. Compra con propósito y apoya a quienes mantienen vivas sus tradiciones.'
        );
        expect(view.mount(container)).toBe(el);
        expect(container.firstElementChild).toBe(el);
      });
    });
  })();
})();
