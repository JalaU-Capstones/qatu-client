import { FooterViewModel } from '../../viewmodels/components/FooterViewModel.js';
import { FooterView } from './FooterView.js';

describe('FooterView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FooterViewModel();
    view = new FooterView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render footer element with brand column', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('footer');
    expect(el.classList.contains('q-footer')).toBe(true);

    const logo = el.querySelector('.q-footer-col-brand .q-brand-logo');
    expect(logo).not.toBeNull();
    expect(logo.textContent).toBe("Q'atu");

    const tagline = el.querySelector('.q-footer-tagline');
    expect(tagline).not.toBeNull();
    expect(tagline.textContent).toContain('El mercado de Latinoamérica');
  });

  it('should render category and help section links', () => {
    const el = view.render();
    const headings = Array.from(el.querySelectorAll('.q-footer-heading')).map((h) => h.textContent);
    expect(headings).toContain('Comprar y vender');
    expect(headings).toContain('Ayuda');
    expect(headings).toContain('Síguenos');

    const links = Array.from(el.querySelectorAll('.q-footer-links a')).map((a) => a.textContent);
    expect(links).toContain('Productos');
    expect(links).toContain('Categorías');
    expect(links).toContain('Tiendas');
    expect(links).toContain('Preguntas frecuentes');
  });

  it('should render social buttons f, ig, x', () => {
    const el = view.render();
    const socialBtns = Array.from(el.querySelectorAll('.q-footer-social-btn')).map(
      (btn) => btn.textContent
    );
    expect(socialBtns).toEqual(['f', 'ig', 'x']);
  });

  it('should render bottom legal bar with copyright and motto', () => {
    const el = view.render();
    const copyright = el.querySelector('.q-footer-copyright');
    expect(copyright).not.toBeNull();
    expect(copyright.textContent).toContain('2026');

    const motto = el.querySelector('.q-footer-motto');
    expect(motto).not.toBeNull();
    expect(motto.textContent).toBe('El mercado de Latinoamérica, en un solo lugar.');
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-footer')).not.toBeNull();
  });
});
