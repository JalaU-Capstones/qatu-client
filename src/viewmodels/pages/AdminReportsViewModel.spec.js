import { AdminReportsViewModel } from './AdminReportsViewModel.js';

describe('AdminReportsViewModel', () => {
  let api;
  let viewModel;

  beforeEach(() => {
    api = {
      getSalesReport: jasmine.createSpy('getSalesReport').and.resolveTo({
        data: { currency: 'BOB', total_revenue: 10, total_orders: 2, period_breakdown: [] },
      }),
      getUsersReport: jasmine.createSpy('getUsersReport').and.resolveTo({
        data: { buyer_count: 4, seller_count: 1, pending_seller_applications: 2 },
      }),
      getProductsReport: jasmine.createSpy('getProductsReport').and.resolveTo({
        data: { published_products: 3, draft_products: 1, unpublished_products: 1 },
      }),
    };
    viewModel = new AdminReportsViewModel({ reportsApi: api, rangeKey: 'month' });
  });

  it('loads the sales tab for the selected range', async () => {
    await viewModel.load();

    expect(api.getSalesReport).toHaveBeenCalledWith(
      jasmine.objectContaining({
        groupBy: 'day',
        from: jasmine.any(String),
        to: jasmine.any(String),
      })
    );
    expect(viewModel.sales.total_orders).toBe(2);
    expect(api.getUsersReport).toHaveBeenCalledWith(
      jasmine.objectContaining({
        from: jasmine.any(String),
        to: jasmine.any(String),
      })
    );
    expect(viewModel.users.buyer_count).toBe(4);
    expect(viewModel.isLoading).toBe(false);
  });

  it('keeps sales available when the users summary cannot be loaded', async () => {
    api.getUsersReport.and.rejectWith(new Error('Users report unavailable'));

    await viewModel.load();

    expect(viewModel.sales.total_orders).toBe(2);
    expect(viewModel.users).toBeNull();
    expect(viewModel.usersErrorMessage).toBe('Users report unavailable');
    expect(viewModel.errorMessage).toBe('');
  });

  it('caches a tab and does not request it again', async () => {
    await viewModel.selectTab('users');
    await viewModel.selectTab('sales');
    await viewModel.selectTab('users');

    expect(api.getUsersReport).toHaveBeenCalledTimes(1);
    expect(viewModel.users.pending_seller_applications).toBe(2);
  });

  it('drops the cache when the range changes', async () => {
    await viewModel.load();
    await viewModel.setRange('90d');

    expect(api.getSalesReport).toHaveBeenCalledTimes(2);
    expect(viewModel.rangeKey).toBe('90d');
    expect(api.getSalesReport.calls.mostRecent().args[0].groupBy).toBe('week');
  });

  it('marks the page forbidden when the API returns 403', async () => {
    api.getSalesReport.and.rejectWith(
      Object.assign(new Error('Admin role required'), { code: 'FORBIDDEN', statusCode: 403 })
    );

    await viewModel.load();

    expect(viewModel.isForbidden).toBe(true);
    expect(viewModel.errorMessage).toContain('403');
  });
});
