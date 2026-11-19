import { authStore } from '../../store/authStore.js';
import { AdminReportsPageView } from './AdminReportsPageView.js';

describe('AdminReportsPageView', () => {
  let container;
  let view;

  const sales = {
    currency: 'BOB',
    total_revenue: 40,
    total_orders: 2,
    revenue_by_currency: [
      { currency: 'BOB', revenue: 40, order_count: 2 },
      { currency: 'USD', revenue: 5, order_count: 1 },
    ],
    period_breakdown: [
      { period: '2026-03-01', revenue: 10, order_count: 1 },
      { period: '2026-03-02', revenue: 30, order_count: 1 },
    ],
    top_products: [{ title: 'Manta <img src=x onerror=alert(1)>', units_sold: 3, revenue: 40 }],
    top_sellers: [{ display_name: 'Taller Illimani', revenue: 40 }],
  };

  function viewModel(overrides = {}) {
    return {
      tab: 'sales',
      rangeKey: '30d',
      isLoading: false,
      isForbidden: false,
      errorMessage: '',
      sales,
      users: null,
      products: null,
      subscribe() {
        return () => {};
      },
      load: jasmine.createSpy('load').and.resolveTo(),
      selectTab: jasmine.createSpy('selectTab').and.resolveTo(),
      setRange: jasmine.createSpy('setRange').and.resolveTo(),
      ...overrides,
    };
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    authStore.setSession({
      user: { id: 'admin-1', username: 'ada' },
      roles: [{ name: 'admin' }],
    });
  });

  afterEach(() => {
    if (view) view.destroy();
    container.remove();
    authStore.clearSession();
  });

  it('shows revenue, orders, and the period chart for an admin', () => {
    const vm = viewModel();
    view = new AdminReportsPageView({ viewModel: vm });
    view.mount(container);

    expect(container.textContent).toContain('Bs 40.00');
    expect(container.textContent).toContain('Pedidos');
    expect(container.querySelector('.q-reports-chart svg')).not.toBeNull();
    expect(container.querySelectorAll('.q-reports-chart rect').length).toBe(2);
    expect(vm.load).toHaveBeenCalled();
  });

  it('writes product names as text, so markup in a title is not executed', () => {
    view = new AdminReportsPageView({ viewModel: viewModel() });
    view.mount(container);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Manta <img src=x onerror=alert(1)>');
  });

  it('says there are no sales when the period is empty', () => {
    view = new AdminReportsPageView({
      viewModel: viewModel({
        sales: {
          currency: null,
          total_revenue: 0,
          total_orders: 0,
          revenue_by_currency: [],
          period_breakdown: [],
          top_products: [],
          top_sellers: [],
        },
      }),
    });
    view.mount(container);

    expect(container.textContent).toContain('No hay ventas en este periodo.');
    expect(container.querySelector('.q-reports-chart')).toBeNull();
  });

  it('shows buyers, sellers, and pending applications on the users tab', () => {
    view = new AdminReportsPageView({
      viewModel: viewModel({
        tab: 'users',
        sales: null,
        users: {
          buyer_count: 8,
          seller_count: 2,
          pending_seller_applications: 1,
          total_users: 8,
          new_registrations: 3,
          active_buyers: 4,
          active_sellers: 1,
        },
      }),
    });
    view.mount(container);

    expect(container.textContent).toContain('Compradores');
    expect(container.textContent).toContain('Vendedores');
    expect(container.textContent).toContain('Solicitudes pendientes');
    expect(container.textContent).toContain('8');
    expect(container.textContent).toContain('1');
  });

  it('shows published, draft, and unpublished counts', () => {
    view = new AdminReportsPageView({
      viewModel: viewModel({
        tab: 'products',
        sales: null,
        products: {
          published_products: 5,
          draft_products: 2,
          unpublished_products: 1,
          archived_products: 0,
          total_products: 8,
          new_listings: 3,
          top_selling_products: [{ title: 'Poncho', units_sold: 4 }],
          top_categories: [],
          top_rated_products: [],
        },
      }),
    });
    view.mount(container);

    expect(container.textContent).toContain('Publicados');
    expect(container.textContent).toContain('Borradores');
    expect(container.textContent).toContain('No publicados');
    expect(container.textContent).toContain('Poncho');
  });

  it('does not load reports for a signed-in user who is not an admin', () => {
    authStore.setSession({
      user: { id: 'buyer-1', username: 'ana' },
      roles: [{ name: 'buyer' }],
    });
    const vm = viewModel();
    view = new AdminReportsPageView({ viewModel: vm });
    view.mount(container);

    expect(container.textContent).toContain('403 Forbidden');
    expect(vm.load).not.toHaveBeenCalled();
  });

  it('asks the view model for another tab when a tab is clicked', () => {
    const vm = viewModel();
    view = new AdminReportsPageView({ viewModel: vm });
    view.mount(container);

    container.querySelector('[data-tab="products"]').click();

    expect(vm.selectTab).toHaveBeenCalledWith('products');
  });
});
