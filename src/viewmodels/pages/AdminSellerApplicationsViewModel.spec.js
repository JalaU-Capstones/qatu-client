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
