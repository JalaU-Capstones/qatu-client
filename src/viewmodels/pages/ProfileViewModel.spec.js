import { MAX_AVATAR_FILE_SIZE } from '../../models/validation/profileValidation.js';
import { AuthStore } from '../../store/authStore.js';
import { ProfileViewModel } from './ProfileViewModel.js';

describe('ProfileViewModel', () => {
  let mockProfilesApi;
  let authStore;
  let viewModel;

  const sampleProfile = {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'camila_m',
    full_name: 'Camila Morales',
    avatar_path:
      'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/avatar.webp',
    bio: 'Compradora frecuente de artesanías peruanas.',
    locale: 'es-PE',
    created_at: '2026-01-10T10:00:00.000Z',
    updated_at: '2026-01-12T10:00:00.000Z',
  };

  beforeEach(() => {
    mockProfilesApi = {
      getById: jasmine.createSpy('getById').and.resolveTo({
        data: sampleProfile,
        meta: {},
      }),
      updateMe: jasmine.createSpy('updateMe').and.callFake(async (payload) => ({
        data: {
          ...sampleProfile,
          ...payload,
          updated_at: '2026-02-01T12:00:00.000Z',
        },
        meta: {},
      })),
      uploadAvatar: jasmine.createSpy('uploadAvatar').and.resolveTo({
        data: {
          ...sampleProfile,
          avatar_path:
            'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/new-avatar.webp',
          updated_at: '2026-02-01T12:05:00.000Z',
        },
        meta: {},
      }),
    };

    authStore = new AuthStore();
    authStore.setSession({
      user: { id: sampleProfile.id, email: 'camila@qatu.pe', username: 'camila_m' },
      profile: sampleProfile,
      roles: [{ name: 'buyer' }],
    });

    viewModel = new ProfileViewModel({
      profilesApi: mockProfilesApi,
      authStore,
    });
  });

  afterEach(() => {
    authStore.clearSession();
  });

  describe('Scenario: View own profile', () => {
    it('loads the authenticated user profile, excludes email, and populates snake_case profile and camelCase viewProfile', async () => {
      const result = await viewModel.loadProfile();

      expect(mockProfilesApi.getById).toHaveBeenCalledWith(sampleProfile.id);
      expect(result).toEqual(sampleProfile);
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.errorMessage).toBe('');
      expect(viewModel.profile.username).toBe('camila_m');
      expect(viewModel.profile.full_name).toBe('Camila Morales');
      expect(viewModel.profile.avatar_path).toBe(
        'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/avatar.webp'
      );
      expect(viewModel.profile.bio).toBe('Compradora frecuente de artesanías peruanas.');
      expect(viewModel.profile.email).toBeUndefined();
      expect(viewModel.viewProfile.fullName).toBe('Camila Morales');
      expect(viewModel.viewProfile.avatarPath).toBe(
        'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/avatar.webp'
      );
    });

    it('triggers onUnauthorized when no authenticated user is available', async () => {
      authStore.clearSession();
      const onUnauthorized = jasmine.createSpy('onUnauthorized');
      const unauthVM = new ProfileViewModel({
        profilesApi: mockProfilesApi,
        authStore,
        onUnauthorized,
      });

      const result = await unauthVM.loadProfile();

      expect(result).toBeNull();
      expect(mockProfilesApi.getById).not.toHaveBeenCalled();
      expect(onUnauthorized).toHaveBeenCalled();
      expect(unauthVM.errorMessage).toContain('Debes iniciar sesión');
    });

    it('handles 404 error when loading profile fails', async () => {
      const notFoundErr = new Error('Not found');
      notFoundErr.status = 404;
      mockProfilesApi.getById.and.rejectWith(notFoundErr);

      const result = await viewModel.loadProfile();

      expect(result).toBeNull();
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.errorMessage).toBe('Perfil no encontrado');
    });
  });

  describe('Scenario: Update profile (partial update semantics)', () => {
    it('sends ONLY changed fields to PATCH /v1/profiles/me, syncs authStore, and sets confirmation message', async () => {
      await viewModel.loadProfile();

      viewModel.setField('full_name', 'Camila Morales Quispe');
      viewModel.setField('bio', 'Coleccionista de textiles y cerámica andina.');

      const saved = await viewModel.saveProfile();

      expect(saved).toBe(true);
      expect(mockProfilesApi.updateMe).toHaveBeenCalledWith({
        full_name: 'Camila Morales Quispe',
        bio: 'Coleccionista de textiles y cerámica andina.',
      });
      expect(viewModel.profile.full_name).toBe('Camila Morales Quispe');
      expect(viewModel.profile.bio).toBe('Coleccionista de textiles y cerámica andina.');
      expect(viewModel.successMessage).toBe('Perfil actualizado correctamente');
      expect(viewModel.errorMessage).toBe('');
      expect(authStore.getProfile().full_name).toBe('Camila Morales Quispe');
    });

    it('resets form values back to loaded profile when resetForm() is called', async () => {
      await viewModel.loadProfile();
      viewModel.setField('full_name', 'Nombre Temporal');
      viewModel.setField('bio', 'Bio temporal');

      viewModel.resetForm();

      expect(viewModel.formData.full_name).toBe('Camila Morales');
      expect(viewModel.formData.bio).toBe('Compradora frecuente de artesanías peruanas.');
      expect(viewModel.fieldErrors).toEqual({});
    });
  });

  describe('Scenario: Avatar upload (POST /v1/profiles/me/avatar)', () => {
    it('validates selected image, creates preview URL, uploads via POST /v1/profiles/me/avatar, and updates avatar_path from response', async () => {
      await viewModel.loadProfile();

      const validFile = {
        name: 'photo.webp',
        type: 'image/webp',
        size: 100 * 1024,
        previewUrl: 'blob:preview-1',
      };

      const selected = viewModel.selectAvatarFile(validFile);
      expect(selected).toBe(true);
      expect(viewModel.avatarPreviewUrl).toBe('blob:preview-1');

      const uploaded = await viewModel.uploadAvatar();
      expect(uploaded).toBe(true);
      expect(mockProfilesApi.uploadAvatar).toHaveBeenCalledWith(validFile);
      expect(viewModel.profile.avatar_path).toBe(
        'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/new-avatar.webp'
      );
      expect(viewModel.successMessage).toBe('Foto de perfil actualizada correctamente');
    });

    it('rejects files > 2 MB with "La imagen excede el límite de 2 MB" before calling API', async () => {
      await viewModel.loadProfile();

      const oversized = {
        name: 'huge.png',
        type: 'image/png',
        size: MAX_AVATAR_FILE_SIZE + 100,
      };

      const selected = viewModel.selectAvatarFile(oversized);
      expect(selected).toBe(false);
      expect(viewModel.fieldErrors.avatar).toBe('La imagen excede el límite de 2 MB');
      expect(viewModel.errorMessage).toBe('La imagen excede el límite de 2 MB');
      expect(mockProfilesApi.uploadAvatar).not.toHaveBeenCalled();
    });

    it('rejects unsupported file types with "Solo se aceptan imágenes JPEG, PNG y WebP"', async () => {
      await viewModel.loadProfile();

      const invalidType = {
        name: 'doc.pdf',
        type: 'application/pdf',
        size: 1024,
      };

      const selected = viewModel.selectAvatarFile(invalidType);
      expect(selected).toBe(false);
      expect(viewModel.fieldErrors.avatar).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
      expect(mockProfilesApi.uploadAvatar).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Update with invalid data & error status codes', () => {
    it('sets validation errors and does NOT call updateMe when bio exceeds 500 characters', async () => {
      await viewModel.loadProfile();

      viewModel.setField('bio', 'a'.repeat(501));
      const saved = await viewModel.saveProfile();

      expect(saved).toBe(false);
      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();
      expect(viewModel.fieldErrors.bio).toBe('La biografía no puede exceder 500 caracteres');
      expect(viewModel.errorMessage).toBe('La biografía no puede exceder 500 caracteres');
    });

    it('sets validation errors and does NOT call updateMe when full_name is too short or too long', async () => {
      await viewModel.loadProfile();

      viewModel.setField('full_name', 'A');
      const savedShort = await viewModel.saveProfile();
      expect(savedShort).toBe(false);
      expect(viewModel.fieldErrors.full_name).toBe(
        'El nombre completo debe tener al menos 2 caracteres'
      );

      viewModel.setField('full_name', 'A'.repeat(101));
      const savedLong = await viewModel.saveProfile();
      expect(savedLong).toBe(false);
      expect(viewModel.fieldErrors.full_name).toBe(
        'El nombre completo no puede exceder 100 caracteres'
      );
      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();
    });

    it('maps server-side 400 validation details into fieldErrors if backend rejects request', async () => {
      await viewModel.loadProfile();
      const serverError = new Error('bio must be at most 500 characters');
      serverError.status = 400;
      serverError.data = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: [{ field: 'bio', message: 'bio must be at most 500 characters' }],
        },
      };
      mockProfilesApi.updateMe.and.rejectWith(serverError);

      const saved = await viewModel.saveProfile();

      expect(saved).toBe(false);
      expect(viewModel.fieldErrors.bio).toBe('bio must be at most 500 characters');
      expect(viewModel.errorMessage).toBe('bio must be at most 500 characters');
    });

    it('maps 500 server error to generic message without exposing stack traces', async () => {
      await viewModel.loadProfile();
      const serverErr = new Error('Database stack trace...');
      serverErr.status = 500;
      mockProfilesApi.updateMe.and.rejectWith(serverErr);

      const saved = await viewModel.saveProfile();

      expect(saved).toBe(false);
      expect(viewModel.errorMessage).toBe(
        'Error al guardar los cambios. Inténtalo de nuevo más tarde'
      );
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('ProfileViewModel (recovered 1)', () => {
    let mockProfilesApi;
    let authStore;
    let viewModel;

    const sampleProfile = {
      id: '22222222-2222-4222-8222-222222222222',
      username: 'camila_m',
      full_name: 'Camila Morales',
      avatar_path:
        'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/avatar.webp',
      bio: 'Compradora frecuente de artesanías peruanas.',
      locale: 'es-PE',
      created_at: '2026-01-10T10:00:00.000Z',
      updated_at: '2026-01-12T10:00:00.000Z',
    };

    beforeEach(() => {
      mockProfilesApi = {
        getById: jasmine.createSpy('getById').and.resolveTo({
          data: sampleProfile,
          meta: {},
        }),
        updateMe: jasmine.createSpy('updateMe').and.callFake(async (payload) => ({
          data: {
            ...sampleProfile,
            ...payload,
            updated_at: '2026-02-01T12:00:00.000Z',
          },
          meta: {},
        })),
        uploadAvatar: jasmine.createSpy('uploadAvatar').and.resolveTo({
          data: {
            ...sampleProfile,
            avatar_path:
              'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/new-avatar.webp',
            updated_at: '2026-02-01T12:05:00.000Z',
          },
          meta: {},
        }),
      };

      authStore = new AuthStore();
      authStore.setSession({
        user: { id: sampleProfile.id, email: 'camila@qatu.pe', username: 'camila_m' },
        profile: sampleProfile,
        roles: [{ name: 'buyer' }],
      });

      viewModel = new ProfileViewModel({
        profilesApi: mockProfilesApi,
        authStore,
      });
    });

    afterEach(() => {
      authStore.clearSession();
    });

    describe('Scenario: Avatar upload (POST /v1/profiles/me/avatar) (recovered 2)', () => {
      it('rejects files > 2 MB with "La imagen excede el límite de 2 MB" before calling API', async () => {
        await viewModel.loadProfile();

        const oversized = {
          name: 'huge.png',
          type: 'image/png',
          size: MAX_AVATAR_FILE_SIZE + 100,
        };

        const selected = viewModel.selectAvatarFile(oversized);
        expect(selected).toBe(false);
        expect(viewModel.fieldErrors.avatar).toBe('La imagen excede el límite de 2 MB');
        expect(viewModel.errorMessage).toBe('La imagen excede el límite de 2 MB');
        expect(mockProfilesApi.uploadAvatar).not.toHaveBeenCalled();
      });

      it('rejects unsupported file types with "Solo se aceptan imágenes JPEG, PNG y WebP"', async () => {
        await viewModel.loadProfile();

        const invalidType = {
          name: 'doc.pdf',
          type: 'application/pdf',
          size: 1024,
        };

        const selected = viewModel.selectAvatarFile(invalidType);
        expect(selected).toBe(false);
        expect(viewModel.fieldErrors.avatar).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
        expect(mockProfilesApi.uploadAvatar).not.toHaveBeenCalled();
      });
    });
  });

  (() => {
    const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

    const makeProfile = (overrides = {}) => ({
      id: PROFILE_ID,
      username: 'camila_m',
      full_name: 'Camila Morales',
      avatar_path: 'avatars/camila/avatar.webp',
      bio: 'Biografía',
      locale: 'es-PE',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      ...overrides,
    });

    const createApi = ({ response = { data: makeProfile() }, error = null } = {}) => ({
      getById: jasmine
        .createSpy('getById')
        .and.callFake(() => (error ? Promise.reject(error) : Promise.resolve(response))),
      updateMe: jasmine.createSpy('updateMe').and.resolveTo({ data: makeProfile(), meta: {} }),
      uploadAvatar: jasmine
        .createSpy('uploadAvatar')
        .and.resolveTo({ data: makeProfile(), meta: {} }),
    });

    const createStoreStub = ({ user = null, profile = null, roles = [] } = {}) => ({
      getUser: jasmine.createSpy('getUser').and.returnValue(user),
      getProfile: jasmine.createSpy('getProfile').and.returnValue(profile),
      getRoles: jasmine.createSpy('getRoles').and.returnValue(roles),
      setSession: jasmine.createSpy('setSession'),
    });

    describe('ProfileViewModel additional branches (recovered 3)', () => {
      let authStore;

      afterEach(() => {
        authStore?.clearSession();
        authStore = null;
      });

      const createRealStore = (user = null, profile = null, roles = []) => {
        authStore = new AuthStore();
        authStore.setSession({ user, profile, roles });
        return authStore;
      };

      const setup = ({
        profilesApi = createApi(),
        user = { id: PROFILE_ID, username: 'camila_m' },
        profile = makeProfile(),
        roles = [{ name: 'buyer' }],
        onUnauthorized = null,
        store = null,
      } = {}) => {
        const resolvedStore = store || createRealStore(user, profile, roles);
        const vm = new ProfileViewModel({ profilesApi, authStore: resolvedStore, onUnauthorized });
        return { vm, profilesApi, store: resolvedStore };
      };

      it('loadProfile uses an explicit id even when the cached profile has another one', async () => {
        const profilesApi = createApi({ response: { data: makeProfile({ id: 'explicit-id' }) } });
        const { vm } = setup({ profilesApi });

        const result = await vm.loadProfile('explicit-id');

        expect(profilesApi.getById).toHaveBeenCalledWith('explicit-id');
        expect(result.id).toBe('explicit-id');
        expect(vm.isLoading).toBeFalse();
      });

      it('loadProfile does not hydrate a cached profile whose id differs from the target', async () => {
        let resolveRequest;
        const profilesApi = createApi();
        profilesApi.getById.and.returnValue(
          new Promise((resolve) => {
            resolveRequest = resolve;
          })
        );
        const { vm } = setup({
          profilesApi,
          user: { id: 'target-id' },
          profile: makeProfile({ id: 'cached-id', full_name: 'Cached Name' }),
        });

        const pending = vm.loadProfile('target-id');
        expect(vm.profile).toBeNull();
        expect(vm.isLoading).toBeTrue();

        resolveRequest({ data: makeProfile({ id: 'target-id', full_name: 'Loaded Name' }) });
        await pending;

        expect(vm.profile.full_name).toBe('Loaded Name');
      });

      it('loadProfile hydrates a cached profile without an id before the request resolves', async () => {
        let resolveRequest;
        const profilesApi = createApi();
        profilesApi.getById.and.returnValue(
          new Promise((resolve) => {
            resolveRequest = resolve;
          })
        );
        const { vm } = setup({
          profilesApi,
          user: { id: PROFILE_ID, email: 'cache@x' },
          profile: { full_name: 'Cache Name', bio: 'Cache bio' },
        });

        const pending = vm.loadProfile();
        expect(vm.profile.full_name).toBe('Cache Name');
        expect(vm.profile.id).toBe(PROFILE_ID);

        resolveRequest({ data: makeProfile({ full_name: 'Server Name' }) });
        await pending;

        expect(vm.profile.full_name).toBe('Server Name');
      });

      it('loadProfile accepts a raw profile response and ignores falsy responses', async () => {
        const raw = makeProfile({ id: 'raw-id', full_name: 'Raw Name' });
        const first = setup({ profilesApi: createApi({ response: raw }) });
        expect((await first.vm.loadProfile()).full_name).toBe('Raw Name');

        for (const response of [null, false, 0, '']) {
          const store = createStoreStub({ user: { id: PROFILE_ID } });
          const next = setup({ profilesApi: createApi({ response }), store });
          expect(await next.vm.loadProfile()).toBeNull();
          expect(next.vm.isLoading).toBeFalse();
        }

        const api = createApi();
        api.getById.and.resolveTo(undefined);
        const last = setup({
          profilesApi: api,
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });
        expect(await last.vm.loadProfile()).toBeNull();
      });

      it('loadProfile currently treats an envelope with falsy data as a raw profile', async () => {
        const { vm } = setup({
          profilesApi: createApi({ response: { data: null, meta: {} } }),
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });

        expect(await vm.loadProfile()).toEqual({
          id: '',
          username: '',
          full_name: '',
          avatar_path: null,
          bio: null,
          locale: 'en',
        });
      });

      it('loadProfile invokes onUnauthorized for 401 and SESSION_EXPIRED errors', async () => {
        const errors = [
          Object.assign(new Error('expired'), { status: 401 }),
          Object.assign(new Error('expired code'), { code: 'SESSION_EXPIRED' }),
        ];

        for (const error of errors) {
          const onUnauthorized = jasmine.createSpy('onUnauthorized');
          const { vm, profilesApi } = setup({
            profilesApi: createApi({ error }),
            onUnauthorized,
            store: createStoreStub({ user: { id: PROFILE_ID } }),
          });

          expect(await vm.loadProfile()).toBeNull();
          expect(onUnauthorized).toHaveBeenCalledTimes(1);
          expect(profilesApi.getById).toHaveBeenCalledTimes(1);
          expect(vm.isLoading).toBeFalse();
        }
      });

      it('loadProfile handles auth errors without an onUnauthorized callback', async () => {
        const error = Object.assign(new Error('session expired'), {
          status: 401,
          code: 'SESSION_EXPIRED',
        });
        const { vm } = setup({
          profilesApi: createApi({ error }),
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });

        await expectAsync(vm.loadProfile()).toBeResolvedTo(null);
        expect(vm.errorMessage).toBe('session expired');
      });

      it('loadProfile returns null without calling the API when no id is available', async () => {
        const { vm, profilesApi } = setup({ store: createStoreStub() });

        await expectAsync(vm.loadProfile()).toBeResolvedTo(null);

        expect(vm.errorMessage).toBe('Debes iniciar sesión para ver tu perfil.');
        expect(profilesApi.getById).not.toHaveBeenCalled();
      });

      it('_mapErrorMessage applies status and avatar-code mappings with the documented precedence', () => {
        const { vm } = setup({ store: createStoreStub() });

        expect(vm._mapErrorMessage({ status: 403, message: 'raw' }, 'fallback')).toBe(
          'No tienes permiso para modificar este perfil'
        );
        expect(vm._mapErrorMessage({ status: 404, message: 'raw' }, 'fallback')).toBe(
          'Perfil no encontrado'
        );
        expect(vm._mapErrorMessage({ status: 422, code: 'FILE_TOO_LARGE' }, 'fallback')).toBe(
          'La imagen excede el límite de 2 MB'
        );
        expect(
          vm._mapErrorMessage(
            { status: 422, data: { error: { code: 'INVALID_FILE_FORMAT' } } },
            'fallback'
          )
        ).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
        expect(vm._mapErrorMessage({ status: 502, message: 'raw' }, 'fallback')).toBe(
          'Error al guardar los cambios. Inténtalo de nuevo más tarde'
        );
        expect(
          vm._mapErrorMessage(
            { status: 403, data: { error: { details: [{ message: 'Detalle' }] } } },
            'fallback'
          )
        ).toBe('No tienes permiso para modificar este perfil');
        expect(
          vm._mapErrorMessage(
            { status: 422, data: { error: { details: [{ message: 'Detalle' }] } } },
            'fallback'
          )
        ).toBe('Detalle');
        expect(vm._mapErrorMessage({ message: 'Solo mensaje' }, 'fallback')).toBe('Solo mensaje');
        expect(vm._mapErrorMessage({}, 'fallback')).toBe('fallback');
        expect(vm._mapErrorMessage(null, 'fallback')).toBe('fallback');
      });

      it('setField ignores unknown keys and clears only the edited field error', () => {
        const { vm } = setup({ store: createStoreStub() });
        vm.fieldErrors = { full_name: 'a', bio: 'b', avatar: 'c' };
        vm.errorMessage = 'old error';
        vm.successMessage = 'old success';
        const listener = jasmine.createSpy('listener');
        vm.subscribe(listener);

        vm.setField('unknown', 'x');
        expect(vm.formData.unknown).toBeUndefined();
        expect(listener).not.toHaveBeenCalled();

        vm.setField('full_name', 'Nuevo Nombre');
        expect(vm.formData.full_name).toBe('Nuevo Nombre');
        expect(vm.fieldErrors).toEqual({ bio: 'b', avatar: 'c' });
        expect(vm.errorMessage).toBe('');
        expect(vm.successMessage).toBe('');
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('selectAvatarFile rejects null and non-image files with the format message', () => {
        const { vm } = setup({ store: createStoreStub() });
        vm.selectedAvatarFile = { name: 'old.png' };

        for (const file of [null, undefined, 'x', { name: 'doc.pdf', type: 'application/pdf' }]) {
          expect(vm.selectAvatarFile(file)).toBeFalse();
          expect(vm.selectedAvatarFile).toBeNull();
          expect(vm.fieldErrors.avatar).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
          expect(vm.errorMessage).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
        }
      });

      it('selectAvatarFile accepts the exact size limit and rejects one byte more', () => {
        const { vm } = setup({ store: createStoreStub() });

        expect(vm.selectAvatarFile({ type: 'image/png', size: MAX_AVATAR_FILE_SIZE })).toBeTrue();
        expect(
          vm.selectAvatarFile({ type: 'image/png', size: MAX_AVATAR_FILE_SIZE + 1 })
        ).toBeFalse();
      });

      it('selectAvatarFile creates an object URL for Blobs and clears previous avatar errors', () => {
        const createUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:generated');
        const { vm } = setup({ store: createStoreStub() });
        vm.fieldErrors = { avatar: 'error previo', bio: 'otro' };
        const file = new Blob(['x'], { type: 'image/png' });

        expect(vm.selectAvatarFile(file)).toBeTrue();
        expect(createUrlSpy).toHaveBeenCalledWith(file);
        expect(vm.avatarPreviewUrl).toBe('blob:generated');
        expect(vm.selectedAvatarFile).toBe(file);
        expect(vm.fieldErrors).toEqual({ bio: 'otro' });
        expect(vm.errorMessage).toBe('');
      });

      it('selectAvatarFile uses previewUrl for non-Blob files and revokes the previous preview', () => {
        const revokeSpy = spyOn(URL, 'revokeObjectURL');
        const { vm } = setup({ store: createStoreStub() });
        vm.avatarPreviewUrl = 'blob:old';
        const file = { name: 'a.png', type: 'image/png', size: 10, previewUrl: 'blob:custom' };

        expect(vm.selectAvatarFile(file)).toBeTrue();
        expect(revokeSpy).toHaveBeenCalledWith('blob:old');
        expect(vm.avatarPreviewUrl).toBe('blob:custom');
      });

      it('selectAvatarFile swallows revokeObjectURL failures', () => {
        const revokeSpy = spyOn(URL, 'revokeObjectURL').and.throwError('blocked');
        const { vm } = setup({ store: createStoreStub() });
        vm.avatarPreviewUrl = 'blob:old';
        const file = { name: 'a.webp', type: 'image/webp', size: 1 };

        expect(() => vm.selectAvatarFile(file)).not.toThrow();
        expect(revokeSpy).toHaveBeenCalledWith('blob:old');
        expect(vm.avatarPreviewUrl).toBe('blob:avatar-preview');
      });

      it('uploadAvatar validates its argument directly before calling the API', async () => {
        const { vm, profilesApi } = setup({ store: createStoreStub() });

        await expectAsync(vm.uploadAvatar(null)).toBeResolvedTo(false);

        expect(profilesApi.uploadAvatar).not.toHaveBeenCalled();
        expect(vm.fieldErrors.avatar).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
        expect(vm.errorMessage).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
        expect(vm.isUploadingAvatar).toBeFalse();
      });

      it('uploadAvatar accepts raw responses and still succeeds for falsy ones', async () => {
        const file = { name: 'a.png', type: 'image/png', size: 1 };
        const raw = makeProfile({ id: 'raw-id', avatar_path: 'avatars/new.png' });
        const firstApi = createApi();
        firstApi.uploadAvatar.and.resolveTo(raw);
        const first = setup({
          profilesApi: firstApi,
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });

        await expectAsync(first.vm.uploadAvatar(file)).toBeResolvedTo(true);
        expect(first.vm.profile.avatar_path).toBe('avatars/new.png');

        const secondApi = createApi();
        secondApi.uploadAvatar.and.resolveTo(null);
        const second = setup({
          profilesApi: secondApi,
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });

        await expectAsync(second.vm.uploadAvatar(file)).toBeResolvedTo(true);
        expect(second.vm.profile).toBeNull();
        expect(second.vm.successMessage).toBe('Foto de perfil actualizada correctamente');
      });

      it('uploadAvatar maps avatar errors and leaves generic messages untouched', async () => {
        const file = { name: 'a.png', type: 'image/png', size: 1 };
        const error = Object.assign(new Error('raw'), { status: 422, code: 'FILE_TOO_LARGE' });
        const firstApi = createApi();
        firstApi.uploadAvatar.and.rejectWith(error);
        const first = setup({
          profilesApi: firstApi,
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });

        await expectAsync(first.vm.uploadAvatar(file)).toBeResolvedTo(false);
        expect(first.vm.fieldErrors.avatar).toBe('La imagen excede el límite de 2 MB');
        expect(first.vm.errorMessage).toBe('La imagen excede el límite de 2 MB');
        expect(first.vm.isUploadingAvatar).toBeFalse();

        const secondApi = createApi();
        secondApi.uploadAvatar.and.rejectWith(new Error('boom'));
        const second = setup({
          profilesApi: secondApi,
          store: createStoreStub({ user: { id: PROFILE_ID } }),
        });

        await expectAsync(second.vm.uploadAvatar(file)).toBeResolvedTo(false);
        expect(second.vm.errorMessage).toBe('boom');
      });

      it('uploadAvatar revokes the preview and clears the selected file after success', async () => {
        const createSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:preview');
        const revokeSpy = spyOn(URL, 'revokeObjectURL');
        const { vm } = setup({ store: createStoreStub({ user: { id: PROFILE_ID } }) });
        const file = new Blob(['x'], { type: 'image/jpeg' });
        expect(vm.selectAvatarFile(file)).toBeTrue();
        expect(createSpy).toHaveBeenCalledWith(file);

        await expectAsync(vm.uploadAvatar()).toBeResolvedTo(true);

        expect(revokeSpy).toHaveBeenCalledWith('blob:preview');
        expect(vm.avatarPreviewUrl).toBe('');
        expect(vm.selectedAvatarFile).toBeNull();
        expect(vm.isUploadingAvatar).toBeFalse();
      });

      it('resetForm restores profile values, locale, banners and the avatar selection', () => {
        const revokeSpy = spyOn(URL, 'revokeObjectURL');
        const { vm } = setup({ store: createStoreStub() });
        vm._applyProfileData(
          makeProfile({ locale: 'en-US', bio: 'Bio', avatar_path: 'avatars/a.png' })
        );
        vm.setField('full_name', 'Temporal');
        vm.fieldErrors = { bio: 'x' };
        vm.errorMessage = 'e';
        vm.successMessage = 's';
        vm.avatarPreviewUrl = 'blob:preview';
        vm.selectedAvatarFile = { name: 'a.png' };

        vm.resetForm();

        expect(vm.formData).toEqual({
          full_name: 'Camila Morales',
          bio: 'Bio',
          avatar_path: 'avatars/a.png',
          locale: 'en-US',
        });
        expect(vm.fieldErrors).toEqual({});
        expect(vm.errorMessage).toBe('');
        expect(vm.successMessage).toBe('');
        expect(vm.avatarPreviewUrl).toBe('');
        expect(vm.selectedAvatarFile).toBeNull();
        expect(revokeSpy).toHaveBeenCalledWith('blob:preview');
      });

      it('resetForm falls back to an empty form with the en locale when no profile is loaded', () => {
        const { vm } = setup({ store: createStoreStub() });
        vm.formData = { full_name: 'x', bio: 'y', avatar_path: 'z', locale: 'fr' };

        vm.resetForm();

        expect(vm.formData).toEqual({ full_name: '', bio: '', avatar_path: '', locale: 'en' });
      });

      it('dismissMessages clears both banners and unsubscribe stops notifications', () => {
        const { vm } = setup({ store: createStoreStub() });
        vm.errorMessage = 'e';
        vm.successMessage = 's';
        const listener = jasmine.createSpy('listener');
        const unsubscribe = vm.subscribe(listener);

        vm.dismissMessages();
        expect(vm.errorMessage).toBe('');
        expect(vm.successMessage).toBe('');
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();
        vm.dismissMessages();
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('_buildPartialPayload nulls cleared fields and includes dirty unchanged fields', () => {
        const { vm } = setup({ store: createStoreStub() });
        vm._applyProfileData(makeProfile());
        vm._dirtyFields.add('full_name');

        expect(
          vm._buildPartialPayload({
            full_name: 'Camila Morales',
            bio: null,
            avatar_path: null,
            locale: 'es-PE',
          })
        ).toEqual({ full_name: 'Camila Morales', bio: null, avatar_path: null });
      });

      it('_buildPartialPayload omits already-cleared optional fields and falls back to full_name', () => {
        const { vm } = setup({ store: createStoreStub() });
        vm._applyProfileData(makeProfile({ bio: null, avatar_path: null }));

        expect(
          vm._buildPartialPayload({
            full_name: 'Camila Morales',
            bio: null,
            avatar_path: null,
            locale: 'es-PE',
          })
        ).toEqual({ full_name: 'Camila Morales' });
      });

      it('_buildPartialPayload currently emits full_name: undefined for empty validated values', () => {
        const { vm } = setup({ store: createStoreStub() });

        expect(vm._buildPartialPayload({})).toEqual({ full_name: undefined });
      });

      it('_buildPartialPayload currently throws when called without arguments', () => {
        const { vm } = setup({ store: createStoreStub() });

        expect(() => vm._buildPartialPayload()).toThrowError(TypeError);
      });

      it('saveProfile sends bio and avatar_path as null when both fields are cleared', async () => {
        const { vm, profilesApi } = setup({
          store: createStoreStub({ user: { id: PROFILE_ID }, profile: makeProfile() }),
        });
        await vm.loadProfile();
        vm.setField('bio', '');
        vm.setField('avatar_path', '');

        await expectAsync(vm.saveProfile()).toBeResolvedTo(true);

        expect(profilesApi.updateMe).toHaveBeenCalledWith({ bio: null, avatar_path: null });
      });

      it('saveProfile keeps the first message per field and ignores incomplete details', async () => {
        const { vm, profilesApi } = setup({
          store: createStoreStub({ user: { id: PROFILE_ID }, profile: makeProfile() }),
        });
        await vm.loadProfile();
        const error = Object.assign(new Error('generic'), {
          status: 400,
          data: {
            error: {
              details: [
                { field: 'bio', message: 'primer bio' },
                { field: 'bio', message: 'segundo bio' },
                { field: 'full_name', message: 'nombre' },
                { message: 'sin campo' },
                { field: 'avatar_path' },
                { field: 'locale', message: '' },
              ],
            },
          },
        });
        profilesApi.updateMe.and.rejectWith(error);

        await expectAsync(vm.saveProfile()).toBeResolvedTo(false);

        expect(vm.fieldErrors).toEqual({ bio: 'primer bio', full_name: 'nombre' });
        expect(vm.errorMessage).toBe('primer bio');
      });

      it('saveProfile ignores an empty details array and uses the error message', async () => {
        const { vm, profilesApi } = setup({
          store: createStoreStub({ user: { id: PROFILE_ID }, profile: makeProfile() }),
        });
        await vm.loadProfile();
        profilesApi.updateMe.and.rejectWith(
          Object.assign(new Error('sin detalles'), {
            status: 400,
            data: { error: { details: [] } },
          })
        );

        await expectAsync(vm.saveProfile()).toBeResolvedTo(false);

        expect(vm.fieldErrors).toEqual({});
        expect(vm.errorMessage).toBe('sin detalles');
      });

      it('_syncAuthStore skips sessions without setSession, ids or with mismatched ids', () => {
        const withoutSetter = {
          getUser: jasmine.createSpy('getUser').and.returnValue({ id: PROFILE_ID }),
          getProfile: jasmine.createSpy('getProfile').and.returnValue(null),
          getRoles: jasmine.createSpy('getRoles').and.returnValue([]),
        };
        const first = new ProfileViewModel({ profilesApi: createApi(), authStore: withoutSetter });
        expect(() => first._syncAuthStore(makeProfile())).not.toThrow();

        const stub = createStoreStub();
        const second = new ProfileViewModel({ profilesApi: createApi(), authStore: stub });
        second._syncAuthStore({});
        second._syncAuthStore(null);
        expect(stub.setSession).not.toHaveBeenCalled();

        const mismatched = createStoreStub({ user: { id: 'user-1' } });
        const third = new ProfileViewModel({ profilesApi: createApi(), authStore: mismatched });
        third._syncAuthStore({ id: 'user-2', full_name: 'Otro' });
        expect(mismatched.setSession).not.toHaveBeenCalled();
      });

      it('_syncAuthStore merges the loaded profile into the cached session', () => {
        const store = createStoreStub({
          user: {
            id: PROFILE_ID,
            email: 'c@x',
            username: 'old_user',
            avatar_path: 'avatars/old.png',
          },
          profile: { bio: 'cached' },
          roles: [{ name: 'buyer' }],
        });
        const vm = new ProfileViewModel({ profilesApi: createApi(), authStore: store });

        vm._syncAuthStore({ id: PROFILE_ID, username: '', full_name: '', avatar_path: null });

        expect(store.setSession).toHaveBeenCalledWith({
          user: {
            id: PROFILE_ID,
            email: 'c@x',
            username: 'old_user',
            avatar_path: 'avatars/old.png',
            full_name: '',
          },
          profile: {
            bio: 'cached',
            id: PROFILE_ID,
            username: '',
            full_name: '',
            avatar_path: null,
          },
          roles: [{ name: 'buyer' }],
        });

        const noCachedUser = createStoreStub();
        const other = new ProfileViewModel({ profilesApi: createApi(), authStore: noCachedUser });
        other._syncAuthStore({ id: 'from-profile', full_name: 'Nuevo' });
        expect(noCachedUser.setSession).toHaveBeenCalled();
      });

      it('_applyProfileData falls back to the username and omits missing timestamps', () => {
        const { vm } = setup({ store: createStoreStub() });

        vm._applyProfileData({ username: 'solo_user', email: 'private@x' });

        expect(vm.profile).toEqual({
          id: '',
          username: 'solo_user',
          full_name: 'solo_user',
          avatar_path: null,
          bio: null,
          locale: 'en',
        });
        expect(vm.viewProfile).toEqual({
          id: '',
          username: 'solo_user',
          fullName: 'solo_user',
          avatarPath: null,
          bio: null,
          locale: 'en',
          createdAt: null,
          updatedAt: null,
        });
        expect(vm.formData).toEqual({
          full_name: 'solo_user',
          bio: '',
          avatar_path: '',
          locale: 'en',
        });
      });
    });
  })();
})();
