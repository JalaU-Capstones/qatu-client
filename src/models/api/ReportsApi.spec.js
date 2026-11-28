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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    describe('ReportsApi additional branches (recovered 1)', () => {
      let fetchFn;
      let api;

      beforeEach(() => {
        fetchFn = jasmine.createSpy('apiFetchFn');
        fetchFn.and.resolveTo(jsonResponse({ data: {}, meta: {} }));
        api = new ReportsApi({ apiFetchFn: fetchFn });
      });

      it('rejects an explicitly falsy fetch function', () => {
        for (const apiFetchFn of [null, '', 0, false]) {
          expect(() => new ReportsApi({ apiFetchFn })).toThrowError('apiFetchFn is required');
        }
      });

      it('defaults group_by to month and accepts day and week', async () => {
        await api.getSalesReport({ from: '2026-01-01', to: '2026-01-31' });
        expect(fetchFn.calls.first().args[0]).toContain('group_by=month');

        await api.getSalesReport({ from: '2026-01-01', to: '2026-01-31', groupBy: 'day' });
        expect(fetchFn.calls.mostRecent().args[0]).toContain('group_by=day');

        await api.getSalesReport({ from: '2026-01-01', to: '2026-01-31', groupBy: 'week' });
        expect(fetchFn.calls.mostRecent().args[0]).toContain('group_by=week');
      });

      it('rejects invalid groupBy values before calling the API', async () => {
        for (const groupBy of ['hour', '', null, 42]) {
          let error;
          try {
            await api.getSalesReport({ from: '2026-01-01', to: '2026-01-31', groupBy });
          } catch (caught) {
            error = caught;
          }
          expect(error.message).toBe('group_by must be day, week, or month.');
          expect(error.code).toBe('INVALID_REQUEST');
          expect(error.statusCode).toBe(400);
        }
        expect(fetchFn).not.toHaveBeenCalled();
      });

      it('validates both dates in every report method', async () => {
        for (const method of ['getSalesReport', 'getUsersReport', 'getProductsReport']) {
          await expectAsync(
            api[method]({ from: undefined, to: '2026-01-31' })
          ).toBeRejectedWithError('from must be a date in YYYY-MM-DD format.');
          await expectAsync(api[method]({ from: '2026-01-01' })).toBeRejectedWithError(
            'to must be a date in YYYY-MM-DD format.'
          );
          await expectAsync(
            api[method]({ from: 20260101, to: '2026-01-31' })
          ).toBeRejectedWithError('from must be a date in YYYY-MM-DD format.');
        }
        expect(fetchFn).not.toHaveBeenCalled();
      });

      it('requests users and products reports with GET and withAuth', async () => {
        await api.getUsersReport({ from: '2026-01-01', to: '2026-01-31' });
        expect(fetchFn.calls.first().args).toEqual([
          '/admin/reports/users?from=2026-01-01&to=2026-01-31',
          { method: 'GET', withAuth: true },
        ]);

        await api.getProductsReport({ from: '2026-02-01', to: '2026-02-28' });
        expect(fetchFn.calls.mostRecent().args).toEqual([
          '/admin/reports/products?from=2026-02-01&to=2026-02-28',
          { method: 'GET', withAuth: true },
        ]);
      });

      it('maps status codes, fallback messages and details consistently', async () => {
        const cases = [
          [401, 'UNAUTHORIZED'],
          [404, 'NOT_FOUND'],
          [500, 'UNKNOWN_ERROR'],
        ];
        for (const [status, code] of cases) {
          fetchFn.and.resolveTo(new Response('', { status }));
          let error;
          try {
            await api.getUsersReport({ from: '2026-01-01', to: '2026-01-31' });
          } catch (caught) {
            error = caught;
          }
          expect(error.code).toBe(code);
          expect(error.statusCode).toBe(status);
          expect(error.message).toBe(`Failed to load users report (${status})`);
        }

        fetchFn.and.resolveTo(jsonResponse({ error: { details: [{ field: 'from' }] } }, 422));
        let error;
        try {
          await api.getProductsReport({ from: '2026-01-01', to: '2026-01-31' });
        } catch (caught) {
          error = caught;
        }
        expect(error.message).toBe('Failed to load products report (422)');
        expect(error.details).toEqual([{ field: 'from' }]);
      });

      it('propagates a network rejection', async () => {
        fetchFn.and.rejectWith(new Error('offline'));
        await expectAsync(
          api.getSalesReport({ from: '2026-01-01', to: '2026-01-31' })
        ).toBeRejectedWithError('offline');
      });
    });
  })();
})();
