import { CartView } from './CartView.js';

const createItem = (overrides = {}) => ({
  productId: 'p1',
  name: 'Aguayo tradicional',
  seller: 'Tejidos Illimani',
  price: 40,
  currency: 'USD',
  imageUrl: null,
  quantity: 2,
  priceLabel: 'US$ 40.00',
  subtotal: 80,
  subtotalLabel: 'US$ 80.00',
  detailHref: '/products/p1',
  ...overrides,
});

const createMockViewModel = (overrides = {}) => {
  const listeners = new Set();
  const vm = {
    items: [createItem()],
    subtotal: 80,
    shipping: 0,
    total: 80,
    itemCount: 2,
    distinctCount: 1,
    isEmpty: false,
    requiresAuth: false,
    notice: '',
    load: jasmine.createSpy('load').and.resolveTo(undefined),
    getSubtotalLabel: () => 'US$ 80.00',
    getShippingLabel: () => 'Gratis',
    getTotalLabel: () => 'US$ 80.00',
    getItemCountLabel: () => '2 artículos',
    getShippingNotice: () => '¡Tienes envío gratis!',
    getShippingProgressPercentage: () => 100,
    setQuantity: jasmine.createSpy('setQuantity'),
    increment: jasmine.createSpy('increment'),
    decrement: jasmine.createSpy('decrement'),
    remove: jasmine.createSpy('remove'),
    clear: jasmine.createSpy('clear'),
    checkout: jasmine.createSpy('checkout'),
    dismissNotice: jasmine.createSpy('dismissNotice'),
    destroy: jasmine.createSpy('destroy'),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      listeners.forEach((listener) => listener(vm));
    },
    ...overrides,
  };
  return vm;
};

