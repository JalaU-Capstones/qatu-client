import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { SellerOrdersViewModel } from '../../viewmodels/pages/SellerOrdersViewModel.js';
import { SellerOrdersPageView } from './SellerOrdersPageView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function apiError(code, statusCode = 400) {
  const err = new Error(code);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function sellerOrder(overrides = {}) {
  return {
    id: 'o1',
    order_number: 'ORD-00100042',
    buyer_id: 'b1',
    status: 'confirmed',
    currency: 'USD',
    created_at: '2026-10-14T11:00:00.000Z',
    items: [{ product_name: 'Chair', quantity: 2, subtotal: 40 }],
    ...overrides,
  };
}

describe('SellerOrdersPageView', () => {
  let container;
  let view;
  let ordersApi;
  let profilesApi;
  let viewModel;
  let orders;

  const rows = () => [...container.querySelectorAll('tbody tr')];
  const rowFor = (id) => container.querySelector(`tr[data-order-id="${id}"]`);
  const selectIn = (row) => row.querySelector('select');

  function build() {
    ordersApi = {
      listOrders: jasmine.createSpy('listOrders').and.callFake(async () => ({
        data: orders,
        meta: { page: 1, per_page: 10, total: orders.length, total_pages: 1 },
      })),
      updateOrderStatus: jasmine
        .createSpy('updateOrderStatus')
        .and.callFake(async (id, status) => ({
          data: { id, status, items: [{ subtotal: 40 }] },
        })),
    };
    profilesApi = {
      getById: jasmine.createSpy('getById').and.resolveTo({ data: { full_name: 'Buyer One' } }),
    };
    viewModel = new SellerOrdersViewModel({ ordersApi, profilesApi });
    view = new SellerOrdersPageView({ viewModel, onNavigate: jasmine.createSpy('onNavigate') });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    orders = [sellerOrder()];
    spyOn(authStore, 'isAuthenticated').and.returnValue(true);
    spyOn(authStore, 'isSeller').and.returnValue(true);
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  describe('access gate (defense in depth behind the route guard)', () => {
    it('asks anonymous visitors to sign in, remembers the return path and never calls the API', async () => {
      authStore.isAuthenticated.and.returnValue(false);
      authStore.isSeller.and.returnValue(false);
      spyOn(authRedirectStore, 'setReturnTo');
      build();
      view.mount(container);
      await tick();

      expect(container.textContent).toContain('Debes iniciar sesión');
      expect(ordersApi.listOrders).not.toHaveBeenCalled();

      container.querySelector('button.q-btn--primary').click();
      expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith('/seller/orders');
      expect(view.onNavigate).toHaveBeenCalledWith('/login');
    });

    it('tells a signed-in buyer that the panel is for sellers and never calls the API', async () => {
      authStore.isSeller.and.returnValue(false);
      build();
      view.mount(container);
      await tick();

      expect(container.textContent).toContain('Solo los vendedores');
      expect(ordersApi.listOrders).not.toHaveBeenCalled();
      expect(container.querySelector('table')).toBeNull();
    });
  });

  describe('rendering', () => {
    it('lists the seller orders with their buyer, products and seller-only revenue', async () => {
      build();
      view.mount(container);
      await tick();

      expect(container.querySelector('.q-seller-orders-page__title').textContent).toBe(
        'Mis ventas'
      );
      expect(container.querySelector('.q-seller-orders-page__subtitle').textContent).toBe(
        'Pedidos que incluyen tus productos y control de estado'
      );
      expect(container.querySelector('.q-seller-orders-page__filter')).not.toBeNull();
      expect(ordersApi.listOrders).toHaveBeenCalledWith(
        jasmine.objectContaining({ view: 'seller' })
      );
      expect(rows().length).toBe(1);
      const text = rowFor('o1').textContent;
      expect(text).toContain('ORD-00100042');
      expect(text).toContain('Buyer One');
      expect(text).toContain('Chair ×2');
      expect(text).toContain('40.00');
      expect(text).toContain('Confirmada');
      expect([...container.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
        'Pedido',
        'Fecha',
        'Comprador',
        'Productos',
        'Ingreso',
        'Estado',
        'Actualizar',
      ]);
    });

    it('shows an empty state when there are no sales', async () => {
      orders = [];
      build();
      view.mount(container);
      await tick();

      expect(container.textContent).toContain('Aún no tienes ventas');
      expect(container.querySelector('table')).toBeNull();
    });

    it('shows the error (and no empty state) when the list fails to load', async () => {
      build();
      ordersApi.listOrders.and.rejectWith(apiError('FORBIDDEN', 403));
      view.mount(container);
      await tick();

      expect(container.querySelector('[role="alert"]').textContent).toContain(
        'permisos de vendedor'
      );
      expect(container.textContent).not.toContain('Aún no tienes ventas');
    });

    it('renders the KPI cards', async () => {
      orders = [sellerOrder({ id: 'a', status: 'pending' }), sellerOrder({ id: 'b' })];
      build();
      view.mount(container);
      await tick();

      const kpis = container.querySelector('[data-role="kpis"]').textContent;
      expect(kpis).toContain('Por confirmar');
      expect(kpis).toContain('80.00');
      expect(container.querySelectorAll('.q-seller-orders-kpi').length).toBe(4);
      expect(
        container.querySelector('.q-seller-orders-kpi--revenue .q-seller-orders-kpi__label')
          .textContent
      ).toBe('Ingresos (página)');
    });
  });

  describe('security: order data is rendered as text, never as HTML', () => {
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';

    afterEach(() => {
      delete window.__xss;
    });

    it('a malicious buyer full_name is not interpreted as markup', async () => {
      build();
      profilesApi.getById.and.resolveTo({ data: { full_name: payload } });
      view.mount(container);
      await tick(30);

      expect(container.querySelector('tbody img')).toBeNull();
      expect(container.querySelector('tbody script')).toBeNull();
      expect(rowFor('o1').textContent).toContain(payload);
      expect(window.__xss).toBeUndefined();
    });

    it('a malicious product name or order number is not interpreted as markup', async () => {
      orders = [
        sellerOrder({
          order_number: payload,
          items: [{ product_name: payload, quantity: 1, subtotal: 5 }],
        }),
      ];
      build();
      view.mount(container);
      await tick(30);

      expect(container.querySelector('tbody img')).toBeNull();
      expect(container.querySelector('tbody script')).toBeNull();
      expect(window.__xss).toBeUndefined();
    });

    it('an unknown status cannot inject a CSS class or markup', async () => {
      orders = [sellerOrder({ status: '"><img src=x onerror=alert(1)>' })];
      build();
      view.mount(container);
      await tick();

      const badge = rowFor('o1').querySelector('.q-order-status');
      expect(badge.className).toBe('q-order-status q-order-status--unknown');
      expect(container.querySelector('tbody img')).toBeNull();
    });
  });

  describe('terminal states', () => {
    for (const status of ['delivered', 'cancelled']) {
      it(`${status}: no selector, an explained dash instead`, async () => {
        orders = [sellerOrder({ status })];
        build();
        view.mount(container);
        await tick();

        const row = rowFor('o1');
        expect(selectIn(row)).toBeNull();
        expect(row.querySelector('[title="Estado final: no se puede cambiar"]')).not.toBeNull();
        expect(row.querySelector('.q-sr-only').textContent).toContain('Estado final');
      });
    }

    it('a non-terminal order offers only its valid next statuses', async () => {
      build();
      view.mount(container);
      await tick();

      const values = [...selectIn(rowFor('o1')).options].map((o) => o.value).filter(Boolean);
      expect(values).toEqual(['shipped', 'cancelled']);
    });
  });

  describe('updating a status', () => {
    it('sends the new status, shows the success notice and re-renders the row', async () => {
      build();
      view.mount(container);
      await tick();

      const select = selectIn(rowFor('o1'));
      select.value = 'shipped';
      select.dispatchEvent(new Event('change'));
      await tick();

      expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith('o1', 'shipped');
      expect(container.querySelector('[data-role="notice"]').textContent).toContain('Enviada');
      expect(rowFor('o1').textContent).toContain('Enviada');
      const values = [...selectIn(rowFor('o1')).options].map((o) => o.value).filter(Boolean);
      expect(values).toEqual(['delivered']);
    });

    it('disables only the selector of the order being updated and shows progress', async () => {
      orders = [sellerOrder({ id: 'o1' }), sellerOrder({ id: 'o2', buyer_id: 'b2' })];
      build();
      let finish;
      ordersApi.updateOrderStatus.and.returnValue(
        new Promise((resolve) => {
          finish = () =>
            resolve({ data: { id: 'o1', status: 'shipped', items: [{ subtotal: 40 }] } });
        })
      );
      view.mount(container);
      await tick();

      const select = selectIn(rowFor('o1'));
      select.value = 'shipped';
      select.dispatchEvent(new Event('change'));
      await tick();

      expect(selectIn(rowFor('o1')).disabled).toBe(true);
      expect(selectIn(rowFor('o2')).disabled).toBe(false);
      expect(rowFor('o1').textContent).toContain('Actualizando…');
      expect(rowFor('o1').getAttribute('aria-busy')).toBe('true');

      finish();
      await tick();
      expect(rowFor('o1').textContent).not.toContain('Actualizando…');
    });

    it('shows a specific, announced error when the update is rejected', async () => {
      build();
      ordersApi.updateOrderStatus.and.rejectWith(apiError('FORBIDDEN', 403));
      view.mount(container);
      await tick();

      const select = selectIn(rowFor('o1'));
      select.value = 'shipped';
      select.dispatchEvent(new Event('change'));
      await tick();

      const alert = container.querySelector('[role="alert"]');
      expect(alert.textContent).toContain('No tienes permiso');
      expect(container.querySelector('[data-role="notice"]').textContent).toBe('');
    });

    it('ignores the placeholder option', async () => {
      build();
      view.mount(container);
      await tick();

      const select = selectIn(rowFor('o1'));
      select.value = '';
      select.dispatchEvent(new Event('change'));
      await tick();

      expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('labels every status selector with its order number', async () => {
      build();
      view.mount(container);
      await tick();

      expect(selectIn(rowFor('o1')).getAttribute('aria-label')).toBe(
        'Cambiar estado del pedido ORD-00100042'
      );
    });

    it('has live regions for notices and a column scope on every header', async () => {
      build();
      view.mount(container);
      await tick();

      expect(container.querySelector('[data-role="notice"]').getAttribute('aria-live')).toBe(
        'polite'
      );
      expect(container.querySelector('[data-role="error"]').getAttribute('role')).toBe('alert');
      const headers = [...container.querySelectorAll('thead th')];
      expect(headers.length).toBeGreaterThan(0);
      expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    });

    it('labels the status filter', async () => {
      build();
      view.mount(container);
      await tick();

      const select = container.querySelector('#seller-order-status-filter');
      expect(container.querySelector('label[for="seller-order-status-filter"]')).not.toBeNull();
      expect(select).not.toBeNull();
    });
  });

  describe('filter and pagination', () => {
    it('reloads with the selected status', async () => {
      build();
      view.mount(container);
      await tick();

      const filter = container.querySelector('#seller-order-status-filter');
      filter.value = 'shipped';
      filter.dispatchEvent(new Event('change'));
      await tick();

      expect(ordersApi.listOrders).toHaveBeenCalledWith(
        jasmine.objectContaining({ status: 'shipped', view: 'seller', page: 1 })
      );
    });

    it('keeps the previous rows visible (dimmed) while a new page loads', async () => {
      build();
      view.mount(container);
      await tick();
      expect(rows().length).toBe(1);

      let finish;
      ordersApi.listOrders.and.returnValue(
        new Promise((resolve) => {
          finish = () =>
            resolve({
              data: orders,
              meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
            });
        })
      );
      const reload = viewModel.loadOrders(1);
      await tick();

      expect(rows().length).toBe(1);
      expect(container.querySelector('.q-seller-orders-table-wrap.is-loading')).not.toBeNull();

      finish();
      await reload;
      expect(container.querySelector('.is-loading')).toBeNull();
    });

    it('shows pagination only when there is more than one page', async () => {
      build();
      ordersApi.listOrders.and.resolveTo({
        data: orders,
        meta: { page: 1, per_page: 1, total: 3, total_pages: 3 },
      });
      view.mount(container);
      await tick();

      const pager = container.querySelector('nav.q-orders-page__pagination');
      expect(pager).not.toBeNull();
      expect(pager.getAttribute('aria-label')).toBe('Paginación de ventas');
      expect(pager.querySelector('.q-pagination-info').textContent).toBe('Página 1 de 3');
      const prev = pager.querySelector('.q-pagination-prev');
      const next = pager.querySelector('.q-pagination-next');
      expect(prev.disabled).toBe(true);
      expect(next.disabled).toBe(false);
    });
  });

  it('stops reacting to the view model after destroy()', async () => {
    build();
    view.mount(container);
    await tick();
    view.destroy();

    await expectAsync(viewModel.loadOrders(1)).toBeResolved();
    expect(container.querySelector('table')).toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

  function sellerOrder(overrides = {}) {
    return {
      id: 'o1',
      order_number: 'ORD-00100042',
      buyer_id: 'b1',
      status: 'confirmed',
      currency: 'USD',
      created_at: '2026-10-14T11:00:00.000Z',
      items: [{ product_name: 'Chair', quantity: 2, subtotal: 40 }],
      ...overrides,
    };
  }

  describe('SellerOrdersPageView (recovered 1)', () => {
    let container;
    let view;
    let ordersApi;
    let profilesApi;
    let viewModel;
    let orders;

    const rowFor = (id) => container.querySelector(`tr[data-order-id="${id}"]`);
    const selectIn = (row) => row.querySelector('select');

    function build() {
      ordersApi = {
        listOrders: jasmine.createSpy('listOrders').and.callFake(async () => ({
          data: orders,
          meta: { page: 1, per_page: 10, total: orders.length, total_pages: 1 },
        })),
        updateOrderStatus: jasmine
          .createSpy('updateOrderStatus')
          .and.callFake(async (id, status) => ({
            data: { id, status, items: [{ subtotal: 40 }] },
          })),
      };
      profilesApi = {
        getById: jasmine.createSpy('getById').and.resolveTo({ data: { full_name: 'Buyer One' } }),
      };
      viewModel = new SellerOrdersViewModel({ ordersApi, profilesApi });
      view = new SellerOrdersPageView({ viewModel, onNavigate: jasmine.createSpy('onNavigate') });
    }

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      orders = [sellerOrder()];
      spyOn(authStore, 'isAuthenticated').and.returnValue(true);
      spyOn(authStore, 'isSeller').and.returnValue(true);
    });

    afterEach(() => {
      view?.destroy();
      view = null;
      container.remove();
    });

    describe('terminal states (recovered 2)', () => {
      for (const status of ['delivered', 'cancelled']) {
        it(`${status}: no selector, an explained dash instead`, async () => {
          orders = [sellerOrder({ status })];
          build();
          view.mount(container);
          await tick();

          const row = rowFor('o1');
          expect(selectIn(row)).toBeNull();
          expect(row.querySelector('[title="Estado final: no se puede cambiar"]')).not.toBeNull();
          expect(row.querySelector('.q-sr-only').textContent).toContain('Estado final');
        });
      }
    });
  });

  (() => {
    const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

    function sellerOrder(overrides = {}) {
      return {
        id: 'o1',
        order_number: 'ORD-00100042',
        buyer_id: 'buyer-123456789',
        status: 'confirmed',
        currency: 'USD',
        created_at: '2026-10-14T11:00:00.000Z',
        items: [{ product_name: 'Chair', quantity: 2, subtotal: 40 }],
        ...overrides,
      };
    }

    function createMockVM(overrides = {}) {
      const transitions = {
        pending: ['confirmed'],
        confirmed: ['shipped', 'cancelled'],
        shipped: ['delivered'],
      };
      const vm = {
        orders: [],
        meta: { page: 1, per_page: 10, total: 0, total_pages: 0 },
        isLoading: false,
        errorMessage: '',
        noticeMessage: '',
        statusFilter: '',
        _listeners: new Set(),
        subscribe(listener) {
          this._listeners.add(listener);
          return () => this._listeners.delete(listener);
        },
        notify() {
          for (const listener of this._listeners) listener(this);
        },
        // The real VM notifies its subscribers at the start and end of a load;
        // notifying here lets the view render its table/KPIs/empty state on mount.
        loadOrders: jasmine.createSpy('loadOrders').and.callFake(() => {
          vm.notify();
          return Promise.resolve();
        }),
        setStatusFilter: jasmine.createSpy('setStatusFilter').and.resolveTo(),
        updateStatus: jasmine.createSpy('updateStatus').and.resolveTo(),
        getKpis: jasmine.createSpy('getKpis').and.returnValue({
          toConfirm: 0,
          toShip: 0,
          shipped: 0,
          revenue: 0,
        }),
        getBuyerLabel: jasmine
          .createSpy('getBuyerLabel')
          .and.callFake((order) => (order?.buyer_id ? order.buyer_id.slice(0, 8) : 'Comprador')),
        getNextStatuses: jasmine
          .createSpy('getNextStatuses')
          .and.callFake((order) =>
            transitions[order?.status] ? [...transitions[order.status]] : []
          ),
        isOrderUpdating: jasmine.createSpy('isOrderUpdating').and.returnValue(false),
        ...overrides,
      };
      return vm;
    }

    describe('SellerOrdersPageView additional branches (recovered 3)', () => {
      let container;
      let vm;
      let view;

      const el = (selector) => container.querySelector(selector);
      const rowFor = (id) => el(`tr[data-order-id="${id}"]`);
      const cellsFor = (id) => [...rowFor(id).querySelectorAll('td')];

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        spyOn(authStore, 'isAuthenticated').and.returnValue(true);
        spyOn(authStore, 'isSeller').and.returnValue(true);
        vm = createMockVM();
        view = new SellerOrdersPageView({
          viewModel: vm,
          onNavigate: jasmine.createSpy('onNavigate'),
        });
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        window.sessionStorage.clear();
        window.localStorage.clear();
        container.remove();
      });

      it('offers the exact status filter options and starts on Todos', () => {
        view.mount(container);
        const filter = el('#seller-order-status-filter');

        expect([...filter.options].map((option) => option.value)).toEqual([
          '',
          'pending',
          'confirmed',
          'shipped',
          'delivered',
          'cancelled',
        ]);
        expect([...filter.options].map((option) => option.textContent)).toEqual([
          'Todos',
          'Pendiente',
          'Confirmada',
          'Enviada',
          'Entregada',
          'Cancelada',
        ]);
        expect(filter.value).toBe('');
        expect(el('label[for="seller-order-status-filter"]').textContent).toBe('Estado:');

        filter.value = 'cancelled';
        filter.dispatchEvent(new Event('change'));
        expect(vm.setStatusFilter).toHaveBeenCalledTimes(1);
        expect(vm.setStatusFilter).toHaveBeenCalledWith('cancelled');
      });

      it('keeps the subscription and a null onNavigate safe behind the unauthenticated gate', () => {
        authStore.isAuthenticated.and.returnValue(false);
        spyOn(authRedirectStore, 'setReturnTo');
        const onNavigate = view.onNavigate;
        view.mount(container);

        expect(vm._listeners.size).toBe(1);
        expect(vm.loadOrders).not.toHaveBeenCalled();
        const box = el('[data-role="content"] .q-seller-orders-empty');
        expect(box.querySelector('p').textContent).toBe(
          'Debes iniciar sesión para ver tus ventas.'
        );
        const button = box.querySelector('button');
        expect(button.textContent).toBe('Iniciar sesión');

        button.click();
        expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith('/seller/orders');
        expect(onNavigate).toHaveBeenCalledWith('/login');

        view.onNavigate = null;
        expect(() => button.click()).not.toThrow();
        expect(onNavigate.calls.count()).toBe(1);
      });

      it('shows the seller-only gate, with no login button, while still subscribing', () => {
        authStore.isSeller.and.returnValue(false);
        view.mount(container);

        expect(vm._listeners.size).toBe(1);
        expect(vm.loadOrders).not.toHaveBeenCalled();
        expect(el('[data-role="content"]').textContent).toContain(
          'Solo los vendedores pueden acceder a este panel.'
        );
        expect(el('[data-role="content"] button')).toBeNull();
      });

      it('only evaluates the auth gate at mount time, not on later updates', async () => {
        vm.orders = [sellerOrder()];
        view.mount(container);
        await tick();

        authStore.isAuthenticated.and.returnValue(false);
        authStore.isSeller.and.returnValue(false);
        vm.notify();

        expect(el('[data-role="content"]').textContent).not.toContain('Debes iniciar sesión');
        expect(el('table.q-seller-orders-table')).not.toBeNull();
      });

      it('guards _update against a missing element and missing regions', () => {
        expect(view.element).toBeNull();
        expect(() => view._update()).not.toThrow();

        view.element = document.createElement('section');
        expect(() => view._update()).not.toThrow();
        view.element = null;
      });

      it('replaces notice and error content on every update and clears them', () => {
        view.mount(container);
        const notice = el('[data-role="notice"]');
        const error = el('[data-role="error"]');
        expect(notice.getAttribute('aria-live')).toBe('polite');
        expect(notice.getAttribute('aria-atomic')).toBe('true');
        expect(error.getAttribute('role')).toBe('alert');

        vm.noticeMessage = 'Estado actualizado a Enviada';
        vm.errorMessage = 'No se pudo actualizar el estado.';
        vm.notify();
        expect(notice.querySelector('.q-orders-alert--success').textContent).toBe(
          'Estado actualizado a Enviada'
        );
        expect(error.querySelector('.q-orders-alert--forbidden').textContent).toBe(
          'No se pudo actualizar el estado.'
        );

        vm.noticeMessage = '';
        vm.errorMessage = '';
        vm.notify();
        expect(notice.textContent).toBe('');
        expect(error.textContent).toBe('');
        expect(notice.children.length).toBe(0);
        expect(error.children.length).toBe(0);
      });

      it('shows the loading message for an empty list and suppresses the empty state while an error is set', () => {
        view.mount(container);
        const content = el('[data-role="content"]');

        vm.isLoading = true;
        vm.notify();
        expect(content.querySelector('.q-seller-orders-empty').textContent).toBe(
          'Cargando ventas…'
        );
        expect(content.textContent).not.toContain('Aún no tienes ventas');

        vm.isLoading = false;
        vm.errorMessage = 'No se pudieron cargar las ventas. Inténtalo de nuevo.';
        vm.notify();
        expect(content.textContent).toBe('');
        expect(el('[role="alert"]').textContent).toBe(
          'No se pudieron cargar las ventas. Inténtalo de nuevo.'
        );
        expect(content.textContent).not.toContain('Aún no tienes ventas');
      });

      it('renders the four exact KPI values and labels', () => {
        vm.getKpis.and.returnValue({ toConfirm: 1, toShip: 1, shipped: 1, revenue: 80 });
        view.mount(container);
        const kpis = el('[data-role="kpis"]');

        expect([...kpis.querySelectorAll('strong')].map((node) => node.textContent)).toEqual([
          '1',
          '1',
          '1',
          '80.00',
        ]);
        expect(
          [...kpis.querySelectorAll('.q-seller-orders-kpi__label')].map((node) => node.textContent)
        ).toEqual(['Por confirmar', 'Por enviar', 'Enviados', 'Ingresos (página)']);
      });

      it('renders the seven exact column headers', () => {
        vm.orders = [sellerOrder()];
        view.mount(container);
        const headers = [...el('thead').querySelectorAll('th')];

        expect(headers.map((th) => th.textContent)).toEqual([
          'Pedido',
          'Fecha',
          'Comprador',
          'Productos',
          'Ingreso',
          'Estado',
          'Actualizar',
        ]);
        expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
      });

      it('falls back for missing order number, date, items, buyer and currency', () => {
        const broken = sellerOrder({
          order_number: '',
          created_at: null,
          items: 'not-an-array',
          buyer_id: null,
          currency: '',
        });
        vm.orders = [broken];
        view.mount(container);
        const cells = cellsFor('o1');

        expect(cells.map((td) => td.dataset.label)).toEqual([
          'Pedido',
          'Fecha',
          'Comprador',
          'Productos',
          'Ingreso',
          'Estado',
          'Actualizar',
        ]);
        expect(cells[0].textContent).toBe('o1');
        expect(cells[1].textContent).toBe('—');
        expect(cells[2].textContent).toBe('Comprador');
        expect(cells[3].textContent).toBe('—');
        expect(cells[4].textContent).toBe(SellerOrdersViewModel.sellerRevenue(broken).toFixed(2));
        expect(cells[4].textContent).toBe('0.00');
        expect(cells[5].querySelector('.q-order-status').className).toBe(
          'q-order-status q-order-status--confirmed'
        );
        expect(cells[5].textContent).toBe('Confirmada');
      });

      it('truncates buyer ids, defaults product names and renders the literal undefined quantity', () => {
        const order = sellerOrder({ items: [{ quantity: undefined, subtotal: 40 }] });
        vm.orders = [order];
        view.mount(container);
        let cells = cellsFor('o1');

        expect(cells[2].textContent).toBe('buyer-12');
        expect(cells[3].textContent).toBe('Producto ×undefined');
        expect(cells[4].textContent).toBe('40.00 USD');
        expect(cells[4].textContent).toBe(
          `${SellerOrdersViewModel.sellerRevenue(order).toFixed(2)} USD`
        );

        vm.orders = [sellerOrder({ items: [{ product_name: 'Mesa', quantity: 3, subtotal: 40 }] })];
        vm.notify();
        cells = cellsFor('o1');
        expect(cells[3].textContent).toBe('Mesa ×3');
        expect(cells[4].textContent).toBe('40.00 USD');
      });

      it('keeps an unknown status raw while using the sanitized CSS class', () => {
        vm.orders = [sellerOrder({ status: 'weird-status' })];
        view.mount(container);
        const badge = rowFor('o1').querySelector('.q-order-status');

        expect(badge.className).toBe('q-order-status q-order-status--unknown');
        expect(badge.textContent).toBe('weird-status');
      });

      it('offers only the valid next statuses and labels the selector with the order id fallback', async () => {
        vm.orders = [
          sellerOrder({ id: 'o-pending', order_number: '', status: 'pending' }),
          sellerOrder({ id: 'o-shipped', status: 'shipped' }),
        ];
        view.mount(container);
        const pendingSelect = rowFor('o-pending').querySelector('select');
        const shippedSelect = rowFor('o-shipped').querySelector('select');

        expect([...pendingSelect.options].map((option) => option.value)).toEqual(['', 'confirmed']);
        expect([...pendingSelect.options].map((option) => option.textContent)).toEqual([
          'Cambiar…',
          'Confirmada',
        ]);
        expect(pendingSelect.getAttribute('aria-label')).toBe(
          'Cambiar estado del pedido o-pending'
        );
        expect([...shippedSelect.options].map((option) => option.value)).toEqual(['', 'delivered']);
        expect([...shippedSelect.options].map((option) => option.textContent)).toEqual([
          'Cambiar…',
          'Entregada',
        ]);

        pendingSelect.value = 'confirmed';
        pendingSelect.dispatchEvent(new Event('change'));
        await tick();
        expect(vm.updateStatus).toHaveBeenCalledTimes(1);
        expect(vm.updateStatus).toHaveBeenCalledWith('o-pending', 'confirmed');
      });

      it('moves between pages, disables while loading and hides a single-page pager', () => {
        vm.orders = [sellerOrder()];
        vm.meta = { page: 2, per_page: 10, total: 25, total_pages: 3 };
        view.mount(container);
        const pager = el('nav.q-orders-page__pagination');
        expect(pager).not.toBeNull();
        expect(pager.querySelector('.q-pagination-info').textContent).toBe('Página 2 de 3');
        const prev = pager.querySelector('.q-pagination-prev');
        const next = pager.querySelector('.q-pagination-next');
        expect(prev.disabled).toBe(false);
        expect(next.disabled).toBe(false);

        vm.loadOrders.calls.reset();
        prev.click();
        next.click();
        expect(vm.loadOrders.calls.allArgs()).toEqual([[1], [3]]);

        // Every notification rebuilds the content (including the pager), so the
        // original button nodes are detached; re-query the current pager.
        vm.isLoading = true;
        vm.notify();
        const loadingPager = el('nav.q-orders-page__pagination');
        expect(loadingPager.querySelector('.q-pagination-prev').disabled).toBe(true);
        expect(loadingPager.querySelector('.q-pagination-next').disabled).toBe(true);
        expect(el('.q-seller-orders-table-wrap.is-loading')).not.toBeNull();
        expect(el('.q-seller-orders-table-wrap').getAttribute('aria-busy')).toBe('true');

        vm.isLoading = false;
        vm.meta.total_pages = 1;
        vm.notify();
        expect(el('nav.q-orders-page__pagination')).toBeNull();

        vm.orders = [];
        vm.meta.total_pages = 0;
        vm.notify();
        expect(el('nav.q-orders-page__pagination')).toBeNull();
      });

      it('offers the catalog link in the empty state with route metadata', () => {
        view.mount(container);
        const link = el('[data-role="content"] .q-seller-orders-empty a');

        expect(link.textContent).toBe('Ver catálogo');
        expect(link.getAttribute('href')).toBe('/products');
        expect(link.getAttribute('data-route')).toBe('');
      });

      it('recreates the element on every render call and only subscribes on mount', () => {
        const first = view.render();
        const second = view.render();
        expect(second).not.toBe(first);
        expect(view.element).toBeNull();
        expect(vm._listeners.size).toBe(0);

        // mount() returns undefined; the rendered section is only exposed as
        // view.element (characterized).
        expect(view.mount(container)).toBeUndefined();
        const mounted = view.element;
        expect(mounted).not.toBe(first);
        expect(vm._listeners.size).toBe(1);
        expect(view.render()).not.toBe(mounted);
        expect(view.element).toBe(mounted);
      });

      it('calls the real unsubscribe function on destroy only once', () => {
        const unsubscribe = jasmine.createSpy('unsubscribe');
        vm.subscribe = jasmine.createSpy('subscribe').and.returnValue(unsubscribe);
        view.mount(container);

        expect(vm.subscribe).toHaveBeenCalledTimes(1);
        expect(typeof vm.subscribe.calls.mostRecent().args[0]).toBe('function');

        view.destroy();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(view._unsubscribe).toBeNull();
        expect(() => view.destroy()).not.toThrow();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
      });
    });
  })();
})();
