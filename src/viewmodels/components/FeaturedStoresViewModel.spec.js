import { FeaturedStoresViewModel } from './FeaturedStoresViewModel.js';

describe('FeaturedStoresViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new FeaturedStoresViewModel();
  });

  it('should initialize with default stores from defaultStores()', () => {
    expect(viewModel.stores.length).toBe(3);
    expect(viewModel.stores[0].id).toBe('tejidos');
    expect(viewModel.stores[0].name).toBe('Tejidos Illimani');
    expect(viewModel.stores[0].category).toBe('Textiles artesanales');
    expect(viewModel.stores[0].rating).toBe(4.8);
    expect(viewModel.stores[0].reviewCount).toBe(132);
    expect(viewModel.stores[0].href).toBe('/tiendas/tejidos-illimani');
  });

  it('should initialize with default title, subtitle, and see-all values', () => {
    expect(viewModel.title).toBe('Tiendas destacadas');
    expect(viewModel.subtitle).toBe('Conoce a quienes crean');
    expect(viewModel.seeAllLabel).toBe('Ver todas');
    expect(viewModel.seeAllHref).toBe('/tiendas');
  });

  it('should replace stores and notify subscribers when setStores is called', () => {
    let notified = false;
    const newStores = [
      {
        id: 'nueva',
        name: 'Nueva Tienda',
        category: 'Comida',
        rating: 5.0,
        reviewCount: 10,
        href: '/tiendas/nueva',
      },
    ];

    viewModel.subscribe((vm) => {
      notified = true;
      expect(vm.stores).toBe(newStores);
    });

    viewModel.setStores(newStores);
    expect(viewModel.stores.length).toBe(1);
    expect(notified).toBe(true);
  });

  it('should return an unsubscribe function that stops further notifications', () => {
    let count = 0;
    const unsubscribe = viewModel.subscribe(() => {
      count += 1;
    });

    viewModel.setStores([]);
    expect(count).toBe(1);

    unsubscribe();
    viewModel.setStores([
      {
        id: 'otra',
        name: 'Otra Tienda',
        category: 'Ropa',
        rating: 4.5,
        reviewCount: 20,
        href: '/tiendas/otra',
      },
    ]);
    expect(count).toBe(1);
  });
});
