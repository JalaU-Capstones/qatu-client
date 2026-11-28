import { ShippingBannerViewModel } from './ShippingBannerViewModel.js';

describe('ShippingBannerViewModel', () => {
  it('constructor initializes with default copy', () => {
    const vm = new ShippingBannerViewModel();
    expect(vm.title).toBe('Envío gratis');
    expect(vm.subtitle).toBe('en compras desde US$ 50');
    expect(vm.ctaLabel).toBe('A toda Latinoamérica');
    expect(vm.ctaLink).toBe('Compra segura');
    expect(vm.ctaHref).toBe('/products');
  });

  it('constructor accepts custom copy', () => {
    const vm = new ShippingBannerViewModel({
      title: 'Título personalizado',
      subtitle: 'Subtítulo personalizado',
      ctaLabel: 'Solo por hoy',
      ctaLink: 'Ver más',
      ctaHref: '/ofertas',
    });
    expect(vm.title).toBe('Título personalizado');
    expect(vm.subtitle).toBe('Subtítulo personalizado');
    expect(vm.ctaLabel).toBe('Solo por hoy');
    expect(vm.ctaLink).toBe('Ver más');
    expect(vm.ctaHref).toBe('/ofertas');
  });

  it('subscribe registers and unsubscribes listeners', () => {
    const vm = new ShippingBannerViewModel();
    let notified = 0;
    const unsubscribe = vm.subscribe(() => {
      notified += 1;
    });

    vm._notify();
    expect(notified).toBe(1);

    unsubscribe();
    vm._notify();
    expect(notified).toBe(1);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('ShippingBannerViewModel additional branches (recovered 1)', () => {
      let unsubscribes;

      const track = (unsubscribe) => {
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      };

      beforeEach(() => {
        unsubscribes = [];
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      });

      it('falls back to the default copy for empty-string and null overrides', () => {
        const vm = new ShippingBannerViewModel({
          title: '',
          subtitle: null,
          ctaLabel: '',
          ctaLink: null,
          ctaHref: '',
        });

        expect(vm.title).toBe('Envío gratis');
        expect(vm.subtitle).toBe('en compras desde US$ 50');
        expect(vm.ctaLabel).toBe('A toda Latinoamérica');
        expect(vm.ctaLink).toBe('Compra segura');
        expect(vm.ctaHref).toBe('/products');
      });

      it('passes the view model to every subscriber when _notify is called', () => {
        const vm = new ShippingBannerViewModel();
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        track(vm.subscribe(first));
        track(vm.subscribe(second));

        vm._notify();

        expect(first.calls.count()).toBe(1);
        expect(second.calls.count()).toBe(1);
        expect(first).toHaveBeenCalledWith(vm);
        expect(second).toHaveBeenCalledWith(vm);
      });

      it('stops notifying after unsubscribe', () => {
        const vm = new ShippingBannerViewModel();
        const listener = jasmine.createSpy('listener');
        const unsubscribe = track(vm.subscribe(listener));

        vm._notify();
        expect(listener.calls.count()).toBe(1);

        expect(unsubscribe()).toBe(true);
        vm._notify();
        expect(listener.calls.count()).toBe(1);
      });
    });
  })();
})();
