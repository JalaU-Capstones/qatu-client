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

  it('should contain Comprar, Vender, and Ayuda sections', () => {
    expect(viewModel.sections.length).toBe(3);
    expect(viewModel.sections.map((section) => section.title)).toEqual([
      'Comprar',
      'Vender',
      'Ayuda',
    ]);

    const buyingLinks = viewModel.sections[0].links.map((l) => l.label);
    expect(buyingLinks).toContain('Productos');
    expect(buyingLinks).toContain('Categorías');
    expect(buyingLinks).toContain('Tiendas');

    const helpLinks = viewModel.sections[2].links.map((l) => l.label);
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
    expect(viewModel.bottomBar.motto).toBe('El mercado de Latinoamérica, en un solo lugar');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('FooterViewModel additional branches (recovered 1)', () => {
      let viewModel;
      let unsubscribes;

      const track = (unsubscribe) => {
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      };

      beforeEach(() => {
        unsubscribes = [];
        viewModel = new FooterViewModel();
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      });

      it('keeps custom brand, sections, social and bottomBar overrides by reference', () => {
        const brand = { logoText: 'Custom', logoHref: '/custom', tagline: 'Custom tagline' };
        const sections = [
          { id: 'custom', title: 'Custom', links: [{ label: 'Custom', href: '/c' }] },
        ];
        const social = { title: 'Custom social', items: [] };
        const bottomBar = {
          copyright: 'Custom copyright',
          motto: 'Custom motto',
          mottoHref: '/custom-about',
        };

        const vm = new FooterViewModel({ brand, sections, social, bottomBar });

        expect(vm.brand).toBe(brand);
        expect(vm.sections).toBe(sections);
        expect(vm.social).toBe(social);
        expect(vm.bottomBar).toBe(bottomBar);
      });

      it('falls back to defaults for empty-string and null overrides', () => {
        const vm = new FooterViewModel({
          brand: '',
          sections: null,
          social: '',
          bottomBar: null,
        });

        expect(vm.brand.logoText).toBe("Q'atu");
        expect(vm.brand.logoHref).toBe('/');
        expect(vm.sections.length).toBe(3);
        expect(vm.social.title).toBe('Síguenos');
        expect(vm.bottomBar.copyright).toBe("© 2026 Q'atu");
      });

      it('exposes the exact default link arrays including Nosotros', () => {
        expect(viewModel.sections.map(({ id, title }) => ({ id, title }))).toEqual([
          { id: 'buy', title: 'Comprar' },
          { id: 'sell', title: 'Vender' },
          { id: 'support', title: 'Ayuda' },
        ]);
        expect(viewModel.sections[0].links).toEqual([
          { label: 'Productos', href: '/products' },
          { label: 'Categorías', href: '/categories' },
          { label: 'Tiendas', href: '/tiendas' },
        ]);
        expect(viewModel.sections[1].links).toEqual([
          { label: 'Vende en Q’atu', href: '/vender' },
          { label: 'Centro de ayuda', href: '/ayuda' },
          { label: 'Comisiones', href: '/comisiones' },
        ]);
        expect(viewModel.sections[2].links).toEqual([
          { label: 'Preguntas frecuentes', href: '/faq' },
          { label: 'Envíos y devoluciones', href: '/devoluciones' },
          { label: 'Contáctanos', href: '/contacto' },
          { label: 'Nosotros', href: '/about' },
        ]);
        expect(viewModel.social.items).toEqual([
          { id: 'facebook', label: 'f', href: 'https://facebook.com', ariaLabel: 'Facebook' },
          { id: 'instagram', label: 'ig', href: 'https://instagram.com', ariaLabel: 'Instagram' },
          { id: 'x', label: 'x', href: 'https://x.com', ariaLabel: 'X' },
        ]);
        expect(viewModel.bottomBar).toEqual({
          copyright: "© 2026 Q'atu",
          motto: 'El mercado de Latinoamérica, en un solo lugar',
          mottoHref: '/about',
        });
      });

      it('notifies subscribers with the view model and stops after unsubscribe', () => {
        const listener = jasmine.createSpy('listener');
        const unsubscribe = track(viewModel.subscribe(listener));

        viewModel._notify();

        expect(listener.calls.count()).toBe(1);
        expect(listener).toHaveBeenCalledWith(viewModel);

        unsubscribe();
        viewModel._notify();
        expect(listener.calls.count()).toBe(1);
      });
    });
  })();
})();
