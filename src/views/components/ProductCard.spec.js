import { ProductCard } from './ProductCard.js';

describe('ProductCard', () => {
  const product = {
    id: 'product-1',
    slug: 'woven-bag',
    name: 'Woven bag',
    price: 42.5,
    currency: 'USD',
    stock: 5,
    average_rating: 4.5,
    ratings_count: 12,
    category: { name: 'Accessories' },
    images: [{ url: 'https://example.test/bag.jpg' }],
  };

  it('renders title, formatted price, category, and rating', () => {
    const card = new ProductCard({ product }).render();

    expect(card.querySelector('h3').textContent).toBe('Woven bag');
    expect(card.textContent).toContain('US$ 42.50');
    expect(card.textContent).toContain('Accessories');
    expect(card.querySelector('.product-card__rating').textContent).toContain('4.5');
    expect(card.querySelector('.product-card__rating').textContent).toContain('12');
  });

  it('renders the featured product layout with seller origin, status, wishlist, and compact cart action', () => {
    const card = new ProductCard({
      product: {
        ...product,
        seller: { full_name: 'Tejidos Illimani', country: 'Bolivia' },
        is_best_seller: true,
      },
      variant: 'featured',
    }).render();

    expect(card.classList.contains('product-card--featured')).toBe(true);
    expect(card.querySelector('.product-card__category').textContent).toBe(
      'Tejidos Illimani · Bolivia'
    );
    expect(card.querySelector('.product-card__status-pill').textContent).toBe('Más vendido');
    expect(card.querySelector('.product-card__favorite')).not.toBeNull();
    expect(card.querySelector('.product-card__footer .product-card__price').textContent).toBe(
      'US$ 42.50'
    );
    expect(card.querySelector('.product-card__add-button').textContent).toBe('');
    expect(card.querySelector('.product-card__add-button').classList.contains('is-fullwidth')).toBe(
      false
    );
  });

  it('toggles the featured wishlist button state', () => {
    const card = new ProductCard({ product, variant: 'featured' }).render();
    const favorite = card.querySelector('.product-card__favorite');

    favorite.click();
    expect(favorite.getAttribute('aria-pressed')).toBe('true');
    expect(favorite.classList.contains('is-saved')).toBe(true);
  });

  it('uses the default Bolivian currency when no currency is supplied', () => {
    const card = new ProductCard({ product: { name: 'Bag', price: 2 } }).render();

    expect(card.querySelector('.product-card__price').textContent).toBe('Bs 2.00');
  });

  it('hides the rating block when there is no average rating', () => {
    const card = new ProductCard({ product: { ...product, average_rating: undefined } }).render();

    expect(card.querySelector('.product-card__rating')).toBeNull();
  });

  it('uses the SVG placeholder when the product has no images', () => {
    const card = new ProductCard({ product: { ...product, images: [] } }).render();
    const image = card.querySelector('img');

    expect(image.src).toContain('product-placeholder.svg');
    expect(image.classList.contains('product-card__image--placeholder')).toBe(true);
    expect(image.alt).toBe('Woven bag');
  });

  it('prioritizes primary_image_path over gallery images for home and catalog cards', () => {
    ['featured', 'default', 'compact'].forEach((variant) => {
      const card = new ProductCard({
        product: {
          ...product,
          primary_image_path: 'https://cdn.example.test/primary.jpg',
        },
        variant,
      }).render();

      expect(card.querySelector('img').src).toBe('https://cdn.example.test/primary.jpg');
    });
  });

  it('falls back to the first gallery URL when primary_image_path is empty', () => {
    const card = new ProductCard({
      product: { ...product, primary_image_path: '  ' },
    }).render();

    expect(card.querySelector('img').src).toBe('https://example.test/bag.jpg');
  });

  it('resolves a relative primary image path against the API origin', () => {
    const card = new ProductCard({
      product: { ...product, primary_image_path: 'product-images/item/main.jpg' },
    }).render();

    expect(card.querySelector('img').src).toContain('/product-images/item/main.jpg');
    expect(card.querySelector('img').src).toMatch(/^https?:\/\//);
  });

  it('uses the product placeholder when the selected image fails to load', () => {
    const card = new ProductCard({
      product: { ...product, primary_image_path: 'https://cdn.example.test/missing.jpg' },
    }).render();
    const image = card.querySelector('img');

    image.dispatchEvent(new Event('error'));

    expect(image.src).toContain('product-placeholder.svg');
    expect(image.classList.contains('product-card__image--placeholder')).toBe(true);
  });

  it('uses a generic alt label when the product name is empty', () => {
    const card = new ProductCard({ product: { images: [] } }).render();

    expect(card.querySelector('img').alt).toBe('Imagen del producto');
  });

  it('uses the seller thumbnail placeholder class for seller cards', () => {
    const card = new ProductCard({
      product: { ...product, images: [] },
      variant: 'seller',
    }).render();

    expect(card.querySelector('.q-seller-products__thumb-wrap')).not.toBeNull();
    expect(card.querySelector('.q-seller-products__thumb-placeholder-img')).not.toBeNull();
  });

  it('shows the out-of-stock badge and disables the add button', () => {
    const card = new ProductCard({ product: { ...product, stock: 0 } }).render();

    expect(card.textContent).toContain('Agotado');
    expect(card.querySelector('button[aria-label^="Añadir"]').disabled).toBe(true);
  });

  it('shows edit and delete controls only for the seller variant', () => {
    const seller = new ProductCard({ product, variant: 'seller' }).render();
    const regular = new ProductCard({ product }).render();

    expect(seller.textContent).toContain('Editar');
    expect(seller.textContent).toContain('Eliminar');
    expect(regular.textContent).not.toContain('Editar');
    expect(regular.textContent).not.toContain('Eliminar');
  });

  it('disables the add button while awaiting and re-enables it after rejection', async () => {
    let rejectAdd;
    const card = new ProductCard({
      product,
      onAddToCart: () =>
        new Promise((resolve, reject) => {
          rejectAdd = reject;
        }),
    }).render();
    const button = card.querySelector('button[aria-label^="Añadir"]');

    button.click();
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('is-loading')).toBe(true);
    rejectAdd(new Error('Add failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(button.disabled).toBe(false);
    expect(button.classList.contains('is-loading')).toBe(false);
  });

  it('calls onView with the product when the linked title is clicked', () => {
    const onView = jasmine.createSpy('onView');
    const card = new ProductCard({ product, onView }).render();
    const link = card.querySelector('.product-card__title a');

    expect(link.getAttribute('href')).toBe('/products/woven-bag');
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    link.click();
    expect(onView).toHaveBeenCalledOnceWith(product);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('ProductCard additional branches (recovered 2)', () => {
      let container;
      let view = null;

      const product = {
        id: 'product-1',
        slug: 'woven-bag',
        name: 'Woven bag',
        price: 42.5,
        currency: 'USD',
        stock: 5,
        average_rating: 4.5,
        ratings_count: 12,
        category: { name: 'Accessories' },
        images: [{ url: 'https://example.test/bag.jpg' }],
      };

      const settle = async () => {
        await Promise.resolve();
        await Promise.resolve();
      };

      const makeCard = (options) => {
        view = new ProductCard(options);
        return view.render();
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        view?.destroy?.();
        container.remove();
      });

      it('falls back to an empty product and the default variant for missing or invalid inputs', () => {
        const empty = makeCard();
        expect(empty.tagName.toLowerCase()).toBe('article');
        expect(empty.className).toBe('product-card product-card--default');
        expect(empty.getAttribute('role')).toBe('listitem');
        expect(empty.querySelector('h3')).toBeNull();
        expect(empty.querySelector('.product-card__price')).toBeNull();
        expect(empty.querySelector('.product-card__rating')).toBeNull();
        expect(empty.querySelector('img').alt).toBe('Imagen del producto');
        expect(empty.querySelector('button[aria-label^="Añadir"]').getAttribute('aria-label')).toBe(
          'Añadir producto al carrito'
        );

        const nulled = makeCard({ product: null, variant: 'unknown-variant' });
        expect(nulled.className).toBe('product-card product-card--default');
        expect(nulled.querySelector('h3')).toBeNull();
      });

      it('resolves featured seller-line fallbacks from seller, store, seller_name and country fields', () => {
        const cases = [
          [{}, 'Accessories'],
          [{ seller: 'Tejidos Illimani' }, 'Tejidos Illimani'],
          [{ seller_name: 'Tienda Local' }, 'Tienda Local'],
          [{ seller: { username: 'tejidos', country: { name: 'Bolivia' } } }, 'tejidos · Bolivia'],
          [
            { seller: { full_name: 'Nombre', country: 'Chile', country_name: 'País explícito' } },
            'Nombre · País explícito',
          ],
          [{ seller: { name: 'Tienda', countryName: 'Perú' } }, 'Tienda · Perú'],
          [{ seller: { store_name: 'Store' }, country_name: 'México' }, 'Store · México'],
          [{ seller: {} }, 'Accessories'],
        ];

        cases.forEach(([extra, expected]) => {
          const card = makeCard({ product: { ...product, ...extra }, variant: 'featured' });
          expect(card.querySelector('.product-card__category').textContent).toBe(expected);
        });
      });

      it('applies featured badge precedence from explicit badge, tag and derived flags', () => {
        const cases = [
          [{ badge: 'Oferta', is_best_seller: true }, 'Oferta'],
          [{ tag: 'Nuevo', stock: 0 }, 'Nuevo'],
          [{ badge: 'Desconocido', is_best_seller: true }, 'Más vendido'],
          [{ stock: 0, is_best_seller: true }, 'Agotado'],
          [{ isBestSeller: true, discount_price: 10 }, 'Más vendido'],
          [{ best_seller: true, is_new: true }, 'Más vendido'],
          [{ sale_price: 5, is_new: true }, 'Oferta'],
          [{ discount_percentage: 15, stock: 2 }, 'Oferta'],
          [{ is_new: true, stock: 1 }, 'Nuevo'],
          [{ isNew: true, stock: 5 }, 'Nuevo'],
          [{ stock: 1 }, 'Últimas unidades'],
          [{ stock: '1' }, 'Últimas unidades'],
          // Five units still earns the featured "Últimas unidades" pill.
          [{ stock: 5 }, 'Últimas unidades'],
          [{ stock: 6 }, null],
        ];

        cases.forEach(([extra, expected]) => {
          const card = makeCard({ product: { ...product, ...extra }, variant: 'featured' });
          const badge = card.querySelector('.product-card__status-pill');
          if (expected === null) {
            expect(badge).toBeNull();
          } else {
            expect(badge.textContent).toBe(expected);
          }
        });
      });

      it('reverts the featured favorite label, state and class on a second click without bubbling', () => {
        const card = makeCard({ product, variant: 'featured' });
        container.appendChild(card);
        const favorite = card.querySelector('.product-card__favorite');
        const media = card.querySelector('.product-card__media');
        const parentClick = jasmine.createSpy('parentClick');
        media.addEventListener('click', parentClick);

        expect(favorite.getAttribute('aria-label')).toBe('Guardar Woven bag');
        expect(favorite.getAttribute('aria-pressed')).toBe('false');
        expect(favorite.classList.contains('is-saved')).toBe(false);

        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        favorite.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(parentClick).not.toHaveBeenCalled();
        expect(favorite.getAttribute('aria-pressed')).toBe('true');
        expect(favorite.getAttribute('aria-label')).toBe('Quitar de favoritos Woven bag');
        expect(favorite.classList.contains('is-saved')).toBe(true);

        favorite.click();
        expect(favorite.getAttribute('aria-pressed')).toBe('false');
        expect(favorite.getAttribute('aria-label')).toBe('Guardar Woven bag');
        expect(favorite.classList.contains('is-saved')).toBe(false);
      });

      it('handles rating edge values and orders category, rating and title in default cards', () => {
        const card = makeCard({
          product: { ...product, average_rating: '4.25', ratings_count: '7' },
        });
        const body = card.querySelector('.product-card__body');

        expect(body.children[0].className).toBe('product-card__category');
        const rating = body.children[1];
        expect(rating.className).toBe('product-card__rating');
        expect(body.children[2].className).toBe('product-card__title-price');
        expect(rating.children[0].textContent).toBe('4.3');
        expect(rating.children[1].textContent).toBe('★');
        expect(rating.children[1].getAttribute('aria-hidden')).toBe('true');
        expect(rating.children[2].textContent).toBe('(7)');

        expect(
          makeCard({ product: { ...product, average_rating: 0 } }).querySelector(
            '.product-card__rating'
          ).textContent
        ).toBe('0.0★(12)');
        expect(
          makeCard({ product: { ...product, average_rating: 'abc' } }).querySelector(
            '.product-card__rating'
          )
        ).toBeNull();
        expect(
          makeCard({ product: { ...product, average_rating: '' } }).querySelector(
            '.product-card__rating'
          )
        ).toBeNull();
        expect(
          makeCard({ product: { ...product, average_rating: null } }).querySelector(
            '.product-card__rating'
          )
        ).toBeNull();

        const featured = makeCard({ product, variant: 'featured' });
        const featuredBody = featured.querySelector('.product-card__body');
        expect(featuredBody.children[1].className).toBe('product-card__title-price');
        expect(featuredBody.children[2].className).toBe('product-card__rating');
      });

      it('skips non-finite prices, formats numeric strings and moves featured prices into the footer', () => {
        expect(
          makeCard({ product: { ...product, price: '' } }).querySelector('.product-card__price')
        ).toBeNull();
        expect(
          makeCard({ product: { ...product, price: 'abc' } }).querySelector('.product-card__price')
        ).toBeNull();
        expect(
          makeCard({ product: { ...product, price: 0, currency: '' } }).querySelector(
            '.product-card__price'
          ).textContent
        ).toBe('Bs 0.00');
        expect(
          makeCard({ product: { ...product, price: '42.5', currency: 'EUR' } }).querySelector(
            '.product-card__price'
          ).textContent
        ).toBe('€ 42.50');

        const featured = makeCard({ product, variant: 'featured' });
        expect(
          featured.querySelector('.product-card__title-price .product-card__price')
        ).toBeNull();
        expect(
          featured.querySelector('.product-card__footer .product-card__price').textContent
        ).toBe('US$ 42.50');
      });

      it('renders seller state labels only for known states', () => {
        const labels = {
          published: 'Publicado',
          draft: 'Borrador',
          unpublished: 'No publicado',
          archived: 'Archivado',
        };

        Object.entries(labels).forEach(([state, label]) => {
          const card = makeCard({ product: { ...product, state }, variant: 'seller' });
          const status = card.querySelector('.product-card__status');
          expect(status.textContent).toBe(label);
          expect(status.parentNode.className).toBe('product-card__seller-controls');
        });

        const unknown = makeCard({ product: { ...product, state: 'borrador' }, variant: 'seller' });
        expect(unknown.querySelector('.product-card__status')).toBeNull();
        expect(
          makeCard({ product, variant: 'seller' }).querySelector('.product-card__status')
        ).toBeNull();
      });

      it('uses the exact add-button classes for every supported variant', () => {
        const expected = {
          default: 'button is-primary is-fullwidth',
          compact: 'button is-small is-primary',
          seller: 'button is-small',
          featured: 'product-card__add-button product-card__cart-action',
        };

        Object.entries(expected).forEach(([variant, className]) => {
          const card = makeCard({ product, variant });
          const button = card.querySelector('button[aria-label^="Añadir"]');
          expect(button.className).toBe(className);
          expect(button.type).toBe('button');
          expect(button.getAttribute('aria-label')).toBe('Añadir Woven bag al carrito');
        });
      });

      it('honors hideAddToCart and hideSellerActions independently', () => {
        let card = makeCard({ product, variant: 'seller', hideAddToCart: true });
        expect(card.querySelector('button[aria-label^="Añadir"]')).toBeNull();
        expect(card.querySelector('.product-card__dropdown')).not.toBeNull();

        card = makeCard({ product, variant: 'seller', hideSellerActions: true });
        expect(card.querySelector('.product-card__dropdown')).toBeNull();
        expect(card.querySelector('button[aria-label^="Añadir"]')).not.toBeNull();

        card = makeCard({
          product,
          variant: 'seller',
          hideAddToCart: true,
          hideSellerActions: true,
        });
        expect(card.querySelector('.product-card__footer')).toBeNull();
      });

      it('derives add-button availability from numeric stock zero and explicit states', () => {
        const cases = [
          [{ stock: 0 }, true],
          [{ stock: '0' }, false],
          [{ stock: -1 }, false],
          [{ state: 'draft' }, true],
          [{ state: 'published' }, false],
          [{ state: null }, true],
          [{ stock: 0, state: 'published' }, true],
        ];

        cases.forEach(([extra, disabled]) => {
          const card = makeCard({ product: { ...product, ...extra } });
          expect(card.querySelector('button[aria-label^="Añadir"]').disabled).toBe(disabled);
        });
      });

      it('calls onAddToCart with the product and quantity one, exposing busy state while pending', async () => {
        const onAddToCart = jasmine.createSpy('onAddToCart').and.resolveTo({ status: 'added' });
        const card = makeCard({ product, onAddToCart });
        const button = card.querySelector('button[aria-label^="Añadir"]');

        button.click();
        expect(onAddToCart).toHaveBeenCalledOnceWith(product, 1);
        expect(button.disabled).toBe(true);
        expect(button.classList.contains('is-loading')).toBe(true);
        expect(button.getAttribute('aria-busy')).toBe('true');

        await settle();
        expect(card.querySelector('.product-card__error')).toBeNull();
        expect(button.classList.contains('is-loading')).toBe(false);
        expect(button.hasAttribute('aria-busy')).toBe(false);
        expect(button.disabled).toBe(false);
      });

      it('reuses a single error element and falls back to the default error message', async () => {
        const onAddToCart = jasmine
          .createSpy('onAddToCart')
          .and.resolveTo({ status: 'error', error: new Error('Primer fallo') });
        const card = makeCard({ product, onAddToCart });
        const button = card.querySelector('button[aria-label^="Añadir"]');

        button.click();
        await settle();
        const error = card.querySelector('.product-card__error');
        expect(error.textContent).toBe('Primer fallo');
        expect(error.getAttribute('role')).toBe('alert');

        onAddToCart.and.resolveTo({ status: 'error' });
        button.click();
        await settle();
        expect(card.querySelectorAll('.product-card__error').length).toBe(1);
        expect(card.querySelector('.product-card__error').textContent).toBe('No se pudo añadir');
      });

      it('recovers after a rejected add and treats a non-Error rejection as the default message', async () => {
        let rejectAdd;
        const onAddToCart = jasmine.createSpy('onAddToCart').and.callFake(
          () =>
            new Promise((resolve, reject) => {
              rejectAdd = reject;
            })
        );
        const card = makeCard({ product, onAddToCart });
        const button = card.querySelector('button[aria-label^="Añadir"]');

        button.click();
        expect(button.getAttribute('aria-busy')).toBe('true');
        rejectAdd('texto plano');
        await settle();

        expect(card.querySelector('.product-card__error').textContent).toBe('No se pudo añadir');
        expect(button.disabled).toBe(false);
        expect(button.classList.contains('is-loading')).toBe(false);
        expect(button.hasAttribute('aria-busy')).toBe(false);
      });

      it('does nothing when the add button is clicked without an onAddToCart callback', async () => {
        const card = makeCard({ product });
        const button = card.querySelector('button[aria-label^="Añadir"]');

        expect(() => button.click()).not.toThrow();
        await settle();
        expect(button.disabled).toBe(false);
        expect(button.classList.contains('is-loading')).toBe(false);
        expect(card.querySelector('.product-card__error')).toBeNull();
      });

      it('toggles the seller dropdown and invokes edit and delete callbacks once', () => {
        const onEdit = jasmine.createSpy('onEdit');
        const onDelete = jasmine.createSpy('onDelete');
        const card = makeCard({ product, variant: 'seller', onEdit, onDelete });
        const dropdown = card.querySelector('.product-card__dropdown');
        const trigger = dropdown.querySelector('button');

        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        trigger.click();
        expect(dropdown.classList.contains('is-active')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        trigger.click();
        expect(dropdown.classList.contains('is-active')).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        card.querySelector('button[aria-label^="Editar"]').click();
        card.querySelector('button[aria-label^="Eliminar"]').click();
        expect(onEdit).toHaveBeenCalledOnceWith(product);
        expect(onDelete).toHaveBeenCalledOnceWith(product);
      });

      it('encodes the slug in view links and exposes route metadata and accessible labels', () => {
        const withSlug = { ...product, slug: 'woven bag/special?' };
        const onView = jasmine.createSpy('onView');
        const card = makeCard({ product: withSlug, onView });
        const links = card.querySelectorAll('.product-card__view-link');

        expect(links.length).toBe(2);
        expect(links[0].querySelector('img')).not.toBeNull();
        const titleLink = links[1];
        expect(titleLink.getAttribute('href')).toBe('/products/woven%20bag%2Fspecial%3F');
        expect(titleLink.dataset.route).toBe('');
        expect(titleLink.getAttribute('aria-label')).toBe('Ver Woven bag');
        titleLink.addEventListener('click', (event) => event.preventDefault());
        titleLink.click();
        expect(onView).toHaveBeenCalledOnceWith(withSlug);

        expect(
          makeCard({ product: { ...product, slug: '' }, onView }).querySelectorAll(
            '.product-card__view-link'
          ).length
        ).toBe(0);
        expect(makeCard({ product }).querySelectorAll('.product-card__view-link').length).toBe(0);
      });
    });
  })();
})();
