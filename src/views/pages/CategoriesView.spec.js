import { CategoriesPageView } from './CategoriesView.js';

describe('CategoriesPageView', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      text: () => Promise.resolve('<svg viewBox="0 0 24 24"></svg>'),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders descriptions with a fallback and always shows product counts', () => {
    const viewModel = {
      isLoading: false,
      errorMessage: '',
      categories: [
        {
          id: '1',
          slug: 'hogar-y-jardin',
          name: 'Hogar y Jardín',
          description: 'Decoración y artículos para el hogar',
          product_count: 7,
        },
        { id: '2', slug: 'moda', name: 'Moda', description: '', product_count: 0 },
      ],
    };
    const view = new CategoriesPageView({ viewModel });
    const element = view.render();
    const cards = element.querySelectorAll('.q-categories-page__card');

    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.q-categories-page__description').textContent).toBe(
      'Decoración y artículos para el hogar'
    );
    expect(cards[0].querySelector('.q-categories-page__count').textContent).toBe('7 productos');
    expect(cards[1].querySelector('.q-categories-page__description').textContent).toBe(
      'Explora esta categoría'
    );
    expect(cards[1].querySelector('.q-categories-page__count').textContent).toBe('0 productos');
    view.destroy();
  });
});
