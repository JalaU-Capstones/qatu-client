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

  it('should initialize with default title, subtitle, and see-all values', () => {
    expect(viewModel.title).toBe('Explora por categoría');
    expect(viewModel.subtitle).toBe('Encuentra tu próximo favorito');
    expect(viewModel.seeAllLabel).toBe('Ver todas');
    expect(viewModel.seeAllHref).toBe('/categorias');
  });

  it('should replace categories and notify subscribers when setCategories is called', () => {
    let notified = false;
    const newCategories = [
      { id: 'musica', name: 'Música', productCount: 15, href: '/categorias/musica' },
    ];

    viewModel.subscribe((vm) => {
      notified = true;
      expect(vm.categories).toBe(newCategories);
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
