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
