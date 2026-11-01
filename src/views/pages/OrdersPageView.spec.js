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

  it('Scenario: No orders - renders "No orders yet" empty state message', async () => {
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
    expect(emptyMsg.textContent).toBe('No orders yet');
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
});
