import { CategoriesViewModel } from './CategoriesViewModel.js';

describe('CategoriesViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new CategoriesViewModel();
  });

  it('should initialize with default categories from defaultCategories()', () => {
    expect(viewModel.categories.length).toBe(6);
    expect(viewModel.categories[0].id).toBe('textiles');
    expect(viewModel.categories[0].name).toBe('Textiles y moda');
    expect(viewModel.categories[0].productCount).toBe(248);
  });

  it('should initialize with default title, subtitle, eyebrow, and see-all values', () => {
    expect(viewModel.eyebrow).toBe('Encuentra tu próximo favorito');
    expect(viewModel.title).toBe('Explora por categoría');
    expect(viewModel.subtitle).toBe('');
    expect(viewModel.seeAllLabel).toBe('Ver todas');
    expect(viewModel.seeAllHref).toBe('/categorias');
  });

  it('should include a style object on each category item', () => {
    viewModel.categories.forEach((cat) => {
      expect(cat.style).toBeDefined();
      expect(typeof cat.style.color).toBe('string');
      expect(typeof cat.style.icon).toBe('string');
    });
  });

  it('should resolve known slug tecnologia to color pink and icon laptop', () => {
    const vm = new CategoriesViewModel({
      categories: [{ slug: 'tecnologia', name: 'Tecnología', productCount: 10, href: '/tec' }],
    });
    expect(vm.categories[0].style.color).toBe('pink');
    expect(vm.categories[0].style.icon).toBe('laptop');
  });

  it('should fall back to COLOR_CYCLE and ICON_CYCLE order for unknown slug', () => {
    const vm = new CategoriesViewModel({
      categories: [
        { slug: 'unknown-1', name: 'Unknown 1', productCount: 1, href: '/u1' },
        { slug: 'unknown-2', name: 'Unknown 2', productCount: 2, href: '/u2' },
      ],
    });
    expect(vm.categories[0].style.color).toBe('pink');
    expect(vm.categories[0].style.icon).toBe('laptop');
    expect(vm.categories[1].style.color).toBe('amber');
    expect(vm.categories[1].style.icon).toBe('coffee');
  });

  it('should replace categories and notify subscribers when setCategories is called', () => {
    let notified = false;
    const newCategories = [
      { id: 'musica', name: 'Música', productCount: 15, href: '/categorias/musica' },
    ];

    viewModel.subscribe((vm) => {
      notified = true;
      expect(vm.categories[0].id).toBe('musica');
      expect(vm.categories[0].style).toBeDefined();
    });

    viewModel.setCategories(newCategories);
    expect(viewModel.categories.length).toBe(1);
    expect(notified).toBe(true);
  });

  it('should return an unsubscribe function that stops further notifications', () => {
    let count = 0;
    const unsubscribe = viewModel.subscribe(() => {
      count += 1;
    });

    viewModel.setCategories([]);
    expect(count).toBe(1);

    unsubscribe();
    viewModel.setCategories([
      { id: 'libros', name: 'Libros', productCount: 5, href: '/categorias/libros' },
    ]);
    expect(count).toBe(1);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('CategoriesViewModel additional branches (recovered 1)', () => {
      let vm;

      beforeEach(() => {
        vm = new CategoriesViewModel();
      });

      it('applies custom header options and keeps defaults for falsy overrides', () => {
        const vm = new CategoriesViewModel({
          eyebrow: '',
          title: '',
          subtitle: 'Compra local',
          seeAllLabel: '',
          seeAllHref: '',
        });

        expect(vm.eyebrow).toBe('Encuentra tu próximo favorito');
        expect(vm.title).toBe('Explora por categoría');
        expect(vm.subtitle).toBe('Compra local');
        expect(vm.seeAllLabel).toBe('Ver todas');
        expect(vm.seeAllHref).toBe('/categorias');

        const custom = new CategoriesViewModel({
          eyebrow: 'Oferta',
          title: 'Categorías',
          subtitle: 'Hecho en Bolivia',
          seeAllLabel: 'Explorar',
          seeAllHref: '/todo',
          categories: [],
        });

        expect(custom.eyebrow).toBe('Oferta');
        expect(custom.title).toBe('Categorías');
        expect(custom.subtitle).toBe('Hecho en Bolivia');
        expect(custom.seeAllLabel).toBe('Explorar');
        expect(custom.seeAllHref).toBe('/todo');
        expect(custom.categories).toEqual([]);
      });

      it('resolves style keys with slug taking precedence over id and both name forms', () => {
        const vm = new CategoriesViewModel({
          categories: [
            { slug: 'tecnologia', id: 'deportes', name: 'Artesanias' },
            { slug: 'unknown', id: 'deportes', name: 'artesanias' },
            { slug: 'unknown', id: 'unknown-too', name: 'Electronica' },
            { slug: 'unknown', id: 'unknown-too', name: 'Hogar y Decoracion' },
            { name: 'TECNOLOGIA' },
          ],
        });

        expect(vm.categories.map((category) => category.style)).toEqual([
          { color: 'pink', icon: 'laptop' },
          { color: 'green', icon: 'ball' },
          { color: 'purple', icon: 'headphones' },
          { color: 'teal', icon: 'home' },
          { color: 'pink', icon: 'laptop' },
        ]);
      });

      it('rotates the palette with a 5-color cycle and a 6-icon cycle', () => {
        const vm = new CategoriesViewModel({
          categories: Array.from({ length: 7 }, (_, index) => ({ id: `unknown-${index}` })),
        });

        expect(vm.categories.map((category) => category.style)).toEqual([
          { color: 'pink', icon: 'laptop' },
          { color: 'amber', icon: 'coffee' },
          { color: 'teal', icon: 'vase' },
          { color: 'purple', icon: 'home' },
          { color: 'green', icon: 'ball' },
          { color: 'pink', icon: 'headphones' },
          { color: 'amber', icon: 'laptop' },
        ]);
      });

      it('preserves extra category properties while replacing the style', () => {
        const vm = new CategoriesViewModel({
          categories: [
            {
              id: 'custom',
              name: 'Custom',
              productCount: 7,
              href: '/custom',
              metadata: { featured: true },
              style: { color: 'old', icon: 'old' },
            },
          ],
        });

        expect(vm.categories[0]).toEqual({
          id: 'custom',
          name: 'Custom',
          productCount: 7,
          href: '/custom',
          metadata: { featured: true },
          style: { color: 'pink', icon: 'laptop' },
        });
      });

      it('handles a category without a name by using the positional fallback', () => {
        const vm = new CategoriesViewModel({ categories: [{ id: 'nameless', productCount: 2 }] });

        expect(vm.categories[0].style).toEqual({ color: 'pink', icon: 'laptop' });
        expect(vm.categories[0].name).toBeUndefined();
      });

      it('characterizes a non-string category name throwing during normalization', () => {
        expect(() => new CategoriesViewModel({ categories: [{ name: 5 }] })).toThrowError(
          TypeError
        );
      });

      it('normalizes null to an empty list and still notifies subscribers', () => {
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);
        try {
          vm.setCategories(null);

          expect(vm.categories).toEqual([]);
          expect(listener).toHaveBeenCalledTimes(1);
          expect(listener.calls.mostRecent().args[0]).toBe(vm);
        } finally {
          unsubscribe();
        }
      });
    });
  })();
})();
