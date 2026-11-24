import { getOrderStatusLabel, ORDER_STATUSES } from '../../models/entities/orderStatus.js';
import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { OrdersViewModel } from '../../viewmodels/pages/OrdersViewModel.js';
import { OrdersPageView } from './OrdersPageView.js';

describe('OrdersPageView', () => {
  let container;
  let mockApi;
  let viewModel;
  let view;

  const sampleOrder = {
    id: '9d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
    order_number: 'ORD-00100042',
    status: 'delivered',
    currency: 'USD',
    total: 89.99,
    created_at: '2026-10-14T11:00:00.000Z',
    items: [],
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockApi = {
      listOrders: jasmine.createSpy('listOrders').and.returnValue(
        Promise.resolve({
          data: [sampleOrder],
          meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
        })
      ),
      getOrderById: jasmine.createSpy('getOrderById'),
    };

    viewModel = new OrdersViewModel({ ordersApi: mockApi });

    // Set authenticated user by default
    spyOn(authStore, 'isAuthenticated').and.returnValue(true);
  });

  afterEach(() => {
    if (view) {
      view.destroy();
      view = null;
    }
    if (container && container.parentElement) {
      container.remove();
    }
  });

  it('Scenario: View own orders - renders paginated list of orders with details', async () => {
    view = new OrdersPageView({ viewModel });
    view.mount(container);

    // Wait for async loadOrders to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockApi.listOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: undefined,
    });

    const orderIdEl = container.querySelector('[data-testid="order-id"]');
    expect(orderIdEl).not.toBeNull();
    expect(orderIdEl.textContent).toBe('ORD-00100042');

    const statusEl = container.querySelector('[data-testid="order-status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.textContent).toBe('Entregada');

    const totalEl = container.querySelector('[data-testid="order-total"]');
    expect(totalEl).not.toBeNull();
    expect(totalEl.textContent).toContain('89.99');
  });

  it('Scenario: No orders - renders "Aún no tienes órdenes" empty state message', async () => {
    mockApi.listOrders.and.returnValue(
      Promise.resolve({
        data: [],
        meta: { page: 1, per_page: 10, total: 0, total_pages: 0 },
      })
    );

    view = new OrdersPageView({ viewModel });
    view.mount(container);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const emptyMsg = container.querySelector('.q-orders-empty-message');
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toBe('Aún no tienes órdenes');
  });

  it('Scenario: Cannot see other buyers orders - displays 403 Forbidden alert', async () => {
    const forbiddenErr = new Error('You do not have permission to access this order');
    forbiddenErr.statusCode = 403;
    forbiddenErr.code = 'FORBIDDEN';
    mockApi.listOrders.and.returnValue(Promise.reject(forbiddenErr));

    view = new OrdersPageView({ viewModel });
    view.mount(container);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const alertEl = container.querySelector('[data-testid="forbidden-alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl.textContent).toContain('403 Forbidden');
    expect(alertEl.textContent).toContain('You do not have permission');
  });

  it('renders pagination controls when total_pages > 1', async () => {
    mockApi.listOrders.and.returnValue(
      Promise.resolve({
        data: [sampleOrder],
        meta: { page: 1, per_page: 1, total: 2, total_pages: 2 },
      })
    );

    view = new OrdersPageView({ viewModel });
    view.mount(container);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const prevBtn = container.querySelector('.q-pagination-prev');
    const nextBtn = container.querySelector('.q-pagination-next');
    const info = container.querySelector('.q-pagination-info');

    expect(prevBtn).not.toBeNull();
    expect(prevBtn.disabled).toBeTrue();
    expect(nextBtn).not.toBeNull();
    expect(nextBtn.disabled).toBeFalse();
    expect(info.textContent).toBe('Página 1 de 2');
  });

  it('triggers setStatusFilter on status filter select change', async () => {
    spyOn(viewModel, 'setStatusFilter');

    view = new OrdersPageView({ viewModel });
    view.mount(container);

    const select = container.querySelector('[data-testid="order-status-filter"]');
    expect(select).not.toBeNull();

    select.value = 'shipped';
    select.dispatchEvent(new Event('change'));

    expect(viewModel.setStatusFilter).toHaveBeenCalledWith('shipped');
  });

  it('navigates to the order-number route from the order list', async () => {
    const onNavigate = jasmine.createSpy('onNavigate');
    view = new OrdersPageView({ viewModel, onNavigate });
    view.mount(container);

    await new Promise((resolve) => setTimeout(resolve, 10));
    container.querySelector('[data-testid="view-order-details-btn"]').click();

    expect(onNavigate).toHaveBeenCalledWith('/orders/ORD-00100042');
    expect(viewModel.selectedOrder).toBeNull();
  });

  it('loads a direct order-number route and returns to the list', async () => {
    const onNavigate = jasmine.createSpy('onNavigate');
    view = new OrdersPageView({ viewModel, onNavigate, orderNumber: 'ORD-00100042' });
    view.mount(container);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockApi.listOrders).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(container.querySelector('[data-testid="order-detail"]')).not.toBeNull();
    expect(
      container.querySelector('.q-orders-page').classList.contains('q-orders-page--detail')
    ).toBeTrue();

    container.querySelector('[data-testid="order-detail-back-btn"]').click();
    expect(onNavigate).toHaveBeenCalledWith('/orders');
  });

  it('renders order detail view when an order is selected, and returns to list on back', async () => {
    mockApi.getOrderById.and.returnValue(
      Promise.resolve({
        data: {
          ...sampleOrder,
          shipping_address: '123 Fake Street',
          items: [
            {
              id: 'it-1',
              product_name: 'Super Gadget',
              quantity: 1,
              unit_price: 89.99,
              subtotal: 89.99,
            },
          ],
        },
      })
    );

    view = new OrdersPageView({ viewModel });
    view.mount(container);

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Initially shows list
    expect(container.querySelector('[data-testid="order-list"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="order-detail"]')).toBeNull();

    // Click "Ver detalle" button
    const viewBtn = container.querySelector('[data-testid="view-order-details-btn"]');
    expect(viewBtn).not.toBeNull();
    viewBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Now shows order detail
    expect(container.querySelector('[data-testid="order-detail"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="order-detail-title"]').textContent).toContain(
      'ORD-00100042'
    );
    expect(container.querySelector('[data-testid="order-item-name"]').textContent).toBe(
      'Super Gadget'
    );

    // Click back button to return to order list
    const backBtn = container.querySelector('[data-testid="order-detail-back-btn"]');
    expect(backBtn).not.toBeNull();
    backBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Returned to order list
    expect(container.querySelector('[data-testid="order-detail"]')).toBeNull();
    expect(container.querySelector('[data-testid="order-list"]')).not.toBeNull();
  });

  it('Scenario: Unauthenticated visitor - clicking login redirects to /login and sets returnTo to /orders', () => {
    authStore.isAuthenticated.and.returnValue(false);
    const onNavigateSpy = jasmine.createSpy('onNavigate');
    spyOn(authRedirectStore, 'setReturnTo');

    view = new OrdersPageView({ viewModel, onNavigate: onNavigateSpy });
    view.mount(container);

    const loginBtn = container.querySelector(
      '[data-testid="orders-unauthenticated"] a[data-route]'
    );
    expect(loginBtn).not.toBeNull();
    loginBtn.click();

    expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith('/orders');
    expect(onNavigateSpy).toHaveBeenCalledWith('/login');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('OrdersPageView (recovered 1)', () => {
    let container;
    let mockApi;
    let viewModel;
    let view;

    const sampleOrder = {
      id: '9d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
      order_number: 'ORD-00100042',
      status: 'delivered',
      currency: 'USD',
      total: 89.99,
      created_at: '2026-10-14T11:00:00.000Z',
      items: [],
    };

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);

      mockApi = {
        listOrders: jasmine.createSpy('listOrders').and.returnValue(
          Promise.resolve({
            data: [sampleOrder],
            meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
          })
        ),
        getOrderById: jasmine.createSpy('getOrderById'),
      };

      viewModel = new OrdersViewModel({ ordersApi: mockApi });

      // Set authenticated user by default
      spyOn(authStore, 'isAuthenticated').and.returnValue(true);
    });

    afterEach(() => {
      if (view) {
        view.destroy();
        view = null;
      }
      if (container && container.parentElement) {
        container.remove();
      }
    });

    it('Scenario: No orders - renders "Aún no tienes órdenes" empty state message', async () => {
      mockApi.listOrders.and.returnValue(
        Promise.resolve({
          data: [],
          meta: { page: 1, per_page: 10, total: 0, total_pages: 0 },
        })
      );

      view = new OrdersPageView({ viewModel });
      view.mount(container);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const emptyMsg = container.querySelector('.q-orders-empty-message');
      expect(emptyMsg).not.toBeNull();
      expect(emptyMsg.textContent).toBe('Aún no tienes órdenes');
    });
  });

  (() => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    const sampleOrder = {
      id: 'ord-1',
      order_number: 'ORD-00100042',
      status: 'delivered',
      currency: 'USD',
      total: 89.99,
      created_at: '2026-10-14T11:00:00.000Z',
      items: [],
    };

    const meta = (page, totalPages) => ({
      page,
      per_page: 10,
      total: page * 10,
      total_pages: totalPages,
    });

    describe('OrdersPageView additional branches (recovered 2)', () => {
      let container;
      let views;
      let ordersApi;
      let viewModel;
      let onNavigate;

      const makeView = (options = {}) => {
        const view = new OrdersPageView(options);
        views.push(view);
        return view;
      };

      const mountView = async ({ navigate = onNavigate } = {}) => {
        const view = makeView({ viewModel, onNavigate: navigate });
        view.mount(container);
        await tick();
        return view;
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        views = [];
        ordersApi = {
          listOrders: jasmine.createSpy('listOrders').and.resolveTo({
            data: [sampleOrder],
            meta: meta(1, 1),
          }),
          getOrderById: jasmine.createSpy('getOrderById').and.resolveTo({ data: sampleOrder }),
        };
        viewModel = new OrdersViewModel({ ordersApi });
        onNavigate = jasmine.createSpy('onNavigate');
        spyOn(authStore, 'isAuthenticated').and.returnValue(true);
      });

      afterEach(() => {
        views.forEach((view) => view.destroy());
        views = [];
        authRedirectStore.clearReturnTo();
        container.remove();
      });

      it('uses the documented defaults when constructed with no options', () => {
        const view = makeView();

        expect(view.viewModel).toBeInstanceOf(OrdersViewModel);
        expect(view.onNavigate).toBeNull();
        expect(view.element).toBeNull();
        expect(view._unsubscribe).toBeNull();
        expect(view._orderList.orders).toEqual([]);
        expect(view._orderDetail.order).toBeNull();
        expect(view._orderList.onOrderClick).toEqual(jasmine.any(Function));
        expect(view._orderDetail.onBack).toEqual(jasmine.any(Function));
      });

      it('renders the exact page title, subtitle and aria label', () => {
        const element = makeView({ viewModel }).render();

        expect(element.className).toBe('q-orders-page');
        expect(element.getAttribute('aria-label')).toBe('Historial de compras');
        expect(element.querySelector('.q-orders-page__title').textContent).toBe('Mis Órdenes');
        expect(element.querySelector('.q-orders-page__subtitle').textContent).toBe(
          'Revisa el historial y estado de todas tus compras'
        );
        expect(element.querySelector('.q-section-container')).not.toBeNull();
      });

      it('builds the status filter options from ORDER_STATUSES with Todos preselected', () => {
        const element = makeView({ viewModel }).render();
        const label = element.querySelector('label[for="order-status-filter"]');
        const select = element.querySelector('[data-testid="order-status-filter"]');

        expect(label.textContent).toBe('Estado:');
        expect(label.className).toBe('q-orders-filter__label');
        expect(select.id).toBe('order-status-filter');
        expect(select.className).toBe('q-orders-filter__select');
        expect([...select.options].map((option) => option.value)).toEqual(['', ...ORDER_STATUSES]);
        expect([...select.options].map((option) => option.textContent)).toEqual([
          'Todos',
          ...ORDER_STATUSES.map(getOrderStatusLabel),
        ]);
        expect(select.value).toBe('');
      });

      it('preselects the filter value already set on the VM', () => {
        viewModel.statusFilter = 'shipped';
        const element = makeView({ viewModel }).render();

        expect(element.querySelector('select').value).toBe('shipped');
        expect(
          [...element.querySelectorAll('option')]
            .filter((option) => option.selected)
            .map((o) => o.value)
        ).toEqual(['shipped']);
      });

      it('creates a new section on each mount and leaks the first subscription (characterized)', () => {
        const loadOrders = spyOn(viewModel, 'loadOrders').and.resolveTo();
        const view = makeView({ viewModel });
        expect(view.mount(container)).toBeUndefined();
        const first = view.element;

        expect(viewModel._listeners.size).toBe(1);
        expect(view.mount(container)).toBeUndefined();
        const second = view.element;

        expect(second).not.toBe(first);
        expect(container.querySelectorAll('.q-orders-page').length).toBe(2);
        expect(viewModel._listeners.size).toBe(2);
        expect(loadOrders).toHaveBeenCalledTimes(2);
        expect(loadOrders).toHaveBeenCalledWith(1);

        // Known bug: a second mount overwrites the unsubscribe handle, so the
        // first subscription and first section survive destroy(). The VM itself
        // has no destroy() method, so there is nothing to delegate to either.
        expect(viewModel.destroy).toBeUndefined();
        view.destroy();
        expect(viewModel._listeners.size).toBe(1);
        expect(container.querySelectorAll('.q-orders-page').length).toBe(1);
        expect(container.contains(first)).toBe(true);
        expect(container.contains(second)).toBe(false);
      });

      it('unsubscribes and detaches the DOM on destroy without destroying the VM', () => {
        const loadOrders = spyOn(viewModel, 'loadOrders').and.resolveTo();
        const view = makeView({ viewModel });
        view.mount(container);
        const element = view.element;

        expect(viewModel._listeners.size).toBe(1);

        view.destroy();

        expect(viewModel._listeners.size).toBe(0);
        expect(viewModel.destroy).toBeUndefined();
        expect(view.element).toBeNull();
        expect(view._unsubscribe).toBeNull();
        expect(document.body.contains(element)).toBe(false);
        expect(container.querySelector('.q-orders-page')).toBeNull();
        expect(() => view.destroy()).not.toThrow();
        expect(loadOrders).toHaveBeenCalledTimes(1);
      });

      it('shows the exact generic error with the error alert class and role', async () => {
        ordersApi.listOrders.and.rejectWith(new Error('Fallo inesperado'));
        await mountView();

        const alert = container.querySelector('.q-orders-alert');
        expect(alert.classList.contains('q-orders-alert--error')).toBe(true);
        expect(alert.getAttribute('role')).toBe('alert');
        expect(alert.textContent).toBe('Fallo inesperado');
        expect(container.querySelector('[data-testid="forbidden-alert"]')).toBeNull();
      });

      it('keeps generic error text as literal text rather than markup', async () => {
        ordersApi.listOrders.and.rejectWith(new Error('<b data-testid="injected-error">boom</b>'));
        await mountView();

        const alert = container.querySelector('.q-orders-alert--error');
        expect(alert.querySelector('[data-testid="injected-error"]')).toBeNull();
        expect(alert.textContent).toBe('<b data-testid="injected-error">boom</b>');
      });

      it('uses the fallback message for a forbidden alert without an error message', async () => {
        spyOn(viewModel, 'loadOrders').and.resolveTo();
        const view = makeView({ viewModel });
        view.mount(container);
        viewModel.forbiddenError = true;
        viewModel.errorMessage = '';
        viewModel._notify();

        const alert = container.querySelector('[data-testid="forbidden-alert"]');
        expect(alert.className).toBe('q-orders-alert q-orders-alert--forbidden');
        expect(alert.getAttribute('role')).toBe('alert');
        expect(alert.textContent.trim()).toBe(
          '403 Forbidden: No tienes permiso para acceder a esta orden.'
        );
        expect(container.querySelector('.q-orders-alert--error')).toBeNull();
      });

      it('prefers the forbidden alert when both error flags are set', async () => {
        spyOn(viewModel, 'loadOrders').and.resolveTo();
        const view = makeView({ viewModel });
        view.mount(container);
        viewModel.forbiddenError = true;
        viewModel.errorMessage = 'otro error';
        viewModel._notify();

        const alert = container.querySelector('[data-testid="forbidden-alert"]');
        expect(alert.textContent.trim()).toBe('403 Forbidden: otro error');
        expect(container.querySelector('.q-orders-alert--error')).toBeNull();
      });

      it('parses a forbidden error message as markup (characterized)', async () => {
        spyOn(viewModel, 'loadOrders').and.resolveTo();
        const view = makeView({ viewModel });
        view.mount(container);
        viewModel.forbiddenError = true;
        viewModel.errorMessage = '<b data-testid="injected-markup">boom</b>';
        viewModel._notify();

        const alert = container.querySelector('[data-testid="forbidden-alert"]');
        expect(alert.querySelector('[data-testid="injected-markup"]')).not.toBeNull();
        expect(alert.querySelector('[data-testid="injected-markup"]').textContent).toBe('boom');
      });

      it('shows the loading placeholder and hides the list and pagination', async () => {
        let resolveList;
        ordersApi.listOrders.and.returnValue(
          new Promise((resolve) => {
            resolveList = resolve;
          })
        );
        const view = makeView({ viewModel });
        view.mount(container);

        const loading = container.querySelector('[data-testid="orders-loading"]');
        expect(loading).not.toBeNull();
        expect(loading.querySelector('.q-spinner')).not.toBeNull();
        expect(loading.querySelector('p').textContent).toBe('Cargando órdenes...');
        expect(container.querySelector('[data-testid="order-list"]')).toBeNull();
        expect(container.querySelector('.q-orders-page__pagination').children.length).toBe(0);

        resolveList({ data: [sampleOrder], meta: meta(1, 1) });
        await tick();
      });

      it('renders the empty-items message for a selected order without items', async () => {
        const view = await mountView();
        expect(container.querySelector('[data-testid="order-list"]')).not.toBeNull();

        viewModel.selectedOrder = { id: 'ord-2', status: 'pending' };
        viewModel._notify();

        expect(container.querySelector('[data-testid="order-detail"]')).not.toBeNull();
        expect(container.querySelector('.q-order-detail__item-empty').textContent).toBe(
          'No hay desglose de productos disponible para esta orden.'
        );
        expect(container.querySelector('[data-testid="order-list"]')).toBeNull();
        expect(container.querySelector('.q-orders-page__pagination').children.length).toBe(0);
        expect(view.element).not.toBeNull();
      });

      it('shows an alert and returns to the list when the detail request fails', async () => {
        ordersApi.getOrderById.and.rejectWith(new Error('detalle roto'));
        await mountView({ navigate: null });

        container.querySelector('[data-testid="view-order-details-btn"]').click();
        await tick();

        const alert = container.querySelector('.q-orders-alert--error');
        expect(alert.textContent).toBe('detalle roto');
        expect(viewModel.selectedOrder).toBeNull();
        expect(container.querySelector('[data-testid="order-detail"]')).toBeNull();
        expect(container.querySelector('[data-testid="order-list"]')).not.toBeNull();
      });

      it('delegates a card body click to loadOrderById with the order id', async () => {
        const loadOrderById = spyOn(viewModel, 'loadOrderById').and.resolveTo();
        await mountView({ navigate: null });

        container.querySelector('.q-order-card__body').click();

        expect(loadOrderById).toHaveBeenCalledTimes(1);
        expect(loadOrderById).toHaveBeenCalledWith(sampleOrder.id);
      });

      it('delegates the detail back button to clearSelectedOrder', async () => {
        const clearSelectedOrder = spyOn(viewModel, 'clearSelectedOrder').and.callThrough();
        await mountView();

        viewModel.selectedOrder = { id: 'ord-2', status: 'pending' };
        viewModel._notify();
        container.querySelector('[data-testid="order-detail-back-btn"]').click();

        expect(clearSelectedOrder).toHaveBeenCalledTimes(1);
        expect(viewModel.selectedOrder).toBeNull();
        expect(container.querySelector('[data-testid="order-list"]')).not.toBeNull();
      });

      it('hides pagination buttons when total_pages is at most one', async () => {
        const view = await mountView();
        const pagination = container.querySelector('.q-orders-page__pagination');

        expect(pagination.getAttribute('aria-label')).toBe('Paginación de órdenes');
        expect(pagination.children.length).toBe(0);
        expect(view.element.querySelector('.q-pagination-next')).toBeNull();

        ordersApi.listOrders.and.resolveTo({ data: [], meta: meta(1, 0) });
        await viewModel.loadOrders(1);

        expect(pagination.children.length).toBe(0);
      });

      it('disables the next button on the last page', async () => {
        ordersApi.listOrders.and.resolveTo({ data: [sampleOrder], meta: meta(2, 2) });
        const nextPage = spyOn(viewModel, 'nextPage').and.resolveTo();
        await mountView();

        const prev = container.querySelector('.q-pagination-prev');
        const next = container.querySelector('.q-pagination-next');
        expect(prev.disabled).toBeFalse();
        expect(next.disabled).toBeTrue();
        expect(container.querySelector('.q-pagination-info').textContent).toBe('Página 2 de 2');

        next.click();
        expect(nextPage).not.toHaveBeenCalled();
      });

      it('wires the enabled pagination buttons to nextPage and prevPage', async () => {
        ordersApi.listOrders.and.resolveTo({ data: [sampleOrder], meta: meta(2, 3) });
        const nextPage = spyOn(viewModel, 'nextPage').and.resolveTo();
        const prevPage = spyOn(viewModel, 'prevPage').and.resolveTo();
        await mountView();

        container.querySelector('.q-pagination-next').click();
        container.querySelector('.q-pagination-prev').click();

        expect(nextPage).toHaveBeenCalledTimes(1);
        expect(prevPage).toHaveBeenCalledTimes(1);
      });

      it('throws when the VM meta is null (characterized)', async () => {
        const view = await mountView();

        viewModel.meta = null;

        expect(() => view._update()).toThrowError(TypeError);
      });

      it('renders the exact guest prompt without listing orders and cleans up on destroy', () => {
        authStore.isAuthenticated.and.returnValue(false);
        const setReturnTo = spyOn(authRedirectStore, 'setReturnTo');
        const view = makeView({ viewModel, onNavigate });
        view.mount(container);

        const prompt = container.querySelector('[data-testid="orders-unauthenticated"]');
        expect(prompt).not.toBeNull();
        expect(prompt.querySelector('h3').textContent).toBe('Inicia sesión');
        expect(prompt.querySelector('p').textContent).toBe(
          'Debes iniciar sesión como comprador para ver tu historial de órdenes.'
        );
        const link = prompt.querySelector('a[data-route]');
        expect(link.textContent).toBe('Iniciar sesión');
        expect(link.getAttribute('href')).toBe('/login');
        expect(link.hasAttribute('data-route')).toBe(true);
        expect(ordersApi.listOrders).not.toHaveBeenCalled();
        expect(viewModel._listeners.size).toBe(1);

        link.click();
        expect(setReturnTo).toHaveBeenCalledWith('/orders');
        expect(onNavigate).toHaveBeenCalledWith('/login');

        view.destroy();
        expect(view.element).toBeNull();
        expect(document.body.contains(prompt)).toBe(false);
        expect(container.querySelector('[data-testid="orders-unauthenticated"]')).toBeNull();
        expect(viewModel._listeners.size).toBe(0);
      });

      it('does not set a return path for a guest prompt without onNavigate', () => {
        authStore.isAuthenticated.and.returnValue(false);
        const setReturnTo = spyOn(authRedirectStore, 'setReturnTo');
        const view = makeView({ viewModel });
        view.mount(container);

        const link = container.querySelector('[data-testid="orders-unauthenticated"] a');
        link.removeAttribute('href');
        expect(() => link.click()).not.toThrow();

        expect(setReturnTo).not.toHaveBeenCalled();
        expect(authRedirectStore.getReturnTo()).toBeNull();
        expect(ordersApi.listOrders).not.toHaveBeenCalled();
      });

      it('lets a later VM notification erase the guest prompt (characterized)', () => {
        authStore.isAuthenticated.and.returnValue(false);
        const view = makeView({ viewModel, onNavigate });
        view.mount(container);

        expect(container.querySelector('[data-testid="orders-unauthenticated"]')).not.toBeNull();
        expect(viewModel._listeners.size).toBe(1);

        viewModel.clearSelectedOrder();

        expect(container.querySelector('[data-testid="orders-unauthenticated"]')).toBeNull();
        expect(container.querySelector('[data-testid="orders-empty-state"]').textContent).toContain(
          'Aún no tienes órdenes'
        );
        expect(ordersApi.listOrders).not.toHaveBeenCalled();
      });
    });
  })();
})();
