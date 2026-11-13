import { SellerOrdersViewModel } from './SellerOrdersViewModel.js';

/** An API error shaped like the ones `OrdersApi` throws. */
function apiError(code, statusCode = 400) {
  const err = new Error(code);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function order(overrides = {}) {
  return {
    id: 'o1',
    buyer_id: 'b1',
    status: 'confirmed',
    items: [{ subtotal: 20, product_name: 'Chair', quantity: 1 }],
    ...overrides,
  };
}

function listResponse(orders, meta = {}) {
  return {
    data: orders,
    meta: { page: 1, per_page: 10, total: orders.length, total_pages: 1, ...meta },
  };
}

function buildVm({ orders = [order()], listOrders, updateOrderStatus, getById } = {}) {
  const ordersApi = {
    listOrders:
      listOrders || jasmine.createSpy('listOrders').and.callFake(async () => listResponse(orders)),
    updateOrderStatus:
      updateOrderStatus ||
      jasmine.createSpy('updateOrderStatus').and.resolveTo({
        data: { id: 'o1', status: 'shipped', items: [{ subtotal: 20 }] },
      }),
  };
  const profilesApi = {
    getById:
      getById ||
      jasmine.createSpy('getById').and.callFake(async (id) => ({
        data: { full_name: `Name of ${id}` },
      })),
  };
  return { vm: new SellerOrdersViewModel({ ordersApi, profilesApi }), ordersApi, profilesApi };
}

describe('SellerOrdersViewModel', () => {
  it('computes seller revenue from items[].subtotal only', () => {
    const revenue = SellerOrdersViewModel.sellerRevenue({
      total: 999,
      items: [{ subtotal: 10 }, { subtotal: 5.5 }],
    });
    expect(revenue).toBe(15.5);
  });

  it('loads seller orders with view=seller and updates status', async () => {
    const { vm, ordersApi } = buildVm({
      getById: jasmine.createSpy('getById').and.resolveTo({ data: { full_name: 'Buyer One' } }),
    });
    await vm.loadOrders(1);

    expect(ordersApi.listOrders).toHaveBeenCalledWith(jasmine.objectContaining({ view: 'seller' }));
    expect(vm.orders[0].status).toBe('confirmed');
    expect(vm.getBuyerLabel(vm.orders[0])).toBe('Buyer One');
    expect(vm.getNextStatuses(vm.orders[0])).toEqual(['shipped', 'cancelled']);

    await vm.updateStatus('o1', 'shipped');
    expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith('o1', 'shipped');
    expect(vm.orders[0].status).toBe('shipped');
    expect(vm.noticeMessage).toContain('Enviada');
    expect(vm.errorMessage).toBe('');
  });

  describe('transitions are never offered or sent from a terminal state', () => {
    for (const status of ['delivered', 'cancelled']) {
      it(`offers no next status for ${status}`, async () => {
        const { vm } = buildVm({ orders: [order({ status })] });
        await vm.loadOrders(1);
        expect(vm.getNextStatuses(vm.orders[0])).toEqual([]);
      });

      it(`does not call the API when updating a ${status} order`, async () => {
        const { vm, ordersApi } = buildVm({ orders: [order({ status })] });
        await vm.loadOrders(1);

        await vm.updateStatus('o1', 'shipped');

        expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled();
        expect(vm.errorMessage).toContain('no está disponible');
        expect(vm.orders[0].status).toBe(status);
      });
    }

    it('does not call the API for a transition the state machine forbids', async () => {
      const { vm, ordersApi } = buildVm({ orders: [order({ status: 'pending' })] });
      await vm.loadOrders(1);

      await vm.updateStatus('o1', 'delivered');

      expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled();
      expect(vm.errorMessage).not.toBe('');
    });

    it('does not call the API for an order that is not in the list', async () => {
      const { vm, ordersApi } = buildVm();
      await vm.loadOrders(1);
      await vm.updateStatus('ghost', 'shipped');
      expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('updating state is per order', () => {
    it('marks only the order being updated and ignores a double submit', async () => {
      let resolveUpdate;
      const updateOrderStatus = jasmine.createSpy('updateOrderStatus').and.returnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );
      const { vm } = buildVm({
        orders: [order({ id: 'o1' }), order({ id: 'o2', buyer_id: 'b2' })],
        updateOrderStatus,
      });
      await vm.loadOrders(1);

      const first = vm.updateStatus('o1', 'shipped');
      const second = vm.updateStatus('o1', 'cancelled');

      expect(vm.isOrderUpdating('o1')).toBe(true);
      expect(vm.isOrderUpdating('o2')).toBe(false);
      expect(vm.isUpdating).toBe(true);

      resolveUpdate({ data: { id: 'o1', status: 'shipped', items: [{ subtotal: 20 }] } });
      await Promise.all([first, second]);

      expect(updateOrderStatus).toHaveBeenCalledTimes(1);
      expect(vm.isOrderUpdating('o1')).toBe(false);
      expect(vm.isUpdating).toBe(false);
    });

    it('lets another order be updated while one is in flight', async () => {
      const pending = [];
      const updateOrderStatus = jasmine.createSpy('updateOrderStatus').and.callFake(
        (id) =>
          new Promise((resolve) => {
            pending.push(() =>
              resolve({ data: { id, status: 'shipped', items: [{ subtotal: 20 }] } })
            );
          })
      );
      const { vm } = buildVm({
        orders: [order({ id: 'o1' }), order({ id: 'o2', buyer_id: 'b2' })],
        updateOrderStatus,
      });
      await vm.loadOrders(1);

      const a = vm.updateStatus('o1', 'shipped');
      const b = vm.updateStatus('o2', 'shipped');
      expect(updateOrderStatus).toHaveBeenCalledTimes(2);

      pending.forEach((finish) => finish());
      await Promise.all([a, b]);
      expect(vm.isUpdating).toBe(false);
    });

    it('clears the updating flag when the request fails', async () => {
      const { vm } = buildVm({
        updateOrderStatus: jasmine.createSpy().and.rejectWith(apiError('FORBIDDEN', 403)),
      });
      await vm.loadOrders(1);
      await vm.updateStatus('o1', 'shipped');
      expect(vm.isOrderUpdating('o1')).toBe(false);
    });
  });

  describe('update errors map to a specific message', () => {
    const cases = [
      ['FORBIDDEN', 403, 'No tienes permiso'],
      ['NOT_FOUND', 404, 'Pedido no encontrado'],
      ['INVALID_STATUS_TRANSITION', 422, 'No se puede cambiar el pedido'],
      ['INVALID_CSRF_TOKEN', 403, 'Recarga la página'],
      ['SESSION_EXPIRED', 401, 'sesión expiró'],
      ['SOMETHING_ELSE', 500, 'No se pudo actualizar'],
    ];

    for (const [code, statusCode, fragment] of cases) {
      it(`${code} -> message containing "${fragment}"`, async () => {
        const { vm } = buildVm({
          updateOrderStatus: jasmine.createSpy().and.rejectWith(apiError(code, statusCode)),
        });
        await vm.loadOrders(1);
        await vm.updateStatus('o1', 'shipped');
        expect(vm.errorMessage).toContain(fragment);
        expect(vm.noticeMessage).toBe('');
      });
    }

    it('a CSRF 403 is not reported as a permission problem', async () => {
      const { vm } = buildVm({
        updateOrderStatus: jasmine.createSpy().and.rejectWith(apiError('INVALID_CSRF_TOKEN', 403)),
      });
      await vm.loadOrders(1);
      await vm.updateStatus('o1', 'shipped');
      expect(vm.errorMessage).not.toContain('permiso');
    });

    it('names both states in the 422 message', async () => {
      const { vm } = buildVm({
        updateOrderStatus: jasmine
          .createSpy()
          .and.rejectWith(apiError('INVALID_STATUS_TRANSITION', 422)),
      });
      await vm.loadOrders(1);
      await vm.updateStatus('o1', 'shipped');
      expect(vm.errorMessage).toContain('Confirmada');
      expect(vm.errorMessage).toContain('Enviada');
    });

    for (const code of ['INVALID_STATUS_TRANSITION', 'NOT_FOUND']) {
      it(`reloads the list after ${code} and keeps the error message`, async () => {
        const { vm, ordersApi } = buildVm({
          updateOrderStatus: jasmine.createSpy().and.rejectWith(apiError(code, 422)),
        });
        await vm.loadOrders(1);
        expect(ordersApi.listOrders).toHaveBeenCalledTimes(1);

        await vm.updateStatus('o1', 'shipped');

        expect(ordersApi.listOrders).toHaveBeenCalledTimes(2);
        expect(vm.errorMessage).not.toBe('');
      });
    }

    it('does not reload the list after a plain FORBIDDEN', async () => {
      const { vm, ordersApi } = buildVm({
        updateOrderStatus: jasmine.createSpy().and.rejectWith(apiError('FORBIDDEN', 403)),
      });
      await vm.loadOrders(1);
      await vm.updateStatus('o1', 'shipped');
      expect(ordersApi.listOrders).toHaveBeenCalledTimes(1);
    });
  });

  describe('list load errors', () => {
    it('maps FORBIDDEN to a seller-permission message and empties the list', async () => {
      const { vm } = buildVm({
        listOrders: jasmine.createSpy().and.rejectWith(apiError('FORBIDDEN', 403)),
      });
      await vm.loadOrders(1);
      expect(vm.errorMessage).toContain('permisos de vendedor');
      expect(vm.orders).toEqual([]);
      expect(vm.isLoading).toBe(false);
    });

    it('maps an unexpected failure to a generic retry message', async () => {
      const { vm } = buildVm({
        listOrders: jasmine.createSpy().and.rejectWith(new Error('network down')),
      });
      await vm.loadOrders(1);
      expect(vm.errorMessage).toContain('No se pudieron cargar las ventas');
    });
  });

  describe('buyer name lookup', () => {
    it('requests each buyer once per page, even when several orders share the buyer', async () => {
      const { vm, profilesApi } = buildVm({
        orders: [
          order({ id: 'o1', buyer_id: 'b1' }),
          order({ id: 'o2', buyer_id: 'b1' }),
          order({ id: 'o3', buyer_id: 'b2' }),
        ],
      });
      await vm.loadOrders(1);
      expect(profilesApi.getById).toHaveBeenCalledTimes(2);
    });

    it('does not re-request cached buyers when reloading or changing page', async () => {
      const { vm, profilesApi } = buildVm();
      await vm.loadOrders(1);
      await vm.loadOrders(2);
      await vm.setStatusFilter('confirmed');
      expect(profilesApi.getById).toHaveBeenCalledTimes(1);
    });

    it('shares one request between concurrent loads (in-flight dedupe)', async () => {
      let resolveProfile;
      const getById = jasmine.createSpy('getById').and.returnValue(
        new Promise((resolve) => {
          resolveProfile = resolve;
        })
      );
      const { vm } = buildVm({ getById });

      const first = vm.loadOrders(1);
      const second = vm.loadOrders(1);
      // A macrotask lets both loads reach the (still pending) profile lookup.
      await new Promise((resolve) => setTimeout(resolve, 0));
      resolveProfile({ data: { full_name: 'Shared' } });
      await Promise.all([first, second]);

      expect(getById).toHaveBeenCalledTimes(1);
      expect(vm.getBuyerLabel(vm.orders[0])).toBe('Shared');
    });

    it('does not retry a failed lookup (no request storm) and falls back to a short id', async () => {
      const getById = jasmine.createSpy('getById').and.rejectWith(apiError('NOT_FOUND', 404));
      const { vm } = buildVm({
        orders: [order({ buyer_id: '12345678-aaaa-bbbb-cccc-dddddddddddd' })],
        getById,
      });
      await vm.loadOrders(1);
      await vm.loadOrders(1);

      expect(getById).toHaveBeenCalledTimes(1);
      expect(vm.getBuyerLabel(vm.orders[0])).toBe('12345678');
    });

    it('never falls back to the buyer e-mail', async () => {
      const { vm } = buildVm({
        orders: [order({ buyer_id: 'abcdef12-0000-0000-0000-000000000000' })],
        getById: jasmine.createSpy().and.resolveTo({ data: { email: 'secret@buyer.test' } }),
      });
      await vm.loadOrders(1);
      expect(vm.getBuyerLabel(vm.orders[0])).toBe('abcdef12');
    });

    it('labels an order without buyer_id generically', () => {
      const { vm } = buildVm();
      expect(vm.getBuyerLabel({})).toBe('Comprador');
    });
  });

  it('computes KPIs from the seller items of the current page', async () => {
    const { vm } = buildVm({
      orders: [
        order({ id: 'a', status: 'pending', items: [{ subtotal: 10 }] }),
        order({ id: 'b', status: 'confirmed', items: [{ subtotal: 5 }, { subtotal: 5 }] }),
        order({ id: 'c', status: 'shipped', items: [{ subtotal: 1.5 }] }),
      ],
    });
    await vm.loadOrders(1);
    expect(vm.getKpis()).toEqual({ toConfirm: 1, toShip: 1, shipped: 1, revenue: 21.5 });
  });
});
