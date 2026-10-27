import { CartStore, FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from '../../store/cartStore.js';
import { CartViewModel } from './CartViewModel.js';

const product = (overrides = {}) => ({
  id: 'p1',
  name: 'Aguayo',
  price: 40,
  currency: 'USD',
  seller: 'Tejidos Illimani',
  imageUrl: null,
  ...overrides,
});

describe('CartViewModel', () => {
  let store;
  let vm;

  beforeEach(() => {
    window.localStorage.clear();
    store = new CartStore();
    vm = new CartViewModel({ cartStore: store });
  });

  afterEach(() => {
    vm.destroy();
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(vm.items).toEqual([]);
    expect(vm.subtotal).toBe(0);
    expect(vm.shipping).toBe(0);
    expect(vm.total).toBe(0);
    expect(vm.itemCount).toBe(0);
    expect(vm.isEmpty).toBe(true);
    expect(vm.getShippingLabel()).toBe('');
  });

  it('reflects items added to the store with presentation labels', () => {
    store.addItem(product(), 2);

    expect(vm.items.length).toBe(1);
    expect(vm.items[0]).toEqual(
      jasmine.objectContaining({
        productId: 'p1',
        name: 'Aguayo',
        quantity: 2,
        priceLabel: 'US$ 40.00',
        subtotal: 80,
        subtotalLabel: 'US$ 80.00',
        detailHref: '/products/p1',
      })
    );
    expect(vm.subtotal).toBe(80);
    expect(vm.itemCount).toBe(2);
    expect(vm.isEmpty).toBe(false);
    expect(vm.getItemCountLabel()).toBe('2 artículos');
  });

  it('applies the flat shipping rate below the free-shipping threshold', () => {
    store.addItem(product({ price: 20 }), 1);

    expect(vm.subtotal).toBe(20);
    expect(vm.shipping).toBe(FLAT_SHIPPING_RATE);
    expect(vm.total).toBe(24.99);
    expect(vm.getShippingLabel()).toBe('US$ 4.99');
    expect(vm.getShippingNotice()).toBe('Te faltan US$ 30.00 para obtener envío gratis.');
  });

  it('offers free shipping from the threshold', () => {
    store.addItem(product({ price: FREE_SHIPPING_THRESHOLD }), 1);

    expect(vm.shipping).toBe(0);
    expect(vm.getShippingLabel()).toBe('Gratis');
    expect(vm.getShippingNotice()).toBe('¡Tienes envío gratis!');
  });

  it('formats subtotal and total labels', () => {
    store.addItem(product({ price: 20 }), 1);
    expect(vm.getSubtotalLabel()).toBe('US$ 20.00');
    expect(vm.getTotalLabel()).toBe('US$ 24.99');
  });

  it('setQuantity updates the item and totals', () => {
    store.addItem(product(), 1);

    vm.setQuantity('p1', 3);

    expect(vm.items[0].quantity).toBe(3);
    expect(vm.subtotal).toBe(120);
    expect(vm.itemCount).toBe(3);
  });

  it('increment and decrement update the quantity', () => {
    store.addItem(product(), 1);

    vm.increment('p1');
    expect(vm.items[0].quantity).toBe(2);

    vm.decrement('p1');
    expect(vm.items[0].quantity).toBe(1);

    vm.decrement('p1');
    expect(vm.items[0].quantity).toBe(1);
  });

  it('remove deletes the item and recalculates totals', () => {
    store.addItem(product(), 2);
    store.addItem(product({ id: 'p2', name: 'Café', price: 14 }), 1);

    vm.remove('p1');

    expect(vm.items.length).toBe(1);
    expect(vm.subtotal).toBe(14);
    expect(vm.itemCount).toBe(1);
  });

  it('clear empties the cart', () => {
    store.addItem(product(), 2);
    vm.clear();

    expect(vm.items).toEqual([]);
    expect(vm.isEmpty).toBe(true);
    expect(vm.total).toBe(0);
  });

  it('checkout shows a placeholder notice and dismissNotice clears it', () => {
    store.addItem(product(), 1);

    vm.checkout();
    expect(vm.notice).toContain('El pago estará disponible próximamente');

    vm.dismissNotice();
    expect(vm.notice).toBe('');
  });

  it('notifies subscribers when the store changes', () => {
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    store.addItem(product(), 1);

    expect(listener).toHaveBeenCalledWith(vm);
  });

  it('destroy stops listening to the store', () => {
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);
    vm.destroy();

    store.addItem(product(), 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('works with a store that has no subscription and no total helpers', () => {
    const plainStore = {
      getItems: () => [
        {
          productId: 'p1',
          name: 'Aguayo',
          price: 20,
          currency: 'USD',
          quantity: 1,
          seller: '',
          imageUrl: null,
        },
      ],
      updateQuantity: jasmine.createSpy('updateQuantity'),
      removeItem: jasmine.createSpy('removeItem'),
      clear: jasmine.createSpy('clear'),
    };
    const plainVm = new CartViewModel({ cartStore: plainStore });

    expect(plainVm.subtotal).toBe(20);
    expect(plainVm.shipping).toBe(FLAT_SHIPPING_RATE);
    expect(plainVm.total).toBe(24.99);
    expect(plainVm.itemCount).toBe(1);

    plainVm.setQuantity('p1', 2);
    expect(plainStore.updateQuantity).toHaveBeenCalledWith('p1', 2);
    plainVm.destroy();
  });
});
