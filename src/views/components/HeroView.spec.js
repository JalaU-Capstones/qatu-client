import { HeroViewModel } from '../../viewmodels/components/HeroViewModel.js';
import { HeroView } from './HeroView.js';

describe('HeroView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new HeroViewModel();
    view = new HeroView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a section element with class q-hero and aria-labelledby', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-hero')).toBe(true);
    expect(el.getAttribute('aria-labelledby')).toBe('q-hero-title');
  });

  it('should render the expected eyebrow, title, and subtitle', () => {
    const el = view.render();
    const eyebrow = el.querySelector('.q-hero__eyebrow');
    const title = el.querySelector('#q-hero-title');
    const subtitle = el.querySelector('.q-hero__subtitle');

    expect(eyebrow).not.toBeNull();
    expect(eyebrow.textContent).toBe('INSPIRADO EN NUESTRAS FERIAS');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Lo mejor de Latinoamérica, en un solo lugar.');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toContain('Descubre productos únicos');
  });

  it('should render the search input with correct placeholder and button', () => {
    const el = view.render();
    const input = el.querySelector('.q-hero__search-input');
    const button = el.querySelector('.q-hero__search-button');

    expect(input).not.toBeNull();
    expect(input.getAttribute('placeholder')).toBe('¿Qué estás buscando hoy?');
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Buscar');
  });

  it('should call onSearch with the current input value when search form is submitted', () => {
    const onSearchSpy = jasmine.createSpy('onSearch');
    const customVM = new HeroViewModel({ onSearch: onSearchSpy });
    const customView = new HeroView(customVM);
    const el = customView.render();

    const input = el.querySelector('.q-hero__search-input');
    const form = el.querySelector('.q-hero__search');

    input.value = 'sombreros';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(customVM.searchValue).toBe('sombreros');

    const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(onSearchSpy).toHaveBeenCalledWith('sombreros');

    customView.destroy();
  });

  it('should render exactly 5 quick links in the expected order', () => {
    const el = view.render();
    const links = el.querySelectorAll('.q-hero__quick-link');

    expect(links.length).toBe(5);
    const expectedLabels = ['Artesanías', 'Café', 'Textiles', 'Cacao', 'Tecnología'];
    links.forEach((link, idx) => {
      expect(link.textContent).toBe(expectedLabels[idx]);
    });
  });

  it('should prevent default navigation on quick link click', () => {
    const el = view.render();
    const link = el.querySelector('.q-hero__quick-link');
    const clickEvent = new MouseEvent('click', {
      cancelable: true,
      bubbles: true,
    });

    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('should render the floating card with label and CTA', () => {
    const el = view.render();
    const floatingCard = el.querySelector('.q-hero__floating-card');
    const label = el.querySelector('.q-hero__floating-card-label');
    const cta = el.querySelector('.q-hero__floating-card-cta');

    expect(floatingCard).not.toBeNull();
    expect(label).not.toBeNull();
    expect(label.textContent).toBe('Hecho en Latinoamérica');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toContain('Ver más sobre');
  });

  it('should render visual image with q-hero__visual-img class and valid src', () => {
    const el = view.render();
    const img = el.querySelector('.q-hero__visual-img');

    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://picsum.photos/seed/qatu-hero/900/700');
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-hero')).not.toBeNull();
  });

  it('should remove the element from DOM on destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-hero')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-hero')).toBeNull();
    expect(view.element).toBeNull();
  });

  it('should update input value when viewModel.setSearchValue is called', () => {
    const el = view.render();
    const input = el.querySelector('.q-hero__search-input');

    viewModel.setSearchValue('artesanías');
    expect(input.value).toBe('artesanías');
  });
});
