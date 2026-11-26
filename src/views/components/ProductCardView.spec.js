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
    expect(photo.alt).toBe('Item with photo');
  });

  it('renders the polygon placeholder image when imageUrl is null', () => {
    const cardView = new ProductCardView({
      id: 'p8',
      name: 'Item without photo',
      imageUrl: null,
    });
    const el = cardView.render();

    const placeholder = el.querySelector('.q-product-card-placeholder-img');
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains('product-card__image--placeholder')).toBe(true);
    expect(placeholder.getAttribute('src')).toContain('product-placeholder.svg');
    expect(placeholder.alt).toBe('Item without photo');
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
    const cardView = new ProductCardView({ id: 'img-null', name: '', imageUrl: null });
    const el = cardView.render();
    const placeholder = el.querySelector('.q-product-card-placeholder-img');

    expect(placeholder).not.toBeNull();
    expect(placeholder.getAttribute('src')).toContain('product-placeholder.svg');
    expect(placeholder.alt).toBe('Imagen del producto');
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
    // The failed photo is replaced by the polygon placeholder image.
    expect(el.querySelector('.q-product-card-photo')).toBeNull();
    const placeholder = el.querySelector('.q-product-card-placeholder-img');
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains('product-card__image--placeholder')).toBe(true);
    expect(placeholder.getAttribute('src')).toContain('product-placeholder.svg');
    expect(placeholder.alt).toBe('Item');
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

  // ─── hideCartButton option (C5) ──────────────────────────────────────────

  describe('hideCartButton option', () => {
    it('hideCartButton: true → no "Añadir" button in DOM', () => {
      const cardView = new ProductCardView(
        { id: 'p1', name: 'Mi Producto' },
        { hideCartButton: true }
      );
      const el = cardView.render();
      expect(el.querySelector('[aria-label^="Añadir"]')).toBeNull();
      expect(el.querySelector('button.q-product-card-action')).toBeNull();
    });

    it('hideCartButton: false (default) → "Añadir" button present (regression)', () => {
      const cardView = new ProductCardView(
        { id: 'p1', name: 'Otro Producto' },
        { hideCartButton: false }
      );
      const el = cardView.render();
      expect(el.querySelector('button.q-product-card-action')).not.toBeNull();
    });

    it('hideCartButton: true + onAddToCart provided → still no button (option wins)', () => {
      const onAddToCart = jasmine.createSpy('onAddToCart');
      const cardView = new ProductCardView(
        { id: 'p1', name: 'Mi Producto' },
        { hideCartButton: true, onAddToCart }
      );
      const el = cardView.render();
      expect(el.querySelector('button.q-product-card-action')).toBeNull();
      expect(onAddToCart).not.toHaveBeenCalled();
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('ProductCardView (recovered 1)', () => {
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

    it('render() with variant \'default\' CTA text is "Añadir"', () => {
      const cardView = new ProductCardView(
        { id: 'cta-d', name: 'Sombrero' },
        { variant: 'default' }
      );
      const el = cardView.render();
      expect(el.querySelector('button.q-product-card-action').textContent).toBe('Añadir');
    });

    it('render() with variant \'featured\' CTA text is "Añadir"', () => {
      const cardView = new ProductCardView(
        { id: 'cta-f', name: 'Poncho' },
        { variant: 'featured' }
      );
      const el = cardView.render();
      expect(el.querySelector('button.q-product-card-action').textContent).toBe('Añadir');
    });

    describe('state machine (recovered 2)', () => {
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
    });

    // ─── hideCartButton option (C5) ──────────────────────────────────────────

    describe('hideCartButton option (recovered 3)', () => {
      it('hideCartButton: true → no "Añadir" button in DOM', () => {
        const cardView = new ProductCardView(
          { id: 'p1', name: 'Mi Producto' },
          { hideCartButton: true }
        );
        const el = cardView.render();
        expect(el.querySelector('[aria-label^="Añadir"]')).toBeNull();
        expect(el.querySelector('button.q-product-card-action')).toBeNull();
      });

      it('hideCartButton: false (default) → "Añadir" button present (regression)', () => {
        const cardView = new ProductCardView(
          { id: 'p1', name: 'Otro Producto' },
          { hideCartButton: false }
        );
        const el = cardView.render();
        expect(el.querySelector('button.q-product-card-action')).not.toBeNull();
      });
    });
  });

  (() => {
    describe('ProductCardView additional branches (recovered 4)', () => {
      let container;
      let view = null;

      const settle = async () => {
        await Promise.resolve();
        await Promise.resolve();
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        view?.destroy();
        container.remove();
      });

      it('caches render output, exposes data.id and keeps unknown variant classes verbatim', () => {
        view = new ProductCardView({ id: 'p42', name: 'Item' }, { variant: 'bogus' });
        const first = view.render();

        expect(first).toBe(view.render());
        expect(first.tagName.toLowerCase()).toBe('li');
        expect(first.className).toBe('q-product-card q-product-card--bogus');
        expect(first.dataset.productId).toBe('p42');
        expect(view.mount(container)).toBe(first);
        expect(container.querySelectorAll('.q-product-card').length).toBe(1);
      });

      it('renders a routed title link when detailHref is set and plain text otherwise', () => {
        view = new ProductCardView(
          { id: 'p', name: 'Mochila' },
          { detailHref: '/products/mochila?ref=card' }
        );
        const linked = view.render();
        const titleLink = linked.querySelector('.q-product-card-title-link');

        expect(titleLink.getAttribute('href')).toBe('/products/mochila?ref=card');
        expect(titleLink.dataset.route).toBe('');
        expect(titleLink.textContent).toBe('Mochila');
        expect(linked.querySelector('h3.q-product-card-title').textContent).toBe('Mochila');
        view.destroy();

        view = new ProductCardView({ id: 'p2', name: 'Sin enlace' });
        const plain = view.render();
        expect(plain.querySelector('.q-product-card-title-link')).toBeNull();
        expect(plain.querySelector('h3.q-product-card-title').textContent).toBe('Sin enlace');
      });

      it('derives catalog badges with badgeLabel precedence and lowercased aria-labels', () => {
        const cases = [
          [{ badgeLabel: 'Envío gratis', stock: 0 }, 'Envío gratis', 'Producto: envío gratis'],
          [{ stock: 0 }, 'Agotado', 'Producto: agotado'],
          [{ isNew: true }, 'Nuevo', 'Producto: nuevo'],
        ];

        cases.forEach(([extra, text, ariaLabel]) => {
          view = new ProductCardView(
            { id: 'p', name: 'Item', ...extra },
            { showCatalogActions: true }
          );
          const badge = view.render().querySelector('.q-product-card-new-badge');
          expect(badge.textContent).toBe(text);
          expect(badge.getAttribute('aria-label')).toBe(ariaLabel);
          view.destroy();
        });

        view = new ProductCardView(
          { id: 'p', name: 'Item', badgeLabel: '', isNew: true, stock: 0 },
          { variant: 'featured' }
        );
        expect(view.render().querySelector('.q-product-card-new-badge').textContent).toBe('Nuevo');
        view.destroy();

        view = new ProductCardView(
          { id: 'p', name: 'Item', badgeLabel: 'Destacado' },
          { variant: 'featured', showCatalogActions: true }
        );
        const override = view.render().querySelector('.q-product-card-new-badge');
        expect(override.textContent).toBe('Destacado');
        expect(override.getAttribute('aria-label')).toBe('Producto: destacado');
        view.destroy();

        view = new ProductCardView({ id: 'p', name: 'Item', stock: 0 }, { variant: 'featured' });
        expect(view.render().querySelector('.q-product-card-new-badge')).toBeNull();
      });

      it('throws when a truthy badgeLabel is not a string', () => {
        view = new ProductCardView(
          { id: 'p', name: 'Item', badgeLabel: 42 },
          { showCatalogActions: true }
        );

        expect(() => view.render()).toThrowError(TypeError);
        expect(view.element).toBeNull();
      });

      it('toggles a catalog heart twice with preventDefault and stopPropagation', () => {
        const onToggleFavorite = jasmine.createSpy('onToggleFavorite');
        view = new ProductCardView(
          { id: 'p', name: 'Poncho' },
          { showCatalogActions: true, onToggleFavorite }
        );
        const element = view.mount(container);
        const media = element.querySelector('.q-product-card-media');
        const parentClick = jasmine.createSpy('parentClick');
        media.addEventListener('click', parentClick);
        const heart = element.querySelector('.q-product-card-heart-btn');

        expect(heart.type).toBe('button');
        expect(heart.getAttribute('aria-pressed')).toBe('false');
        expect(heart.getAttribute('aria-label')).toBe('Guardar Poncho en favoritos');

        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        heart.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(parentClick).not.toHaveBeenCalled();
        expect(heart.getAttribute('aria-pressed')).toBe('true');
        expect(heart.classList.contains('is-saved')).toBe(true);
        expect(heart.getAttribute('aria-label')).toBe('Quitar de favoritos Poncho en favoritos');

        heart.click();
        expect(heart.getAttribute('aria-pressed')).toBe('false');
        expect(heart.classList.contains('is-saved')).toBe(false);
        expect(heart.getAttribute('aria-label')).toBe('Guardar Poncho en favoritos');
        expect(onToggleFavorite).toHaveBeenCalledTimes(2);
        expect(onToggleFavorite).toHaveBeenCalledWith('p');
      });

      it('omits the rating when the label is missing and defaults stars and accessible text', () => {
        view = new ProductCardView({
          id: 'p',
          name: 'Item',
          ratingAccessible: 'Calificación 5',
          starsFilled: [true, true, true, true, true],
        });
        expect(view.render().querySelector('.q-product-card-rating')).toBeNull();
        view.destroy();

        view = new ProductCardView({ id: 'p', name: 'Item', ratingLabel: '4.0' });
        const element = view.render();
        const stars = element.querySelectorAll('.q-product-card-star');

        expect(stars.length).toBe(5);
        expect(Array.from(stars).every((star) => !star.classList.contains('is-filled'))).toBe(true);
        expect(element.querySelector('.q-product-card-stars').getAttribute('aria-hidden')).toBe(
          'true'
        );
        expect(element.querySelector('.q-product-card-rating-value').textContent).toBe('4.0');
        expect(element.querySelector('.q-sr-only').textContent).toBe('');
        view.destroy();

        view = new ProductCardView({ id: 'p', name: 'Item', ratingLabel: '4.0', starsFilled: [] });
        expect(view.render().querySelectorAll('.q-product-card-star').length).toBe(0);
      });

      it('renders exact seller and price labels, including an empty price paragraph', () => {
        view = new ProductCardView({
          id: 'p',
          name: 'Item',
          sellerLine: 'Tienda · País',
          priceLabel: 'US$ 12.50',
        });
        let element = view.render();
        expect(element.querySelector('.q-product-card-seller').textContent).toBe('Tienda · País');
        expect(element.querySelector('.q-product-card-price').textContent).toBe('US$ 12.50');
        view.destroy();

        view = new ProductCardView({ id: 'p', name: 'Item', priceLabel: '' });
        element = view.render();
        expect(element.querySelector('.q-product-card-seller')).toBeNull();
        const price = element.querySelector('.q-product-card-price');
        expect(price).not.toBeNull();
        expect(price.textContent).toBe('');
      });

      it('applies disabled precedence for draft states, numeric stock and string stock', () => {
        const cases = [
          [{ state: 'draft', stock: 0 }, 'No disponible', 'No disponible: Item'],
          [{ state: 'published', stock: 0 }, 'Sin stock', 'Sin stock: Item'],
          [{ state: 'published', stock: '0' }, 'Añadir', 'Añadir: Item'],
          [{ state: '', stock: -2 }, 'Sin stock', 'Sin stock: Item'],
          [{ state: 'published', stock: null }, 'Añadir', 'Añadir: Item'],
          [{ state: 'archived' }, 'No disponible', 'No disponible: Item'],
        ];

        cases.forEach(([extra, text, ariaLabel]) => {
          view = new ProductCardView({ id: 'p', name: 'Item', ...extra });
          const button = view.render().querySelector('.q-product-card-action');
          expect(button.textContent).toBe(text);
          expect(button.getAttribute('aria-label')).toBe(ariaLabel);
          expect(button.disabled).toBe(text !== 'Añadir');
          expect(button.classList.contains('is-disabled')).toBe(text !== 'Añadir');
          view.destroy();
        });
      });

      it('clicking the action without onAddToCart is a no-op', () => {
        view = new ProductCardView({ id: 'p', name: 'Item' });
        const button = view.render().querySelector('.q-product-card-action');

        expect(() => button.click()).not.toThrow();
        expect(view._status).toBe('idle');
        expect(button.textContent).toBe('Añadir');
        expect(button.disabled).toBe(false);
      });

      it('turns a synchronous throw from onAddToCart into the error state', async () => {
        const onAddToCart = jasmine.createSpy('onAddToCart').and.callFake(() => {
          throw new Error('Boom');
        });
        view = new ProductCardView({ id: 'p', name: 'Item' }, { onAddToCart });
        const element = view.render();
        const button = element.querySelector('button.q-product-card-action');

        button.click();
        await settle();
        expect(button.classList.contains('is-error')).toBe(true);
        expect(button.textContent).toBe('Añadir');
        expect(element.querySelector('.q-product-card-error').textContent).toBe('Boom');
      });

      it('turns a rejected onAddToCart promise into the error state', async () => {
        const onAddToCart = jasmine
          .createSpy('onAddToCart')
          .and.rejectWith(new Error('Sin conexión'));
        view = new ProductCardView({ id: 'p', name: 'Item' }, { onAddToCart });
        const element = view.render();
        const button = element.querySelector('button.q-product-card-action');

        button.click();
        await settle();
        expect(button.classList.contains('is-error')).toBe(true);
        expect(element.querySelector('.q-product-card-error').textContent).toBe('Sin conexión');
      });

      it('uses the default error message for undefined and unrecognized results', async () => {
        for (const result of [undefined, {}, { status: 'unknown' }, { status: 'error' }]) {
          view = new ProductCardView(
            { id: 'p', name: 'Item' },
            { onAddToCart: jasmine.createSpy('onAddToCart').and.resolveTo(result) }
          );
          const element = view.render();
          element.querySelector('button.q-product-card-action').click();
          await settle();

          const error = element.querySelector('.q-product-card-error');
          expect(error).not.toBeNull();
          expect(error.textContent).toBe('No se pudo añadir');
          view.destroy();
        }
      });

      it('reuses one error element across failures and keeps it after a later success', async () => {
        const onAddToCart = jasmine.createSpy('onAddToCart');
        view = new ProductCardView({ id: 'p', name: 'Item' }, { onAddToCart });
        const element = view.render();
        const button = element.querySelector('button.q-product-card-action');

        onAddToCart.and.resolveTo({ status: 'error', error: new Error('Uno') });
        button.click();
        await settle();
        expect(element.querySelectorAll('.q-product-card-error').length).toBe(1);
        expect(element.querySelector('.q-product-card-error').textContent).toBe('Uno');

        onAddToCart.and.resolveTo({ status: 'error', error: new Error('Dos') });
        button.click();
        await settle();
        expect(element.querySelectorAll('.q-product-card-error').length).toBe(1);
        expect(element.querySelector('.q-product-card-error').textContent).toBe('Dos');

        onAddToCart.and.resolveTo({ status: 'added' });
        button.click();
        await settle();
        expect(element.querySelector('.q-product-card-error').textContent).toBe('Dos');
      });

      it('_setStatus("idle") removes every state class and restores the idle label', () => {
        view = new ProductCardView({ id: 'p', name: 'Item', stock: 0 });
        const button = view.render().querySelector('.q-product-card-action');
        expect(button.classList.contains('is-disabled')).toBe(true);

        view._setStatus('loading');
        expect(button.classList.contains('is-loading')).toBe(true);
        view._setStatus('success');
        expect(button.classList.contains('is-success')).toBe(true);
        view._setStatus('error');
        expect(button.classList.contains('is-error')).toBe(true);

        view._setStatus('idle');
        expect(view._status).toBe('idle');
        expect(button.disabled).toBe(false);
        expect(button.textContent).toBe('Añadir');
        for (const className of ['is-loading', 'is-success', 'is-error', 'is-disabled']) {
          expect(button.classList.contains(className)).toBe(false);
        }
      });

      it('destroy nulls cached refs, is safe detached and twice, and allows re-rendering', () => {
        view = new ProductCardView({ id: 'p', name: 'Item' });
        const first = view.render();
        expect(view._actionBtn).not.toBeNull();

        view.destroy();
        expect(view.element).toBeNull();
        expect(view._actionBtn).toBeNull();
        expect(() => view.destroy()).not.toThrow();

        const second = view.render();
        expect(second).not.toBe(first);
        expect(view._actionBtn).not.toBeNull();
        view.mount(container);
        expect(container.querySelector('.q-product-card')).toBe(second);
        view.destroy();
        expect(container.querySelector('.q-product-card')).toBeNull();
      });

      it('characterizes _status surviving destroy and re-render with changed data', () => {
        const onAddToCart = jasmine.createSpy('onAddToCart');
        view = new ProductCardView({ id: 'p', name: 'Item', stock: 0 }, { onAddToCart });
        view.render();
        expect(view._status).toBe('disabled');

        view.destroy();
        view.data.stock = 2;
        const button = view.render().querySelector('.q-product-card-action');
        expect(button.disabled).toBe(false);
        expect(view._status).toBe('disabled');

        button.click();
        expect(onAddToCart).not.toHaveBeenCalled();
      });

      describe('success timers (recovered 5)', () => {
        beforeEach(() => {
          jasmine.clock().install();
        });

        afterEach(() => {
          jasmine.clock().uninstall();
        });

        it('two rapid successes clear the first timer and share the final revert', async () => {
          const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
          view = new ProductCardView({ id: 'p', name: 'Item' }, { onAddToCart });
          const button = view.render().querySelector('button.q-product-card-action');

          button.click();
          await settle();
          const firstTimer = view._successTimer;
          expect(firstTimer).not.toBeNull();

          button.click();
          await settle();
          expect(view._successTimer).not.toBe(firstTimer);

          jasmine.clock().tick(1500);
          expect(button.classList.contains('is-success')).toBe(false);
          expect(button.textContent).toBe('Añadir');
          expect(button.disabled).toBe(false);
          expect(view._successTimer).toBeNull();
          expect(onAddToCart).toHaveBeenCalledTimes(2);
        });

        it('auth-required flashes success and reverts to idle after 1500ms', async () => {
          const onAddToCart = jasmine
            .createSpy('onAddToCart')
            .and.resolveTo({ status: 'auth-required' });
          view = new ProductCardView({ id: 'p', name: 'Item' }, { onAddToCart });
          const button = view.render().querySelector('button.q-product-card-action');

          button.click();
          await settle();
          expect(button.classList.contains('is-success')).toBe(true);
          expect(button.textContent).toBe('✓ Añadido');

          jasmine.clock().tick(1499);
          expect(button.classList.contains('is-success')).toBe(true);
          jasmine.clock().tick(1);
          expect(button.classList.contains('is-success')).toBe(false);
          expect(button.textContent).toBe('Añadir');
          expect(view._successTimer).toBeNull();
        });
      });
    });
  })();
})();
