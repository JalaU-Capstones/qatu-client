import { FooterViewModel } from './FooterViewModel.js';

describe('FooterViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new FooterViewModel();
  });

  it('should initialize with default brand details and tagline', () => {
    expect(viewModel.brand.logoText).toBe("Q'atu");
    expect(viewModel.brand.tagline).toContain('El mercado de Latinoamérica');
  });

  it('should contain Comprar y vender and Ayuda sections', () => {
    expect(viewModel.sections.length).toBe(2);
    expect(viewModel.sections[0].title).toBe('Comprar y vender');
    expect(viewModel.sections[1].title).toBe('Ayuda');

    const buyingLinks = viewModel.sections[0].links.map((l) => l.label);
    expect(buyingLinks).toContain('Productos');
    expect(buyingLinks).toContain('Categorías');
    expect(buyingLinks).toContain('Tiendas');

    const helpLinks = viewModel.sections[1].links.map((l) => l.label);
    expect(helpLinks).toContain('Preguntas frecuentes');
    expect(helpLinks).toContain('Envíos y devoluciones');
    expect(helpLinks).toContain('Contáctanos');
  });

  it('should contain social links for f, ig, and x', () => {
    expect(viewModel.social.title).toBe('Síguenos');
    const labels = viewModel.social.items.map((i) => i.label);
    expect(labels).toEqual(['f', 'ig', 'x']);
  });

  it('should contain copyright and latinoamerica motto', () => {
    expect(viewModel.bottomBar.copyright).toContain('2026');
    expect(viewModel.bottomBar.motto).toBe('El mercado de Latinoamérica, en un solo lugar.');
  });
});
