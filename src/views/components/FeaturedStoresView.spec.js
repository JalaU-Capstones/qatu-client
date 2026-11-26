import { FeaturedStoresViewModel } from '../../viewmodels/components/FeaturedStoresViewModel.js';
import { FeaturedStoresView } from './FeaturedStoresView.js';

describe('FeaturedStoresView', () => {
  let container;
  let view;
  let viewModel;

  const sellers = (count) =>
    Array.from({ length: count }, (_, index) => ({
      id: `seller-${index}`,
      username: `vendedor${index}`,
      fullName: `Vendedor ${index}`,
      bio: 'Productos hechos a mano.',
      avatarPath: null,
      productCount: index + 1,
    }));

  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  const setup = (listSellers) => {
    viewModel = new FeaturedStoresViewModel({ sellersApi: { listSellers } });
    view = new FeaturedStoresView(viewModel);
    return view.mount(container);
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    view?.destroy();
    container.remove();
  });

  it('renders the header and a /stores route CTA', () => {
    setup(() => Promise.resolve(sellers(3)));
    const link = container.querySelector('.q-featured-stores__see-all');

    expect(container.querySelector('h2').textContent).toBe('Tiendas destacadas');
    expect(link.getAttribute('href')).toBe('/stores');
    expect(link.hasAttribute('data-route')).toBe(true);
    expect(link.textContent).toContain('Ver todas las tiendas');
  });

  it('renders three cards after loading with no rating or detail CTA', async () => {
    setup(() => Promise.resolve(sellers(5)));
    await settle();

    const cards = container.querySelectorAll('.q-store-card');
    expect(cards.length).toBe(3);
    expect(cards[0].querySelector('.q-store-card__name').textContent).toBe('Vendedor 0');
    expect(cards[0].querySelector('.q-store-card__bio').textContent).toBe(
      'Productos hechos a mano.'
    );
    expect(cards[0].querySelector('.q-store-card__count').textContent).toBe('1 productos');
    expect(cards[0].querySelector('.q-store-card__header').nextElementSibling).toBe(
      cards[0].querySelector('.q-store-card__avatar')
    );
    expect(cards[0].getAttribute('aria-disabled')).toBe('true');
    expect(cards[0].querySelector('.q-store-card__rating')).toBeNull();
    expect(cards[0].querySelector('.q-store-card__cta')).toBeNull();
  });

  it('renders three skeleton cards while loading', () => {
    let resolve;
    setup(() => new Promise((done) => (resolve = done)));

    expect(container.querySelectorAll('.q-store-card--skeleton').length).toBe(3);
    resolve(sellers(3));
  });

  it('renders an inline error and a retry button when loading fails', async () => {
    const listSellers = jasmine.createSpy().and.rejectWith(new Error('offline'));
    setup(listSellers);
    await settle();

    expect(container.textContent).toContain('No se pudieron cargar las tiendas.');
    container.querySelector('button').click();
    expect(listSellers).toHaveBeenCalledTimes(2);
  });

  it('hides the section when loading succeeds without sellers', async () => {
    setup(() => Promise.resolve([]));
    await settle();
    expect(container.querySelector('.q-featured-stores').hidden).toBe(true);
  });

  it('renders a fallback avatar and marks cards disabled until seller profiles are available', async () => {
    setup(() => Promise.resolve(sellers(1)));
    await settle();
    const card = container.querySelector('.q-store-card');

    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.title).toBe('Perfil de vendedor próximamente');
    expect(card.querySelector('.q-store-card__initials').textContent).toBe('V0');
    expect(card.querySelector('img')).toBeNull();
  });
});
