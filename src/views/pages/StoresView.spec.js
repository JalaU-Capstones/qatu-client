import { StoresViewModel } from '../../viewmodels/pages/StoresViewModel.js';
import { StoresView } from './StoresView.js';

describe('StoresView', () => {
  let container;
  let view;
  let viewModel;

  const makeSeller = (index) => ({
    id: `seller-${index}`,
    username: `vendedor${index}`,
    fullName: `Vendedor ${index}`,
    bio: `Descripción ${index}`,
    avatarPath: null,
    productCount: index + 1,
  });

  const mountView = (count = 0, overrides = {}) => {
    viewModel = new StoresViewModel({
      sellersApi: {
        listSellers: jasmine
          .createSpy()
          .and.resolveTo(Array.from({ length: count }, (_, i) => makeSeller(i))),
      },
      ...overrides,
    });
    view = new StoresView({ viewModel });
    view.mount(container);
    return viewModel;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    view?.destroy();
    container.remove();
  });

  it("renders the Tiendas de Q'atu header and search controls", () => {
    view = new StoresView({
      viewModel: new StoresViewModel({ sellersApi: { listSellers: async () => [] } }),
    });
    const element = view.mount(container);

    expect(element.querySelector('h1').textContent).toBe("Tiendas de Q'atu");
    expect(element.querySelector('input[type="search"]')).not.toBeNull();
    expect(element.querySelector('button[type="submit"]').textContent).toBe('Buscar');
  });

  it('renders the empty state when no sellers are available', async () => {
    mountView();
    await viewModel.load();
    expect(container.textContent).toContain('No hay tiendas disponibles.');
  });

  it('renders an error with a retry action', async () => {
    viewModel = new StoresViewModel({
      sellersApi: { listSellers: jasmine.createSpy().and.rejectWith(new Error('offline')) },
    });
    view = new StoresView({ viewModel });
    view.mount(container);
    await viewModel.load();

    expect(container.textContent).toContain('No se pudieron cargar las tiendas.');
    expect(container.querySelector('[role="alert"] button').textContent).toBe('Reintentar');
  });

  it('renders one accessible card per paginated seller with profile content', async () => {
    mountView(21);
    await viewModel.load();

    expect(container.querySelectorAll('.q-store-card').length).toBe(20);
    const card = container.querySelector('.q-store-card');
    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.title).toBe('Perfil de vendedor próximamente');
    expect(card.querySelector('.q-store-card__name').textContent).toBe('Vendedor 0');
    expect(card.querySelector('.q-store-card__bio').textContent).toBe('Descripción 0');
    expect(card.querySelector('.q-store-card__count').textContent).toBe('1 productos');
    expect(card.querySelector('.q-store-card__initials').textContent).toBe('V0');
  });

  it('renders pluralized toolbar text and pagination for multiple pages', async () => {
    mountView(21);
    await viewModel.load();

    expect(container.textContent).toContain('21 TIENDAS ENCONTRADAS');
    expect(container.textContent).toContain('Página 1 de 2');
    container.querySelector('.q-stores__pagination-btn:last-child').click();
    expect(container.textContent).toContain('Página 2 de 2');
  });

  it('singularizes the toolbar label and hides pagination for one seller', async () => {
    mountView(1);
    await viewModel.load();

    expect(container.textContent).toContain('1 TIENDA ENCONTRADA');
    expect(container.querySelector('.q-stores__pagination').children.length).toBe(0);
  });

  it('submits the search field to the view model', async () => {
    mountView(2);
    await viewModel.load();
    spyOn(viewModel, 'search').and.callThrough();
    const input = container.querySelector('input[type="search"]');
    input.value = 'vendedor1';
    container
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(viewModel.search).toHaveBeenCalledWith('vendedor1');
    expect(container.querySelectorAll('.q-store-card').length).toBe(1);
  });

  it('renders an image avatar when an avatar path is available', async () => {
    const seller = { ...makeSeller(0), avatarPath: '/avatar.png' };
    viewModel = new StoresViewModel({ sellersApi: { listSellers: async () => [seller] } });
    view = new StoresView({ viewModel });
    view.mount(container);
    await viewModel.load();

    expect(container.querySelector('.q-store-card__avatar-img').getAttribute('src')).toBe(
      '/avatar.png'
    );
  });
});
