import { OrdersApi } from './OrdersApi.js';
import { apiFetch } from './client.js';

describe('OrdersApi', () => {
  let fetchSpy;
  let api;

  beforeEach(() => {
    fetchSpy = jasmine.createSpy('apiFetchFn').and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'ord-1',
                order_number: 'ORD-00100042',
                status: 'pending',
                total: 100,
                created_at: '2026-10-14T11:00:00.000Z',
              },
            ],
            meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );
    api = new OrdersApi({ apiFetchFn: fetchSpy });
  });

  it('constructor defaults to real apiFetch', () => {
    const defaultApi = new OrdersApi();
    expect(defaultApi._fetch).toBe(apiFetch);
  });

  it('listOrders requests /orders with pagination query params and withAuth: true', async () => {
    const result = await api.listOrders({ page: 2, limit: 5, status: 'confirmed' });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/orders?page=2&limit=5&status=confirmed',
      jasmine.objectContaining({
        method: 'GET',
        withAuth: true,
      })
    );
    expect(result.data.length).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('listOrders throws on error response', async () => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: 'UNAUTHORIZED', message: 'Authentication failed' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    try {
      await api.listOrders();
      fail('Expected listOrders to throw');
    } catch (err) {
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    }
  });

  it('getOrderById throws when orderId is missing or invalid', async () => {
    try {
      await api.getOrderById('');
      fail('Expected to throw');
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_REQUEST');
    }
  });

  it('getOrderById sends GET request with withAuth: true', async () => {
    const orderData = { id: 'ord-123', total: 50 };
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: orderData,
            meta: { timestamp: '2026-10-14T11:00:00Z' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const result = await api.getOrderById('ord-123');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/orders/ord-123',
      jasmine.objectContaining({
        method: 'GET',
        withAuth: true,
      })
    );
    expect(result.data.id).toBe('ord-123');
  });

  it('getOrderById throws 403 Forbidden when accessing another buyers order', async () => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this order',
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    try {
      await api.getOrderById('foreign-order-id');
      fail('Expected to throw 403');
    } catch (err) {
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('You do not have permission to access this order');
    }
  });
});

