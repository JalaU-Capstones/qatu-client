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

  it('should render four social links with accessible icons', () => {
    const el = view.render();
    const socialLinks = Array.from(el.querySelectorAll('.q-footer-social-btn'));
    expect(socialLinks.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Instagram',
      'Facebook',
      'TikTok',
      'X',
    ]);
    socialLinks.forEach((link) => {
      expect(link.querySelector('svg')).not.toBeNull();
    });
  });

  it('renders the existing four-column structure and source headings', () => {
    const el = view.render();

    expect(el.querySelectorAll('.q-footer-grid > .q-footer-col').length).toBe(4);
    expect(el.querySelector('.q-footer-col-brand .q-brand-logo')).not.toBeNull();
    const headings = Array.from(el.querySelectorAll('.q-footer-heading')).map(
      (heading) => heading.textContent
    );
    expect(headings).toEqual(['Comprar y vender', 'Ayuda', 'Síguenos']);
  });

  describe('restored behavioral checks', () => {
    it('renders social links with safe external-link attributes', () => {
      const el = view.render();
      const socialLinks = Array.from(el.querySelectorAll('.q-footer-social-btn'));

      socialLinks.forEach((link) => {
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      });
    });

    it('preserves custom social links and adds the missing TikTok link', () => {
      const customModel = new FooterViewModel({
        social: {
          title: 'Síguenos',
          items: [{ id: 'blog', label: 'Blog', href: 'https://example.com/blog' }],
        },
      });
      const customView = new FooterView(customModel);
      const el = customView.render();

      expect(el.querySelector('[aria-label="Blog"]').getAttribute('href')).toBe(
        'https://example.com/blog'
      );
      expect(el.querySelector('[aria-label="TikTok"]')).not.toBeNull();

      customView.destroy();
    });
  });

  it('renders social links with safe external-link attributes', () => {
    const el = view.render();
    const socialLinks = Array.from(el.querySelectorAll('.q-footer-social-btn'));

    socialLinks.forEach((link) => {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  it('preserves custom social links and adds the missing TikTok link', () => {
    const customModel = new FooterViewModel({
      social: {
        title: 'Síguenos',
        items: [{ id: 'blog', label: 'Blog', href: 'https://example.com/blog' }],
      },
    });
    const customView = new FooterView(customModel);
    const el = customView.render();

    expect(el.querySelector('[aria-label="Blog"]').getAttribute('href')).toBe(
      'https://example.com/blog'
    );
    expect(el.querySelector('[aria-label="TikTok"]')).not.toBeNull();

    customView.destroy();
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

  it('non-seller -> footer "Vender" link href is /seller/apply', () => {
    const mockAuth = { isSeller: () => false };
    const footerView = new FooterView(viewModel, { authStore: mockAuth });
    const el = footerView.render();

    const venderLink = Array.from(el.querySelectorAll('.q-footer-links a')).find((a) =>
      a.textContent.toLowerCase().includes('vender')
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
      a.textContent.toLowerCase().includes('vender')
    );
    expect(venderLink).not.toBeNull();
    expect(venderLink.getAttribute('href')).toBe('/seller/products');
    footerView.destroy();
  });
});
