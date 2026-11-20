import { AVATAR_MAX_LENGTH } from '../../models/validation/profileValidation.js';
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
    avatar_path:
      'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/avatar.webp',
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
          avatar_path:
            'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/uploaded.webp',
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
        'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/avatar.webp'
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

    it('renders placeholder SVG when avatar image fails to load (onerror fallback)', async () => {
      mockProfilesApi.getById.and.resolveTo({
        data: {
          ...sampleProfile,
          avatar_path: 'https://invalid.example/broken-avatar.webp',
        },
        meta: {},
      });

      const el = view.mount(container);
      await viewModel.loadProfile();

      const img = el.querySelector('.q-profile-avatar-img');
      expect(img).not.toBeNull();

      img.dispatchEvent(new Event('error'));

      expect(el.querySelector('.q-profile-avatar-img')).toBeNull();
      expect(el.querySelector('.q-profile-avatar-placeholder')).not.toBeNull();
    });
  });

  describe('Scenario: Update profile & Upload avatar', () => {
    it('enables form actions only for normalized edits and restores disabled state on cancel', async () => {
      const el = view.mount(container);
      const saveBtn = el.querySelector('.q-profile-save-btn');
      const resetBtn = el.querySelector('.q-profile-reset-btn');
      const expectActionsDisabled = (disabled) => {
        expect(saveBtn.disabled).toBe(disabled);
        expect(resetBtn.disabled).toBe(disabled);
      };

      expectActionsDisabled(true);
      await viewModel.loadProfile();
      expectActionsDisabled(true);

      const fullNameInput = el.querySelector('#q-profile-full-name');
      fullNameInput.value = `${sampleProfile.full_name}  `;
      fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      expectActionsDisabled(true);

      fullNameInput.value = 'Camila Morales Editada';
      fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      expectActionsDisabled(false);

      fullNameInput.value = sampleProfile.full_name;
      fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      expectActionsDisabled(true);

      fullNameInput.value = 'Camila Morales Editada';
      fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
      resetBtn.click();
      expect(fullNameInput.value).toBe(sampleProfile.full_name);
      expectActionsDisabled(true);

      const bioInput = el.querySelector('#q-profile-bio');
      bioInput.value = 'Biografía editada';
      bioInput.dispatchEvent(new Event('input', { bubbles: true }));
      expectActionsDisabled(false);
      resetBtn.click();
      expectActionsDisabled(true);

      const localeSelect = el.querySelector('#q-profile-locale');
      localeSelect.value = 'en';
      localeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      expectActionsDisabled(false);
      resetBtn.click();
      expectActionsDisabled(true);

      el.querySelector('.q-profile-studio-toggle').click();
      el.querySelector('.q-profile-avatar-preset').click();
      expectActionsDisabled(false);
      resetBtn.click();
      expectActionsDisabled(true);

      const avatarUrlInput = el.querySelector('#q-profile-avatar-url');
      avatarUrlInput.value = 'avatars/camila/custom.webp';
      avatarUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
      expectActionsDisabled(false);
      resetBtn.click();
      expectActionsDisabled(true);
    });

    it('selects and previews a dropped avatar image, then exposes the upload action', () => {
      const el = view.mount(container);
      const file = {
        name: 'foto.webp',
        type: 'image/webp',
        size: 50 * 1024,
        previewUrl: 'blob:dropped-preview',
      };
      const dropzone = el.querySelector('.q-profile-dropzone');
      const dragEvent = new Event('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { dropEffect: 'none' },
      });

      dropzone.dispatchEvent(dragEvent);
      expect(dropzone.classList.contains('is-dragover')).toBe(true);

      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
      dropzone.dispatchEvent(dropEvent);

      expect(dropzone.classList.contains('is-dragover')).toBe(false);
      expect(viewModel.selectedAvatarFile).toBe(file);
      expect(el.querySelector('.q-profile-avatar-img').getAttribute('src')).toBe(
        'blob:dropped-preview'
      );
      expect(el.querySelector('.q-profile-upload-btn').hasAttribute('hidden')).toBe(false);
    });

    it('keeps URL editing in the collapsed avatar studio and syncs preset or custom paths', () => {
      const el = view.mount(container);
      const toggle = el.querySelector('.q-profile-studio-toggle');
      const studio = el.querySelector('#q-profile-avatar-studio');

      expect(el.querySelector('#q-profile-avatar')).toBeNull();
      expect(el.querySelector('.q-profile-form #q-profile-avatar-url')).toBeNull();
      expect(studio.hasAttribute('hidden')).toBe(true);

      toggle.click();
      expect(studio.hasAttribute('hidden')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      const preset = el.querySelector('.q-profile-avatar-preset');
      preset.click();
      expect(viewModel.formData.avatar_path).toBe(preset.dataset.avatarPath);
      expect(preset.getAttribute('aria-pressed')).toBe('true');
      expect(el.querySelector('.q-profile-avatar-img').getAttribute('src')).toBe(
        preset.dataset.avatarPath
      );

      const urlInput = el.querySelector('#q-profile-avatar-url');
      urlInput.value = 'avatars/camila/custom.webp';
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(viewModel.formData.avatar_path).toBe('avatars/camila/custom.webp');
    });

    it('uses short static preset paths and validates an overlong URL as it is entered', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();

      const presets = Array.from(el.querySelectorAll('.q-profile-avatar-preset'));
      expect(presets.length).toBe(3);
      presets.forEach((preset) => {
        expect(preset.dataset.avatarPath.startsWith('/assets/avatar-presets/')).toBe(true);
        expect(preset.dataset.avatarPath.length).toBeLessThan(AVATAR_MAX_LENGTH);
        expect(preset.dataset.avatarPath.startsWith('data:')).toBe(false);
      });

      el.querySelector('.q-profile-studio-toggle').click();
      const urlInput = el.querySelector('#q-profile-avatar-url');
      urlInput.value = 'a'.repeat(AVATAR_MAX_LENGTH + 1);
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));

      const error = el.querySelector('[data-error-for="avatar_path"]');
      expect(error.hasAttribute('hidden')).toBe(false);
      expect(error.textContent).toBe(
        `La ruta o URL del avatar no puede superar los ${AVATAR_MAX_LENGTH} caracteres.`
      );
      expect(urlInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('opens the avatar studio and focuses its URL field when avatar-path validation fails', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();
      el.querySelector('.q-profile-studio-toggle').click();

      const urlInput = el.querySelector('#q-profile-avatar-url');
      urlInput.value = 'a'.repeat(501);
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
      el.querySelector('.q-profile-form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();
      expect(urlInput.getAttribute('aria-invalid')).toBe('true');
      expect(el.querySelector('#q-profile-avatar-studio').hasAttribute('hidden')).toBe(false);
      expect(document.activeElement).toBe(urlInput);
    });

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
      expect(el.querySelector('.q-profile-save-btn').disabled).toBe(true);
      expect(el.querySelector('.q-profile-reset-btn').disabled).toBe(true);

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
        'https://example.supabase.co/storage/v1/object/public/avatars/22222222-2222-4222-8222-222222222222/uploaded.webp'
      );
      expect(el.querySelector('.q-profile-alert-success').textContent).toContain(
        'Foto de perfil actualizada correctamente'
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
