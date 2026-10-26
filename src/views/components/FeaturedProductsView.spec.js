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

    expect(el.querySelector('.q-featured-eyebrow').textContent).toBe('Seleccionados para ti');
    expect(el.querySelector('.q-featured-subtitle')).toBeNull();
  });

  it('render() does NOT include a .q-featured-subtitle element when subtitle is empty', () => {
    const el = view.render();
    expect(el.querySelector('.q-featured-subtitle')).toBeNull();
  });

  it('should render the catalog link without navigating', () => {
    const el = view.render();
    const link = el.querySelector('.q-featured-link');
    expect(link.textContent).toBe('Ver catálogo →');
    expect(link.getAttribute('href')).toBe('/products');

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
    expect(rating.querySelector('.q-product-card-rating-value').textContent).toContain('4.9 (24)');
    expect(rating.querySelector('.q-sr-only').textContent).toBe(
      'Calificación 4.9 de 5, 24 reseñas'
    );
  });

  it('should render the image placeholder with the Figma mark when there is no image', () => {
    const el = view.render();
    const image = el.querySelector('.q-product-card-media .q-product-card-image');

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
    expect(photo.getAttribute('alt')).toBe('');
    expect(el.querySelector('.q-product-card-mark')).toBeNull();
  });

  it('should render an accessible Add to cart button per product', () => {
    const el = view.render();
    const buttons = el.querySelectorAll('button.q-product-card-action');

    expect(buttons.length).toBe(8);
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].textContent).toBe('Añadir');
    expect(buttons[0].getAttribute('aria-label')).toBe('Añadir: Aguayo tradicional de Tarabuco');
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

  it('should wrap image, badge and heart inside .q-product-card-media', () => {
    const el = view.render();
    const card = el.querySelector('.q-product-card');
    const media = card.querySelector('.q-product-card-media');
    expect(media).not.toBeNull();
    expect(media.querySelector('.q-product-card-image')).not.toBeNull();
    expect(media.querySelector('.q-product-card-heart-btn')).not.toBeNull();
  });

  it('should render a "Nuevo" badge for the first two products by default', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-product-card');
    expect(cards[0].querySelector('.q-product-card-new-badge')).not.toBeNull();
    expect(cards[1].querySelector('.q-product-card-new-badge')).not.toBeNull();
    expect(cards[2].querySelector('.q-product-card-new-badge')).toBeNull();
  });

  it('should not render a badge when product.isNew is explicitly false', () => {
    viewModel.setProducts([
      {
        id: 'p1',
        name: 'P1',
        seller: 'S',
        price: 1,
        currency: 'USD',
        rating: 4,
        ratingsCount: 1,
        isNew: false,
      },
    ]);
    const el = view.render();
    expect(el.querySelector('.q-product-card-new-badge')).toBeNull();
  });

  it('should render 5 star spans with .is-filled matching getStarsFilled', () => {
    const el = view.render();
    const card = el.querySelector('.q-product-card');
    const stars = card.querySelectorAll('.q-product-card-star');
    expect(stars.length).toBe(5);
    const filled = viewModel.getStarsFilled(viewModel.products[0]);
    stars.forEach((star, i) => {
      expect(star.classList.contains('is-filled')).toBe(filled[i]);
    });
  });

  it('should render the action button with getAddButtonLabel text', () => {
    const el = view.render();
    const btn = el.querySelector('button.q-product-card-action');
    expect(btn.textContent).toBe(viewModel.getAddButtonLabel());
  });

  it('should call viewModel.addToCart when the action button is clicked', () => {
    spyOn(viewModel, 'addToCart').and.returnValue(true);
    const el = view.render();
    el.querySelector('button.q-product-card-action').click();
    expect(viewModel.addToCart).toHaveBeenCalledTimes(1);
  });

  it('should render one heart button per card and clicking it does not propagate addToCart', () => {
    spyOn(viewModel, 'addToCart');
    const el = view.render();
    const hearts = el.querySelectorAll('.q-product-card-heart-btn');
    expect(hearts.length).toBe(8);
    hearts[0].click();
    expect(viewModel.addToCart).not.toHaveBeenCalled();
  });
});
