import { ProfilesApi } from '../../models/api/ProfilesApi.js';
import {
  validateAvatarFile,
  validateProfileUpdate,
} from '../../models/validation/profileValidation.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';

const ALLOWED_UPDATE_FIELDS = ['full_name', 'bio', 'avatar_path', 'locale'];

/**
 * ViewModel for the Buyer Profile page (`/profile`).
 * Coordinates viewing own profile, editing profile fields, avatar upload via
 * `POST /v1/profiles/me/avatar`, client-side validation, and partial updates
 * via `PATCH /v1/profiles/me`.
 */
export class ProfileViewModel {
  /**
   * @param {Object} [options]
   * @param {ProfilesApi} [options.profilesApi]
   * @param {import('../../store/authStore.js').AuthStore} [options.authStore]
   * @param {Function|null} [options.onUnauthorized]
   */
  constructor(options = {}) {
    this.profilesApi = options.profilesApi || new ProfilesApi();
    this.authStore = options.authStore || defaultAuthStore;
    this.onUnauthorized = options.onUnauthorized || null;

    this.profile = null;
    this.viewProfile = null;
    this.formData = {
      full_name: '',
      bio: '',
      avatar_path: '',
      locale: 'en',
    };
    this.selectedAvatarFile = null;
    this.avatarPreviewUrl = '';
    this.isLoading = false;
    this.isSaving = false;
    this.isUploadingAvatar = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};
    this._dirtyFields = new Set();
    this._listeners = new Set();
  }

  /**
   * Loads the user's profile from the backend (`GET /v1/profiles/:id`).
   * Hydrates initial state from `authStore` cache when available.
   *
   * @param {string} [profileId]
   * @returns {Promise<Object|null>}
   */
  async loadProfile(profileId) {
    const cachedUser = this.authStore?.getUser?.() || null;
    const cachedProfile = this.authStore?.getProfile?.() || null;
    const targetId = profileId || cachedUser?.id || cachedProfile?.id;

    if (!targetId) {
      this.errorMessage = 'Debes iniciar sesión para ver tu perfil.';
      if (typeof this.onUnauthorized === 'function') {
        this.onUnauthorized();
      }
      this._notify();
      return null;
    }

    if (!this.profile && cachedProfile && (!cachedProfile.id || cachedProfile.id === targetId)) {
      this._applyProfileData({
        ...cachedUser,
        ...cachedProfile,
        id: targetId,
      });
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this._notify();

    try {
      const response = await this.profilesApi.getById(targetId);
      const loaded = response?.data || response;
      if (loaded) {
        this._applyProfileData(loaded);
        this._syncAuthStore(this.profile);
      }
      return this.profile;
    } catch (err) {
      this._handleAuthError(err);
      this.errorMessage = this._mapErrorMessage(err, 'No se pudo cargar el perfil');
      return null;
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Updates a single form field and clears any previous field error or status banner.
   *
   * @param {'full_name'|'bio'|'avatar_path'|'locale'} field
   * @param {string} value
   */
  setField(field, value) {
    if (!Object.prototype.hasOwnProperty.call(this.formData, field)) {
      return;
    }

    this.formData = {
      ...this.formData,
      [field]: value,
    };
    this._dirtyFields.add(field);

    if (this.fieldErrors[field]) {
      const nextErrors = { ...this.fieldErrors };
      delete nextErrors[field];
      this.fieldErrors = nextErrors;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this._notify();
  }

  /**
   * Validates a user-selected avatar file and creates an immediate client-side preview URL.
   *
   * @param {File|Blob|Object|null} file
   * @returns {boolean} true if file is valid for preview/upload
   */
  selectAvatarFile(file) {
    this._revokeAvatarPreview();
    this.selectedAvatarFile = null;
    this.errorMessage = '';
    this.successMessage = '';

    const validation = validateAvatarFile(file);
    if (!validation.isValid) {
      this.fieldErrors = {
        ...this.fieldErrors,
        avatar: validation.error,
      };
      this.errorMessage = validation.error;
      this._notify();
      return false;
    }

    const nextErrors = { ...this.fieldErrors };
    delete nextErrors.avatar;
    this.fieldErrors = nextErrors;

    this.selectedAvatarFile = file;
    if (
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      typeof Blob !== 'undefined' &&
      file instanceof Blob
    ) {
      this.avatarPreviewUrl = URL.createObjectURL(file);
    } else {
      this.avatarPreviewUrl = file.previewUrl || 'blob:avatar-preview';
    }

    this._notify();
    return true;
  }

  /**
   * Uploads the selected avatar image via `POST /v1/profiles/me/avatar` and updates state
   * from the returned profile envelope.
   *
   * @param {File|Blob|Object} [file=this.selectedAvatarFile]
   * @returns {Promise<boolean>}
   */
  async uploadAvatar(file = this.selectedAvatarFile) {
    this.errorMessage = '';
    this.successMessage = '';

    const validation = validateAvatarFile(file);
    if (!validation.isValid) {
      this.fieldErrors = {
        ...this.fieldErrors,
        avatar: validation.error,
      };
      this.errorMessage = validation.error;
      this._notify();
      return false;
    }

    const nextErrors = { ...this.fieldErrors };
    delete nextErrors.avatar;
    this.fieldErrors = nextErrors;

    this.isUploadingAvatar = true;
    this._notify();

    try {
      const response = await this.profilesApi.uploadAvatar(file);
      const updated = response?.data || response;
      if (updated) {
        this._applyProfileData(updated);
        this._syncAuthStore(this.profile);
      }
      this._revokeAvatarPreview();
      this.selectedAvatarFile = null;
      this.successMessage = 'Foto de perfil actualizada correctamente';
      return true;
    } catch (err) {
      this._handleAuthError(err);
      const message = this._mapErrorMessage(
        err,
        'Error al guardar los cambios. Inténtalo de nuevo más tarde'
      );
      this.fieldErrors = {
        ...this.fieldErrors,
        avatar: message,
      };
      this.errorMessage = message;
      return false;
    } finally {
      this.isUploadingAvatar = false;
      this._notify();
    }
  }

  /**
   * Resets the editable form back to the currently loaded profile values.
   */
  resetForm() {
    this._revokeAvatarPreview();
    this.selectedAvatarFile = null;
    this.formData = {
      full_name: this.profile?.full_name || '',
      bio: this.profile?.bio || '',
      avatar_path: this.profile?.avatar_path || '',
      locale: this.profile?.locale || 'en',
    };
    this._dirtyFields.clear();
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    this._notify();
  }

  /**
   * Clears alert messages (`errorMessage` and `successMessage`).
   */
  dismissMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this._notify();
  }

  /**
   * Validates form inputs and persists changed fields via `PATCH /v1/profiles/me`.
   *
   * @returns {Promise<boolean>} true when update succeeded, false otherwise
   */
  async saveProfile() {
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};

    const validation = validateProfileUpdate(this.formData);
    if (!validation.isValid) {
      this.fieldErrors = validation.errors;
      this.errorMessage =
        Object.values(validation.errors)[0] || 'Por favor corrige los errores del formulario.';
      this._notify();
      return false;
    }

    const partialPayload = this._buildPartialPayload(validation.values);

    this.isSaving = true;
    this._notify();

    try {
      const response = await this.profilesApi.updateMe(partialPayload);
      const updated = response?.data || response;
      if (updated) {
        this._applyProfileData(updated);
        this._syncAuthStore(this.profile);
      }
      this._dirtyFields.clear();
      this.successMessage = 'Perfil actualizado correctamente';
      return true;
    } catch (err) {
      this._handleAuthError(err);

      const details = err?.data?.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        const mappedErrors = {};
        for (const item of details) {
          if (item?.field && item?.message && !mappedErrors[item.field]) {
            mappedErrors[item.field] = item.message;
          }
        }
        this.fieldErrors = mappedErrors;
      }

      this.errorMessage = this._mapErrorMessage(
        err,
        'Error al guardar los cambios. Inténtalo de nuevo más tarde'
      );
      return false;
    } finally {
      this.isSaving = false;
      this._notify();
    }
  }

  /**
   * Subscribes to ViewModel state updates.
   *
   * @param {Function} listener
   * @returns {Function} Unsubscribe callback
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Builds a partial update payload containing only allowed fields that changed.
   *
   * @param {Object} validatedValues
   * @returns {Object}
   * @private
   */
  _buildPartialPayload(validatedValues) {
    const payload = {};

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(validatedValues, field)) {
        continue;
      }

      const nextValue = validatedValues[field];
      const currentValue = this.profile ? (this.profile[field] ?? null) : undefined;
      const isDirty = this._dirtyFields.has(field);
      const isChanged = !this.profile || nextValue !== currentValue;

      if (field === 'bio' && nextValue === null) {
        // Only send bio: null if the user explicitly cleared it or had a previous bio
        if (isDirty || (this.profile && this.profile.bio !== null)) {
          payload.bio = null;
        }
        continue;
      }

      if (field === 'avatar_path' && nextValue === null) {
        if (isDirty || (this.profile && this.profile.avatar_path !== null)) {
          payload.avatar_path = null;
        }
        continue;
      }

      if (isDirty || isChanged) {
        payload[field] = nextValue;
      }
    }

    if (Object.keys(payload).length === 0) {
      payload.full_name = validatedValues.full_name;
    }

    return payload;
  }

  /**
   * Applies a snake_case profile object to `this.profile`, camelCase `this.viewProfile`,
   * and `this.formData`, always excluding sensitive fields (`email`).
   *
   * @param {Object} profileData
   * @private
   */
  _applyProfileData(profileData) {
    const id = profileData.id || '';
    const username = profileData.username || '';
    const fullName = profileData.full_name || profileData.username || '';
    const avatarPath = profileData.avatar_path ?? null;
    const bio = profileData.bio ?? null;
    const locale = profileData.locale || 'en';
    const createdAt = profileData.created_at || null;
    const updatedAt = profileData.updated_at || null;

    this.profile = {
      id,
      username,
      full_name: fullName,
      avatar_path: avatarPath,
      bio,
      locale,
      ...(createdAt ? { created_at: createdAt } : {}),
      ...(updatedAt ? { updated_at: updatedAt } : {}),
    };

    this.viewProfile = {
      id,
      username,
      fullName,
      avatarPath,
      bio,
      locale,
      createdAt,
      updatedAt,
    };

    this.formData = {
      full_name: fullName,
      bio: bio || '',
      avatar_path: avatarPath || '',
      locale,
    };
  }

  /**
   * Synchronizes the updated profile into `authStore` so the header and session cache
   * immediately reflect the latest full_name and avatar_path.
   *
   * @param {Object} profileData
   * @private
   */
  _syncAuthStore(profileData) {
    if (!this.authStore || typeof this.authStore.setSession !== 'function') {
      return;
    }

    const currentUser = this.authStore.getUser?.() || null;
    const userId = currentUser?.id || profileData?.id;
    if (!userId || (currentUser?.id && profileData?.id && currentUser.id !== profileData.id)) {
      return;
    }

    const mergedUser = {
      ...(currentUser || {}),
      id: userId,
      username: profileData.username || currentUser?.username || '',
      full_name: profileData.full_name || currentUser?.full_name || '',
      avatar_path: profileData.avatar_path ?? currentUser?.avatar_path ?? null,
    };

    this.authStore.setSession({
      user: mergedUser,
      profile: {
        ...(this.authStore.getProfile?.() || {}),
        ...profileData,
      },
      roles: this.authStore.getRoles?.() || [],
    });
  }

  /**
   * Triggers `onUnauthorized` when a 401 or `SESSION_EXPIRED` error occurs.
   *
   * @param {Error & { status?: number, code?: string }} err
   * @private
   */
  _handleAuthError(err) {
    if (
      (err?.status === 401 || err?.code === 'SESSION_EXPIRED') &&
      typeof this.onUnauthorized === 'function'
    ) {
      this.onUnauthorized();
    }
  }

  /**
   * Maps HTTP status codes to contract-compliant Spanish messages without exposing server details.
   *
   * @param {Error & { status?: number, code?: string, data?: Object }} err
   * @param {string} fallbackMessage
   * @returns {string}
   * @private
   */
  _mapErrorMessage(err, fallbackMessage) {
    const status = err?.status;
    const code = err?.code || err?.data?.error?.code || '';

    if (status === 403) {
      return 'No tienes permiso para modificar este perfil';
    }
    if (status === 404) {
      return 'Perfil no encontrado';
    }
    if (status === 422 && code === 'FILE_TOO_LARGE') {
      return 'La imagen excede el límite de 2 MB';
    }
    if (status === 422 && code === 'INVALID_FILE_FORMAT') {
      return 'Solo se aceptan imágenes JPEG, PNG y WebP';
    }
    if (status >= 500) {
      return 'Error al guardar los cambios. Inténtalo de nuevo más tarde';
    }

    const firstDetail = err?.data?.error?.details?.[0]?.message;
    if (firstDetail) {
      return firstDetail;
    }

    return err?.message || fallbackMessage;
  }

  /**
   * Revokes any active object URL created for client-side avatar preview.
   * @private
   */
  _revokeAvatarPreview() {
    if (
      this.avatarPreviewUrl &&
      this.avatarPreviewUrl.startsWith('blob:') &&
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      try {
        URL.revokeObjectURL(this.avatarPreviewUrl);
      } catch {
        // Ignore revoke errors
      }
    }
    this.avatarPreviewUrl = '';
  }

  /**
   * Notifies all subscribers of state changes.
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
