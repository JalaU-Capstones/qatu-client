import { ProductCardView } from './ProductCardView.js';

describe('ProductCardView', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render product card container with .q-product-card without displaying product id', () => {
    const cardView = new ProductCardView({ id: 'uuid-12345', name: 'Mochila' });
    const el = cardView.render();

    expect(el.tagName.toLowerCase()).toBe('div');
    expect(el.classList.contains('q-product-card')).toBe(true);

    // Internal UUID must not be visible to the user in text content
    expect(el.textContent).not.toContain('uuid-12345');
  });

  it('should render an img when primary_image_path is provided', () => {
    const cardView = new ProductCardView({
      id: 'prod-1',
      name: 'Café de altura',
      primary_image_path: 'https://example.com/cafe.jpg',
    });
    const el = cardView.render();
    const imageContainer = el.querySelector('.q-product-card__image');
    expect(imageContainer).not.toBeNull();

    const img = imageContainer.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/cafe.jpg');
    expect(img.getAttribute('alt')).toBe('Café de altura');
    expect(imageContainer.querySelector('.q-product-card__placeholder')).toBeNull();
  });

  it('should render placeholder text "Sin imagen" when primary_image_path is missing or null', () => {
    const cardView = new ProductCardView({
      id: 'prod-2',
      name: 'Sin foto',
      primary_image_path: null,
    });
    const el = cardView.render();
    const imageContainer = el.querySelector('.q-product-card__image');
    expect(imageContainer).not.toBeNull();

    const img = imageContainer.querySelector('img');
    expect(img).toBeNull();

    const placeholder = imageContainer.querySelector('.q-product-card__placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toContain('Sin imagen');
  });

  it('should render product title and price formatted as `${currency} ${price.toFixed(2)}`', () => {
    const cardView = new ProductCardView({
      id: 'prod-3',
      name: 'Poncho de alpaca',
      price: 45.5,
      currency: 'USD',
    });
    const el = cardView.render();

    const title = el.querySelector('h3.q-product-card__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Poncho de alpaca');

    const price = el.querySelector('p.q-product-card__price');
    expect(price).not.toBeNull();
    expect(price.textContent).toBe('USD 45.50');
  });

  it('should render optional seller line when seller is provided', () => {
    const cardViewWithSeller = new ProductCardView({
      id: 'prod-4',
      name: 'Sombrero',
      price: 20,
      seller: 'Artesanías del Valle',
    });
    const elWithSeller = cardViewWithSeller.render();
    expect(elWithSeller.querySelector('p.q-product-card__seller').textContent).toBe(
      'Artesanías del Valle'
    );

    const cardViewWithoutSeller = new ProductCardView({
      id: 'prod-5',
      name: 'Cerámica',
      price: 15,
    });
    const elWithoutSeller = cardViewWithoutSeller.render();
    expect(elWithoutSeller.querySelector('p.q-product-card__seller')).toBeNull();
  });

  it('should render an "Agregar al carrito" action button with class q-product-card__action', () => {
    const cardView = new ProductCardView({
      id: 'prod-6',
      name: 'Chocolate',
      price: 6,
      currency: 'USD',
    });
    const el = cardView.render();

    const button = el.querySelector('button.q-product-card__action');
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Agregar al carrito');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should not contain any navigation links to detail page', () => {
    const cardView = new ProductCardView({
      id: 'prod-7',
      name: 'Test item',
      price: 10,
    });
    const el = cardView.render();
    expect(el.querySelector('a')).toBeNull();
  });

  it('should mount into container and clean up on destroy', () => {
    const cardView = new ProductCardView({ id: 'prod-8', name: 'Item' });
    cardView.mount(container);
    expect(container.querySelector('.q-product-card')).not.toBeNull();

    cardView.destroy();
    expect(container.querySelector('.q-product-card')).toBeNull();
    expect(cardView.element).toBeNull();
  });
});
