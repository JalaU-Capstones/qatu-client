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
    expect(viewModel.subtitle).toBe('');
    expect(viewModel.seeAllLabel).toBe('Ver todas');
    expect(viewModel.seeAllHref).toBe('/tiendas');
  });

  it('eyebrow defaults to "Conoce a quienes crean"', () => {
    expect(viewModel.eyebrow).toBe('Conoce a quienes crean');
  });

  it('every store receives an accent from STORE_COLOR_CYCLE', () => {
    const accents = viewModel.stores.map((s) => s.accent);
    expect(accents).toEqual(['pink', 'blue', 'purple']);
  });

  it('every store receives initials computed from name', () => {
    const initials = viewModel.stores.map((s) => s.initials);
    expect(initials).toEqual(['TI', 'CY', 'AT']);
  });

  it('_computeInitials handles stop words (de, del, la, los, y)', () => {
    expect(viewModel._computeInitials('Café de los Yungas')).toBe('CY');
    expect(viewModel._computeInitials('Arte del Sol y Luna')).toBe('AS');
  });

  it('_computeInitials handles single-word store names', () => {
    expect(viewModel._computeInitials('Amazonas')).toBe('AM');
  });

  it('explicit store.accent is preserved when provided', () => {
    const vm = new FeaturedStoresViewModel({
      stores: [{ id: 's1', name: 'Custom Store', accent: 'green' }],
    });
    expect(vm.stores[0].accent).toBe('green');
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
      expect(vm.stores[0].id).toBe(newStores[0].id);
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('FeaturedStoresViewModel (recovered 1)', () => {
    let viewModel;

    beforeEach(() => {
      viewModel = new FeaturedStoresViewModel();
    });

    it('eyebrow defaults to "Conoce a quienes crean"', () => {
      expect(viewModel.eyebrow).toBe('Conoce a quienes crean');
    });
  });

  (() => {
    describe('FeaturedStoresViewModel additional branches (recovered 2)', () => {
      let disposers;
      let vm;

      beforeEach(() => {
        vm = new FeaturedStoresViewModel();
        disposers = [];
      });

      afterEach(() => {
        disposers.forEach((unsubscribe) => unsubscribe());
      });

      it('returns a question mark for empty, null and undefined names', () => {
        expect(vm._computeInitials('')).toBe('?');
        expect(vm._computeInitials(null)).toBe('?');
        expect(vm._computeInitials(undefined)).toBe('?');
      });

      it('falls back to the first two characters when every word is a stop word', () => {
        expect(vm._computeInitials('de la y')).toBe('DE');
        expect(vm._computeInitials('y')).toBe('Y');
        expect(vm._computeInitials('de')).toBe('DE');
      });

      it('collapses multiple and edge spaces before computing initials', () => {
        expect(vm._computeInitials('Tejidos   Illimani')).toBe('TI');
        expect(vm._computeInitials('  Andes   Tech  ')).toBe('AT');
      });

      it('reuses the three-color accent cycle at indexes 3 to 5', () => {
        const stores = Array.from({ length: 6 }, (_, index) => ({
          id: `s${index}`,
          name: `Tienda ${index}`,
        }));
        const custom = new FeaturedStoresViewModel({ stores });

        expect(custom.stores.map((store) => store.accent)).toEqual([
          'pink',
          'blue',
          'purple',
          'pink',
          'blue',
          'purple',
        ]);
        expect(custom.stores.map((store) => store.initials)).toEqual([
          'T0',
          'T1',
          'T2',
          'T3',
          'T4',
          'T5',
        ]);
      });

      it('preserves explicit initials in the constructor and in setStores', () => {
        const custom = new FeaturedStoresViewModel({
          stores: [
            { id: 'a', name: 'Andes Tech', initials: 'ZZ' },
            { id: 'b', name: 'Café Yungas', initials: '' },
          ],
        });

        expect(custom.stores[0].initials).toBe('ZZ');
        expect(custom.stores[1].initials).toBe('CY');

        custom.setStores([{ id: 'c', name: 'Nueva Tienda', initials: 'NT' }]);
        expect(custom.stores[0].initials).toBe('NT');
      });

      it('accepts a custom subtitle and keeps the default when it is empty', () => {
        const custom = new FeaturedStoresViewModel({ subtitle: 'Productos locales' });

        expect(custom.subtitle).toBe('Productos locales');
        expect(new FeaturedStoresViewModel({ subtitle: '' }).subtitle).toBe('');
      });

      it('treats null and missing setStores arguments as an empty notified list', () => {
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));

        vm.setStores(null);
        expect(vm.stores).toEqual([]);
        expect(listener).toHaveBeenCalledTimes(1);

        vm.setStores();
        expect(vm.stores).toEqual([]);
        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('spreads extra store properties and keeps an explicit accent', () => {
        const extra = {
          id: 'custom',
          name: 'Custom Store',
          category: 'Otros',
          rating: 4,
          reviewCount: 3,
          href: '/tiendas/custom',
          accent: 'green',
          initials: 'CS',
          highlighted: true,
        };
        const custom = new FeaturedStoresViewModel({ stores: [extra] });

        expect(custom.stores[0]).toEqual(extra);
        expect(custom.stores[0].highlighted).toBe(true);

        custom.setStores([extra]);
        expect(custom.stores[0]).toEqual(extra);
      });

      it('uses an empty stores array instead of defaults and notifies every listener', () => {
        const custom = new FeaturedStoresViewModel({ stores: [] });
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        const unsubscribeFirst = custom.subscribe(first);
        const unsubscribeSecond = custom.subscribe(second);
        disposers.push(unsubscribeFirst, unsubscribeSecond);

        expect(custom.stores).toEqual([]);

        custom.setStores([{ id: 's1', name: 'Solo Tienda' }]);
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);

        unsubscribeFirst();
        custom.setStores([{ id: 's2', name: 'Otra Tienda' }]);
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(2);
      });

      it('characterizes a non-string store name throwing while computing initials', () => {
        expect(() => vm._computeInitials(42)).toThrowError(TypeError);
        expect(() => new FeaturedStoresViewModel({ stores: [{ name: 42 }] })).toThrowError(
          TypeError
        );
      });
    });
  })();
})();
