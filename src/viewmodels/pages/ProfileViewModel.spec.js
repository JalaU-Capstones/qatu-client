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
    avatar_path: 'https://cdn.qatu.pe/avatars/camila.png',
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
    it('loads the authenticated user profile and populates username, full name, avatar, and bio', async () => {
      const result = await viewModel.loadProfile();

      expect(mockProfilesApi.getById).toHaveBeenCalledWith(sampleProfile.id);
      expect(result).toEqual(sampleProfile);
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.errorMessage).toBe('');
      expect(viewModel.profile.username).toBe('camila_m');
      expect(viewModel.profile.full_name).toBe('Camila Morales');
      expect(viewModel.profile.avatar_path).toBe('https://cdn.qatu.pe/avatars/camila.png');
      expect(viewModel.profile.bio).toBe('Compradora frecuente de artesanías peruanas.');
      expect(viewModel.formData).toEqual({
        full_name: 'Camila Morales',
        bio: 'Compradora frecuente de artesanías peruanas.',
        avatar_path: 'https://cdn.qatu.pe/avatars/camila.png',
      });
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

    it('handles API error when loading profile fails', async () => {
      mockProfilesApi.getById.and.rejectWith(new Error('Perfil no encontrado'));

      const result = await viewModel.loadProfile();

      expect(result).toBeNull();
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.errorMessage).toBe('Perfil no encontrado');
    });
  });

  describe('Scenario: Update profile', () => {
    it('updates full name, bio, and avatar via PATCH /v1/profiles/me, syncs authStore, and sets confirmation message', async () => {
      await viewModel.loadProfile();

      viewModel.setField('full_name', 'Camila Morales Quispe');
      viewModel.setField('bio', 'Coleccionista de textiles y cerámica andina.');
      viewModel.setField('avatar_path', 'https://cdn.qatu.pe/avatars/camila-new.png');

      const saved = await viewModel.saveProfile();

      expect(saved).toBe(true);
      expect(mockProfilesApi.updateMe).toHaveBeenCalledWith({
        full_name: 'Camila Morales Quispe',
        bio: 'Coleccionista de textiles y cerámica andina.',
        avatar_path: 'https://cdn.qatu.pe/avatars/camila-new.png',
      });
      expect(viewModel.profile.full_name).toBe('Camila Morales Quispe');
      expect(viewModel.profile.bio).toBe('Coleccionista de textiles y cerámica andina.');
      expect(viewModel.profile.avatar_path).toBe('https://cdn.qatu.pe/avatars/camila-new.png');
      expect(viewModel.successMessage).toBe('Perfil actualizado correctamente.');
      expect(viewModel.errorMessage).toBe('');
      expect(authStore.getProfile().full_name).toBe('Camila Morales Quispe');
      expect(authStore.getUser().full_name).toBe('Camila Morales Quispe');
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

  describe('Scenario: Update with invalid data', () => {
    it('sets validation errors and does NOT call updateMe when bio exceeds 500 characters', async () => {
      await viewModel.loadProfile();

      const tooLongBio = 'a'.repeat(501);
      viewModel.setField('bio', tooLongBio);

      const saved = await viewModel.saveProfile();

      expect(saved).toBe(false);
      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();
      expect(viewModel.fieldErrors.bio).toContain('500 caracteres');
      expect(viewModel.errorMessage).toContain('500 caracteres');
      expect(viewModel.successMessage).toBe('');
      expect(viewModel.profile.bio).toBe('Compradora frecuente de artesanías peruanas.');
    });

    it('sets validation errors and does NOT call updateMe when full_name is empty or too short', async () => {
      await viewModel.loadProfile();

      viewModel.setField('full_name', 'A');
      const saved = await viewModel.saveProfile();

      expect(saved).toBe(false);
      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();
      expect(viewModel.fieldErrors.full_name).toBeDefined();
      expect(viewModel.profile.full_name).toBe('Camila Morales');
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
  });
});
