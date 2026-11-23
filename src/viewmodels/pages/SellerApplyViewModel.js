import { SellerApplicationsApi } from '../../models/api/SellerApplicationsApi.js';
import { validateSellerApplicationForm } from '../../models/validation/sellerApplicationValidation.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';

export const SELLER_PHONE_COUNTRIES = Object.freeze(
  [
    { code: 'DE', name: 'Alemania', dialCode: '+49' },
    { code: 'AR', name: 'Argentina', dialCode: '+54' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591' },
    { code: 'BR', name: 'Brasil', dialCode: '+55' },
    { code: 'CA', name: 'Canadá', dialCode: '+1' },
    { code: 'CL', name: 'Chile', dialCode: '+56' },
    { code: 'CN', name: 'China', dialCode: '+86' },
    { code: 'CO', name: 'Colombia', dialCode: '+57' },
    { code: 'KR', name: 'Corea del Sur', dialCode: '+82' },
    { code: 'EC', name: 'Ecuador', dialCode: '+593' },
    { code: 'ES', name: 'España', dialCode: '+34' },
    { code: 'US', name: 'Estados Unidos', dialCode: '+1' },
    { code: 'FR', name: 'Francia', dialCode: '+33' },
    { code: 'IT', name: 'Italia', dialCode: '+39' },
    { code: 'JP', name: 'Japón', dialCode: '+81' },
    { code: 'MX', name: 'México', dialCode: '+52' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595' },
    { code: 'PE', name: 'Perú', dialCode: '+51' },
    { code: 'GB', name: 'Reino Unido', dialCode: '+44' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598' },
  ].map(Object.freeze)
);

function getDefaultPhoneCountry(authStore) {
  const locale =
    authStore?.getProfile?.()?.locale ||
    authStore?.getUser?.()?.locale ||
    (typeof navigator !== 'undefined' ? navigator.language : '');
  const region = typeof locale === 'string' ? locale.split(/[-_]/).pop()?.toUpperCase() : '';
  return (
    SELLER_PHONE_COUNTRIES.find((country) => country.code === region) ||
    SELLER_PHONE_COUNTRIES.find((country) => country.code === 'BO')
  );
}

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
    this.accountEmail = this.authStore?.getUser?.()?.email || '';
    const defaultPhoneCountry = getDefaultPhoneCountry(this.authStore);

    this.formData = {
      business_name: '',
      business_description: '',
      country_code: defaultPhoneCountry.dialCode,
      country_region: defaultPhoneCountry.code,
      phone_number: '',
      email_option: 'account',
      contact_email: this.accountEmail,
      custom_contact_email: '',
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
    const errorField =
      field === 'country_region'
        ? 'country_code'
        : field === 'custom_contact_email' && this.formData.email_option === 'custom'
          ? 'contact_email'
          : field;
    if (field === 'country_region') {
      const country = SELLER_PHONE_COUNTRIES.find((item) => item.code === value);
      if (country) this.formData.country_code = country.dialCode;
    }
    if (field === 'email_option') {
      this.formData.contact_email =
        value === 'custom' ? this.formData.custom_contact_email : this.accountEmail;
      this.fieldErrors = { ...this.fieldErrors };
      delete this.fieldErrors.contact_email;
    } else if (field === 'custom_contact_email' && this.formData.email_option === 'custom') {
      this.formData.contact_email = value;
    }
    if (this.fieldErrors[field] || this.fieldErrors[errorField]) {
      const nextErrors = { ...this.fieldErrors };
      delete nextErrors[field];
      delete nextErrors[errorField];
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

    const validation = validateSellerApplicationForm({
      ...this.formData,
      account_email: this.accountEmail,
    });
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
