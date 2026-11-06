import { BIO_MAX_LENGTH } from '../../models/validation/profileValidation.js';
import { ProfileViewModel } from '../../viewmodels/pages/ProfileViewModel.js';

/**
 * View for the Buyer Profile page (`/profile`).
 * Displays the user's username, full name, avatar, bio, and locale, provides an
 * avatar image upload control (`POST /v1/profiles/me/avatar`) with immediate preview,
 * and a validated form to update profile fields (`PATCH /v1/profiles/me`).
 */
export class ProfileView {
  /**
   * @param {ProfileViewModel} [viewModel]
   * @param {Object} [options]
   * @param {boolean} [options.autoLoad=true]
   */
  constructor(viewModel = new ProfileViewModel(), options = {}) {
    this.viewModel = viewModel;
    this.autoLoad = options.autoLoad !== false;
    this.element = null;
    this._unsubscribe = null;
  }

  /**
   * Builds and returns the profile page DOM element.
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) {
      return this.element;
    }

    const section = document.createElement('section');
    section.className = 'q-profile';
    section.setAttribute('aria-labelledby', 'q-profile-heading');

    section.innerHTML = `
      <header class="q-profile-header">
        <p class="q-profile-eyebrow">Mi cuenta</p>
        <h1 id="q-profile-heading" class="q-profile-title">Mi Perfil</h1>
        <p class="q-profile-subtitle">Consulta y actualiza tu información personal en Q'atu.</p>
      </header>

      <div class="q-profile-grid">
        <aside class="q-profile-card q-profile-summary-card" aria-label="Resumen de perfil">
          <div class="q-profile-avatar-frame"></div>
          <h2 class="q-profile-display-name"></h2>
          <p class="q-profile-username"></p>
          <p class="q-profile-display-bio"></p>

          <div class="q-profile-avatar-upload">
            <label class="q-profile-btn q-profile-select-avatar-btn" for="q-profile-avatar-file">
              Cambiar foto de perfil
            </label>
            <input
              id="q-profile-avatar-file"
              class="q-profile-file-input"
              type="file"
              name="image"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              aria-describedby="q-profile-error-avatar"
            />
            <button
              type="button"
              class="q-profile-btn q-profile-upload-btn"
              hidden
            >
              Subir imagen
            </button>
            <p class="q-profile-field-hint">Formatos permitidos: JPEG, PNG, WebP (máx. 2 MB).</p>
            <p
              id="q-profile-error-avatar"
              class="q-profile-field-error"
              data-error-for="avatar"
              role="alert"
              hidden
            ></p>
          </div>
        </aside>

        <div class="q-profile-card q-profile-form-card">
          <div class="q-profile-alert q-profile-alert-error" role="alert" tabindex="-1" hidden></div>
          <div class="q-profile-alert q-profile-alert-success" role="status" hidden>
            <span class="q-profile-alert-text"></span>
            <button
              type="button"
              class="q-profile-alert-close"
              aria-label="Cerrar notificación"
            >
              &times;
            </button>
          </div>

          <form class="q-profile-form" novalidate>
            <div class="q-profile-field">
              <label class="q-profile-label" for="q-profile-username-input">Nombre de usuario</label>
              <input
                id="q-profile-username-input"
                class="q-profile-input"
                type="text"
                name="username"
                readonly
                aria-readonly="true"
              />
              <p class="q-profile-field-hint">El nombre de usuario es único y no se puede modificar.</p>
            </div>

            <div class="q-profile-field">
              <label class="q-profile-label" for="q-profile-full-name">Nombre completo</label>
              <input
                id="q-profile-full-name"
                class="q-profile-input"
                type="text"
                name="full_name"
                placeholder="Ej. Camila Morales"
                autocomplete="name"
                aria-describedby="q-profile-error-full_name"
                required
              />
              <p
                id="q-profile-error-full_name"
                class="q-profile-field-error"
                data-error-for="full_name"
                hidden
              ></p>
            </div>

            <div class="q-profile-field">
              <label class="q-profile-label" for="q-profile-avatar">Avatar (ruta o URL)</label>
              <input
                id="q-profile-avatar"
                class="q-profile-input"
                type="text"
                name="avatar_path"
                placeholder="avatars/usuario/avatar.webp"
                aria-describedby="q-profile-error-avatar_path"
              />
              <p
                id="q-profile-error-avatar_path"
                class="q-profile-field-error"
                data-error-for="avatar_path"
                hidden
              ></p>
            </div>

            <div class="q-profile-field">
              <label class="q-profile-label" for="q-profile-locale">Idioma preferido</label>
              <select
                id="q-profile-locale"
                class="q-profile-input q-profile-select"
                name="locale"
                aria-describedby="q-profile-error-locale"
              >
                <option value="en">English (en)</option>
                <option value="es">Español (es)</option>
                <option value="es-PE">Español - Perú (es-PE)</option>
                <option value="pt-BR">Português - Brasil (pt-BR)</option>
              </select>
              <p
                id="q-profile-error-locale"
                class="q-profile-field-error"
                data-error-for="locale"
                hidden
              ></p>
            </div>

            <div class="q-profile-field">
              <div class="q-profile-label-row">
                <label class="q-profile-label" for="q-profile-bio">Biografía</label>
                <span class="q-profile-bio-counter">0 / ${BIO_MAX_LENGTH}</span>
              </div>
              <textarea
                id="q-profile-bio"
                class="q-profile-textarea"
                name="bio"
                rows="4"
                placeholder="Cuéntanos un poco sobre ti..."
                aria-describedby="q-profile-error-bio"
              ></textarea>
              <p
                id="q-profile-error-bio"
                class="q-profile-field-error"
                data-error-for="bio"
                hidden
              ></p>
            </div>

            <div class="q-profile-actions">
              <button type="button" class="q-profile-btn q-profile-reset-btn">
                Cancelar
              </button>
              <button type="submit" class="q-profile-btn q-profile-save-btn">
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.element = section;
    this._bindEvents();
    this._update(this.viewModel);

    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    return this.element;
  }

  /**
   * Mounts the profile view into the given container and triggers initial profile load.
   *
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    if (this.autoLoad) {
      void this.viewModel.loadProfile();
    }
    return el;
  }

  /**
   * Wires form input, file selection, upload, and button listeners to the ViewModel.
   * @private
   */
  _bindEvents() {
    if (!this.element) return;

    const fullNameInput = this.element.querySelector('#q-profile-full-name');
    const avatarInput = this.element.querySelector('#q-profile-avatar');
    const localeSelect = this.element.querySelector('#q-profile-locale');
    const bioInput = this.element.querySelector('#q-profile-bio');
    const avatarFileInput = this.element.querySelector('#q-profile-avatar-file');
    const uploadBtn = this.element.querySelector('.q-profile-upload-btn');
    const resetBtn = this.element.querySelector('.q-profile-reset-btn');
    const closeAlertBtn = this.element.querySelector('.q-profile-alert-close');
    const form = this.element.querySelector('.q-profile-form');

    fullNameInput?.addEventListener('input', (e) => {
      this.viewModel.setField('full_name', e.target.value);
    });

    avatarInput?.addEventListener('input', (e) => {
      this.viewModel.setField('avatar_path', e.target.value);
    });

    localeSelect?.addEventListener('change', (e) => {
      this.viewModel.setField('locale', e.target.value);
    });

    bioInput?.addEventListener('input', (e) => {
      this.viewModel.setField('bio', e.target.value);
    });

    avatarFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        this.viewModel.selectAvatarFile(file);
      }
    });

    uploadBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      void this.viewModel.uploadAvatar();
    });

    resetBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.resetForm();
      if (avatarFileInput) {
        avatarFileInput.value = '';
      }
    });

    closeAlertBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewModel.dismissMessages();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saved = await this.viewModel.saveProfile();
      if (!saved) {
        this._focusFirstInvalidField();
      }
    });
  }

  /**
   * Moves focus to the first form control with a validation error.
   * @private
   */
  _focusFirstInvalidField() {
    if (!this.element) return;
    const firstInvalid = this.element.querySelector(
      '.q-profile-form [aria-invalid="true"], .q-profile-form .is-invalid'
    );
    if (firstInvalid && typeof firstInvalid.focus === 'function') {
      firstInvalid.focus();
    }
  }

  /**
   * Synchronizes the DOM with the current ViewModel state.
   *
   * @param {ProfileViewModel} vm
   * @private
   */
  _update(vm) {
    if (!this.element) return;

    const viewProfile = vm.viewProfile || {};
    const profile = vm.profile || {};
    const username = viewProfile.username || profile.username || '';
    const displayName = viewProfile.fullName || profile.full_name || username || 'Usuario';
    const bioText = viewProfile.bio || profile.bio || 'Sin biografía registrada.';
    const avatarSrc = vm.avatarPreviewUrl || viewProfile.avatarPath || profile.avatar_path || '';

    // 1. Summary card & avatar preview
    const avatarFrame = this.element.querySelector('.q-profile-avatar-frame');
    if (avatarFrame) {
      avatarFrame.innerHTML = '';
      if (avatarSrc) {
        const img = document.createElement('img');
        img.className = 'q-profile-avatar-img avatar-image';
        img.src = avatarSrc;
        img.alt = 'Foto de perfil';
        avatarFrame.appendChild(img);
      } else {
        avatarFrame.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="q-profile-avatar-placeholder">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        `;
      }
    }

    const nameEl = this.element.querySelector('.q-profile-display-name');
    if (nameEl) {
      nameEl.textContent = displayName;
    }

    const usernameEl = this.element.querySelector('.q-profile-username');
    if (usernameEl) {
      usernameEl.textContent = username ? `@${username}` : '';
    }

    const bioEl = this.element.querySelector('.q-profile-display-bio');
    if (bioEl) {
      bioEl.textContent = bioText;
    }

    // 2. Avatar upload button state
    const uploadBtn = this.element.querySelector('.q-profile-upload-btn');
    const avatarFileInput = this.element.querySelector('#q-profile-avatar-file');
    if (uploadBtn) {
      if (vm.selectedAvatarFile || vm.isUploadingAvatar) {
        uploadBtn.removeAttribute('hidden');
      } else {
        uploadBtn.setAttribute('hidden', '');
      }
      uploadBtn.disabled = vm.isUploadingAvatar || vm.isLoading || vm.isSaving;
      uploadBtn.textContent = vm.isUploadingAvatar ? 'Subiendo...' : 'Subir imagen';
    }

    // 3. Form inputs
    const usernameInput = this.element.querySelector('#q-profile-username-input');
    if (usernameInput) {
      usernameInput.value = username;
    }

    const fullNameInput = this.element.querySelector('#q-profile-full-name');
    if (fullNameInput && fullNameInput.value !== (vm.formData.full_name ?? '')) {
      fullNameInput.value = vm.formData.full_name ?? '';
    }

    const avatarInput = this.element.querySelector('#q-profile-avatar');
    if (avatarInput && avatarInput.value !== (vm.formData.avatar_path ?? '')) {
      avatarInput.value = vm.formData.avatar_path ?? '';
    }

    const localeSelect = this.element.querySelector('#q-profile-locale');
    if (localeSelect && vm.formData.locale) {
      const targetLocale = vm.formData.locale;
      const hasOption = Array.from(localeSelect.options).some((opt) => opt.value === targetLocale);
      if (!hasOption) {
        const customOpt = document.createElement('option');
        customOpt.value = targetLocale;
        customOpt.textContent = targetLocale;
        localeSelect.appendChild(customOpt);
      }
      if (localeSelect.value !== targetLocale) {
        localeSelect.value = targetLocale;
      }
    }

    const bioInput = this.element.querySelector('#q-profile-bio');
    if (bioInput && bioInput.value !== (vm.formData.bio ?? '')) {
      bioInput.value = vm.formData.bio ?? '';
    }

    // Bio counter
    const bioCounter = this.element.querySelector('.q-profile-bio-counter');
    if (bioCounter) {
      const currentLength = (vm.formData.bio || '').trim().length;
      bioCounter.textContent = `${currentLength} / ${BIO_MAX_LENGTH}`;
      bioCounter.classList.toggle('is-over-limit', currentLength > BIO_MAX_LENGTH);
    }

    // 4. Field validation errors
    this._updateFieldError('full_name', fullNameInput, vm.fieldErrors.full_name);
    this._updateFieldError('avatar_path', avatarInput, vm.fieldErrors.avatar_path);
    this._updateFieldError('locale', localeSelect, vm.fieldErrors.locale);
    this._updateFieldError('bio', bioInput, vm.fieldErrors.bio);
    this._updateFieldError('avatar', avatarFileInput, vm.fieldErrors.avatar);

    // 5. Alert banners
    const errorBanner = this.element.querySelector('.q-profile-alert-error');
    if (errorBanner) {
      if (vm.errorMessage) {
        errorBanner.textContent = vm.errorMessage;
        errorBanner.removeAttribute('hidden');
      } else {
        errorBanner.textContent = '';
        errorBanner.setAttribute('hidden', '');
      }
    }

    const successBanner = this.element.querySelector('.q-profile-alert-success');
    const successText = this.element.querySelector('.q-profile-alert-text');
    if (successBanner) {
      if (vm.successMessage) {
        if (successText) {
          successText.textContent = vm.successMessage;
        } else {
          successBanner.textContent = vm.successMessage;
        }
        successBanner.removeAttribute('hidden');
      } else {
        if (successText) {
          successText.textContent = '';
        }
        successBanner.setAttribute('hidden', '');
      }
    }

    // 6. Loading / saving states
    const saveBtn = this.element.querySelector('.q-profile-save-btn');
    const resetBtn = this.element.querySelector('.q-profile-reset-btn');
    const isBusy = vm.isLoading || vm.isSaving || vm.isUploadingAvatar;
    if (saveBtn) {
      saveBtn.disabled = isBusy;
      saveBtn.textContent = vm.isSaving ? 'Guardando...' : 'Guardar cambios';
    }
    if (resetBtn) {
      resetBtn.disabled = isBusy;
    }
  }

  /**
   * Toggles per-field error text and input `.is-invalid` / `aria-invalid` state.
   *
   * @param {string} fieldName
   * @param {HTMLElement|null} inputEl
   * @param {string|undefined} errorText
   * @private
   */
  _updateFieldError(fieldName, inputEl, errorText) {
    if (!this.element) return;
    const errorEl = this.element.querySelector(`[data-error-for="${fieldName}"]`);
    if (errorEl) {
      if (errorText) {
        errorEl.textContent = errorText;
        errorEl.removeAttribute('hidden');
      } else {
        errorEl.textContent = '';
        errorEl.setAttribute('hidden', '');
      }
    }
    if (inputEl) {
      inputEl.classList.toggle('is-invalid', Boolean(errorText));
      if (errorText) {
        inputEl.setAttribute('aria-invalid', 'true');
      } else {
        inputEl.removeAttribute('aria-invalid');
      }
    }
  }

  /**
   * Cleans up subscriptions and removes the element from the DOM.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
