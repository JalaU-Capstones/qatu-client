import { HeroViewModel } from './HeroViewModel.js';

describe('HeroViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new HeroViewModel();
  });

  it('should initialize with default options', () => {
    expect(viewModel.eyebrow).toBe('Inspirado en nuestras ferias');
    expect(viewModel.title).toBe('Lo mejor de Latinoamérica, en un solo lugar.');
    expect(viewModel.subtitle).toContain('Descubre productos únicos');
    expect(viewModel.searchPlaceholder).toBe('¿Qué estás buscando hoy?');
    expect(viewModel.searchButtonLabel).toBe('Buscar');
    expect(viewModel.quickLinksLabel).toBe('Explora:');
    expect(viewModel.quickLinks.length).toBe(5);
    expect(viewModel.visualBadgeLabel).toBe('100%');
    expect(viewModel.visualBadgeSublabel).toBe('único');
    expect(viewModel.floatingCardLabel).toBe('Hecho en Latinoamérica');
    expect(viewModel.floatingCardCtaLabel).toBe('Ver más sobre');
    expect(viewModel.floatingCardHref).toBe('/nosotros');
    expect(viewModel.searchValue).toBe('');
    expect(viewModel.onSearch).toBeNull();
  });

  it('should allow custom options in constructor', () => {
    const customVM = new HeroViewModel({
      eyebrow: 'Custom Eyebrow',
      title: 'Custom Title',
      subtitle: 'Custom Subtitle',
      searchPlaceholder: 'Search here...',
      searchButtonLabel: 'Go',
      quickLinksLabel: 'Tags:',
      quickLinks: [{ id: 'test', label: 'Test', href: '/test' }],
      visualBadgeLabel: '50%',
      floatingCardLabel: 'Made Locally',
    });

    expect(customVM.eyebrow).toBe('Custom Eyebrow');
    expect(customVM.title).toBe('Custom Title');
    expect(customVM.quickLinks.length).toBe(1);
    expect(customVM.visualBadgeLabel).toBe('50%');
    expect(customVM.floatingCardLabel).toBe('Made Locally');
  });

  it('should update searchValue and notify subscribers on setSearchValue', () => {
    const listener = jasmine.createSpy('listener');
    viewModel.subscribe(listener);

    viewModel.setSearchValue('café');

    expect(viewModel.searchValue).toBe('café');
    expect(listener).toHaveBeenCalledWith(viewModel);
    expect(listener.calls.count()).toBe(1);
  });

  it('should not notify subscribers when setSearchValue is called with the same value', () => {
    viewModel.setSearchValue('artesanías');

    const listener = jasmine.createSpy('listener');
    viewModel.subscribe(listener);

    viewModel.setSearchValue('artesanías');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should call onSearch callback with current searchValue on triggerSearch', () => {
    const onSearchSpy = jasmine.createSpy('onSearch');
    const vm = new HeroViewModel({ onSearch: onSearchSpy });

    vm.setSearchValue('textiles');
    vm.triggerSearch();

    expect(onSearchSpy).toHaveBeenCalledWith('textiles');
  });

  it('should not throw on triggerSearch when onSearch is not provided', () => {
    expect(() => {
      viewModel.triggerSearch();
    }).not.toThrow();
  });

  it('should unsubscribe listener when returned function is called', () => {
    const listener = jasmine.createSpy('listener');
    const unsubscribe = viewModel.subscribe(listener);

    viewModel.setSearchValue('poncho');
    expect(listener.calls.count()).toBe(1);

    unsubscribe();

    viewModel.setSearchValue('chullo');
    expect(listener.calls.count()).toBe(1);
  });
});
