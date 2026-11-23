import { SellerApplyViewModel } from './SellerApplyViewModel.js';

describe('SellerApplyViewModel', () => {
  function createAuthStoreMock({
    isSeller = false,
    email = 'buyer@qatu.pe',
    locale = 'es-PE',
  } = {}) {
    return {
      hasRole: (role) => role === 'seller' && isSeller,
      getUser: () => ({ id: 'user-1', email }),
      getProfile: () => ({ locale }),
    };
  }

  it('marks isAlreadySeller when the user already has the seller role', async () => {
    const api = {
      getMyApplication: jasmine.createSpy('getMyApplication'),
      apply: jasmine.createSpy('apply'),
    };
    const vm = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: createAuthStoreMock({ isSeller: true }),
    });

    await vm.loadStatus();

    expect(vm.isAlreadySeller).toBe(true);
    expect(api.getMyApplication).not.toHaveBeenCalled();
  });

  it('submits valid seller application and sets pending state and confirmation', async () => {
    const api = {
      getMyApplication: jasmine.createSpy('getMyApplication').and.resolveTo(null),
      apply: jasmine.createSpy('apply').and.resolveTo({
        data: { id: 'app-1', business_name: 'Textiles Cusco', status: 'pending' },
      }),
    };
    const vm = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: createAuthStoreMock(),
    });

    vm.setField('business_name', 'Textiles Cusco');
    vm.setField('business_description', 'Tejidos tradicionales elaborados en lana de alpaca.');
    vm.setField('country_code', '+51');
    vm.setField('phone_number', '987654321');

    const ok = await vm.submit();

    expect(ok).toBe(true);
    expect(api.apply).toHaveBeenCalledWith(
      jasmine.objectContaining({
        country_code: '+51',
        phone_number: '987654321',
        contact_email: 'buyer@qatu.pe',
      })
    );
    expect(vm.application.status).toBe('pending');
    expect(vm.successMessage).toContain('pendiente');
    expect(vm.errorMessage).toBe('');
  });

  it('blocks duplicate submission when a pending application already exists', async () => {
    const api = {
      getMyApplication: jasmine
        .createSpy('getMyApplication')
        .and.resolveTo({ id: 'app-1', status: 'pending' }),
      apply: jasmine.createSpy('apply'),
    };
    const vm = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: createAuthStoreMock(),
    });

    await vm.loadStatus();
    const ok = await vm.submit();

    expect(ok).toBe(false);
    expect(vm.errorMessage).toBe('You already have a pending application');
    expect(api.apply).not.toHaveBeenCalled();
  });

  it('defaults the phone country from the account locale and requires valid custom email', async () => {
    const api = {
      getMyApplication: jasmine.createSpy('getMyApplication').and.resolveTo(null),
      apply: jasmine.createSpy('apply'),
    };
    const vm = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: createAuthStoreMock({ locale: 'es-BO' }),
    });
    vm.setField('business_name', 'Textiles Cusco');
    vm.setField('business_description', 'Tejidos tradicionales elaborados en lana de alpaca.');
    vm.setField('email_option', 'custom');

    expect(vm.formData.country_code).toBe('+591');
    expect(await vm.submit()).toBe(false);
    expect(vm.fieldErrors.contact_email).toContain('correo electrónico');
    expect(api.apply).not.toHaveBeenCalled();

    vm.setField('custom_contact_email', 'contacto@textiles.pe');
    vm.setField('phone_number', '123-45');
    expect(await vm.submit()).toBe(false);
    expect(vm.fieldErrors.phone_number).toContain('solo números');
    expect(api.apply).not.toHaveBeenCalled();
  });

  it('uses the selected custom email and rejects a missing account email', async () => {
    const api = {
      getMyApplication: jasmine.createSpy('getMyApplication').and.resolveTo(null),
      apply: jasmine.createSpy('apply').and.resolveTo({ data: { status: 'pending' } }),
    };
    const vm = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: createAuthStoreMock({ email: '' }),
    });
    vm.setField('business_name', 'Textiles Cusco');
    vm.setField('business_description', 'Tejidos tradicionales elaborados en lana de alpaca.');
    vm.setField('email_option', 'custom');
    vm.setField('custom_contact_email', 'contacto@textiles.pe');
    await vm.submit();

    expect(api.apply).toHaveBeenCalledWith(
      jasmine.objectContaining({ contact_email: 'contacto@textiles.pe' })
    );
  });
});
