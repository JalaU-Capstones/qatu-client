import { RecommendationCardView } from './RecommendationCardView.js';

describe('RecommendationCardView', () => {
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

  const data = {
    id: 'p2',
    name: 'Huipil bordado',
    sellerLine: 'Telar Maya · Guatemala',
    ratingLabel: '4.9 (9)',
    priceLabel: 'US$ 65.00',
    imageUrl: null,
  };

  it('renders the image placeholder, name, price and detail link', () => {
    const card = new RecommendationCardView(data);
    const el = card.mount(container);

    expect(el.tagName.toLowerCase()).toBe('li');
    expect(el.classList.contains('q-recommendation-card')).toBe(true);
    expect(el.querySelector('.q-recommendation-card__image')).not.toBeNull();
    expect(el.querySelector('.q-recommendation-card__image-label').textContent).toBe(
      'Imagen del producto'
    );
    expect(el.querySelector('.q-recommendation-card__title-link').textContent).toBe(
      'Huipil bordado'
    );
    expect(el.querySelector('.q-recommendation-card__title-link').getAttribute('href')).toBe(
      '/products/p2'
    );
    expect(el.querySelector('.q-recommendation-card__seller').textContent).toBe(
      'Telar Maya · Guatemala'
    );
    expect(el.querySelector('.q-recommendation-card__rating').textContent).toBe('4.9 (9)');
    expect(el.querySelector('.q-recommendation-card__price').textContent).toBe('US$ 65.00');
    expect(el.querySelector('.q-recommendation-card__link').textContent).toBe('Ver detalle');
    expect(el.querySelector('.q-recommendation-card__link').getAttribute('href')).toBe(
      '/products/p2'
    );
  });

  it('uses an explicit detailHref when provided', () => {
    const card = new RecommendationCardView({ ...data, detailHref: '/products/custom' });
    const el = card.mount(container);

    expect(el.querySelector('.q-recommendation-card__link').getAttribute('href')).toBe(
      '/products/custom'
    );
  });

  it('renders an image when imageUrl is provided', () => {
    const card = new RecommendationCardView({
      ...data,
      imageUrl: 'https://example.com/product.jpg',
    });
    const el = card.mount(container);

    const img = el.querySelector('.q-recommendation-card__photo');
    expect(img).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('src')).toBe('https://example.com/product.jpg');
  });

  it('destroy removes the card from the DOM', () => {
    const card = new RecommendationCardView(data);
    card.mount(container);
    expect(container.querySelector('.q-recommendation-card')).not.toBeNull();

    card.destroy();
    expect(container.querySelector('.q-recommendation-card')).toBeNull();
  });
});
