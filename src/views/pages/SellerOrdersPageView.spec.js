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
