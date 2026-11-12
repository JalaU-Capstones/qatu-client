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
