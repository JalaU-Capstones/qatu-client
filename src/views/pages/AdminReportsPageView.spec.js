import { REPORT_RANGE_OPTIONS } from '../../models/adminReportRange.js';
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
      users: {
        buyer_count: 7,
        seller_count: 2,
        pending_seller_applications: 1,
      },
      usersErrorMessage: '',
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
    expect(container.textContent).toContain('Ticket promedio');
    expect(container.textContent).toContain('Compradores');
    expect(container.textContent).toContain('Vendedores');
    expect(container.textContent).toContain('Pendientes');
    expect(container.querySelector('.q-reports-chart svg')).not.toBeNull();
    expect(container.querySelectorAll('.q-reports-chart rect').length).toBe(2);
    expect(container.querySelector('.q-reports-chart__title').textContent).toBe(
      'Ventas por período'
    );
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

  it('uses compact month labels in the chart', () => {
    view = new AdminReportsPageView({
      viewModel: viewModel({
        sales: {
          ...sales,
          period_breakdown: [
            { period: '2026-06', revenue: 10, order_count: 1 },
            { period: '2026-07', revenue: 30, order_count: 1 },
          ],
        },
      }),
    });
    view.mount(container);

    const labels = [...container.querySelectorAll('.q-reports-chart svg text')].map(
      (label) => label.textContent
    );
    expect(labels).toEqual(['06', '07']);
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('AdminReportsPageView additional branches (recovered 1)', () => {
      let container;
      let view;

      function createViewModel(overrides = {}) {
        const listeners = new Set();
        const vm = {
          tab: 'sales',
          rangeKey: '30d',
          isLoading: false,
          isForbidden: false,
          errorMessage: '',
          sales: null,
          users: null,
          products: null,
          subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
            listeners.add(listener);
            return jasmine.createSpy('unsubscribe').and.callFake(() => listeners.delete(listener));
          }),
          load: jasmine.createSpy('load').and.resolveTo(),
          selectTab: jasmine.createSpy('selectTab').and.resolveTo(),
          setRange: jasmine.createSpy('setRange').and.resolveTo(),
          notify() {
            for (const listener of [...listeners]) listener(vm);
          },
          ...overrides,
        };
        return vm;
      }

      function salesPayload(overrides = {}) {
        return {
          currency: 'BOB',
          total_revenue: 100,
          total_orders: 3,
          revenue_by_currency: [],
          period_breakdown: [
            { period: '2026-03-01', revenue: 50, order_count: 1 },
            { period: '2026-03-02', revenue: 100, order_count: 2 },
          ],
          top_products: [],
          top_sellers: [],
          ...overrides,
        };
      }

      function productsPayload(overrides = {}) {
        return {
          published_products: 5,
          draft_products: 2,
          unpublished_products: 1,
          total_products: 8,
          archived_products: 0,
          new_listings: 3,
          top_selling_products: [],
          top_categories: [],
          top_rated_products: [],
          ...overrides,
        };
      }

      function mountView(vm, onNavigate = null) {
        view = new AdminReportsPageView({ viewModel: vm, onNavigate });
        view.mount(container);
        return view;
      }

      const kpis = (root) =>
        Array.from(root.querySelectorAll('.q-reports-kpi')).map((card) => ({
          label: card.querySelector('.q-reports-kpi__label').textContent,
          value: card.querySelector('.q-reports-kpi__value').textContent,
          hint: card.querySelector('.q-reports-kpi__hint')?.textContent ?? null,
        }));

      const tableBlocks = (root) =>
        Array.from(root.querySelectorAll('.q-reports-table-block')).map((block) => ({
          title: block.querySelector('.q-reports-table-block__title').textContent,
          empty: block.querySelector('.q-reports-empty')?.textContent ?? null,
          headers: Array.from(block.querySelectorAll('th')).map((th) => ({
            text: th.textContent,
            scope: th.getAttribute('scope'),
          })),
        }));

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        authStore.setSession({
          user: { id: 'admin-1', username: 'ada' },
          roles: [{ name: 'admin' }],
        });
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
        authStore.clearSession();
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      it('shows the exact sign-in gate and never loads reports for a guest', () => {
        authStore.clearSession();
        const vm = createViewModel();
        mountView(vm);

        const box = container.querySelector('[data-role="content"] .q-reports-forbidden');
        expect(box.getAttribute('role')).toBe('alert');
        expect(box.querySelector('.q-reports-forbidden__title').textContent).toBe('Inicia sesión');
        expect(box.querySelector('p').textContent).toBe(
          'Debes iniciar sesión como administrador para ver los reportes.'
        );
        expect(container.textContent).not.toContain('403 Forbidden');
        expect(vm.load).not.toHaveBeenCalled();
      });

      it('keeps gate controls live and wipes the gate on the next view-model update', () => {
        authStore.clearSession();
        const vm = createViewModel();
        mountView(vm);

        const select = container.querySelector('#admin-reports-range');
        select.value = 'year';
        select.dispatchEvent(new Event('change'));
        expect(vm.setRange).toHaveBeenCalledWith('year');

        container.querySelector('[data-tab="products"]').click();
        expect(vm.selectTab).toHaveBeenCalledWith('products');

        vm.tab = 'sales';
        vm.sales = salesPayload();
        vm.notify();

        expect(container.textContent).not.toContain('Inicia sesión');
        expect(container.querySelector('.q-reports-chart')).not.toBeNull();
      });

      it('renders the forbidden copy and sends the home button to the root path', () => {
        authStore.setSession({
          user: { id: 'buyer-1', username: 'ana' },
          roles: [{ name: 'buyer' }],
        });
        const vm = createViewModel();
        const onNavigate = jasmine.createSpy('onNavigate');
        mountView(vm, onNavigate);

        const box = container.querySelector('[data-role="content"] .q-reports-forbidden');
        expect(box.getAttribute('role')).toBe('alert');
        expect(Array.from(box.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
          '403 Forbidden',
          'No tienes permisos de administrador para ver los reportes.',
        ]);
        expect(box.querySelector('h2').textContent).toBe('Acceso denegado');
        const home = box.querySelector('button');
        expect(home.textContent).toBe('Volver al inicio');
        home.click();
        expect(onNavigate).toHaveBeenCalledWith('/');
        expect(vm.load).not.toHaveBeenCalled();
      });

      it('switches to the forbidden panel when the view model sets isForbidden', () => {
        const vm = createViewModel({ sales: salesPayload() });
        mountView(vm);
        expect(container.querySelector('.q-reports-chart')).not.toBeNull();

        vm.isForbidden = true;
        vm.notify();

        expect(container.textContent).toContain('Acceso denegado');
        expect(container.querySelector('.q-reports-chart')).toBeNull();
        expect(vm.load).toHaveBeenCalledTimes(1);
      });

      it('renders the four range options with their exact keys and labels', () => {
        mountView(createViewModel());

        const select = container.querySelector('#admin-reports-range');
        expect(container.querySelector('label[for="admin-reports-range"]').textContent).toBe(
          'Período:'
        );
        expect(
          Array.from(select.options).map((option) => ({
            value: option.value,
            label: option.textContent,
          }))
        ).toEqual(
          REPORT_RANGE_OPTIONS.map((option) => ({ value: option.key, label: option.label }))
        );
        expect(select.className).toBe('q-orders-filter__select');
      });

      it('asks for a new range on change and syncs select.value from the view model', () => {
        const vm = createViewModel();
        mountView(vm);

        const select = container.querySelector('#admin-reports-range');
        expect(select.value).toBe('30d');
        select.value = '90d';
        select.dispatchEvent(new Event('change'));
        expect(vm.setRange).toHaveBeenCalledWith('90d');

        vm.rangeKey = 'year';
        vm.notify();
        expect(select.value).toBe('year');
      });

      it('marks the active tab with aria-selected and is-active and delegates clicks', () => {
        const vm = createViewModel();
        mountView(vm);

        const tablist = container.querySelector('.q-reports-tabs');
        expect(tablist.getAttribute('role')).toBe('tablist');
        expect(tablist.getAttribute('aria-label')).toBe('Tipo de reporte');
        const tabs = Array.from(tablist.querySelectorAll('button'));
        expect(
          tabs.map((button) => ({
            tab: button.dataset.tab,
            label: button.textContent,
            role: button.getAttribute('role'),
            selected: button.getAttribute('aria-selected'),
            active: button.classList.contains('is-active'),
          }))
        ).toEqual([
          { tab: 'sales', label: 'Ventas', role: 'tab', selected: 'true', active: true },
          { tab: 'users', label: 'Usuarios', role: 'tab', selected: 'false', active: false },
          { tab: 'products', label: 'Catálogo', role: 'tab', selected: 'false', active: false },
        ]);

        tabs[2].click();
        expect(vm.selectTab).toHaveBeenCalledWith('products');
      });

      it('renders the error alert with a retry button and suppresses the no-data copy', () => {
        const vm = createViewModel({ errorMessage: 'No se pudo cargar el reporte.' });
        mountView(vm);

        expect(container.querySelector('[data-role="error"]').getAttribute('role')).toBe('alert');
        // The wrapper owns role="alert"; the message itself is the nested alert div.
        const alert = container.querySelector('.q-reports-error .q-orders-alert');
        expect(alert.className).toBe('q-orders-alert q-orders-alert--forbidden');
        expect(alert.textContent).toBe('No se pudo cargar el reporte.');
        expect(container.textContent).not.toContain('No hay datos para este reporte.');

        const retry = container.querySelector('.q-reports-retry');
        expect(retry.textContent).toBe('Reintentar');
        expect(retry.type).toBe('button');
        retry.click();
        expect(vm.load).toHaveBeenCalledTimes(2);
      });

      it('shows the exact loading copy while the active payload is missing', () => {
        mountView(createViewModel({ isLoading: true, sales: null }));

        expect(container.querySelector('[data-role="content"]').textContent).toBe(
          'Cargando reportes…'
        );
        expect(container.querySelector('.q-reports-error').textContent).toBe('');
      });

      it('uses an em dash and Sin ventas when the sales currency is null, with bare table numbers', () => {
        const vm = createViewModel({
          sales: salesPayload({
            currency: null,
            total_revenue: 40,
            total_orders: 1,
            period_breakdown: [{ period: '2026-03-01', revenue: 40, order_count: 1 }],
            top_products: [{ title: 'Manta', units_sold: 2, revenue: 40 }],
          }),
        });
        mountView(vm);

        expect(kpis(container).slice(0, 2)).toEqual([
          { label: 'Ingresos', value: '—', hint: 'Sin ventas' },
          { label: 'Pedidos', value: '1', hint: 'Sin cancelados ni reembolsos' },
        ]);
        expect(container.textContent).toContain('Ventas por período');
        const cells = container
          .querySelectorAll('.q-reports-table-block')[0]
          .querySelectorAll('tbody td');
        expect(cells[2].textContent).toBe('40.00');
      });

      it('names the report currency and formats other currencies with singular/plural counts', () => {
        const vm = createViewModel({
          sales: salesPayload({
            currency: 'BOB',
            total_orders: 1,
            revenue_by_currency: [
              { currency: 'BOB', revenue: 100, order_count: 1 },
              { currency: 'USD', revenue: 5, order_count: 1 },
              { currency: 'EUR', revenue: 8, order_count: 2 },
            ],
          }),
        });
        mountView(vm);

        expect(kpis(container)[0].hint).toBe('Moneda BOB');
        expect(container.querySelector('.q-reports-note').textContent).toBe(
          'Otras monedas: US$ 5.00 (1 pedido) · € 8.00 (2 pedidos)'
        );
      });

      it('ignores a non-array revenue_by_currency without rendering an other-currencies note', () => {
        mountView(createViewModel({ sales: salesPayload({ revenue_by_currency: 'invalid' }) }));

        expect(container.querySelector('.q-reports-note')).toBeNull();
        expect(container.querySelector('.q-reports-chart')).not.toBeNull();
      });

      it('truncates countable values to whole numbers in KPIs and chart tooltips', () => {
        mountView(
          createViewModel({
            sales: salesPayload({
              total_orders: 2.9,
              period_breakdown: [{ period: '2026-03-01', revenue: 100, order_count: 1.8 }],
            }),
          })
        );

        expect(kpis(container)[1].value).toBe('2');
        expect(container.querySelector('.q-reports-chart rect title').textContent).toBe(
          '2026-03-01: Bs 100.00, 1 pedidos'
        );
      });

      it('renders non-finite counts as 0 and skips the chart when there are no sales', () => {
        mountView(
          createViewModel({
            sales: salesPayload({
              total_orders: Number.NaN,
              period_breakdown: [],
              top_products: [{ title: 'Manta', units_sold: 'abc', revenue: 40 }],
            }),
          })
        );

        expect(kpis(container)[1].value).toBe('0');
        const cells = container
          .querySelectorAll('.q-reports-table-block')[0]
          .querySelectorAll('tbody td');
        expect(cells[1].textContent).toBe('0');
        expect(container.querySelector('.q-reports-chart')).toBeNull();
      });

      it('draws the chart with short ISO labels, accessible metadata and exact bar attributes', () => {
        mountView(createViewModel({ sales: salesPayload() }));

        const panel = container.querySelector('.q-reports-chart');
        expect(panel.querySelector('h2').textContent).toBe('Ventas por período');
        const svg = panel.querySelector('svg');
        expect(svg.getAttribute('viewBox')).toBe('0 0 280 180');
        expect(svg.getAttribute('role')).toBe('img');
        expect(svg.getAttribute('aria-label')).toBe('Ventas por periodo en BOB. 2 periodos.');

        const bars = svg.querySelectorAll('rect');
        expect(bars.length).toBe(2);
        expect(
          Array.from(bars).map((rect) => ({
            x: rect.getAttribute('x'),
            y: rect.getAttribute('y'),
            width: rect.getAttribute('width'),
            height: rect.getAttribute('height'),
            rx: rect.getAttribute('rx'),
            fill: rect.getAttribute('fill'),
            title: rect.querySelector('title').textContent,
          }))
        ).toEqual([
          {
            x: '8',
            y: '79',
            width: '20',
            height: '55',
            rx: '4',
            fill: 'url(#q-reports-bar)',
            title: '2026-03-01: Bs 50.00, 1 pedidos',
          },
          {
            x: '44',
            y: '24',
            width: '20',
            height: '110',
            rx: '4',
            fill: 'url(#q-reports-bar)',
            title: '2026-03-02: Bs 100.00, 2 pedidos',
          },
        ]);
        expect(Array.from(svg.querySelectorAll('text')).map((label) => label.textContent)).toEqual([
          '03-01',
          '03-02',
        ]);
      });

      it('shows only every fifth label except the last for long charts and keeps non-ISO periods', () => {
        const periods = Array.from({ length: 13 }, (_, index) => ({
          period: index === 5 ? 'semana-5' : `2026-02-${String(index + 1).padStart(2, '0')}`,
          revenue: index + 1,
          order_count: 1,
        }));
        mountView(createViewModel({ sales: salesPayload({ period_breakdown: periods }) }));

        const svg = container.querySelector('.q-reports-chart svg');
        expect(svg.getAttribute('viewBox')).toBe('0 0 468 180');
        expect(Array.from(svg.querySelectorAll('text')).map((label) => label.textContent)).toEqual([
          '02-01',
          'semana-5',
          '02-11',
          '02-13',
        ]);
      });

      it('renders an empty chart without crashing when the period breakdown is empty', () => {
        mountView(createViewModel({ sales: salesPayload({ period_breakdown: [] }) }));

        const svg = container.querySelector('.q-reports-chart svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('viewBox')).toBe('0 0 280 180');
        expect(svg.querySelectorAll('rect').length).toBe(0);
      });

      it('maps every users-tab field to its exact KPI label, value and hint', () => {
        mountView(
          createViewModel({
            tab: 'users',
            sales: null,
            users: {
              buyer_count: 8,
              seller_count: 2,
              pending_seller_applications: 1,
              total_users: 11,
              new_registrations: 3,
              active_buyers: 4,
              active_sellers: 1,
            },
          })
        );

        expect(kpis(container)).toEqual([
          { label: 'Compradores', value: '8', hint: 'Con el rol buyer' },
          { label: 'Vendedores', value: '2', hint: 'Con el rol seller' },
          { label: 'Solicitudes pendientes', value: '1', hint: 'Cola actual' },
          { label: 'Usuarios', value: '11', hint: 'Perfiles registrados' },
          { label: 'Altas del periodo', value: '3', hint: 'Cuentas nuevas' },
          { label: 'Compraron', value: '4', hint: 'Con un pedido en el periodo' },
          { label: 'Vendieron', value: '1', hint: 'Con una venta en el periodo' },
        ]);
      });

      it('maps products-tab fields and formats top ratings with one decimal', () => {
        mountView(
          createViewModel({
            tab: 'products',
            sales: null,
            products: productsPayload({
              top_selling_products: [{ title: 'Poncho', units_sold: 4 }],
              top_categories: [{ name: 'Textiles', product_count: 3 }],
              top_rated_products: [{ title: 'Manta', average_rating: 4, rating_count: 12 }],
            }),
          })
        );

        expect(kpis(container)).toEqual([
          { label: 'Publicados', value: '5', hint: 'Visibles en el catálogo' },
          { label: 'Borradores', value: '2', hint: 'Todavía no publicados' },
          { label: 'No publicados', value: '1', hint: 'Retirados de la venta' },
          { label: 'Total', value: '8', hint: 'Sin los eliminados' },
          { label: 'Archivados', value: '0', hint: 'Fuera del catálogo' },
          { label: 'Nuevos en el periodo', value: '3', hint: 'Creados en las fechas' },
        ]);
        const thirdTable = container.querySelectorAll('.q-reports-table-block')[2];
        expect(
          Array.from(thirdTable.querySelectorAll('tbody td')).map((cell) => cell.textContent)
        ).toEqual(['Manta', '4.0', '12']);
      });

      it('renders column-scoped headers and data-label attributes on populated tables', () => {
        mountView(
          createViewModel({
            sales: salesPayload({
              top_products: [{ title: 'Manta', units_sold: 3, revenue: 60 }],
              top_sellers: [{ display_name: 'Taller Illimani', revenue: 60 }],
            }),
          })
        );

        const blocks = tableBlocks(container);
        expect(blocks.map((block) => block.title)).toEqual([
          'Productos más vendidos',
          'Vendedores con más ingresos',
        ]);
        expect(blocks[0].headers).toEqual([
          { text: 'Producto', scope: 'col' },
          { text: 'Unidades', scope: 'col' },
          { text: 'Ingresos', scope: 'col' },
        ]);
        const cells = container
          .querySelectorAll('.q-reports-table-block')[0]
          .querySelectorAll('tbody tr:first-child td');
        expect(
          Array.from(cells).map((cell) => ({
            label: cell.getAttribute('data-label'),
            text: cell.textContent,
          }))
        ).toEqual([
          { label: 'Producto', text: 'Manta' },
          { label: 'Unidades', text: '3' },
          { label: 'Ingresos', text: 'Bs 60.00' },
        ]);
      });

      it('shows the exact empty-table copy on both sales tables', () => {
        // Tables are only rendered when the active sales payload is present.
        mountView(createViewModel({ sales: salesPayload() }));

        expect(tableBlocks(container).map((block) => block.empty)).toEqual([
          'Nadie compró productos en este periodo.',
          'No hay vendedores con ventas en este periodo.',
        ]);
      });

      it('shows the exact empty-table copy on all product tables', () => {
        mountView(
          createViewModel({
            tab: 'products',
            sales: null,
            products: productsPayload(),
          })
        );

        expect(tableBlocks(container).map((block) => block.empty)).toEqual([
          'Nadie compró productos en este periodo.',
          'No hay productos con categoría.',
          'Todavía no hay valoraciones.',
        ]);
      });

      it('unsubscribes, removes the DOM and ignores updates after destroy', () => {
        const vm = createViewModel();
        mountView(vm);
        const unsubscribe = vm.subscribe.calls.mostRecent().returnValue;
        const listener = vm.subscribe.calls.mostRecent().args[0];
        view.destroy();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(view.element).toBeNull();
        expect(container.querySelector('.q-reports-page')).toBeNull();
        expect(container.childNodes.length).toBe(0);

        listener();
        expect(container.childNodes.length).toBe(0);
      });

      it('reuses the rendered element until destroy creates a fresh one', () => {
        const vm = createViewModel();
        view = new AdminReportsPageView({ viewModel: vm });
        const first = view.render();
        expect(view.render()).toBe(first);

        view.mount(container);
        expect(view.element).toBe(first);
        expect(container.querySelector('.q-reports-page')).toBe(first);
        expect(view.render()).toBe(first);

        view.destroy();
        expect(view.render()).not.toBe(first);
      });
    });
  })();
})();
