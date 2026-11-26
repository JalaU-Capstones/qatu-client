import { resolveReportRange } from '../../models/adminReportRange.js';
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('AdminReportsViewModel additional branches (recovered 1)', () => {
      const SALES_DATA = { total_revenue: 10, total_orders: 2, period_breakdown: [] };
      const USERS_DATA = { buyer_count: 4, seller_count: 1, pending_seller_applications: 2 };
      const PRODUCTS_DATA = { published_products: 3, draft_products: 1, unpublished_products: 1 };

      let api;
      let viewModel;
      let unsubscribers;

      const pending = () => {
        let resolve;
        let reject;
        const promise = new Promise((done, fail) => {
          resolve = done;
          reject = fail;
        });
        return { promise, resolve, reject };
      };

      const subscribe = (listener) => {
        unsubscribers.push(viewModel.subscribe(listener));
      };

      beforeEach(() => {
        api = {
          getSalesReport: jasmine.createSpy('getSalesReport').and.resolveTo({ data: SALES_DATA }),
          getUsersReport: jasmine.createSpy('getUsersReport').and.resolveTo({ data: USERS_DATA }),
          getProductsReport: jasmine
            .createSpy('getProductsReport')
            .and.resolveTo({ data: PRODUCTS_DATA }),
        };
        viewModel = new AdminReportsViewModel({ reportsApi: api, rangeKey: '30d' });
        unsubscribers = [];
      });

      afterEach(() => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      });

      describe('_fetchTab (recovered 2)', () => {
        it('passes the full range to users/products and explicit fields to sales', async () => {
          const range = resolveReportRange('30d');
          api.getUsersReport.and.resolveTo({ data: { buyer_count: 7 } });
          api.getProductsReport.and.resolveTo({ data: { published_products: 8 } });
          api.getSalesReport.and.resolveTo({ data: { total_orders: 9 } });

          await expectAsync(viewModel._fetchTab('users', range)).toBeResolvedTo({ buyer_count: 7 });
          expect(api.getUsersReport).toHaveBeenCalledWith(range);

          await expectAsync(viewModel._fetchTab('products', range)).toBeResolvedTo({
            published_products: 8,
          });
          expect(api.getProductsReport).toHaveBeenCalledWith(range);

          await expectAsync(viewModel._fetchTab('sales', range)).toBeResolvedTo({
            total_orders: 9,
          });
          expect(api.getSalesReport).toHaveBeenCalledWith({
            from: range.from,
            to: range.to,
            groupBy: range.groupBy,
          });
        });

        it('returns an empty object when a response has no data', async () => {
          const range = resolveReportRange('30d');
          api.getUsersReport.and.resolveTo(null);
          api.getProductsReport.and.resolveTo(undefined);
          api.getSalesReport.and.resolveTo({});

          await expectAsync(viewModel._fetchTab('users', range)).toBeResolvedTo({});
          await expectAsync(viewModel._fetchTab('products', range)).toBeResolvedTo({});
          await expectAsync(viewModel._fetchTab('sales', range)).toBeResolvedTo({});
        });
      });

      describe('selectTab (recovered 3)', () => {
        it('loads the products tab with the resolved 30d range', async () => {
          await viewModel.selectTab('products');

          expect(viewModel.tab).toBe('products');
          expect(api.getProductsReport).toHaveBeenCalledWith(resolveReportRange('30d'));
          expect(api.getSalesReport).not.toHaveBeenCalled();
          expect(viewModel.products).toEqual(PRODUCTS_DATA);
          expect(viewModel.isLoading).toBe(false);
        });

        it('ignores unknown tabs and a repeated active tab', async () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);

          await viewModel.selectTab('unknown');
          await viewModel.selectTab('sales');

          expect(viewModel.tab).toBe('sales');
          expect(api.getSalesReport).not.toHaveBeenCalled();
          expect(api.getUsersReport).not.toHaveBeenCalled();
          expect(listener).not.toHaveBeenCalled();
        });

        it('serves a cached tab, clearing loading/error and notifying without a new request', async () => {
          await viewModel.load();
          await viewModel.selectTab('users');
          const listener = jasmine.createSpy('listener');
          subscribe(listener);
          viewModel.isLoading = true;
          viewModel.errorMessage = 'old error';

          await viewModel.selectTab('sales');

          expect(api.getSalesReport).toHaveBeenCalledTimes(1);
          expect(viewModel.sales).toEqual(SALES_DATA);
          expect(viewModel.isLoading).toBe(false);
          expect(viewModel.errorMessage).toBe('');
          expect(listener).toHaveBeenCalledWith(viewModel);
        });
      });

      describe('load (recovered 4)', () => {
        it('requests the 30d range with day grouping', async () => {
          await viewModel.load();

          expect(api.getSalesReport).toHaveBeenCalledWith({
            from: resolveReportRange('30d').from,
            to: resolveReportRange('30d').to,
            groupBy: 'day',
          });
          expect(viewModel.sales).toEqual(SALES_DATA);
        });

        it('detects forbidden errors by code only and by status code only', async () => {
          for (const error of [{ code: 'FORBIDDEN' }, { statusCode: 403 }]) {
            api.getSalesReport.and.rejectWith(error);

            await viewModel.load();

            expect(viewModel.isForbidden).toBe(true);
            expect(viewModel.errorMessage).toBe(
              '403 Forbidden: No tienes permisos de administrador.'
            );
          }
        });

        it('maps 401 and SESSION_EXPIRED to the exact session message', async () => {
          api.getSalesReport.and.rejectWith({ statusCode: 401 });
          await viewModel.load();
          expect(viewModel.errorMessage).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
          expect(viewModel.isForbidden).toBe(false);

          api.getSalesReport.and.rejectWith({ code: 'SESSION_EXPIRED' });
          await viewModel.load();
          expect(viewModel.errorMessage).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
          expect(viewModel.isForbidden).toBe(false);
        });

        it('uses error messages and the generic fallback while clearing a stale forbidden flag', async () => {
          viewModel.isForbidden = true;
          api.getSalesReport.and.rejectWith(new Error('Backend down'));

          await viewModel.load();

          expect(viewModel.errorMessage).toBe('Backend down');
          expect(viewModel.isForbidden).toBe(false);

          api.getSalesReport.and.rejectWith({});
          await viewModel.load();
          expect(viewModel.errorMessage).toBe('No se pudo cargar el reporte.');
          expect(viewModel.isLoading).toBe(false);
        });

        it('ignores a slow response that resolves after switching tabs', async () => {
          const slow = pending();
          api.getSalesReport.and.returnValue(slow.promise);

          const staleLoad = viewModel.load();
          await viewModel.selectTab('users');

          expect(viewModel.users).toEqual(USERS_DATA);
          expect(viewModel.isLoading).toBe(false);

          slow.resolve({ data: SALES_DATA });
          await staleLoad;

          expect(viewModel.sales).toBeNull();
          expect(viewModel.users).toEqual(USERS_DATA);
          expect(viewModel._cache.has('30d:sales')).toBe(false);
          expect(viewModel.isLoading).toBe(false);
        });

        it('ignores a stale error after a newer successful load', async () => {
          const slow = pending();
          api.getSalesReport.and.returnValue(slow.promise);

          const staleLoad = viewModel.load();
          api.getSalesReport.and.resolveTo({ data: SALES_DATA });
          await viewModel.load();

          slow.reject(Object.assign(new Error('old forbidden'), { code: 'FORBIDDEN' }));
          await staleLoad;

          expect(viewModel.sales).toEqual(SALES_DATA);
          expect(viewModel.errorMessage).toBe('');
          expect(viewModel.isForbidden).toBe(false);
          expect(viewModel.isLoading).toBe(false);
        });
      });

      describe('setRange (recovered 5)', () => {
        it('treats the current range and an invalid alias for it as no-ops', async () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);

          await viewModel.setRange('30d');
          await viewModel.setRange('not-a-range');

          expect(viewModel.rangeKey).toBe('30d');
          expect(api.getSalesReport).not.toHaveBeenCalled();
          expect(listener).not.toHaveBeenCalled();
        });

        it('normalizes an invalid range to 30d/day when changing from another range', async () => {
          viewModel.rangeKey = 'year';

          await viewModel.setRange('invalid');

          expect(viewModel.rangeKey).toBe('30d');
          expect(api.getSalesReport.calls.mostRecent().args[0]).toEqual(
            jasmine.objectContaining({
              from: resolveReportRange('30d').from,
              to: resolveReportRange('30d').to,
              groupBy: 'day',
            })
          );
        });

        it('clears the cache and every tab, then reloads the active tab for year/month', async () => {
          await viewModel.load();
          await viewModel.selectTab('users');
          await viewModel.selectTab('products');
          await viewModel.selectTab('sales');
          expect(viewModel._cache.size).toBe(3);

          const slow = pending();
          api.getSalesReport.and.returnValue(slow.promise);
          const changing = viewModel.setRange('year');

          expect(viewModel.rangeKey).toBe('year');
          expect(viewModel._cache.size).toBe(0);
          expect(viewModel.sales).toBeNull();
          expect(viewModel.users).toBeNull();
          expect(viewModel.products).toBeNull();

          slow.resolve({ data: SALES_DATA });
          await changing;

          expect(viewModel._cache.size).toBe(2);
          expect(viewModel._cache.has('year:sales')).toBe(true);
          expect(viewModel._cache.has('year:users')).toBe(true);
          expect(viewModel.sales).toEqual(SALES_DATA);
          expect(viewModel.users).toEqual(USERS_DATA);
          expect(viewModel.products).toBeNull();
          expect(api.getSalesReport.calls.mostRecent().args[0].groupBy).toBe('month');
          expect(api.getSalesReport.calls.mostRecent().args[0].from).toBe(
            resolveReportRange('year').from
          );
        });
      });

      it('notifies multiple subscribers and stops after unsubscribe', async () => {
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        const unsubscribeFirst = viewModel.subscribe(first);
        unsubscribers.push(unsubscribeFirst);
        unsubscribers.push(viewModel.subscribe(second));

        await viewModel.load();

        expect(first).toHaveBeenCalledWith(viewModel);
        expect(second).toHaveBeenCalledWith(viewModel);

        unsubscribeFirst();
        const firstCount = first.calls.count();
        await viewModel.selectTab('users');

        expect(first.calls.count()).toBe(firstCount);
        expect(second.calls.count()).toBeGreaterThan(firstCount);
      });
    });
  })();
})();
