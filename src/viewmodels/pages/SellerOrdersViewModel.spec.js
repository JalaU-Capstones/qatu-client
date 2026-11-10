import { SellerOrdersViewModel } from './SellerOrdersViewModel.js';

describe('SellerOrdersViewModel', () => {
  it('computes seller revenue from items[].subtotal only', () => {
    const revenue = SellerOrdersViewModel.sellerRevenue({
      total: 999,
      items: [{ subtotal: 10 }, { subtotal: 5.5 }],
    });
    expect(revenue).toBe(15.5);
  });

  it('loads seller orders with view=seller and updates status', async () => {
    const ordersApi = {
      listOrders: jasmine.createSpy('listOrders').and.resolveTo({
        data: [
          {
            id: 'o1',
            buyer_id: 'b1',
            status: 'confirmed',
            items: [{ subtotal: 20, product_name: 'Chair', quantity: 1 }],
          },
        ],
        meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
      }),
      updateOrderStatus: jasmine.createSpy('updateOrderStatus').and.resolveTo({
        data: { id: 'o1', status: 'shipped', items: [{ subtotal: 20 }] },
      }),
    };
    const profilesApi = {
      getById: jasmine.createSpy('getById').and.resolveTo({
        data: { full_name: 'Buyer One' },
      }),
    };

    const vm = new SellerOrdersViewModel({ ordersApi, profilesApi });
    await vm.loadOrders(1);

    expect(ordersApi.listOrders).toHaveBeenCalledWith(jasmine.objectContaining({ view: 'seller' }));
    expect(vm.orders[0].status).toBe('confirmed');
    expect(vm.getBuyerLabel(vm.orders[0])).toBe('Buyer One');
    expect(vm.getNextStatuses(vm.orders[0])).toEqual(['shipped', 'cancelled']);

    await vm.updateStatus('o1', 'shipped');
    expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith('o1', 'shipped');
    expect(vm.orders[0].status).toBe('shipped');
    expect(vm.noticeMessage).toContain('Enviada');
  });
});
