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

  it('render() with variant \'default\' produces outline CTA "Añadir al carrito"', () => {
    const cardView = new ProductCardView(
      { id: 'p1', name: 'Mochila', priceLabel: 'USD 50.00' },
      { variant: 'default' }
    );
    const el = cardView.render();

    expect(el.classList.contains('q-product-card--default')).toBe(true);
    const cta = el.querySelector('button.q-product-card-action');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toBe('Añadir al carrito');
    expect(cta.getAttribute('aria-label')).toBe('Añadir al carrito: Mochila');
  });

  it('render() with variant \'featured\' produces filled CTA "Añadir"', () => {
    const cardView = new ProductCardView(
      { id: 'p2', name: 'Aguayo', priceLabel: 'US$ 40.00' },
      { variant: 'featured' }
    );
    const el = cardView.render();

    expect(el.classList.contains('q-product-card--featured')).toBe(true);
    const cta = el.querySelector('button.q-product-card-action');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toBe('Añadir');
    expect(cta.getAttribute('aria-label')).toBe('Añadir: Aguayo');
  });

  it("variant 'featured' with isNew: true renders .q-product-card-new-badge", () => {
    const cardView = new ProductCardView(
      { id: 'p3', name: 'Café', isNew: true },
      { variant: 'featured' }
    );
    const el = cardView.render();

    const badge = el.querySelector('.q-product-card-new-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Nuevo');
  });

  it("variant 'featured' renders .q-product-card-heart-btn", () => {
    const cardView = new ProductCardView({ id: 'p4', name: 'Poncho' }, { variant: 'featured' });
    const el = cardView.render();

    const heart = el.querySelector('.q-product-card-heart-btn');
    expect(heart).not.toBeNull();
    expect(heart.getAttribute('aria-label')).toContain('Guardar Poncho en favoritos');
  });

  it("variant 'default' does NOT render heart or badge", () => {
    const cardView = new ProductCardView(
      { id: 'p5', name: 'Item', isNew: true },
      { variant: 'default' }
    );
    const el = cardView.render();

    expect(el.querySelector('.q-product-card-new-badge')).toBeNull();
    expect(el.querySelector('.q-product-card-heart-btn')).toBeNull();
  });

  it('clicking CTA calls onAddToCart with data.id', () => {
    const onAddToCart = jasmine.createSpy('onAddToCart');
    const cardView = new ProductCardView({ id: 'prod-cart-1', name: 'Item' }, { onAddToCart });
    const el = cardView.render();

    el.querySelector('button.q-product-card-action').click();
    expect(onAddToCart).toHaveBeenCalledWith('prod-cart-1');
  });

  it('clicking heart calls onToggleFavorite with data.id (featured only)', () => {
    const onToggleFavorite = jasmine.createSpy('onToggleFavorite');
    const cardView = new ProductCardView(
      { id: 'prod-fav-1', name: 'Item' },
      { variant: 'featured', onToggleFavorite }
    );
    const el = cardView.render();

    el.querySelector('.q-product-card-heart-btn').click();
    expect(onToggleFavorite).toHaveBeenCalledWith('prod-fav-1');
  });

  it('renders 5 stars, filled ones have .is-filled matching starsFilled array', () => {
    const cardView = new ProductCardView(
      {
        id: 'p6',
        name: 'Item',
        starsFilled: [true, true, true, false, false],
        ratingLabel: '3.0 (10)',
        ratingAccessible: 'Calificación 3.0 de 5, 10 reseñas',
      },
      { variant: 'featured' }
    );
    const el = cardView.render();

    const stars = el.querySelectorAll('.q-product-card-star');
    expect(stars.length).toBe(5);
    expect(stars[0].classList.contains('is-filled')).toBe(true);
    expect(stars[1].classList.contains('is-filled')).toBe(true);
    expect(stars[2].classList.contains('is-filled')).toBe(true);
    expect(stars[3].classList.contains('is-filled')).toBe(false);
    expect(stars[4].classList.contains('is-filled')).toBe(false);

    expect(el.querySelector('.q-product-card-rating-value').textContent).toBe('3.0 (10)');
    expect(el.querySelector('.q-sr-only').textContent).toBe('Calificación 3.0 de 5, 10 reseñas');
  });

  it('renders photo image when imageUrl is provided', () => {
    const cardView = new ProductCardView({
      id: 'p7',
      name: 'Item with photo',
      imageUrl: 'https://example.com/item.jpg',
    });
    const el = cardView.render();

    const photo = el.querySelector('.q-product-card-photo');
    expect(photo).not.toBeNull();
    expect(photo.getAttribute('src')).toBe('https://example.com/item.jpg');
    expect(el.querySelector('.q-product-card-mark')).toBeNull();
  });

  it('renders placeholder mark when imageUrl is null', () => {
    const cardView = new ProductCardView({
      id: 'p8',
      name: 'Item without photo',
      imageUrl: null,
    });
    const el = cardView.render();

    const mark = el.querySelector('.q-product-card-mark img');
    expect(mark).not.toBeNull();
    expect(mark.getAttribute('src')).toContain('placeholder-mark.svg');
    expect(el.querySelector('.q-product-card-photo')).toBeNull();
  });

  it('mounts into container and cleans up on destroy', () => {
    const cardView = new ProductCardView({ id: 'p9', name: 'Item' });
    cardView.mount(container);
    expect(container.querySelector('.q-product-card')).not.toBeNull();

    cardView.destroy();
    expect(container.querySelector('.q-product-card')).toBeNull();
    expect(cardView.element).toBeNull();
  });
});
