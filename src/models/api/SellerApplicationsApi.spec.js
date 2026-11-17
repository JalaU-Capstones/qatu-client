import { SellerApplicationsApi } from './SellerApplicationsApi.js';

describe('SellerApplicationsApi', () => {
  it('apply() sends POST /seller-applications with trimmed fields', async () => {
    const fetchSpy = jasmine.createSpy('apiFetch').and.resolveTo(
      new Response(JSON.stringify({ data: { id: 'app-1', status: 'pending' }, meta: {} }), {
        status: 201,
      })
    );
    const api = new SellerApplicationsApi({ apiFetchFn: fetchSpy });

    const res = await api.apply({
      business_name: '  Cerámica Andina  ',
      business_description: '  Artesanías hechas a mano en barro cocido  ',
      contact_phone: '  +51 999 111 222  ',
      contact_email: '  tienda@andina.pe  ',
    });

    expect(res.data.status).toBe('pending');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/seller-applications',
      jasmine.objectContaining({
        method: 'POST',
        withAuth: true,
        body: JSON.stringify({
          business_name: 'Cerámica Andina',
          business_description: 'Artesanías hechas a mano en barro cocido',
          contact_phone: '+51 999 111 222',
          contact_email: 'tienda@andina.pe',
        }),
      })
    );
  });

  it('apply() propagates 409 error message verbatim', async () => {
    const fetchSpy = jasmine.createSpy('apiFetch').and.resolveTo(
      new Response(
        JSON.stringify({
          error: { code: 'CONFLICT', message: 'You already have a pending application' },
        }),
        { status: 409 }
      )
    );
    const api = new SellerApplicationsApi({ apiFetchFn: fetchSpy });

    await expectAsync(
      api.apply({
        business_name: 'Tienda',
        business_description: 'Descripción válida de al menos 20 caracteres.',
      })
    ).toBeRejectedWithError('You already have a pending application');
  });

  it('getMyApplication() returns null on 404', async () => {
    const fetchSpy = jasmine
      .createSpy('apiFetch')
      .and.resolveTo(
        new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 })
      );
    const api = new SellerApplicationsApi({ apiFetchFn: fetchSpy });

    const app = await api.getMyApplication();
    expect(app).toBeNull();
  });

  it('listApplications() queries GET /admin/seller-applications with status and pagination', async () => {
    const fetchSpy = jasmine.createSpy('apiFetch').and.resolveTo(
      new Response(
        JSON.stringify({
          data: [{ id: 'app-1', status: 'pending' }],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
        { status: 200 }
      )
    );
    const api = new SellerApplicationsApi({ apiFetchFn: fetchSpy });

    const result = await api.listApplications({ page: 1, limit: 20, status: 'pending' });
    expect(result.data.length).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/admin/seller-applications?page=1&limit=20&status=pending',
      jasmine.objectContaining({ method: 'GET', withAuth: true })
    );
  });

  it('reviewApplication() sends PATCH with rejection_reason when rejected', async () => {
    const fetchSpy = jasmine.createSpy('apiFetch').and.resolveTo(
      new Response(JSON.stringify({ data: { id: 'app-1', status: 'rejected' }, meta: {} }), {
        status: 200,
      })
    );
    const api = new SellerApplicationsApi({ apiFetchFn: fetchSpy });

    await api.reviewApplication('app-1', {
      status: 'rejected',
      rejectionReason: 'Documentación incompleta',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/admin/seller-applications/app-1',
      jasmine.objectContaining({
        method: 'PATCH',
        withAuth: true,
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: 'Documentación incompleta',
        }),
      })
    );
  });
});
