import { ReportsApi } from './ReportsApi.js';

describe('ReportsApi', () => {
  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status });
  }

  it('getSalesReport() sends the date range and group_by', async () => {
    const fetchSpy = jasmine.createSpy('apiFetch').and.resolveTo(
      jsonResponse({
        data: { total_revenue: 10, total_orders: 1 },
        meta: {},
      })
    );
    const api = new ReportsApi({ apiFetchFn: fetchSpy });

    const result = await api.getSalesReport({
      from: '2026-03-01',
      to: '2026-03-31',
      groupBy: 'week',
    });

    expect(result.data.total_orders).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/admin/reports/sales?from=2026-03-01&to=2026-03-31&group_by=week',
      jasmine.objectContaining({ method: 'GET', withAuth: true })
    );
  });

  it('rejects a date that is not YYYY-MM-DD before calling the API', async () => {
    const fetchSpy = jasmine.createSpy('apiFetch');
    const api = new ReportsApi({ apiFetchFn: fetchSpy });

    await expectAsync(
      api.getUsersReport({ from: '18-03-2026', to: '2026-03-31' })
    ).toBeRejectedWithError(/YYYY-MM-DD/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps the API error code on 403', async () => {
    const fetchSpy = jasmine
      .createSpy('apiFetch')
      .and.resolveTo(
        jsonResponse({ error: { code: 'FORBIDDEN', message: 'Admin role required' } }, 403)
      );
    const api = new ReportsApi({ apiFetchFn: fetchSpy });

    try {
      await api.getProductsReport({ from: '2026-03-01', to: '2026-03-31' });
      fail('expected a 403');
    } catch (error) {
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Admin role required');
    }
  });
});
