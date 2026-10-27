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

  it('render() with variant \'default\' produces outline CTA "Añadir"', () => {
    const cardView = new ProductCardView(
      { id: 'p1', name: 'Mochila', priceLabel: 'USD 50.00' },
      { variant: 'default' }
    );
    const el = cardView.render();

    expect(el.classList.contains('q-product-card--default')).toBe(true);
    const cta = el.querySelector('button.q-product-card-action');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toBe('Añadir');
    expect(cta.getAttribute('aria-label')).toBe('Añadir: Mochila');
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

  it('render() with variant \'default\' CTA text is "Añadir"', () => {
    const cardView = new ProductCardView({ id: 'cta-d', name: 'Sombrero' }, { variant: 'default' });
    const el = cardView.render();
    expect(el.querySelector('button.q-product-card-action').textContent).toBe('Añadir');
  });

  it('render() with variant \'featured\' CTA text is "Añadir"', () => {
    const cardView = new ProductCardView({ id: 'cta-f', name: 'Poncho' }, { variant: 'featured' });
    const el = cardView.render();
    expect(el.querySelector('button.q-product-card-action').textContent).toBe('Añadir');
  });

  it('_renderImage renders placeholder immediately when imageUrl is null', () => {
    const cardView = new ProductCardView({ id: 'img-null', name: 'Item', imageUrl: null });
    const el = cardView.render();
    expect(el.querySelector('.q-product-card-photo')).toBeNull();
    expect(el.querySelector('.q-product-card-mark')).not.toBeNull();
    expect(el.querySelector('.q-product-card-image-label')).not.toBeNull();
    expect(el.querySelector('.q-product-card-image-label').textContent).toBe('Imagen del producto');
  });

  it('_renderImage renders placeholder when imageUrl fails to load', () => {
    const cardView = new ProductCardView({
      id: 'img-err',
      name: 'Item',
      imageUrl: 'https://invalid-url.example/x.jpg',
    });
    const el = cardView.render();
    const img = el.querySelector('.q-product-card-photo');
    expect(img).not.toBeNull();
    // Trigger the error event synchronously
    img.dispatchEvent(new Event('error'));
    // After error, the img should be removed and placeholder present
    expect(el.querySelector('.q-product-card-photo')).toBeNull();
    expect(el.querySelector('.q-product-card-mark')).not.toBeNull();
    expect(el.querySelector('.q-product-card-image-label')).not.toBeNull();
  });

  it('mounts into container and cleans up on destroy', () => {
    const cardView = new ProductCardView({ id: 'p9', name: 'Item' });
    cardView.mount(container);
    expect(container.querySelector('.q-product-card')).not.toBeNull();

    cardView.destroy();
    expect(container.querySelector('.q-product-card')).toBeNull();
    expect(cardView.element).toBeNull();
  });

  describe('state machine', () => {
    it('renders "Añadir" button in idle state by default', () => {
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      expect(btn.textContent).toBe('Añadir');
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('is-disabled')).toBe(false);
    });

    it('renders "Sin stock" disabled button when stock is 0', () => {
      const cardView = new ProductCardView({ id: 'p1', name: 'Item', stock: 0 });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      expect(btn.textContent).toBe('Sin stock');
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('is-disabled')).toBe(true);
      expect(btn.getAttribute('aria-label')).toBe('Sin stock: Item');
    });

    it('renders "Sin stock" disabled button when stock is negative', () => {
      const cardView = new ProductCardView({ id: 'p1', name: 'Item', stock: -1 });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      expect(btn.textContent).toBe('Sin stock');
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('is-disabled')).toBe(true);
    });

    it('renders "No disponible" disabled button when state is not "published"', () => {
      const cardView = new ProductCardView({ id: 'p1', name: 'Item', state: 'draft' });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      expect(btn.textContent).toBe('No disponible');
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('is-disabled')).toBe(true);
      expect(btn.getAttribute('aria-label')).toBe('No disponible: Item');
    });

    it('does NOT call onAddToCart when button is clicked and stock is 0', () => {
      const onAddToCart = jasmine.createSpy('onAddToCart');
      const cardView = new ProductCardView({ id: 'p1', name: 'Item', stock: 0 }, { onAddToCart });
      const el = cardView.render();
      el.querySelector('button.q-product-card-action').click();
      expect(onAddToCart).not.toHaveBeenCalled();
    });

    it('clicking the button sets is-loading class and text "Añadiendo…"', () => {
      let resolvePromise;
      const onAddToCart = () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        });
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      btn.click();
      expect(btn.classList.contains('is-loading')).toBe(true);
      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toBe('Añadiendo…');
      resolvePromise({ status: 'added' });
    });

    it('successful result sets is-success class and text "✓ Añadido"', async () => {
      const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      btn.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(btn.classList.contains('is-success')).toBe(true);
      expect(btn.textContent).toBe('✓ Añadido');
      expect(btn.disabled).toBe(false);
    });

    it('success state reverts to idle after 1500ms', async () => {
      jasmine.clock().install();
      try {
        const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
        const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
        const el = cardView.render();
        const btn = el.querySelector('button.q-product-card-action');
        btn.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(btn.classList.contains('is-success')).toBe(true);

        jasmine.clock().tick(1500);
        expect(btn.classList.contains('is-success')).toBe(false);
        expect(btn.textContent).toBe('Añadir');
        expect(btn.disabled).toBe(false);
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('auth-required result sets is-success (flash) before reverting', async () => {
      const onAddToCart = jasmine
        .createSpy('onAddToCart')
        .and.resolveTo({ status: 'auth-required' });
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      btn.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(btn.classList.contains('is-success')).toBe(true);
      expect(btn.textContent).toBe('✓ Añadido');
    });

    it('error result sets is-error class and renders .q-product-card-error with the message', async () => {
      const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({
        status: 'error',
        error: new Error('Sin conexión'),
      });
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      btn.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(btn.classList.contains('is-error')).toBe(true);
      expect(btn.textContent).toBe('Añadir');
      const errEl = el.querySelector('.q-product-card-error');
      expect(errEl).not.toBeNull();
      expect(errEl.textContent).toBe('Sin conexión');
      expect(errEl.getAttribute('role')).toBe('alert');
    });

    it('destroy() clears the success timer', async () => {
      spyOn(window, 'clearTimeout').and.callThrough();
      const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
      cardView.render();
      cardView._actionBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(cardView._successTimer).not.toBeNull();

      cardView.destroy();
      expect(window.clearTimeout).toHaveBeenCalled();
      expect(cardView._successTimer).toBeNull();
    });

    it('clicking while loading is a no-op (does not double-fire)', () => {
      let resolvePromise;
      const onAddToCart = jasmine.createSpy('onAddToCart').and.returnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );
      const cardView = new ProductCardView({ id: 'p1', name: 'Item' }, { onAddToCart });
      const el = cardView.render();
      const btn = el.querySelector('button.q-product-card-action');
      btn.click();
      btn.click();
      expect(onAddToCart).toHaveBeenCalledTimes(1);
      resolvePromise({ status: 'added' });
    });
  });
});
