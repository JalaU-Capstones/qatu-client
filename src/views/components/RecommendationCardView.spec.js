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
    const placeholder = el.querySelector('.q-recommendation-card__placeholder-img');
    expect(placeholder).not.toBeNull();
    expect(placeholder.getAttribute('src')).toContain('product-placeholder.svg');
    expect(placeholder.alt).toBe('Huipil bordado');
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
    expect(img.getAttribute('alt')).toBe('Huipil bordado');
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('RecommendationCardView additional branches (recovered 1)', () => {
      let container;
      let view = null;

      const data = {
        id: 'p2',
        name: 'Huipil bordado',
        sellerLine: 'Telar Maya · Guatemala',
        ratingLabel: '4.9 (9)',
        priceLabel: 'US$ 65.00',
        imageUrl: null,
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        view?.destroy();
        container.remove();
      });

      it('caches render output, exposes dataset.productId and the same mounted node', () => {
        // The view keeps data by reference; use a copy so the mutation below cannot
        // leak into other specs sharing the module-level `data` object.
        view = new RecommendationCardView({ ...data });
        const first = view.render();

        expect(first).toBe(view.render());
        expect(first).toBe(view.mount(container));
        expect(first.dataset.productId).toBe('p2');
        expect(container.querySelectorAll('.q-recommendation-card').length).toBe(1);

        const before = first.querySelector('.q-recommendation-card__title-link').textContent;
        view.data.name = 'Otro nombre';
        expect(view.render().querySelector('.q-recommendation-card__title-link').textContent).toBe(
          before
        );
      });

      it('omits seller and rating paragraphs when their labels are missing', () => {
        view = new RecommendationCardView({
          ...data,
          sellerLine: '',
          ratingLabel: undefined,
        });
        const element = view.render();

        expect(element.querySelector('.q-recommendation-card__seller')).toBeNull();
        expect(element.querySelector('.q-recommendation-card__rating')).toBeNull();
        expect(element.querySelector('.q-recommendation-card__price').textContent).toBe(
          'US$ 65.00'
        );
      });

      it('uses generic alt and aria labels and empty price text for a missing name', () => {
        view = new RecommendationCardView({ ...data, name: '', priceLabel: '' });
        const element = view.render();

        expect(element.querySelector('.q-recommendation-card__title-link').textContent).toBe('');
        expect(
          element.querySelector('.q-recommendation-card__link').getAttribute('aria-label')
        ).toBe('Ver detalle de producto');
        expect(element.querySelector('.q-recommendation-card__placeholder-img').alt).toBe(
          'Imagen del producto'
        );
        expect(element.querySelector('.q-recommendation-card__price').textContent).toBe('');
      });

      it('routes both links through detailHref or the default product path', () => {
        view = new RecommendationCardView({ ...data, detailHref: '/products/custom?src=similar' });
        let element = view.render();
        let titleLink = element.querySelector('.q-recommendation-card__title-link');
        let detailLink = element.querySelector('.q-recommendation-card__link');

        expect(titleLink.getAttribute('href')).toBe('/products/custom?src=similar');
        expect(detailLink.getAttribute('href')).toBe('/products/custom?src=similar');
        expect(titleLink.dataset.route).toBe('');
        expect(detailLink.dataset.route).toBe('');
        view.destroy();

        view = new RecommendationCardView({ ...data, detailHref: '' });
        element = view.render();
        titleLink = element.querySelector('.q-recommendation-card__title-link');
        detailLink = element.querySelector('.q-recommendation-card__link');

        expect(titleLink.getAttribute('href')).toBe('/products/p2');
        expect(detailLink.getAttribute('href')).toBe('/products/p2');
        expect(titleLink.dataset.route).toBe('');
        expect(detailLink.dataset.route).toBe('');
      });

      it('characterizes a missing id as the literal /products/undefined path', () => {
        view = new RecommendationCardView({ name: 'Sin id' });
        const element = view.render();

        expect(element.dataset.productId).toBe('undefined');
        expect(
          element.querySelector('.q-recommendation-card__title-link').getAttribute('href')
        ).toBe('/products/undefined');
        expect(element.querySelector('.q-recommendation-card__link').getAttribute('href')).toBe(
          '/products/undefined'
        );
      });

      it('replaces a failed photo with the configured placeholder in the mounted card', () => {
        view = new RecommendationCardView({
          ...data,
          imageUrl: 'https://example.test/photo.jpg',
        });
        const element = view.mount(container);
        const photo = element.querySelector('.q-recommendation-card__photo');
        expect(photo).not.toBeNull();

        photo.dispatchEvent(new Event('error'));

        expect(element.querySelector('.q-recommendation-card__photo')).toBeNull();
        const placeholder = element.querySelector('.q-recommendation-card__placeholder-img');
        expect(placeholder).not.toBeNull();
        expect(placeholder.getAttribute('src')).toContain('product-placeholder.svg');
        // createImageWithFallback uses placeholderAlt from this.data.name at render time.
        expect(placeholder.alt).toBe('Huipil bordado');
        expect(element.querySelector('.q-recommendation-card__image').children.length).toBe(1);
      });

      it('destroy is safe detached and twice and allows a fresh render', () => {
        view = new RecommendationCardView(data);
        const first = view.render();

        view.destroy();
        expect(view.element).toBeNull();
        expect(() => view.destroy()).not.toThrow();

        const second = view.render();
        expect(second).not.toBe(first);
        expect(view.mount(container)).toBe(second);
        view.destroy();
        expect(container.querySelector('.q-recommendation-card')).toBeNull();

        const untouched = new RecommendationCardView(data);
        expect(() => untouched.destroy()).not.toThrow();
        view = untouched;
      });
    });
  })();
})();
