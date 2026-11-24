import { AdminSellerApplicationsViewModel } from './AdminSellerApplicationsViewModel.js';

describe('AdminSellerApplicationsViewModel', () => {
  it('approves a pending application and updates its status to approved', async () => {
    const api = {
      listApplications: jasmine.createSpy('listApplications').and.resolveTo({
        data: [{ id: 'app-1', business_name: 'Café Altura', status: 'pending' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      reviewApplication: jasmine.createSpy('reviewApplication').and.resolveTo({
        data: { id: 'app-1', business_name: 'Café Altura', status: 'approved' },
      }),
    };
    const vm = new AdminSellerApplicationsViewModel({ sellerApplicationsApi: api });

    await vm.loadApplications(1);
    const ok = await vm.approveApplication('app-1');

    expect(ok).toBe(true);
    expect(vm.applications[0].status).toBe('approved');
    expect(vm.noticeMessage).toContain('aprobada');
  });

  it('requires rejection reason and updates status to rejected on valid submission', async () => {
    const api = {
      listApplications: jasmine.createSpy('listApplications').and.resolveTo({
        data: [{ id: 'app-2', business_name: 'Tienda X', status: 'pending' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      reviewApplication: jasmine.createSpy('reviewApplication').and.resolveTo({
        data: {
          id: 'app-2',
          business_name: 'Tienda X',
          status: 'rejected',
          rejection_reason: 'Falta descripción comercial',
        },
      }),
    };
    const vm = new AdminSellerApplicationsViewModel({ sellerApplicationsApi: api });

    await vm.loadApplications(1);
    vm.openRejectForm('app-2');

    const emptyAttempt = await vm.submitRejection('app-2');
    expect(emptyAttempt).toBe(false);
    expect(vm.rejectionError).not.toBe('');

    vm.setRejectionReason('Falta descripción comercial');
    const validAttempt = await vm.submitRejection('app-2');
    expect(validAttempt).toBe(true);
    expect(vm.applications[0].status).toBe('rejected');
    expect(vm.rejectingId).toBeNull();
  });

  it('flags isForbidden when API returns 403', async () => {
    const forbiddenErr = new Error('Forbidden');
    forbiddenErr.statusCode = 403;
    forbiddenErr.code = 'FORBIDDEN';

    const api = {
      listApplications: jasmine.createSpy('listApplications').and.rejectWith(forbiddenErr),
    };
    const vm = new AdminSellerApplicationsViewModel({ sellerApplicationsApi: api });

    await vm.loadApplications(1);

    expect(vm.isForbidden).toBe(true);
    expect(vm.errorMessage).toContain('403 Forbidden');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('AdminSellerApplicationsViewModel additional branches (recovered 1)', () => {
      let api;
      let viewModel;
      let unsubscribers;

      const application = (overrides = {}) => ({
        id: 'app-1',
        business_name: 'Café Altura',
        status: 'pending',
        ...overrides,
      });

      const listResponse = (data = [], meta = {}) => ({
        data,
        meta: { page: 1, limit: 20, total: data.length, totalPages: 1, ...meta },
      });

      const createApi = () => ({
        listApplications: jasmine
          .createSpy('listApplications')
          .and.resolveTo(listResponse([application()])),
        reviewApplication: jasmine
          .createSpy('reviewApplication')
          .and.resolveTo({ data: application({ status: 'approved' }) }),
      });

      const pending = () => {
        let resolve;
        const promise = new Promise((done) => {
          resolve = done;
        });
        return { promise, resolve };
      };

      const subscribe = (listener) => {
        unsubscribers.push(viewModel.subscribe(listener));
      };

      beforeEach(() => {
        api = createApi();
        viewModel = new AdminSellerApplicationsViewModel({ sellerApplicationsApi: api });
        unsubscribers = [];
      });

      afterEach(() => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      });

      describe('loadApplications (recovered 2)', () => {
        it('treats missing data/meta as empty and maps both totalPages aliases', async () => {
          api.listApplications.and.resolveTo({});

          await viewModel.loadApplications(2);

          expect(viewModel.applications).toEqual([]);
          expect(viewModel.meta).toEqual({ page: 2, limit: 20, total: 0, totalPages: 1 });

          api.listApplications.and.resolveTo({
            data: null,
            meta: { page: '3', limit: '25', total: '8', total_pages: '4' },
          });
          await viewModel.loadApplications(1);
          expect(viewModel.meta).toEqual({ page: 3, limit: 25, total: 8, totalPages: 4 });

          api.listApplications.and.resolveTo({
            data: [application()],
            meta: { totalPages: 2, total_pages: 9 },
          });
          await viewModel.loadApplications(1);
          expect(viewModel.meta.totalPages).toBe(2);
          expect(viewModel.applications.length).toBe(1);
        });

        it('resets a stale forbidden flag on success but keeps it on generic errors', async () => {
          viewModel.isForbidden = true;
          api.listApplications.and.resolveTo(listResponse([]));
          await viewModel.loadApplications(1);
          expect(viewModel.isForbidden).toBe(false);

          api.listApplications.and.rejectWith(new Error('Network down'));
          viewModel.isForbidden = true;
          await viewModel.loadApplications(1);
          expect(viewModel.errorMessage).toBe('Network down');
          expect(viewModel.isForbidden).toBe(true);
          expect(viewModel.isLoading).toBe(false);
        });

        it('uses the generic fallback when the error has no message', async () => {
          api.listApplications.and.rejectWith({});

          await viewModel.loadApplications(1);

          expect(viewModel.errorMessage).toBe(
            'No se pudieron cargar las solicitudes de vendedores.'
          );
          expect(viewModel.applications).toEqual([]);
          expect(viewModel.isLoading).toBe(false);
        });

        it('detects 403 by code only and by status code only with the exact message', async () => {
          for (const error of [{ code: 'FORBIDDEN' }, { statusCode: 403 }]) {
            const caseApi = createApi();
            caseApi.listApplications.and.rejectWith(error);
            const caseViewModel = new AdminSellerApplicationsViewModel({
              sellerApplicationsApi: caseApi,
            });

            await caseViewModel.loadApplications(1);

            expect(caseViewModel.isForbidden).toBe(true);
            expect(caseViewModel.errorMessage).toBe(
              '403 Forbidden: No tienes permisos de administrador.'
            );
            expect(caseViewModel.applications).toEqual([]);
          }
        });
      });

      describe('setStatusFilter (recovered 3)', () => {
        it('normalizes the value, cancels the reject form and always reloads page 1', async () => {
          await viewModel.loadApplications(1);
          viewModel.meta.page = 4;
          viewModel.openRejectForm('app-1');
          viewModel.setRejectionReason('Motivo');
          api.listApplications.calls.reset();

          await viewModel.setStatusFilter('pending');

          expect(viewModel.statusFilter).toBe('pending');
          expect(api.listApplications).toHaveBeenCalledWith({
            page: 1,
            limit: 20,
            status: 'pending',
          });
          expect(viewModel.rejectingId).toBeNull();
          expect(viewModel.rejectionReason).toBe('');
          expect(viewModel.rejectionError).toBe('');

          await viewModel.setStatusFilter(0);

          expect(viewModel.statusFilter).toBe('');
          expect(api.listApplications.calls.mostRecent().args[0].status).toBeUndefined();
        });
      });

      describe('approveApplication (recovered 4)', () => {
        it('rejects missing and busy ids before calling the API', async () => {
          for (const id of [null, undefined, '', 0]) {
            await expectAsync(viewModel.approveApplication(id)).toBeResolvedTo(false);
          }
          viewModel.reviewingIds.add('app-1');
          await expectAsync(viewModel.approveApplication('app-1')).toBeResolvedTo(false);

          expect(api.reviewApplication).not.toHaveBeenCalled();
          expect(viewModel.isReviewing('app-2')).toBe(false);
        });

        it('tracks in-flight review and clears the reject form for the same id', async () => {
          const slow = pending();
          api.reviewApplication.and.returnValue(slow.promise);
          viewModel.openRejectForm('app-1');
          viewModel.setRejectionReason('Motivo');

          const approving = viewModel.approveApplication('app-1');

          expect(viewModel.isReviewing('app-1')).toBe(true);
          expect(viewModel.rejectingId).toBeNull();
          expect(viewModel.rejectionReason).toBe('');
          expect(viewModel.rejectionError).toBe('');

          slow.resolve({ data: application({ status: 'approved' }) });
          await expectAsync(approving).toBeResolvedTo(true);

          expect(viewModel.isReviewing('app-1')).toBe(false);
          expect(viewModel.noticeMessage).toBe(
            'Solicitud aprobada. El solicitante recibió el rol de vendedor y fue notificado.'
          );
        });

        it('uses a synthetic approval when the response has no data', async () => {
          await viewModel.loadApplications(1);
          api.reviewApplication.and.resolveTo(undefined);

          await expectAsync(viewModel.approveApplication('app-1')).toBeResolvedTo(true);

          expect(api.reviewApplication).toHaveBeenCalledWith('app-1', { status: 'approved' });
          expect(viewModel.applications[0]).toEqual(
            jasmine.objectContaining({
              id: 'app-1',
              business_name: 'Café Altura',
              status: 'approved',
            })
          );
        });

        it('reports code-only forbidden and generic errors while clearing busy state', async () => {
          api.reviewApplication.and.rejectWith({ code: 'FORBIDDEN' });

          await expectAsync(viewModel.approveApplication('app-1')).toBeResolvedTo(false);

          expect(viewModel.isForbidden).toBe(true);
          expect(viewModel.errorMessage).toBe(
            '403 Forbidden: No tienes permisos de administrador.'
          );
          expect(viewModel.isReviewing('app-1')).toBe(false);

          api.reviewApplication.and.rejectWith({});
          await expectAsync(viewModel.approveApplication('app-1')).toBeResolvedTo(false);
          expect(viewModel.errorMessage).toBe('No se pudo aprobar la solicitud.');
          expect(viewModel.isReviewing('app-1')).toBe(false);
        });
      });

      describe('rejection form (recovered 5)', () => {
        it('openRejectForm resets transient state and notifies', () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);
          viewModel.rejectionReason = 'old reason';
          viewModel.rejectionError = 'old error';
          viewModel.errorMessage = 'old error';

          viewModel.openRejectForm('app-1');

          expect(viewModel.rejectingId).toBe('app-1');
          expect(viewModel.rejectionReason).toBe('');
          expect(viewModel.rejectionError).toBe('');
          expect(viewModel.errorMessage).toBe('');
          expect(listener).toHaveBeenCalledWith(viewModel);
        });

        it('cancelRejectForm is a no-op without state', () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);

          viewModel.cancelRejectForm();

          expect(viewModel.rejectingId).toBeNull();
          expect(viewModel.rejectionReason).toBe('');
          expect(viewModel.rejectionError).toBe('');
          expect(listener).not.toHaveBeenCalled();
        });

        it('cancelRejectForm clears state and notifies', () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);
          viewModel.openRejectForm('app-1');
          viewModel.setRejectionReason('Motivo');
          viewModel.rejectionError = 'stale error';

          viewModel.cancelRejectForm();

          expect(viewModel.rejectingId).toBeNull();
          expect(viewModel.rejectionReason).toBe('');
          expect(viewModel.rejectionError).toBe('');
          expect(listener).toHaveBeenCalledWith(viewModel);
        });

        it('setRejectionReason clears rejectionError and notifies', async () => {
          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(false);
          expect(viewModel.rejectionError).not.toBe('');
          const listener = jasmine.createSpy('listener');
          subscribe(listener);

          viewModel.setRejectionReason('  Motivo  ');

          expect(viewModel.rejectionReason).toBe('  Motivo  ');
          expect(viewModel.rejectionError).toBe('');
          expect(listener).toHaveBeenCalledWith(viewModel);
        });
      });

      describe('submitRejection (recovered 6)', () => {
        it('rejects missing and busy ids before validation or API calls', async () => {
          for (const id of [null, undefined, '', 0]) {
            await expectAsync(viewModel.submitRejection(id)).toBeResolvedTo(false);
          }
          viewModel.reviewingIds.add('app-1');
          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(false);

          expect(viewModel.rejectionError).toBe('');
          expect(api.reviewApplication).not.toHaveBeenCalled();
        });

        it('enforces the 500-character limit with the exact message and accepts boundaries', async () => {
          viewModel.setRejectionReason('a');
          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(true);
          expect(api.reviewApplication.calls.mostRecent().args[1].rejectionReason).toBe('a');

          viewModel.setRejectionReason(`  ${'b'.repeat(500)}  `);
          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(true);
          expect(api.reviewApplication.calls.mostRecent().args[1].rejectionReason.length).toBe(500);

          viewModel.setRejectionReason('c'.repeat(501));
          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(false);
          expect(viewModel.rejectionError).toBe(
            'El motivo de rechazo no puede superar los 500 caracteres.'
          );
        });

        it('treats non-string and blank reasons as missing', async () => {
          for (const value of [null, undefined, 123, '   ']) {
            viewModel.setRejectionReason(value);
            await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(false);
            expect(viewModel.rejectionError).toBe(
              'El motivo de rechazo es obligatorio cuando se rechaza una solicitud.'
            );
          }
          expect(api.reviewApplication).not.toHaveBeenCalled();
        });

        it('sends the exact rejection payload and clears the form on success', async () => {
          await viewModel.loadApplications(1);
          viewModel.openRejectForm('app-1');
          viewModel.setRejectionReason('  Falta descripción  ');
          api.reviewApplication.and.resolveTo({
            data: application({ status: 'rejected', rejection_reason: 'Falta descripción' }),
          });

          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(true);

          expect(api.reviewApplication).toHaveBeenCalledWith('app-1', {
            status: 'rejected',
            rejectionReason: 'Falta descripción',
          });
          expect(viewModel.applications[0].status).toBe('rejected');
          expect(viewModel.rejectingId).toBeNull();
          expect(viewModel.rejectionReason).toBe('');
          expect(viewModel.noticeMessage).toBe(
            'Solicitud rechazada. El solicitante fue notificado.'
          );
        });

        it('builds a synthetic rejection when the response has no data', async () => {
          await viewModel.loadApplications(1);
          api.reviewApplication.and.resolveTo({});
          viewModel.setRejectionReason('Motivo');

          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(true);

          expect(viewModel.applications[0]).toEqual(
            jasmine.objectContaining({
              id: 'app-1',
              status: 'rejected',
              rejection_reason: 'Motivo',
            })
          );
          expect(viewModel.rejectingId).toBeNull();
        });

        it('reports 403 and generic errors while keeping the form open for retry', async () => {
          viewModel.openRejectForm('app-1');
          viewModel.setRejectionReason('Motivo');
          api.reviewApplication.and.rejectWith({ code: 'FORBIDDEN' });

          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(false);

          expect(viewModel.isForbidden).toBe(true);
          expect(viewModel.errorMessage).toBe(
            '403 Forbidden: No tienes permisos de administrador.'
          );
          expect(viewModel.rejectingId).toBe('app-1');
          expect(viewModel.rejectionReason).toBe('Motivo');
          expect(viewModel.isReviewing('app-1')).toBe(false);

          api.reviewApplication.and.rejectWith({});
          await expectAsync(viewModel.submitRejection('app-1')).toBeResolvedTo(false);

          expect(viewModel.errorMessage).toBe('No se pudo rechazar la solicitud.');
          expect(viewModel.rejectingId).toBe('app-1');
          expect(viewModel.isReviewing('app-1')).toBe(false);
        });
      });

      it('leaves the list untouched when no application matches the updated id', async () => {
        await viewModel.loadApplications(1);
        const before = viewModel.applications;

        viewModel._replaceApplication('missing', { status: 'approved' });

        expect(viewModel.applications).toEqual(before);
        expect(viewModel.applications[0].status).toBe('pending');
      });

      it('notifies multiple subscribers and stops after unsubscribe', () => {
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        const unsubscribeFirst = viewModel.subscribe(first);
        unsubscribers.push(unsubscribeFirst);
        unsubscribers.push(viewModel.subscribe(second));

        viewModel.openRejectForm('app-1');

        expect(first).toHaveBeenCalledWith(viewModel);
        expect(second).toHaveBeenCalledWith(viewModel);

        unsubscribeFirst();
        viewModel.cancelRejectForm();

        expect(first.calls.count()).toBe(1);
        expect(second.calls.count()).toBe(2);
      });
    });
  })();
})();
