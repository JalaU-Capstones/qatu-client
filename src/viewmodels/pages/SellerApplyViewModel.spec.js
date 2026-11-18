import { SellerApplyViewModel } from './SellerApplyViewModel.js';

describe('SellerApplyViewModel', () => {
  function createAuthStoreMock({ isSeller = false, email = 'buyer@qatu.pe' } = {}) {
    return {
      hasRole: (role) => role === 'seller' && isSeller,
      getUser: () => ({ id: 'user-1', email }),
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

    const ok = await vm.submit();

    expect(ok).toBe(true);
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
});
