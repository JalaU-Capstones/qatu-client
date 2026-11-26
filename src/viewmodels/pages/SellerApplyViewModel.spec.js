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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    function authStoreMock({ isSeller = false, email = 'buyer@qatu.pe' } = {}) {
      return {
        hasRole: (role) => role === 'seller' && isSeller,
        getUser: () => ({ id: 'user-1', email }),
      };
    }

    function apiMock() {
      return {
        getMyApplication: jasmine.createSpy('getMyApplication').and.resolveTo(null),
        apply: jasmine
          .createSpy('apply')
          .and.resolveTo({ data: { id: 'app-1', status: 'pending' } }),
      };
    }

    function fillValidForm(vm) {
      vm.setField('business_name', 'Textiles Cusco');
      vm.setField('business_description', 'Tejidos tradicionales elaborados en lana de alpaca.');
    }

    describe('SellerApplyViewModel additional branches (recovered 1)', () => {
      let api;
      let vm;
      let unsubscribes;

      beforeEach(() => {
        unsubscribes = [];
        api = apiMock();
        vm = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore: authStoreMock() });
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
        vm?._listeners?.clear();
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      function watch(target) {
        const listener = jasmine.createSpy('listener');
        unsubscribes.push(target.subscribe(listener));
        return listener;
      }

      it('tolerates a partial or missing authStore', async () => {
        const partial = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore: {} });
        expect(partial.isAlreadySeller).toBe(false);
        expect(partial.formData.contact_email).toBe('');

        const missing = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore: null });
        expect(missing.isAlreadySeller).toBe(false);
        expect(missing.formData.contact_email).toBe('');

        const noRole = new SellerApplyViewModel({
          sellerApplicationsApi: api,
          authStore: { getUser: () => ({ email: 'only@qatu.pe' }) },
        });
        expect(noRole.formData.contact_email).toBe('only@qatu.pe');
        await noRole.loadStatus();
        expect(noRole.isAlreadySeller).toBe(false);
        expect(api.getMyApplication).toHaveBeenCalled();
        expect(noRole.isLoading).toBe(false);
      });

      it('notifies subscribers until unsubscribe', () => {
        const listener = watch(vm);
        vm.setField('business_name', 'A');
        expect(listener).toHaveBeenCalledWith(vm);

        listener.calls.reset();
        const unsubscribe = unsubscribes[unsubscribes.length - 1];
        expect(unsubscribe()).toBe(true);
        vm.setField('business_name', 'B');
        expect(listener).not.toHaveBeenCalled();
      });

      it('ignores unknown fields but clears only the matching error', () => {
        const listener = watch(vm);
        vm.fieldErrors = { business_name: 'old', business_description: 'keep' };
        listener.calls.reset();

        vm.setField('unknown', 'x');
        expect(vm.formData.unknown).toBeUndefined();
        expect(vm.fieldErrors).toEqual({ business_name: 'old', business_description: 'keep' });
        expect(listener).not.toHaveBeenCalled();

        vm.setField('business_name', '');
        expect(vm.formData.business_name).toBe('');
        expect(vm.fieldErrors).toEqual({ business_description: 'keep' });
        expect(listener).toHaveBeenCalled();
      });

      it('clears a stale error when loadStatus sees an already-seller', async () => {
        let isSeller = true;
        const authStore = {
          hasRole: jasmine.createSpy('hasRole').and.callFake(() => isSeller),
          getUser: () => ({ email: 'seller@qatu.pe' }),
        };
        vm = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore });
        vm.errorMessage = 'stale';
        vm.isLoading = true;
        const listener = watch(vm);
        listener.calls.reset();

        await vm.loadStatus();

        expect(authStore.hasRole).toHaveBeenCalledWith('seller');
        expect(vm.isAlreadySeller).toBe(true);
        expect(vm.errorMessage).toBe('');
        expect(vm.isLoading).toBe(false);
        expect(api.getMyApplication).not.toHaveBeenCalled();
        expect(listener).toHaveBeenCalledWith(vm);
      });

      it('keeps a non-pending application and still allows a new submission', async () => {
        for (const status of ['rejected', 'approved', 'draft']) {
          const app = { id: `app-${status}`, status };
          api.getMyApplication.and.resolveTo(app);
          const listener = watch(vm);

          await vm.loadStatus();

          expect(vm.application).toBe(app);
          expect(vm.errorMessage).toBe('');
          expect(vm.isLoading).toBe(false);
          expect(listener).toHaveBeenCalledWith(vm);
        }

        fillValidForm(vm);
        await expectAsync(vm.submit()).toBeResolvedTo(true);
        expect(api.apply).toHaveBeenCalled();
      });

      it('exposes isLoading during flight and maps load errors exactly', async () => {
        let resolveApplication;
        api.getMyApplication.and.returnValue(
          new Promise((resolve) => {
            resolveApplication = resolve;
          })
        );
        const listener = watch(vm);

        const pending = vm.loadStatus();
        expect(vm.isLoading).toBe(true);
        expect(listener).toHaveBeenCalledWith(vm);

        resolveApplication({ id: 'app-1', status: 'pending' });
        await pending;
        expect(vm.isLoading).toBe(false);
        expect(vm.application.status).toBe('pending');

        api.getMyApplication.and.rejectWith(new Error('Fallo de red'));
        await vm.loadStatus();
        expect(vm.errorMessage).toBe('Fallo de red');
        expect(vm.isLoading).toBe(false);

        api.getMyApplication.and.rejectWith({});
        await vm.loadStatus();
        expect(vm.errorMessage).toBe('No se pudo verificar el estado de tu solicitud.');
        expect(vm.isLoading).toBe(false);
      });

      it('short-circuits submit while isSubmitting is already true', async () => {
        vm.isSubmitting = true;
        await expectAsync(vm.submit()).toBeResolvedTo(false);
        expect(api.apply).not.toHaveBeenCalled();
        expect(vm.errorMessage).toBe('');
      });

      it('re-checks the seller role inside submit', async () => {
        let isSeller = false;
        const authStore = {
          hasRole: jasmine.createSpy('hasRole').and.callFake(() => isSeller),
          getUser: () => ({ email: 'buyer@qatu.pe' }),
        };
        vm = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore });
        fillValidForm(vm);
        expect(authStore.hasRole).toHaveBeenCalledWith('seller');

        isSeller = true;
        await expectAsync(vm.submit()).toBeResolvedTo(false);

        expect(vm.isAlreadySeller).toBe(true);
        expect(vm.errorMessage).toBe('You are already a seller');
        expect(api.apply).not.toHaveBeenCalled();
      });

      it('reports exact validation messages and the general banner', async () => {
        vm = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore: {} });
        await expectAsync(vm.submit()).toBeResolvedTo(false);
        expect(vm.fieldErrors).toEqual({
          business_name: 'El nombre del negocio es obligatorio.',
          business_description: 'La descripción del negocio es obligatoria.',
          contact_email:
            'Tu cuenta debe tener un correo electrónico válido para usarlo como contacto.',
        });
        expect(vm.errorMessage).toBe('Revisa los campos marcados antes de enviar tu solicitud.');

        vm.setField('business_name', 'A');
        vm.setField('business_description', 'Corto');
        vm.setField('phone_number', '1'.repeat(41));
        vm.setField('email_option', 'custom');
        vm.setField('custom_contact_email', 'not-an-email');
        await expectAsync(vm.submit()).toBeResolvedTo(false);

        expect(vm.fieldErrors).toEqual({
          business_name: 'El nombre del negocio debe tener entre 2 y 120 caracteres.',
          business_description: 'La descripción debe tener entre 20 y 2000 caracteres.',
          phone_number: 'El teléfono debe contener solo números y no superar los 15 dígitos.',
          contact_email: 'Ingresa un correo electrónico de contacto válido.',
        });
        expect(vm.errorMessage).toBe('Revisa los campos marcados antes de enviar tu solicitud.');
        expect(api.apply).not.toHaveBeenCalled();
      });

      it('sends the sanitized payload and builds a pending application without response data', async () => {
        api.apply.and.resolveTo({ meta: {} });
        vm = new SellerApplyViewModel({ sellerApplicationsApi: api, authStore: authStoreMock() });
        vm.setField('business_name', '  Textiles Cusco  ');
        vm.setField(
          'business_description',
          '  Tejidos tradicionales elaborados en lana de alpaca.  '
        );
        vm.setField('country_code', '+591');
        vm.setField('phone_number', ' 71234567 ');
        vm.setField('email_option', 'custom');
        vm.setField('custom_contact_email', '  contacto@qatu.pe  ');
        vm.setField('contact_email', '');

        await expectAsync(vm.submit()).toBeResolvedTo(true);

        const sanitized = {
          business_name: 'Textiles Cusco',
          business_description: 'Tejidos tradicionales elaborados en lana de alpaca.',
          country_code: '+591',
          phone_number: '71234567',
          contact_email: 'contacto@qatu.pe',
        };
        expect(api.apply).toHaveBeenCalledWith(sanitized);
        expect(api.apply).toHaveBeenCalledTimes(1);
        expect(vm.application).toEqual({ ...sanitized, status: 'pending' });
        expect(vm.successMessage).toBe(
          'Solicitud enviada correctamente. Tu postulación se encuentra en estado pendiente (pending).'
        );
        expect(vm.errorMessage).toBe('');
        expect(vm.fieldErrors).toEqual({});
        expect(vm.isSubmitting).toBe(false);
      });

      it('maps submit failures and resets isSubmitting in finally', async () => {
        fillValidForm(vm);
        api.apply.and.rejectWith(new Error('Conflicto de slug'));
        await expectAsync(vm.submit()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('Conflicto de slug');
        expect(vm.isSubmitting).toBe(false);
        expect(vm.successMessage).toBe('');

        api.apply.and.rejectWith(new Error(''));
        await expectAsync(vm.submit()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('No se pudo enviar la solicitud.');

        api.apply.and.rejectWith({});
        await expectAsync(vm.submit()).toBeResolvedTo(false);
        expect(vm.errorMessage).toBe('No se pudo enviar la solicitud.');
        expect(vm.isSubmitting).toBe(false);
      });

      it('keeps isSubmitting true in flight and ignores a concurrent submit', async () => {
        let resolveApply;
        api.apply.and.returnValue(
          new Promise((resolve) => {
            resolveApply = resolve;
          })
        );
        fillValidForm(vm);
        const listener = watch(vm);

        const first = vm.submit();
        expect(vm.isSubmitting).toBe(true);
        expect(listener).toHaveBeenCalledWith(vm);
        await expectAsync(vm.submit()).toBeResolvedTo(false);
        expect(api.apply).toHaveBeenCalledTimes(1);

        resolveApply({ data: { id: 'app-9', status: 'pending' } });
        await expectAsync(first).toBeResolvedTo(true);
        expect(vm.isSubmitting).toBe(false);
        expect(vm.application.id).toBe('app-9');
      });
    });
  })();
})();
