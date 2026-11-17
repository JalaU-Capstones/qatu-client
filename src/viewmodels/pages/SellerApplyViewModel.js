import { SellerApplicationsApi } from '../../models/api/SellerApplicationsApi.js';
import { validateSellerApplicationForm } from '../../models/validation/sellerApplicationValidation.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';

export class SellerApplyViewModel {
  /**
   * @param {Object} [options]
   * @param {SellerApplicationsApi} [options.sellerApplicationsApi]
   * @param {Object} [options.authStore]
   */
  constructor({
    sellerApplicationsApi = new SellerApplicationsApi(),
    authStore = defaultAuthStore,
  } = {}) {
    this.api = sellerApplicationsApi;
    this.authStore = authStore;

    this.isLoading = false;
    this.isSubmitting = false;
    this.isAlreadySeller = Boolean(this.authStore?.hasRole?.('seller'));
    this.application = null;

    this.formData = {
      business_name: '',
      business_description: '',
      contact_phone: '',
      contact_email: this.authStore?.getUser?.()?.email || '',
    };
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  setField(field, value) {
    if (!(field in this.formData)) return;
    this.formData[field] = value;
    if (this.fieldErrors[field]) {
      const nextErrors = { ...this.fieldErrors };
      delete nextErrors[field];
      this.fieldErrors = nextErrors;
    }
    this._notify();
  }

  /**
   * Loads the user's role or current application state.
   */
  async loadStatus() {
    this.isAlreadySeller = Boolean(this.authStore?.hasRole?.('seller'));
    if (this.isAlreadySeller) {
      this.isLoading = false;
      this.errorMessage = '';
      this._notify();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this._notify();

    try {
      const app = await this.api.getMyApplication();
      this.application = app;
    } catch (err) {
      this.errorMessage = err?.message || 'No se pudo verificar el estado de tu solicitud.';
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Validates and submits the seller application.
   *
   * @returns {Promise<boolean>}
   */
  async submit() {
    if (this.isSubmitting) return false;

    this.isAlreadySeller = Boolean(this.authStore?.hasRole?.('seller'));
    if (this.isAlreadySeller) {
      this.errorMessage = 'You are already a seller';
      this._notify();
      return false;
    }

    if (this.application?.status === 'pending') {
      this.errorMessage = 'You already have a pending application';
      this._notify();
      return false;
    }

    const validation = validateSellerApplicationForm(this.formData);
    if (!validation.valid) {
      this.fieldErrors = validation.errors;
      this.errorMessage = 'Revisa los campos marcados antes de enviar tu solicitud.';
      this._notify();
      return false;
    }

    this.isSubmitting = true;
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    this._notify();

    try {
      const response = await this.api.apply(validation.sanitized);
      this.application = response?.data || {
        ...validation.sanitized,
        status: 'pending',
      };
      this.successMessage =
        'Solicitud enviada correctamente. Tu postulación se encuentra en estado pendiente (pending).';
      return true;
    } catch (err) {
      this.errorMessage = err?.message || 'No se pudo enviar la solicitud.';
      return false;
    } finally {
      this.isSubmitting = false;
      this._notify();
    }
  }
}
