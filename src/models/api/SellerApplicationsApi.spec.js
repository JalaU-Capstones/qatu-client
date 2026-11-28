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
      country_code: '  +51  ',
      phone_number: '  999111222  ',
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
          country_code: '+51',
          phone_number: '999111222',
          contact_email: 'tienda@andina.pe',
        }),
      })
    );
  });

  it('omits incomplete optional phone details from the request', async () => {
    const fetchSpy = jasmine
      .createSpy('apiFetch')
      .and.resolveTo(
        new Response(JSON.stringify({ data: { id: 'app-1' }, meta: {} }), { status: 201 })
      );
    const api = new SellerApplicationsApi({ apiFetchFn: fetchSpy });

    await api.apply({
      business_name: 'Cerámica Andina',
      business_description: 'Artesanías hechas a mano en barro cocido.',
      country_code: '+51',
    });

    expect(JSON.parse(fetchSpy.calls.mostRecent().args[1].body)).not.toEqual(
      jasmine.objectContaining({ country_code: jasmine.any(String) })
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    describe('SellerApplicationsApi additional branches (recovered 1)', () => {
      let fetchFn;
      let api;

      beforeEach(() => {
        fetchFn = jasmine.createSpy('apiFetchFn');
        api = new SellerApplicationsApi({ apiFetchFn: fetchFn });
      });

      it('rejects an explicitly falsy fetch function', () => {
        for (const apiFetchFn of [null, '', 0, false]) {
          expect(() => new SellerApplicationsApi({ apiFetchFn })).toThrowError(
            'apiFetchFn is required'
          );
        }
      });

      it('sends empty strings for a missing application payload', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));

        await api.apply();

        expect(fetchFn.calls.first().args[0]).toBe('/seller-applications');
        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({
          business_name: '',
          business_description: '',
        });
      });

      it('omits blank and non-string optional contact fields', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));

        await api.apply({
          business_name: 123,
          business_description: null,
          contact_phone: '  ',
          contact_email: 7,
        });

        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({
          business_name: '',
          business_description: '',
        });
      });

      it('returns the application data on success and null for an empty envelope', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: { id: 'a1' } }));
        await expectAsync(api.getMyApplication()).toBeResolvedTo({ id: 'a1' });

        fetchFn.and.resolveTo(jsonResponse({ meta: {} }));
        await expectAsync(api.getMyApplication()).toBeResolvedTo(null);

        fetchFn.and.resolveTo(new Response('not-json', { status: 200 }));
        await expectAsync(api.getMyApplication()).toBeResolvedTo(null);
      });

      it('validates the list status and omits falsy pagination params', async () => {
        let error;
        try {
          await api.listApplications({ status: 'archived' });
        } catch (caught) {
          error = caught;
        }
        expect(error.code).toBe('INVALID_REQUEST');
        expect(error.statusCode).toBe(400);
        expect(fetchFn).not.toHaveBeenCalled();

        fetchFn.and.resolveTo(jsonResponse({ data: null, meta: null }));
        await expectAsync(api.listApplications({ page: 0, limit: 0, status: '' })).toBeResolvedTo({
          data: [],
          meta: {},
        });
        expect(fetchFn.calls.first().args[0]).toBe('/admin/seller-applications');
      });

      it('accepts approved/rejected filters and encodes the application id on review', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: [], meta: {} }));

        await api.listApplications({ status: 'approved' });
        expect(fetchFn.calls.first().args[0]).toBe(
          '/admin/seller-applications?page=1&limit=20&status=approved'
        );

        await api.reviewApplication('a/1', { status: 'approved' });
        expect(fetchFn.calls.mostRecent().args[0]).toBe('/admin/seller-applications/a%2F1');
        expect(JSON.parse(fetchFn.calls.mostRecent().args[1].body)).toEqual({ status: 'approved' });
      });

      it('validates review ids and decisions', async () => {
        for (const applicationId of [undefined, null, '', 42, {}]) {
          await expectAsync(
            api.reviewApplication(applicationId, { status: 'approved' })
          ).toBeRejectedWithError('applicationId is required');
        }
        for (const status of [undefined, 'pending', 42, null]) {
          let error;
          try {
            await api.reviewApplication('a1', { status });
          } catch (caught) {
            error = caught;
          }
          expect(error.message).toContain('Invalid decision status');
          expect(error.code).toBe('INVALID_REQUEST');
        }
        expect(fetchFn).not.toHaveBeenCalled();
      });

      it('normalizes the rejection reason for a rejected application', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: {} }));

        await api.reviewApplication('a1', { status: 'rejected', rejectionReason: '  Motivo  ' });
        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({
          status: 'rejected',
          rejection_reason: 'Motivo',
        });

        await api.reviewApplication('a1', { status: 'rejected', rejectionReason: 42 });
        expect(JSON.parse(fetchFn.calls.mostRecent().args[1].body)).toEqual({
          status: 'rejected',
          rejection_reason: '',
        });
      });

      it('maps error status codes and details when the body has no code', async () => {
        const cases = [
          [401, 'UNAUTHORIZED'],
          [403, 'FORBIDDEN'],
          [404, 'NOT_FOUND'],
          [409, 'CONFLICT'],
          [422, 'UNPROCESSABLE_ENTITY'],
          [500, 'UNKNOWN_ERROR'],
        ];
        for (const [status, code] of cases) {
          fetchFn.and.resolveTo(new Response('', { status }));
          let error;
          try {
            await api.apply({ business_name: 'x', business_description: 'y' });
          } catch (caught) {
            error = caught;
          }
          expect(error.code).toBe(code);
          expect(error.statusCode).toBe(status);
          expect(error.message).toBe(`Failed to submit seller application (${status})`);
        }

        fetchFn.and.resolveTo(
          jsonResponse({ error: { details: [{ field: 'business_name' }] } }, 400)
        );
        let error;
        try {
          await api.reviewApplication('a1', { status: 'rejected' });
        } catch (caught) {
          error = caught;
        }
        expect(error.details).toEqual([{ field: 'business_name' }]);
        expect(error.message).toBe('Failed to review seller application (400)');
      });

      it('propagates network rejections', async () => {
        fetchFn.and.rejectWith(new Error('offline'));
        await expectAsync(api.getMyApplication()).toBeRejectedWithError('offline');
      });
    });
  })();
})();
