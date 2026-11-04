import { ProfilesApi } from '../../models/api/ProfilesApi.js';
import { validateProfileUpdate } from '../../models/validation/profileValidation.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';

/**
 * ViewModel for the Buyer Profile page (`/profile`).
 * Coordinates viewing own profile, editing profile fields, client-side validation,
 * and persisting updates via `PATCH /v1/profiles/me`.
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
    this.formData = {
      full_name: '',
      bio: '',
      avatar_path: '',
    };
    this.isLoading = false;
    this.isSaving = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};
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
        this._syncAuthStore(loaded);
      }
      return loaded;
    } catch (err) {
      if (err?.status === 401 && typeof this.onUnauthorized === 'function') {
        this.onUnauthorized();
      }
      this.errorMessage = err?.message || 'No se pudo cargar el perfil';
      return null;
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Updates a single form field and clears any previous field error or status banner.
   *
   * @param {'full_name'|'bio'|'avatar_path'} field
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
   * Resets the editable form back to the currently loaded profile values.
   */
  resetForm() {
    this.formData = {
      full_name: this.profile?.full_name || '',
      bio: this.profile?.bio || '',
      avatar_path: this.profile?.avatar_path || '',
    };
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    this._notify();
  }

  /**
   * Validates form inputs and persists changes via `PATCH /v1/profiles/me`.
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

    this.isSaving = true;
    this._notify();

    try {
      const response = await this.profilesApi.updateMe(validation.values);
      const updated = response?.data || response;
      if (updated) {
        this._applyProfileData(updated);
        this._syncAuthStore(updated);
      }
      this.successMessage = 'Perfil actualizado correctamente.';
      return true;
    } catch (err) {
      if (err?.status === 401 && typeof this.onUnauthorized === 'function') {
        this.onUnauthorized();
      }

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

      this.errorMessage = err?.message || 'No se pudo actualizar el perfil';
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
   * Applies a profile object to `this.profile` and `this.formData`.
   *
   * @param {Object} profileData
   * @private
   */
  _applyProfileData(profileData) {
    this.profile = {
      ...profileData,
      username: profileData.username || '',
      full_name: profileData.full_name || profileData.username || '',
      bio: profileData.bio ?? null,
      avatar_path: profileData.avatar_path ?? null,
    };
    this.formData = {
      full_name: this.profile.full_name || '',
      bio: this.profile.bio || '',
      avatar_path: this.profile.avatar_path || '',
    };
  }

  /**
   * Synchronizes the updated profile into `authStore` so the header and session cache
   * immediately reflect the latest full name and avatar.
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
      avatar_url: profileData.avatar_path ?? currentUser?.avatar_url ?? null,
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
   * Notifies all subscribers of state changes.
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