describe('CartView', () => {
  let container;
  let viewModel;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = createMockViewModel();
    view = new CartView({ viewModel });
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('renders the empty state with a continue-shopping link', () => {
    viewModel = createMockViewModel({
      items: [],
      subtotal: 0,
      shipping: 0,
      total: 0,
      itemCount: 0,
      distinctCount: 0,
      isEmpty: true,
    });
    view = new CartView({ viewModel });
    view.mount(container);

    expect(container.querySelector('section.q-cart')).not.toBeNull();
    expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
      'Tu carrito está vacío'
    );
    const link = container.querySelector('.q-cart__continue');
    expect(link.getAttribute('href')).toBe('/products');
    expect(link.dataset.route).toBe('');
    expect(container.querySelector('.q-cart__layout')).toBeNull();
  });

  it('renders the item list and order summary', () => {
    view.mount(container);

    expect(container.querySelector('.q-cart__eyebrow').textContent).toBe('Compra segura');
    expect(container.querySelector('.q-cart__title').textContent).toBe('Tu carrito');
    expect(container.querySelector('.q-cart__back').getAttribute('href')).toBe('/');
    expect(container.querySelector('.q-cart__items-title').textContent).toBe('Productos (1)');
    expect(container.querySelectorAll('.q-cart-item').length).toBe(1);
    expect(container.querySelector('.q-cart-item__name').textContent).toBe('Aguayo tradicional');
    expect(container.querySelector('.q-cart-item__name').getAttribute('href')).toBe('/products/p1');
    expect(container.querySelector('.q-cart-item__seller').textContent).toBe('Tejidos Illimani');
    expect(container.querySelector('.q-cart-item__unit-price').textContent).toBe('US$ 40.00 c/u');
    expect(container.querySelectorAll('.q-quantity-selector').length).toBe(1);
    expect(container.querySelector('.q-cart__summary')).not.toBeNull();
    expect(container.querySelector('.q-cart__shipping-progress').value).toBe(100);
    expect(container.querySelector('.q-cart__shipping-notice').textContent).toBe(
      '¡Tienes envío gratis!'
    );
    expect(container.querySelector('.q-cart__summary-row--total').textContent).toContain(
      'US$ 80.00'
    );
    expect(container.querySelector('.q-cart__checkout').textContent).toBe('Continuar al pago');
    expect(container.querySelector('.q-cart__clear').textContent).toBe('Vaciar carrito');
    expect(container.querySelector('.q-cart__continue').getAttribute('href')).toBe('/products');
  });

  it('quantity controls update the item quantity through the view model', () => {
    view.mount(container);

    container.querySelector('.q-quantity-selector__btn--decrease').click();
    expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 1);

    container.querySelector('.q-quantity-selector__btn--increase').click();
    expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 2);
  });

  it('remove button calls remove with the product id', () => {
    view.mount(container);

    container.querySelector('.q-cart-item__remove').click();
    expect(viewModel.remove).toHaveBeenCalledWith('p1');
  });

  it('clear button empties the cart through the view model', () => {
    view.mount(container);

    container.querySelector('.q-cart__clear').click();
    expect(viewModel.clear).toHaveBeenCalled();
  });

  it('checkout button calls checkout', () => {
    view.mount(container);

    container.querySelector('.q-cart__checkout').click();
    expect(viewModel.checkout).toHaveBeenCalled();
  });

  it('uses the onCheckout callback when provided', () => {
    const onCheckout = jasmine.createSpy('onCheckout');
    view = new CartView({ viewModel, onCheckout });
    view.mount(container);

    container.querySelector('.q-cart__checkout').click();
    expect(onCheckout).toHaveBeenCalled();
    expect(viewModel.checkout).not.toHaveBeenCalled();
  });

  it('renders the checkout notice and allows dismissing it', () => {
    viewModel.notice = 'El pago estará disponible próximamente.';
    view.mount(container);

    expect(container.querySelector('.q-cart__notice-text').textContent).toBe(
      'El pago estará disponible próximamente.'
    );
    container.querySelector('.q-cart__notice-close').click();
    expect(viewModel.dismissNotice).toHaveBeenCalled();
  });

  it('re-renders when the view model notifies', () => {
    view.mount(container);
    expect(container.querySelectorAll('.q-cart-item').length).toBe(1);

    viewModel.items = [createItem(), createItem({ productId: 'p2', name: 'Café' })];
    viewModel.notify();

    expect(container.querySelectorAll('.q-cart-item').length).toBe(2);
  });

  it('destroy removes the section and unsubscribes', () => {
    view.mount(container);
    expect(container.querySelector('.q-cart')).not.toBeNull();

    view.destroy();

    expect(container.querySelector('.q-cart')).toBeNull();
    expect(viewModel.destroy).toHaveBeenCalled();
  });

  it('renders fallback placeholder when item has no imageUrl', () => {
    viewModel.items = [createItem({ imageUrl: null })];
    view.mount(container);

    const placeholder = container.querySelector('.q-cart-item__placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder.querySelector('.q-cart-item__placeholder-label').textContent).toBe('Imagen');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    const createItem = (overrides = {}) => ({
      productId: 'p1',
      name: 'Aguayo tradicional',
      seller: 'Tejidos Illimani',
      price: 40,
      currency: 'USD',
      imageUrl: null,
      quantity: 2,
      priceLabel: 'US$ 40.00',
      subtotal: 80,
      subtotalLabel: 'US$ 80.00',
      detailHref: '/products/p1',
      ...overrides,
    });

    const createMockViewModel = (overrides = {}) => {
      const listeners = new Set();
      const unsubscribers = [];
      const vm = {
        items: [createItem()],
        subtotal: 80,
        shipping: 0,
        total: 80,
        itemCount: 2,
        distinctCount: 1,
        isEmpty: false,
        requiresAuth: false,
        notice: '',
        load: jasmine.createSpy('load').and.resolveTo(undefined),
        getSubtotalLabel: () => 'US$ 80.00',
        getShippingLabel: () => 'Gratis',
        getTotalLabel: () => 'US$ 80.00',
        getItemCountLabel: () => '2 artículos',
        getShippingNotice: () => '¡Tienes envío gratis!',
        getShippingProgressPercentage: () => 100,
        setQuantity: jasmine.createSpy('setQuantity'),
        remove: jasmine.createSpy('remove'),
        clear: jasmine.createSpy('clear'),
        checkout: jasmine.createSpy('checkout'),
        dismissNotice: jasmine.createSpy('dismissNotice'),
        destroy: jasmine.createSpy('destroy'),
        subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
          listeners.add(listener);
          const unsubscribe = jasmine
            .createSpy('unsubscribe')
            .and.callFake(() => listeners.delete(listener));
          unsubscribers.push(unsubscribe);
          return unsubscribe;
        }),
        notify() {
          listeners.forEach((listener) => listener(vm));
        },
        _listeners: listeners,
        _unsubscribers: unsubscribers,
        ...overrides,
      };
      return vm;
    };

    describe('CartView additional branches (recovered 1)', () => {
      let container;
      let otherContainer = null;
      let viewModel;
      let view = null;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = createMockViewModel();
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        otherContainer?.remove();
        otherContainer = null;
        container.remove();
      });

      it('renders the exact auth prompt copy and routes the login button through onLogin', () => {
        viewModel = createMockViewModel({ requiresAuth: true, isEmpty: true, items: [] });
        const onLogin = jasmine.createSpy('onLogin');
        view = new CartView({ viewModel, onLogin });
        view.mount(container);

        expect(container.querySelector('.q-cart__title').textContent).toBe('Tu carrito');
        expect(container.querySelector('.q-cart__subtitle')).toBeNull();
        const prompt = container.querySelector('.q-cart__empty');
        expect(prompt.querySelector('.q-cart__empty-icon').textContent).toBe('X');
        expect(prompt.querySelector('.q-cart__empty-title').textContent).toBe(
          'Inicia sesión para ver tu carrito'
        );
        expect(prompt.querySelector('.q-cart__empty-message').textContent).toBe(
          'Tu carrito se guarda en tu cuenta. Entra para verlo en cualquier dispositivo.'
        );
        const login = prompt.querySelector('button');
        expect(login.type).toBe('button');
        expect(login.className).toBe('q-btn q-btn--primary q-btn--block');
        expect(login.textContent).toBe('Iniciar sesión');
        login.click();
        expect(onLogin).toHaveBeenCalledTimes(1);

        const link = prompt.querySelector('.q-cart__continue');
        expect(link.getAttribute('href')).toBe('/products');
        expect(link.dataset.route).toBe('');
        expect(link.textContent).toBe('Continuar comprando');
        expect(container.querySelector('.q-cart__layout')).toBeNull();
        expect(container.querySelector('.q-cart__summary')).toBeNull();
      });

      it('keeps the login button harmless when onLogin is absent or not callable', () => {
        viewModel.requiresAuth = true;
        for (const onLogin of [undefined, null, 'not a function']) {
          view = new CartView({ viewModel, onLogin });
          view.mount(container);
          expect(() => container.querySelector('.q-cart__empty button').click()).not.toThrow();
          view.destroy();
          view = null;
        }
      });

      it('renders the exact empty-state copy and subtitle with no layout', () => {
        viewModel = createMockViewModel({
          items: [],
          subtotal: 0,
          total: 0,
          itemCount: 0,
          distinctCount: 0,
          isEmpty: true,
        });
        view = new CartView({ viewModel });
        view.mount(container);

        expect(container.querySelector('.q-cart__subtitle')).toBeNull();
        const empty = container.querySelector('.q-cart__empty');
        expect(empty.querySelector('.q-cart__empty-icon').textContent).toBe('X');
        expect(empty.querySelector('.q-cart__empty-title').textContent).toBe(
          'Tu carrito está vacío'
        );
        expect(empty.querySelector('.q-cart__empty-message').textContent).toBe(
          'Explora el catálogo y añade tus productos favoritos. Los guardaremos aquí para ti.'
        );
        const link = empty.querySelector('.q-cart__continue');
        expect(link.className).toBe('q-btn q-btn--primary q-btn--block q-cart__continue');
        expect(link.getAttribute('href')).toBe('/products');
        expect(link.dataset.route).toBe('');
        expect(link.textContent).toBe('Continuar comprando');
        expect(container.querySelector('.q-cart__layout')).toBeNull();
      });

      it('subscribes once and calls load once during mount', () => {
        view = new CartView({ viewModel });
        view.mount(container);

        expect(viewModel.subscribe).toHaveBeenCalledTimes(1);
        expect(typeof viewModel.subscribe.calls.mostRecent().args[0]).toBe('function');
        expect(viewModel.load).toHaveBeenCalledTimes(1);
        expect(viewModel.load.calls.mostRecent().args).toEqual([]);
      });

      it('hydrates a guest into the auth prompt through load and notify', async () => {
        viewModel.load = jasmine.createSpy('load').and.callFake(async () => {
          viewModel.requiresAuth = true;
          viewModel.items = [];
          viewModel.isEmpty = true;
          viewModel.notify();
        });
        view = new CartView({ viewModel });
        view.mount(container);
        // load() notifies synchronously, so the auth prompt replaces the layout during mount.
        expect(container.querySelector('.q-cart__layout')).toBeNull();
        expect(container.querySelector('.q-cart__empty')).not.toBeNull();

        await tick();

        expect(viewModel.load).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.q-cart__empty-title').textContent).toBe(
          'Inicia sesión para ver tu carrito'
        );
        expect(container.querySelector('.q-cart__subtitle')).toBeNull();
        expect(container.querySelector('.q-cart__layout')).toBeNull();
      });

      it('caches the rendered section while still rebuilding its content on notify', () => {
        view = new CartView({ viewModel });
        const first = view.render();
        expect(view.element).toBe(first);
        expect(view.render()).toBe(first);

        view.mount(container);
        expect(view.render()).toBe(first);
        expect(container.querySelectorAll('section.q-cart').length).toBe(1);

        const oldTitle = container.querySelector('.q-cart__title');
        viewModel.notify();
        expect(container.querySelector('.q-cart__title')).not.toBe(oldTitle);
        expect(container.querySelectorAll('section.q-cart').length).toBe(1);
        expect(view.render()).toBe(first);
      });

      it('unsubscribes, clears state and tolerates destroy being called twice', () => {
        view = new CartView({ viewModel });
        view.mount(container);
        const section = view.element;
        const unsubscribe = viewModel._unsubscribers[0];

        view.destroy();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(view.element).toBeNull();
        expect(container.contains(section)).toBe(false);
        expect(viewModel.destroy).toHaveBeenCalledTimes(1);

        view.destroy();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        // destroy() always forwards to the VM, even when there is nothing left to unsubscribe.
        expect(viewModel.destroy).toHaveBeenCalledTimes(2);
      });

      it('destroys safely before mount and after the section is detached', () => {
        view = new CartView({ viewModel });
        expect(() => view.destroy()).not.toThrow();
        expect(view._unsubscribe).toBeNull();

        viewModel = createMockViewModel();
        view = new CartView({ viewModel });
        view.mount(container);
        view.element.remove();
        expect(() => view.destroy()).not.toThrow();
        expect(view.element).toBeNull();
        expect(viewModel._unsubscribers[0]).toHaveBeenCalledTimes(1);
      });

      it('falls back to vm.checkout for truthy non-function and falsy onCheckout values', () => {
        for (const onCheckout of ['not a function', 0, null]) {
          viewModel = createMockViewModel();
          view = new CartView({ viewModel, onCheckout });
          view.mount(container);
          container.querySelector('.q-cart__checkout').click();
          expect(viewModel.checkout).toHaveBeenCalledTimes(1);
          view.destroy();
          view = null;
        }
      });

      it('exposes product ids, detail-href fallback and route dataset on item rows', () => {
        viewModel.items = [
          createItem({ productId: 'p1', detailHref: '' }),
          createItem({ productId: 'p2', detailHref: '/detalle/p2' }),
        ];
        view = new CartView({ viewModel });
        view.mount(container);

        const items = [...container.querySelectorAll('.q-cart-item')];
        expect(items.map((li) => li.dataset.productId)).toEqual(['p1', 'p2']);
        const names = items.map((li) => li.querySelector('.q-cart-item__name'));
        expect(names[0].getAttribute('href')).toBe('/products/p1');
        expect(names[1].getAttribute('href')).toBe('/detalle/p2');
        expect(names.every((name) => name.dataset.route === '')).toBe(true);
      });

      it('omits the seller element when the item seller is falsy', () => {
        viewModel.items = [
          createItem({ seller: '' }),
          createItem({ productId: 'p2', seller: undefined }),
        ];
        view = new CartView({ viewModel });
        view.mount(container);

        const infos = [...container.querySelectorAll('.q-cart-item__info')];
        expect(infos[0].querySelector('.q-cart-item__seller')).toBeNull();
        expect(infos[1].querySelector('.q-cart-item__seller')).toBeNull();
        expect(infos[0].children[0].className).toBe('q-cart-item__name');
        expect(infos[0].children[1].className).toBe('q-cart-item__unit-price');
      });

      it('renders price and subtotal labels and an exact remove button', () => {
        viewModel.items = [
          createItem({ name: 'Manta', priceLabel: 'Bs 40.00', subtotalLabel: 'Bs 80.00' }),
        ];
        view = new CartView({ viewModel });
        view.mount(container);

        expect(container.querySelector('.q-cart-item__unit-price').textContent).toBe(
          'Bs 40.00 c/u'
        );
        expect(container.querySelector('.q-cart-item__subtotal-label')).toBeNull();
        expect(container.querySelector('.q-cart-item__subtotal-value')).toBeNull();
        const remove = container.querySelector('.q-cart-item__remove');
        expect(remove.type).toBe('button');
        expect(remove.textContent).toBe('Eliminar');
        expect(remove.getAttribute('aria-label')).toBe('Eliminar Manta del carrito');
        remove.click();
        expect(viewModel.remove).toHaveBeenCalledWith('p1');
      });

      it('configures the quantity selector labels, min and disabled decrease at the minimum', () => {
        viewModel.items = [createItem({ quantity: 1, name: 'Manta' })];
        view = new CartView({ viewModel });
        view.mount(container);

        expect(container.querySelector('.q-cart-item__quantity-label')).toBeNull();
        const selector = container.querySelector('.q-quantity-selector');
        expect(selector.getAttribute('role')).toBe('group');
        expect(selector.getAttribute('aria-label')).toBe('Cantidad de Manta');
        const input = selector.querySelector('.q-quantity-selector__input');
        expect(input.type).toBe('number');
        expect(input.getAttribute('aria-label')).toBe('Cantidad de Manta');
        expect(input.min).toBe('1');
        expect(input.value).toBe('1');
        const decrease = selector.querySelector('.q-quantity-selector__btn--decrease');
        expect(decrease.getAttribute('aria-label')).toBe('Disminuir cantidad');
        expect(decrease.disabled).toBe(true);
        const increase = selector.querySelector('.q-quantity-selector__btn--increase');
        expect(increase.disabled).toBe(false);
      });

      it('clamps direct input changes before notifying the view model', () => {
        viewModel.items = [createItem({ quantity: 2 })];
        view = new CartView({ viewModel });
        view.mount(container);
        const input = container.querySelector('.q-quantity-selector__input');

        input.value = '0';
        input.dispatchEvent(new Event('change'));
        expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 1);
        expect(input.value).toBe('1');

        input.value = '3.8';
        input.dispatchEvent(new Event('change'));
        expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 3);
        expect(input.value).toBe('3');

        input.value = '9';
        input.dispatchEvent(new Event('change'));
        expect(viewModel.setQuantity).toHaveBeenCalledWith('p1', 9);
        expect(viewModel.setQuantity).toHaveBeenCalledTimes(3);
      });

      it('renders a loaded photo with the cart class and item name as alt text', () => {
        viewModel.items = [createItem({ imageUrl: '/img/photo.jpg', name: 'Manta' })];
        view = new CartView({ viewModel });
        view.mount(container);

        const photo = container.querySelector('img.q-cart-item__photo');
        expect(photo).not.toBeNull();
        expect(photo.getAttribute('src')).toBe('/img/photo.jpg');
        expect(photo.getAttribute('alt')).toBe('Manta');
        expect(photo.loading).toBe('lazy');
        expect(container.querySelector('.q-cart-item__placeholder')).toBeNull();
      });

      it('renders summary labels, free-shipping styling, notice text and continue link', () => {
        view = new CartView({ viewModel });
        view.mount(container);

        const rows = container.querySelectorAll(
          '.q-cart__summary-rows .q-cart__summary-row:not(.q-cart__summary-row--total)'
        );
        expect(rows.length).toBe(2);
        expect(rows[0].querySelector('span').textContent).toBe('Subtotal');
        expect(rows[0].querySelector('.q-cart__summary-value').textContent).toBe('US$ 80.00');
        expect(rows[1].querySelector('span').textContent).toBe('Envío');
        expect(rows[1].querySelector('.q-cart__summary-value').textContent).toBe('Gratis');
        expect(rows[1].querySelector('.q-cart__summary-value').classList.contains('is-free')).toBe(
          true
        );
        const totalRow = container.querySelector('.q-cart__summary-row--total');
        expect(totalRow.querySelector('span').textContent).toBe('Total');
        expect(totalRow.querySelector('strong.q-cart__summary-value').textContent).toBe(
          'US$ 80.00'
        );
        expect(container.querySelector('.q-cart__shipping-notice').textContent).toBe(
          '¡Tienes envío gratis!'
        );
        const link = container.querySelector('.q-cart__summary .q-cart__continue');
        expect(link.className).toBe('q-btn q-btn--outline q-btn--block q-cart__continue');
        expect(link.getAttribute('href')).toBe('/products');
        expect(link.dataset.route).toBe('');
        expect(link.textContent).toBe('Continuar comprando');
      });

      it('omits the free-shipping class and uses the supplied shipping labels', () => {
        viewModel.shipping = 7;
        viewModel.getShippingLabel = () => 'US$ 7.00';
        viewModel.getShippingNotice = () => 'Te faltan US$ 20.00 para envío gratis.';
        view = new CartView({ viewModel });
        view.mount(container);

        const shippingValue = container
          .querySelectorAll('.q-cart__summary-row')[1]
          .querySelector('.q-cart__summary-value');
        expect(shippingValue.textContent).toBe('US$ 7.00');
        expect(shippingValue.classList.contains('is-free')).toBe(false);
        expect(container.querySelector('.q-cart__shipping-notice').textContent).toBe(
          'Te faltan US$ 20.00 para envío gratis.'
        );
      });

      it('renders a status notice with an exact close label and removes it on dismissal', () => {
        viewModel.notice = 'Aviso de prueba';
        viewModel.dismissNotice.and.callFake(() => {
          viewModel.notice = '';
          viewModel.notify();
        });
        view = new CartView({ viewModel });
        view.mount(container);

        const notice = container.querySelector('.q-cart__notice');
        expect(notice.getAttribute('role')).toBe('status');
        expect(notice.querySelector('.q-cart__notice-text').textContent).toBe('Aviso de prueba');
        const close = notice.querySelector('.q-cart__notice-close');
        expect(close.type).toBe('button');
        expect(close.getAttribute('aria-label')).toBe('Cerrar aviso');
        expect(close.textContent).toBe('×');

        close.click();
        expect(viewModel.dismissNotice).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.q-cart__notice')).toBeNull();
      });

      it('renders every item in a multi-item cart and wires each row independently', () => {
        viewModel.items = [
          createItem({
            productId: 'p1',
            name: 'A',
            priceLabel: 'US$ 1.00',
            subtotalLabel: 'US$ 2.00',
          }),
          createItem({
            productId: 'p2',
            name: 'B',
            priceLabel: 'US$ 3.00',
            subtotalLabel: 'US$ 6.00',
            detailHref: '',
          }),
        ];
        view = new CartView({ viewModel });
        view.mount(container);

        const items = [...container.querySelectorAll('.q-cart-item')];
        expect(items.length).toBe(2);
        expect(items.map((li) => li.dataset.productId)).toEqual(['p1', 'p2']);
        expect(items.map((li) => li.querySelector('.q-cart-item__name').textContent)).toEqual([
          'A',
          'B',
        ]);
        expect(items[1].querySelector('.q-cart-item__name').getAttribute('href')).toBe(
          '/products/p2'
        );
        expect(items.map((li) => li.querySelector('.q-cart-item__unit-price').textContent)).toEqual(
          ['US$ 1.00 c/u', 'US$ 3.00 c/u']
        );
        expect(items.map((li) => li.querySelector('.q-cart-item__subtotal-value'))).toEqual([
          null,
          null,
        ]);

        const selectors = [...container.querySelectorAll('.q-quantity-selector')];
        expect(selectors[1].getAttribute('aria-label')).toBe('Cantidad de B');
        selectors[1].querySelector('.q-quantity-selector__btn--decrease').click();
        expect(viewModel.setQuantity).toHaveBeenCalledWith('p2', 1);
        items[0].querySelector('.q-cart-item__remove').click();
        expect(viewModel.remove).toHaveBeenCalledWith('p1');
      });

      it('characterizes the mount re-subscribe leak: only the newest subscription is removed', () => {
        otherContainer = document.createElement('div');
        document.body.appendChild(otherContainer);
        view = new CartView({ viewModel });
        view.mount(container);
        view.mount(otherContainer);

        expect(viewModel.subscribe).toHaveBeenCalledTimes(2);
        expect(viewModel.load).toHaveBeenCalledTimes(2);
        expect(viewModel._listeners.size).toBe(2);
        expect(container.querySelector('.q-cart')).toBeNull();
        expect(otherContainer.querySelector('.q-cart')).not.toBeNull();

        const renderSpy = spyOn(view, '_renderContent');
        view.destroy();

        expect(viewModel._unsubscribers[0]).not.toHaveBeenCalled();
        expect(viewModel._unsubscribers[1]).toHaveBeenCalledTimes(1);
        expect(viewModel._listeners.size).toBe(1);
        viewModel.notify();
        expect(renderSpy).toHaveBeenCalledTimes(1);
        viewModel._listeners.clear();
      });

      it('characterizes a load result with no then/catch/finally handler attached by the view', () => {
        const loadResult = {
          then: jasmine.createSpy('then'),
          catch: jasmine.createSpy('catch'),
          finally: jasmine.createSpy('finally'),
        };
        viewModel.load = jasmine.createSpy('load').and.returnValue(loadResult);
        view = new CartView({ viewModel });

        expect(() => view.mount(container)).not.toThrow();
        expect(viewModel.load).toHaveBeenCalledTimes(1);
        expect(loadResult.then).not.toHaveBeenCalled();
        expect(loadResult.catch).not.toHaveBeenCalled();
        expect(loadResult.finally).not.toHaveBeenCalled();
        expect(container.querySelector('.q-cart__layout')).not.toBeNull();
        expect(container.querySelector('.q-cart__notice')).toBeNull();
      });

      it('characterizes an unhandled rejected load: the rejection survives without error UI', async () => {
        const error = new Error('falló la carga');
        const rejection = Promise.reject(error);
        viewModel.load = jasmine.createSpy('load').and.returnValue(rejection);
        view = new CartView({ viewModel });

        expect(() => view.mount(container)).not.toThrow();
        const seen = jasmine.createSpy('seen');
        await rejection.catch(seen);
        expect(seen).toHaveBeenCalledWith(error);
        expect(container.querySelector('.q-cart__layout')).not.toBeNull();
        expect(container.querySelector('.q-cart__notice')).toBeNull();
        expect(view.element).not.toBeNull();
      });

      it('characterizes focus loss when a notification re-renders the content', () => {
        view = new CartView({ viewModel });
        view.mount(container);
        const input = container.querySelector('.q-quantity-selector__input');
        input.focus();
        expect(document.activeElement).toBe(input);

        viewModel.notify();

        expect(container.contains(input)).toBe(false);
        expect(document.activeElement).toBe(document.body);
        expect(container.querySelector('.q-quantity-selector__input')).not.toBe(input);
      });
    });
  })();
})();
