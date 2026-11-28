import { AVATAR_MAX_LENGTH, BIO_MAX_LENGTH } from '../../models/validation/profileValidation.js';
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
      expect(new URL(preset.dataset.avatarPath).origin).toBe(window.location.origin);
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
        const presetUrl = new URL(preset.dataset.avatarPath);
        expect(presetUrl.origin).toBe(window.location.origin);
        expect(presetUrl.pathname.startsWith('/assets/avatar-presets/')).toBe(true);
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

    it('saves a selected preset with an absolute same-origin URL', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();
      el.querySelector('.q-profile-studio-toggle').click();

      const preset = el.querySelector('.q-profile-avatar-preset');
      preset.click();
      const avatarPath = preset.dataset.avatarPath;

      expect(await viewModel.saveProfile()).toBe(true);
      expect(mockProfilesApi.updateMe).toHaveBeenCalledWith({ avatar_path: avatarPath });
      expect(el.querySelector('.q-profile-alert-success').textContent).toContain(
        'Perfil actualizado correctamente'
      );
      expect(el.querySelector('.q-profile-alert-error').hasAttribute('hidden')).toBe(true);
    });

    it('blocks root-relative custom paths before sending a profile update', async () => {
      const el = view.mount(container);
      await viewModel.loadProfile();
      el.querySelector('.q-profile-studio-toggle').click();

      const urlInput = el.querySelector('#q-profile-avatar-url');
      urlInput.value = '/assets/avatar-presets/avatar-preset-orchid.svg';
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));

      const error = el.querySelector('[data-error-for="avatar_path"]');
      expect(error.hasAttribute('hidden')).toBe(false);
      expect(error.textContent).toBe('Usa una ruta válida (avatars/...) o una URL HTTP/HTTPS.');
      expect(await viewModel.saveProfile()).toBe(false);
      expect(mockProfilesApi.updateMe).not.toHaveBeenCalled();
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const createMockViewModel = (overrides = {}) => {
      const listeners = new Set();
      const vm = {
        profile: null,
        viewProfile: null,
        formData: {
          full_name: '',
          bio: '',
          avatar_path: '',
          locale: 'en',
        },
        fieldErrors: {},
        selectedAvatarFile: null,
        avatarPreviewUrl: '',
        isLoading: false,
        isSaving: false,
        isUploadingAvatar: false,
        errorMessage: '',
        successMessage: '',
        loadProfile: jasmine.createSpy('loadProfile').and.resolveTo(null),
        setField: jasmine.createSpy('setField'),
        selectAvatarFile: jasmine.createSpy('selectAvatarFile'),
        uploadAvatar: jasmine.createSpy('uploadAvatar').and.resolveTo(true),
        resetForm: jasmine.createSpy('resetForm'),
        dismissMessages: jasmine.createSpy('dismissMessages'),
        saveProfile: jasmine.createSpy('saveProfile').and.resolveTo(true),
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        notify() {
          listeners.forEach((listener) => listener(vm));
        },
        ...overrides,
      };
      return vm;
    };

    const setFileInputFiles = (input, fileName = 'foto.png') => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['contenido'], fileName, { type: 'image/png' }));
      input.files = transfer.files;
      return input.files[0];
    };

    describe('ProfileView additional branches (recovered 1)', () => {
      let container;
      let viewModel;
      let view;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = createMockViewModel();
        view = new ProfileView(viewModel, { autoLoad: false });
      });

      afterEach(() => {
        view?.destroy();
        document.querySelectorAll('.q-modal').forEach((el) => el.remove());
        document.body.style.overflow = '';
        container.remove();
      });

      it('calls loadProfile on mount by default and skips it when autoLoad is false', () => {
        view = new ProfileView(viewModel);
        view.mount(container);
        expect(viewModel.loadProfile).toHaveBeenCalledTimes(1);

        view.destroy();
        const secondViewModel = createMockViewModel();
        view = new ProfileView(secondViewModel, { autoLoad: false });
        view.mount(container);
        expect(secondViewModel.loadProfile).not.toHaveBeenCalled();
      });

      it('render() is idempotent and _bindEvents/_update guard a missing element', () => {
        const first = view.render();
        expect(view.render()).toBe(first);
        view.mount(container);
        expect(container.querySelectorAll('.q-profile').length).toBe(1);
        expect(view.render()).toBe(first);

        view.element = null;
        expect(() => view._bindEvents()).not.toThrow();
        expect(() => view._update(viewModel)).not.toThrow();
      });

      it('destroy() unsubscribes, removes the element and is safe twice', () => {
        const listeners = new Set();
        let unsubscribed = 0;
        viewModel.subscribe = (listener) => {
          listeners.add(listener);
          return () => {
            unsubscribed += 1;
            listeners.delete(listener);
          };
        };

        view = new ProfileView(viewModel, { autoLoad: false });
        const updateSpy = spyOn(view, '_update').and.callThrough();
        view.mount(container);
        expect(listeners.size).toBe(1);

        updateSpy.calls.reset();
        view.destroy();
        expect(unsubscribed).toBe(1);
        expect(view._unsubscribe).toBeNull();
        expect(container.querySelector('.q-profile')).toBeNull();

        viewModel.formData = { ...viewModel.formData, full_name: 'Otro nombre' };
        viewModel.notify();
        expect(updateSpy).not.toHaveBeenCalled();
        expect(() => view.destroy()).not.toThrow();
        expect(unsubscribed).toBe(1);
      });

      it('stores a selected avatar file from the file input and clears the input value', () => {
        const el = view.mount(container);
        const input = el.querySelector('#q-profile-avatar-file');
        const file = setFileInputFiles(input);
        expect(input.value).not.toBe('');

        input.dispatchEvent(new Event('change', { bubbles: true }));

        expect(viewModel.selectAvatarFile).toHaveBeenCalledWith(file);
        expect(input.value).toBe('');
        expect(input.files.length).toBe(0);
      });

      it('ignores an avatar file change without a selected file', () => {
        const el = view.mount(container);
        const input = el.querySelector('#q-profile-avatar-file');

        input.dispatchEvent(new Event('change', { bubbles: true }));

        expect(viewModel.selectAvatarFile).not.toHaveBeenCalled();
        expect(input.value).toBe('');
      });

      it('opens the file picker and tracks drag state on the dropzone', () => {
        const el = view.mount(container);
        const dropzone = el.querySelector('.q-profile-dropzone');
        const input = el.querySelector('#q-profile-avatar-file');
        const clickSpy = spyOn(input, 'click');

        dropzone.click();
        expect(clickSpy).toHaveBeenCalled();

        const dragEvent = new Event('dragover', { bubbles: true, cancelable: true });
        const dataTransfer = { dropEffect: 'none' };
        Object.defineProperty(dragEvent, 'dataTransfer', { value: dataTransfer });
        dropzone.dispatchEvent(dragEvent);
        expect(dragEvent.defaultPrevented).toBe(true);
        expect(dataTransfer.dropEffect).toBe('copy');
        expect(dropzone.classList.contains('is-dragover')).toBe(true);

        const innerLeave = new Event('dragleave', { bubbles: true });
        Object.defineProperty(innerLeave, 'relatedTarget', {
          value: dropzone.querySelector('.q-profile-dropzone-copy'),
        });
        dropzone.dispatchEvent(innerLeave);
        expect(dropzone.classList.contains('is-dragover')).toBe(true);

        const outerLeave = new Event('dragleave', { bubbles: true });
        Object.defineProperty(outerLeave, 'relatedTarget', { value: container });
        dropzone.dispatchEvent(outerLeave);
        expect(dropzone.classList.contains('is-dragover')).toBe(false);

        const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [] } });
        dropzone.dispatchEvent(dropEvent);
        expect(dropEvent.defaultPrevented).toBe(true);
        expect(viewModel.selectAvatarFile).not.toHaveBeenCalled();
      });

      it('toggles the avatar studio and exposes preset pressed states', () => {
        const el = view.mount(container);
        const toggle = el.querySelector('.q-profile-studio-toggle');
        const studio = el.querySelector('#q-profile-avatar-studio');
        const presets = el.querySelectorAll('.q-profile-avatar-preset');
        expect(presets.length).toBe(3);
        expect(Array.from(presets, (preset) => preset.getAttribute('aria-pressed'))).toEqual([
          'false',
          'false',
          'false',
        ]);

        toggle.click();
        expect(studio.hasAttribute('hidden')).toBe(false);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');

        toggle.click();
        expect(studio.hasAttribute('hidden')).toBe(true);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        viewModel.formData = { ...viewModel.formData, avatar_path: presets[1].dataset.avatarPath };
        viewModel.notify();
        expect(
          Array.from(el.querySelectorAll('.q-profile-avatar-preset'), (preset) =>
            preset.getAttribute('aria-pressed')
          )
        ).toEqual(['false', 'true', 'false']);
      });

      it('uploads the selected avatar and resets the file input on cancel', () => {
        const el = view.mount(container);
        viewModel.selectedAvatarFile = { name: 'foto.png', type: 'image/png', size: 1024 };
        viewModel.formData = { ...viewModel.formData, full_name: 'Cambio' };
        viewModel.notify();

        const uploadBtn = el.querySelector('.q-profile-upload-btn');
        expect(uploadBtn.hasAttribute('hidden')).toBe(false);
        uploadBtn.click();
        expect(viewModel.uploadAvatar).toHaveBeenCalled();

        const input = el.querySelector('#q-profile-avatar-file');
        setFileInputFiles(input);
        expect(input.value).not.toBe('');
        el.querySelector('.q-profile-reset-btn').click();
        expect(viewModel.resetForm).toHaveBeenCalled();
        expect(input.value).toBe('');
      });

      it('dismisses messages from the success banner and hides banners when cleared', () => {
        const el = view.mount(container);
        viewModel.errorMessage = 'Fallo';
        viewModel.successMessage = 'Listo';
        viewModel.notify();

        const errorBanner = el.querySelector('.q-profile-alert-error');
        const successBanner = el.querySelector('.q-profile-alert-success');
        expect(errorBanner.hasAttribute('hidden')).toBe(false);
        expect(successBanner.hasAttribute('hidden')).toBe(false);
        expect(el.querySelector('.q-profile-alert-text').textContent).toBe('Listo');

        el.querySelector('.q-profile-alert-close').click();
        expect(viewModel.dismissMessages).toHaveBeenCalled();

        viewModel.errorMessage = '';
        viewModel.successMessage = '';
        viewModel.notify();
        expect(errorBanner.hasAttribute('hidden')).toBe(true);
        expect(errorBanner.textContent).toBe('');
        expect(successBanner.hasAttribute('hidden')).toBe(true);
        expect(el.querySelector('.q-profile-alert-text').textContent).toBe('');
      });

      it('uses display fallbacks when the view model has no profile', () => {
        viewModel.avatarPreviewUrl = 'blob:avatar-preview';
        const el = view.mount(container);

        expect(el.querySelector('.q-profile-display-name').textContent).toBe('Usuario');
        expect(el.querySelector('.q-profile-display-bio').textContent).toBe(
          'Sin biografía registrada.'
        );
        expect(el.querySelector('.q-profile-username').textContent).toBe('');
        const avatar = el.querySelector('.q-profile-avatar-img');
        expect(avatar.getAttribute('src')).toBe('blob:avatar-preview');
        expect(avatar.getAttribute('alt')).toBe('Foto de perfil');
      });

      it('disables upload, dropzone and form actions for each busy state', () => {
        const el = view.mount(container);
        const uploadBtn = el.querySelector('.q-profile-upload-btn');
        const dropzone = el.querySelector('.q-profile-dropzone');
        const saveBtn = el.querySelector('.q-profile-save-btn');
        const resetBtn = el.querySelector('.q-profile-reset-btn');
        expect(uploadBtn.hasAttribute('hidden')).toBe(true);
        expect(dropzone.disabled).toBe(false);
        expect(saveBtn.disabled).toBe(true);
        expect(resetBtn.disabled).toBe(true);

        for (const flag of ['isLoading', 'isSaving']) {
          viewModel[flag] = true;
          viewModel.notify();
          expect(uploadBtn.hasAttribute('hidden')).toBe(true);
          expect(dropzone.disabled).toBe(true);
          expect(saveBtn.disabled).toBe(true);
          expect(resetBtn.disabled).toBe(true);
          viewModel[flag] = false;
          viewModel.notify();
        }

        viewModel.isUploadingAvatar = true;
        viewModel.notify();
        expect(uploadBtn.hasAttribute('hidden')).toBe(false);
        expect(uploadBtn.disabled).toBe(true);
        expect(uploadBtn.textContent).toBe('Subiendo...');
        expect(dropzone.disabled).toBe(true);
        expect(saveBtn.disabled).toBe(true);

        viewModel.isUploadingAvatar = false;
        viewModel.notify();
        expect(uploadBtn.hasAttribute('hidden')).toBe(true);
        expect(uploadBtn.textContent).toBe('Subir imagen');
      });

      it('appends and selects a custom locale option, leaving stale options behind', () => {
        viewModel.formData = { ...viewModel.formData, locale: 'fr-CA' };
        const el = view.mount(container);
        const select = el.querySelector('#q-profile-locale');

        expect(select.options.length).toBe(5);
        const custom = select.querySelector('option[value="fr-CA"]');
        expect(custom.textContent).toBe('fr-CA');
        expect(select.value).toBe('fr-CA');

        viewModel.formData = { ...viewModel.formData, locale: 'es' };
        viewModel.notify();
        expect(select.value).toBe('es');
        expect(select.querySelector('option[value="fr-CA"]')).not.toBeNull();
      });

      it('shows an over-limit bio counter for 505 characters', () => {
        viewModel.formData = { ...viewModel.formData, bio: 'x'.repeat(505) };
        const el = view.mount(container);
        const counter = el.querySelector('.q-profile-bio-counter');

        expect(counter.textContent).toBe(`505 / ${BIO_MAX_LENGTH}`);
        expect(counter.classList.contains('is-over-limit')).toBe(true);
      });

      it('shows the exact oversized avatar error with aria-invalid on the dropzone', () => {
        viewModel.fieldErrors = { avatar: 'La imagen excede el límite de 2 MB' };
        const el = view.mount(container);
        const errorEl = el.querySelector('[data-error-for="avatar"]');
        const dropzone = el.querySelector('.q-profile-dropzone');

        expect(errorEl.hasAttribute('hidden')).toBe(false);
        expect(errorEl.textContent).toBe('La imagen excede el límite de 2 MB');
        expect(dropzone.classList.contains('is-invalid')).toBe(true);
        expect(dropzone.getAttribute('aria-invalid')).toBe('true');
      });

      it('keeps focus when no invalid field exists and focuses the first invalid field', () => {
        const el = view.mount(container);
        const dropzone = el.querySelector('.q-profile-dropzone');
        dropzone.focus();

        expect(() => view._focusFirstInvalidField()).not.toThrow();
        expect(document.activeElement).toBe(dropzone);

        const fullNameInput = el.querySelector('#q-profile-full-name');
        fullNameInput.setAttribute('aria-invalid', 'true');
        view._focusFirstInvalidField();
        expect(document.activeElement).toBe(fullNameInput);
      });

      it('characterizes unguarded formData and fieldErrors in _update', () => {
        viewModel.formData = undefined;
        let broken = new ProfileView(viewModel, { autoLoad: false });
        expect(() => broken.render()).toThrowError(TypeError);
        broken.destroy();

        viewModel.formData = { full_name: '', bio: '', avatar_path: '', locale: 'en' };
        viewModel.fieldErrors = undefined;
        broken = new ProfileView(viewModel, { autoLoad: false });
        expect(() => broken.render()).toThrowError(TypeError);
        broken.destroy();
      });

      it('characterizes the studio state that survives destroy and remount', () => {
        const first = view.mount(container);
        first.querySelector('.q-profile-studio-toggle').click();
        expect(first.querySelector('#q-profile-avatar-studio').hasAttribute('hidden')).toBe(false);

        view.destroy();
        view.mount(container);
        const reopened = container.querySelector('.q-profile');
        expect(reopened).not.toBe(first);
        expect(reopened.querySelector('#q-profile-avatar-studio').hasAttribute('hidden')).toBe(
          false
        );
        expect(
          reopened.querySelector('.q-profile-studio-toggle').getAttribute('aria-expanded')
        ).toBe('true');
      });
    });
  })();
})();
