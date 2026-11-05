import { AuthStore } from '../../store/authStore.js';
import { ProfileViewModel } from '../../viewmodels/pages/ProfileViewModel.js';
import { ProfileView } from './ProfileView.js';

describe('ProfileView', () => {
  let container;
  let mockProfilesApi;
  let authStore;
  let viewModel;
  let view;

  const sampleProfile = {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'camila_m',
    full_name: 'Camila Morales',
    avatar_path: 'avatars/22222222-2222-4222-8222-222222222222/avatar.webp',
    bio: 'Compradora frecuente de artesanías peruanas.',
    locale: 'es-PE',
    created_at: '2026-01-10T10:00:00.000Z',
    updated_at: '2026-01-12T10:00:00.000Z',
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

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
          avatar_path: 'avatars/22222222-2222-4222-8222-222222222222/uploaded.webp',
          updated_at: '2026-02-01T12:10:00.000Z',
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
    view = new ProfileView(viewModel, { autoLoad: false });
  });

  afterEach(() => {
    if (view) {
      view.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    authStore.clearSession();
  });

  describe('Scenario: View own profile', () => {
    it('renders username, full name, avatar, bio, and locale when profile loads', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();

      const displayName = el.querySelector('.q-profile-display-name');
      const username = el.querySelector('.q-profile-username');
      const displayBio = el.querySelector('.q-profile-display-bio');
      const avatarImg = el.querySelector('.q-profile-avatar-img');

      expect(displayName.textContent).toBe('Camila Morales');
      expect(username.textContent).toBe('@camila_m');
      expect(displayBio.textContent).toBe('Compradora frecuente de artesanías peruanas.');
      expect(avatarImg).not.toBeNull();
      expect(avatarImg.getAttribute('src')).toBe(
        'avatars/22222222-2222-4222-8222-222222222222/avatar.webp'
      );

      expect(el.querySelector('#q-profile-username-input').value).toBe('camila_m');
      expect(el.querySelector('#q-profile-full-name').value).toBe('Camila Morales');
      expect(el.querySelector('#q-profile-locale').value).toBe('es-PE');
      expect(el.querySelector('#q-profile-bio').value).toBe(
        'Compradora frecuente de artesanías peruanas.'
      );
    });

    it('renders SVG placeholder avatar when avatar_path is null', async () => {
      mockProfilesApi.getById.and.resolveTo({
        data: { ...sampleProfile, avatar_path: null },
        meta: {},
      });

      const el = view.mount(container);
      await viewModel.loadProfile();

      expect(el.querySelector('.q-profile-avatar-img')).toBeNull();
      expect(el.querySelector('.q-profile-avatar-placeholder')).not.toBeNull();
    });
  });

  describe('Scenario: Update profile & Upload avatar', () => {
    it('submits only changed fields on save, updates the summary card, and shows confirmation message', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();

      const fullNameInput = el.querySelector('#q-profile-full-name');
      const bioInput = el.querySelector('#q-profile-bio');

      fullNameInput.value = 'Camila Morales Actualizada';
      fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));

      bioInput.value = 'Nueva biografía de compradora.';
      bioInput.dispatchEvent(new Event('input', { bubbles: true }));

      await viewModel.saveProfile();

      expect(mockProfilesApi.updateMe).toHaveBeenCalledWith({
        full_name: 'Camila Morales Actualizada',
        bio: 'Nueva biografía de compradora.',
      });

      expect(el.querySelector('.q-profile-display-name').textContent).toBe(
        'Camila Morales Actualizada'
      );
      expect(el.querySelector('.q-profile-display-bio').textContent).toBe(
        'Nueva biografía de compradora.'
      );

      const successBanner = el.querySelector('.q-profile-alert-success');
      expect(successBanner.hasAttribute('hidden')).toBe(false);
      expect(successBanner.textContent).toContain('Perfil actualizado correctamente');
    });

    it('previews selected avatar image and uploads via Subir imagen button', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();

      const mockFile = {
        name: 'foto.webp',
        type: 'image/webp',
        size: 50 * 1024,
        previewUrl: 'blob:local-preview',
      };

      viewModel.selectAvatarFile(mockFile);

      const uploadBtn = el.querySelector('.q-profile-upload-btn');
      expect(uploadBtn.hasAttribute('hidden')).toBe(false);
      expect(el.querySelector('.q-profile-avatar-img').getAttribute('src')).toBe(
        'blob:local-preview'
      );

      await viewModel.uploadAvatar();

      expect(mockProfilesApi.uploadAvatar).toHaveBeenCalledWith(mockFile);
      expect(el.querySelector('.q-profile-avatar-img').getAttribute('src')).toBe(
        'avatars/22222222-2222-4222-8222-222222222222/uploaded.webp'
      );
      expect(el.querySelector('.q-profile-alert-success').textContent).toContain(
        'Foto de perfil actualizada'
      );
    });
  });

  describe('Scenario: Update with invalid data', () => {
    it('displays validation errors with aria-invalid and does NOT update profile when bio is too long (> 500 chars)', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();

      const bioInput = el.querySelector('#q-profile-bio');
      bioInput.value = 'x'.repeat(505);
      bioInput.dispatchEvent(new Event('input', { bubbles: true }));

      const saved = await viewModel.saveProfile();

      expect(saved).toBe(false);
      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();

      const bioError = el.querySelector('[data-error-for="bio"]');
      expect(bioError.hasAttribute('hidden')).toBe(false);
      expect(bioError.textContent).toBe('La biografía no puede exceder 500 caracteres');
      expect(bioInput.classList.contains('is-invalid')).toBe(true);
      expect(bioInput.getAttribute('aria-invalid')).toBe('true');

      const errorBanner = el.querySelector('.q-profile-alert-error');
      expect(errorBanner.hasAttribute('hidden')).toBe(false);
      expect(errorBanner.textContent).toBe('La biografía no puede exceder 500 caracteres');

      expect(el.querySelector('.q-profile-display-bio').textContent).toBe(
        'Compradora frecuente de artesanías peruanas.'
      );
    });
  });
});
