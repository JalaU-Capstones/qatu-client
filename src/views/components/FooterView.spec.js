import { Router } from '../../router/Router.js';
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

    const logo = el.querySelector('.q-footer-col-brand .q-brand-logo-svg');
    expect(logo).not.toBeNull();
    expect(logo.querySelector('text').textContent).toBe('Q’atu');
    expect(logo.querySelector('polygon')).not.toBeNull();

    const tagline = el.querySelector('.q-footer-tagline');
    expect(tagline).not.toBeNull();
    expect(tagline.textContent).toContain('El mercado de Latinoamérica');
  });

  it('should render category and help section links', () => {
    const el = view.render();
    const headings = Array.from(el.querySelectorAll('.q-footer-heading')).map((h) => h.textContent);
    expect(headings).toContain('Comprar');
    expect(headings).toContain('Vender');
    expect(headings).toContain('Ayuda');
    expect(headings).not.toContain('Síguenos');

    const links = Array.from(el.querySelectorAll('.q-footer-links a')).map((a) => a.textContent);
    expect(links).toContain('Productos');
    expect(links).toContain('Categorías');
    expect(links).toContain('Tiendas');
    expect(links).toContain('Preguntas frecuentes');
  });

  it('renders the four-column structure and Figma navigation headings', () => {
    const el = view.render();

    expect(el.querySelectorAll('.q-footer-grid > .q-footer-col').length).toBe(4);
    expect(el.querySelector('.q-footer-col-brand .q-brand-logo-svg')).not.toBeNull();
    const headings = Array.from(el.querySelectorAll('.q-footer-heading')).map(
      (heading) => heading.textContent
    );
    expect(headings).toEqual(['Comprar', 'Vender', 'Ayuda']);
  });

  it('should render bottom legal bar with copyright and motto', () => {
    const el = view.render();
    const copyright = el.querySelector('.q-footer-copyright');
    expect(copyright).not.toBeNull();
    expect(copyright.textContent).toContain('2026');

    const motto = el.querySelector('.q-footer-motto');
    expect(motto).not.toBeNull();
    expect(copyright.textContent).toBe("© 2026 Q'atu");
    expect(motto.textContent).toBe('El mercado de Latinoamérica, en un solo lugar');
    expect(motto.tagName.toLowerCase()).toBe('a');
    expect(motto.getAttribute('href')).toBe('/about');
    expect(motto.hasAttribute('data-route')).toBe(true);
  });

  it('includes a Nosotros navigation link to /about', () => {
    const el = view.render();
    const aboutLink = Array.from(el.querySelectorAll('.q-footer-links a')).find(
      (link) => link.textContent === 'Nosotros'
    );

    expect(aboutLink).not.toBeNull();
    expect(aboutLink.getAttribute('href')).toBe('/about');
    expect(aboutLink.hasAttribute('data-route')).toBe(true);
  });

  it('navigates to /about when the footer motto is clicked', () => {
    const originalPath = window.location.pathname;
    const router = new Router();
    const aboutRoute = jasmine.createSpy('aboutRoute');
    router.addRoute('/about', aboutRoute);
    router.start();
    view.mount(container);

    container.querySelector('.q-footer-motto').click();

    expect(aboutRoute).toHaveBeenCalledWith('/about', {});
    router.destroy();
    window.history.replaceState({}, '', originalPath);
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-footer')).not.toBeNull();
  });

  it('non-seller -> footer "Vender" link href is /seller/apply', () => {
    const mockAuth = { isSeller: () => false };
    const footerView = new FooterView(viewModel, { authStore: mockAuth });
    const el = footerView.render();

    const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
      a.textContent.toLowerCase().includes('vende')
    );
    expect(venderLink).not.toBeNull();
    expect(venderLink.getAttribute('href')).toBe('/seller/apply');
    footerView.destroy();
  });

  it('seller -> footer "Vender" link href is /seller/products', () => {
    const mockAuth = { isSeller: () => true };
    const footerView = new FooterView(viewModel, { authStore: mockAuth });
    const el = footerView.render();

    const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
      a.textContent.toLowerCase().includes('vende')
    );
    expect(venderLink).not.toBeNull();
    expect(venderLink.getAttribute('href')).toBe('/seller/products');
    footerView.destroy();
  });
});
