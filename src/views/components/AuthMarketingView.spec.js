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
