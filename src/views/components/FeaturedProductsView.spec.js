import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';
import { FeaturedProductsView } from './FeaturedProductsView.js';

const FEATURED_PRODUCTS = [
  {
    id: 'p1',
    slug: 'aguayo',
    name: 'Aguayo tradicional',
    seller_id: 'seller-1',
    price: 40,
    currency: 'USD',
    stock: 10,
    state: 'published',
    average_rating: 4.9,
    ratings_count: 24,
    primary_image_path: null,
  },
  {
    id: 'p2',
    slug: 'cafe',
    name: 'Café de especialidad',
    price: 14,
    currency: 'USD',
    stock: 0,
    state: 'published',
    average_rating: undefined,
    primary_image_path: 'https://example.test/coffee.jpg',
  },
];

const createFeaturedApi = () => ({
  getFeaturedProducts: jasmine
    .createSpy('getFeaturedProducts')
    .and.resolveTo(FEATURED_PRODUCTS.map((product) => ({ ...product }))),
});

function makeAuthStore(user = null) {
  const listeners = new Set();
  return {
    getUser: () => user,
    subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
}

describe('FeaturedProductsView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FeaturedProductsViewModel({ productsApi: createFeaturedApi() });
    await viewModel.load();
    view = new FeaturedProductsView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    container.remove();
  });

  it('renders the section heading and one list item per featured product', () => {
    const element = view.render();
    const cards = element.querySelectorAll('[role="listitem"]');

    expect(element.querySelector('h2').textContent).toBe('Destacados de la semana');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Aguayo tradicional');
    expect(cards[1].textContent).toContain('Café de especialidad');
  });

  it('renders formatted price and rating details when available', () => {
    const firstCard = view.render().querySelector('[role="listitem"]');

    expect(firstCard.textContent).toContain('US$ 40.00');
    expect(firstCard.textContent).toContain('4.9');
    expect(firstCard.textContent).toContain('(24)');
    expect(firstCard.querySelector('.product-card__rating')).not.toBeNull();
    expect(firstCard.querySelector('img').src).toContain('product-placeholder.svg');
  });

  it('uses the product photo and hides the rating when no average is provided', () => {
    const secondCard = view.render().querySelectorAll('[role="listitem"]')[1];

    expect(secondCard.querySelector('img').src).toBe('https://example.test/coffee.jpg');
    expect(secondCard.querySelector('.product-card__rating')).toBeNull();
  });

  it('wires add-to-cart and forwards the selected product', async () => {
    const addToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
    viewModel.onAddToCart = addToCart;
    const button = view.render().querySelector('button[aria-label^="Añadir"]');

    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(addToCart).toHaveBeenCalledWith(FEATURED_PRODUCTS[0]);
  });

  it('hides add-to-cart for the current seller and disables out-of-stock products', () => {
    const sellerView = new FeaturedProductsView(viewModel, {
      authStore: makeAuthStore({ id: 'seller-1' }),
    });
    const cards = sellerView.render().querySelectorAll('[role="listitem"]');

    expect(cards[0].querySelector('button[aria-label^="Añadir"]')).toBeNull();
    expect(cards[1].textContent).toContain('Agotado');
    expect(cards[1].querySelector('button[aria-label^="Añadir"]').disabled).toBe(true);
    sellerView.destroy();
  });

  it('updates the visible cards when the ViewModel products change', () => {
    view.mount(container);
    viewModel.setProducts([FEATURED_PRODUCTS[0]]);

    expect(container.querySelectorAll('[role="listitem"]').length).toBe(1);
    expect(container.textContent).toContain('Aguayo tradicional');
  });

  it('shows a loading error instead of the product list', async () => {
    const failingView = new FeaturedProductsView(
      new FeaturedProductsViewModel({
        productsApi: { getFeaturedProducts: () => Promise.reject(new Error('Network error')) },
      })
    );
    failingView.mount(container);
    await failingView.viewModel.load();

    expect(container.textContent).toContain('No pudimos cargar los productos destacados.');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('[role="listitem"]')).toBeNull();
    failingView.destroy();
  });
});
