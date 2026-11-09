import { apiFetch } from './client.js';
import { OrdersApi } from './OrdersApi.js';

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

  it('listOrders requests /orders with pagination query params and GET method', async () => {
    const result = await api.listOrders({ page: 2, limit: 5, status: 'confirmed' });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/orders?page=2&limit=5&status=confirmed',
      jasmine.objectContaining({
        method: 'GET',
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

  it('getOrderById sends GET request to /orders/:id', async () => {
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
  describe('createOrder (US-10 checkout)', () => {
    const shippingAddress = {
      full_name: 'Aaron Florez',
      phone: '71234567',
      street: 'Av. Arce #123',
      city: 'La Paz',
      country: 'BO',
    };
    const created = (
      status = 201,
      body = { data: { id: 'ord-9', order_number: 'ORD-00100099' } }
    ) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    it('POSTs /orders with only the shipping address (the cart is never sent)', async () => {
      fetchSpy.and.returnValue(created());

      const result = await api.createOrder({ shippingAddress });

      const [path, options] = fetchSpy.calls.mostRecent().args;
      expect(path).toBe('/orders');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ shipping_address: shippingAddress });
      expect(result.data.order_number).toBe('ORD-00100099');
    });

    it('sends the payment method and notes only when provided', async () => {
      fetchSpy.and.returnValue(created());

      await api.createOrder({
        shippingAddress,
        paymentMethod: 'cash_on_delivery',
        notes: 'Dejar con el portero',
      });

      const [, options] = fetchSpy.calls.mostRecent().args;
      expect(JSON.parse(options.body)).toEqual({
        shipping_address: shippingAddress,
        payment_method: 'cash_on_delivery',
        notes: 'Dejar con el portero',
      });
    });

    it('does not send credentials or tokens itself (the HttpOnly cookie + CSRF live in apiFetch)', async () => {
      fetchSpy.and.returnValue(created());

      await api.createOrder({ shippingAddress });

      const [, options] = fetchSpy.calls.mostRecent().args;
      expect(options.headers?.Authorization).toBeUndefined();
      expect(options.withAuth).toBeUndefined();
    });

    it('throws EMPTY_CART (422) with the API message', async () => {
      fetchSpy.and.returnValue(
        created(422, { error: { code: 'EMPTY_CART', message: 'Your cart is empty' } })
      );

      try {
        await api.createOrder({ shippingAddress });
        fail('Expected to throw');
      } catch (err) {
        expect(err.statusCode).toBe(422);
        expect(err.code).toBe('EMPTY_CART');
        expect(err.message).toBe('Your cart is empty');
      }
    });

    it('exposes INSUFFICIENT_STOCK details so the UI can name the product', async () => {
      const details = [{ field: 'items.p-1', message: 'Insufficient stock for Clean Code' }];
      fetchSpy.and.returnValue(
        created(422, {
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Insufficient stock for Clean Code',
            details,
          },
        })
      );

      try {
        await api.createOrder({ shippingAddress });
        fail('Expected to throw');
      } catch (err) {
        expect(err.code).toBe('INSUFFICIENT_STOCK');
        expect(err.details).toEqual(details);
      }
    });

    it('falls back to a generic error when the body is not JSON', async () => {
      fetchSpy.and.returnValue(Promise.resolve(new Response('<html>boom</html>', { status: 502 })));

      try {
        await api.createOrder({ shippingAddress });
        fail('Expected to throw');
      } catch (err) {
        expect(err.statusCode).toBe(502);
        expect(err.code).toBe('UNKNOWN_ERROR');
        expect(err.message).toBe('Failed to create order (502)');
      }
    });
  });
});
