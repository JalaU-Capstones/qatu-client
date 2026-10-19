import { CategoriesViewModel } from '../../viewmodels/components/CategoriesViewModel.js';
import { CategoriesView } from './CategoriesView.js';

describe('CategoriesView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new CategoriesViewModel();
    view = new CategoriesView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a section element with class q-categories', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-categories')).toBe(true);
    expect(el.getAttribute('aria-labelledby')).toBe('q-categories-title');
  });

  it('should contain header with title, subtitle, and see-all link', () => {
    const el = view.render();
    const title = el.querySelector('#q-categories-title');
    const subtitle = el.querySelector('.q-categories__subtitle');
    const seeAll = el.querySelector('.q-categories__see-all');

    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Explora por categoría');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toBe('Encuentra tu próximo favorito');
    expect(seeAll).not.toBeNull();
    expect(seeAll.textContent).toContain('Ver todas');
    expect(seeAll.getAttribute('href')).toBe('/categorias');
  });

  it('should render exactly 6 category cards by default', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-category-card');
    expect(cards.length).toBe(6);
  });

  it('should render each card with name, placeholder, and formatted product count', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-category-card');
    const firstCard = cards[0];

    const placeholder = firstCard.querySelector('.q-category-card__image-placeholder');
    const name = firstCard.querySelector('.q-category-card__name');
    const count = firstCard.querySelector('.q-category-card__count');

    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toBe('✕');
    expect(name).not.toBeNull();
    expect(name.textContent).toBe('Textiles y moda');
    expect(count).not.toBeNull();
    expect(count.textContent).toBe('248 productos');
  });

  it('should prevent default navigation on card click', () => {
    const el = view.render();
    const card = el.querySelector('.q-category-card');
    const clickEvent = new MouseEvent('click', { cancelable: true, bubbles: true });

    card.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-categories')).not.toBeNull();
  });

  it('should remove the element from DOM on destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-categories')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-categories')).toBeNull();
    expect(view.element).toBeNull();
  });

  it('should re-render only the grid when viewModel.setCategories is called', () => {
    const el = view.mount(container);
    const headerBefore = el.querySelector('.q-categories__header');

    viewModel.setCategories([
      { id: 'musica', name: 'Música', productCount: 42, href: '/categorias/musica' },
      { id: 'libros', name: 'Libros', productCount: 15, href: '/categorias/libros' },
    ]);

    const cards = el.querySelectorAll('.q-category-card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.q-category-card__name').textContent).toBe('Música');
    expect(cards[0].querySelector('.q-category-card__count').textContent).toBe('42 productos');

    const headerAfter = el.querySelector('.q-categories__header');
    expect(headerAfter).toBe(headerBefore);
  });
});
