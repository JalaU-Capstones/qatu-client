import { ShippingBannerViewModel } from './ShippingBannerViewModel.js';

describe('ShippingBannerViewModel', () => {
  it('constructor initializes with default copy', () => {
    const vm = new ShippingBannerViewModel();
    expect(vm.title).toBe('Envío gratis sobre US$ 50');
    expect(vm.ctaLabel).toBe('A toda Latinoamérica');
    expect(vm.ctaLink).toBe('Compra ahora');
    expect(vm.ctaHref).toBe('/products');
  });

  it('constructor accepts custom copy', () => {
    const vm = new ShippingBannerViewModel({
      title: 'Título personalizado',
      ctaLabel: 'Solo por hoy',
      ctaLink: 'Ver más',
      ctaHref: '/ofertas',
    });
    expect(vm.title).toBe('Título personalizado');
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
