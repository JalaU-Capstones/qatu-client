import { FeaturedProductsViewModel } from '../../viewmodels/components/FeaturedProductsViewModel.js';
import { FeaturedProductsView } from './FeaturedProductsView.js';

describe('FeaturedProductsView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FeaturedProductsViewModel();
    await viewModel.load();
    view = new FeaturedProductsView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a labelled section with the heading copy', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-featured')).toBe(true);

    const title = el.querySelector('h2.q-featured-title');
    expect(title.textContent).toBe('Destacados de la semana');
    expect(el.getAttribute('aria-labelledby')).toBe(title.id);

    expect(el.querySelector('.q-featured-eyebrow').textContent).toBe('PRODUCTOS DESTACADOS');
    expect(el.querySelector('.q-featured-subtitle').textContent).toBe('Seleccionados para ti');
  });

  it('should render the catalog link without navigating', () => {
    const el = view.render();
    const link = el.querySelector('.q-featured-link');
    expect(link.textContent).toBe('Ver catálogo →');
    expect(link.getAttribute('href')).toBe('/productos');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should render one card per product in a list', () => {
    const el = view.render();
    expect(el.querySelector('ul.q-featured-grid')).not.toBeNull();

    const cards = el.querySelectorAll('li.q-product-card');
    expect(cards.length).toBe(8);

    const titles = Array.from(cards).map(
      (card) => card.querySelector('.q-product-card-title').textContent
    );
    expect(titles[0]).toBe('Aguayo tradicional de Tarabuco');
    expect(titles[4]).toBe('Audífonos inalámbricos ANC Pro');
  });

  it('should render seller, price and rating for each card', () => {
    const el = view.render();
    const card = el.querySelector('.q-product-card');

    expect(card.querySelector('.q-product-card-seller').textContent).toBe(
      'Tejidos Illimani · Bolivia'
    );
    expect(card.querySelector('.q-product-card-price').textContent).toBe('US$ 40.00');

    const rating = card.querySelector('.q-product-card-rating');
    expect(rating.textContent).toContain('☆☆☆☆☆');
    expect(rating.textContent).toContain('4.9 (24)');
    expect(rating.querySelector('.q-sr-only').textContent).toBe(
      'Calificación 4.9 de 5, 24 reseñas'
    );
  });

  it('should render the image placeholder with the Figma mark when there is no image', () => {
    const el = view.render();
    const image = el.querySelector('.q-product-card-image');

    expect(image.querySelector('.q-product-card-image-label').textContent).toBe(
      'Imagen del producto'
    );
    const mark = image.querySelector('.q-product-card-mark img');
    expect(mark).not.toBeNull();
    expect(mark.getAttribute('alt')).toBe('');
    expect(mark.getAttribute('src')).toContain('placeholder-mark.svg');
    expect(mark.getAttribute('width')).toBe('24.7071');
    expect(mark.getAttribute('height')).toBe('24.7071');
  });

  it('should render the product photo instead of the placeholder when imageUrl is set', () => {
    viewModel.setProducts([
      {
        id: 'p1',
        name: 'Con foto',
        seller: 'Tienda',
        country: 'Perú',
        rating: 4,
        ratingsCount: 2,
        price: 10,
        currency: 'USD',
        imageUrl: 'https://example.com/foto.jpg',
      },
    ]);
    const el = view.render();

    const photo = el.querySelector('.q-product-card-photo');
    expect(photo.getAttribute('src')).toBe('https://example.com/foto.jpg');
    expect(photo.getAttribute('alt')).toBe('Con foto');
    expect(el.querySelector('.q-product-card-mark')).toBeNull();
  });

  it('should render an accessible Add to cart button per product', () => {
    const el = view.render();
    const buttons = el.querySelectorAll('button.q-product-card-action');

    expect(buttons.length).toBe(8);
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].textContent).toBe('Add to cart');
    expect(buttons[0].getAttribute('aria-label')).toBe(
      'Add to cart: Aguayo tradicional de Tarabuco'
    );
  });

  it('should call onAddToCart with the clicked product', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    viewModel.onAddToCart = onAddToCart;
    const el = view.render();

    el.querySelectorAll('button.q-product-card-action')[1].click();

    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart.calls.mostRecent().args[0].id).toBe('cafe-especialidad-cusco');
  });

  it('should mount into a container and be reusable after destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-featured')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-featured')).toBeNull();

    view.mount(container);
    expect(container.querySelectorAll('.q-featured').length).toBe(1);
  });

  it('should render the products once load() finishes after the view is mounted', async () => {
    const emptyViewModel = new FeaturedProductsViewModel();
    const lazyView = new FeaturedProductsView(emptyViewModel);
    lazyView.mount(container);
    expect(container.querySelectorAll('.q-product-card').length).toBe(0);

    await emptyViewModel.load();

    expect(container.querySelectorAll('.q-featured').length).toBe(1);
    expect(container.querySelectorAll('.q-product-card').length).toBe(8);
    lazyView.destroy();
  });

  it('should show the error message instead of the grid when loading fails', async () => {
    const failingViewModel = new FeaturedProductsViewModel({
      productsApi: { getFeaturedProducts: () => Promise.reject(new Error('x')) },
    });
    const failingView = new FeaturedProductsView(failingViewModel);
    failingView.mount(container);

    await failingViewModel.load();

    const message = container.querySelector('.q-featured-message');
    expect(message.textContent).toBe('No pudimos cargar los productos destacados.');
    expect(message.getAttribute('role')).toBe('alert');
    expect(container.querySelector('.q-featured-grid')).toBeNull();
    expect(container.querySelector('.q-featured-title')).not.toBeNull();
    failingView.destroy();
  });

  it('should re-render in place when the products change', () => {
    view.mount(container);
    expect(container.querySelectorAll('.q-product-card').length).toBe(8);

    viewModel.setProducts(viewModel.products.slice(0, 3));

    expect(container.querySelectorAll('.q-featured').length).toBe(1);
    expect(container.querySelectorAll('.q-product-card').length).toBe(3);
  });
});
