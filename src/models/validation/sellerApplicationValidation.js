export const BUSINESS_NAME_MIN = 2;
export const BUSINESS_NAME_MAX = 120;
export const BUSINESS_DESC_MIN = 20;
export const BUSINESS_DESC_MAX = 2000;
export const CONTACT_PHONE_MAX = 15;
export const CONTACT_EMAIL_MAX = 255;
export const REJECTION_REASON_MIN = 1;
export const REJECTION_REASON_MAX = 500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the buyer seller-application form fields.
 *
 * @param {Object} data
 * @returns {{
 *   valid: boolean,
 *   errors: Record<string, string>,
 *   sanitized: {
 *     business_name: string,
 *     business_description: string,
 *     country_code: string|null,
 *     phone_number: string|null,
 *     contact_email: string|null,
 *   }
 * }}
 */
export function validateSellerApplicationForm(data = {}) {
  const errors = {};

  const businessName = typeof data.business_name === 'string' ? data.business_name.trim() : '';
  const businessDescription =
    typeof data.business_description === 'string' ? data.business_description.trim() : '';
  const countryCode = typeof data.country_code === 'string' ? data.country_code.trim() : '';
  const phoneNumber = typeof data.phone_number === 'string' ? data.phone_number.trim() : '';
  const emailOption = data.email_option === 'custom' ? 'custom' : 'account';
  const accountEmail =
    typeof data.account_email === 'string'
      ? data.account_email.trim()
      : typeof data.contact_email === 'string'
        ? data.contact_email.trim()
        : '';
  const customEmail =
    typeof data.custom_contact_email === 'string' ? data.custom_contact_email.trim() : '';
  const contactEmail = emailOption === 'custom' ? customEmail : accountEmail;

  if (!businessName) {
    errors.business_name = 'El nombre del negocio es obligatorio.';
  } else if (businessName.length < BUSINESS_NAME_MIN || businessName.length > BUSINESS_NAME_MAX) {
    errors.business_name = `El nombre del negocio debe tener entre ${BUSINESS_NAME_MIN} y ${BUSINESS_NAME_MAX} caracteres.`;
  }

  if (!businessDescription) {
    errors.business_description = 'La descripción del negocio es obligatoria.';
  } else if (
    businessDescription.length < BUSINESS_DESC_MIN ||
    businessDescription.length > BUSINESS_DESC_MAX
  ) {
    errors.business_description = `La descripción debe tener entre ${BUSINESS_DESC_MIN} y ${BUSINESS_DESC_MAX} caracteres.`;
  }

  if (phoneNumber) {
    if (!/^\d+$/.test(phoneNumber) || phoneNumber.length > CONTACT_PHONE_MAX) {
      errors.phone_number = `El teléfono debe contener solo números y no superar los ${CONTACT_PHONE_MAX} dígitos.`;
    }
    if (!/^\+\d{1,4}$/.test(countryCode)) {
      errors.country_code = 'Selecciona un código de país válido.';
    }
  }

  if (
    !contactEmail ||
    contactEmail.length > CONTACT_EMAIL_MAX ||
    !EMAIL_PATTERN.test(contactEmail)
  ) {
    errors.contact_email =
      emailOption === 'custom'
        ? 'Ingresa un correo electrónico de contacto válido.'
        : 'Tu cuenta debe tener un correo electrónico válido para usarlo como contacto.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      business_name: businessName,
      business_description: businessDescription,
      country_code: phoneNumber ? countryCode : null,
      phone_number: phoneNumber || null,
      contact_email: contactEmail,
    },
  };
}

/**
 * Validates the admin rejection reason before calling PATCH /v1/admin/seller-applications/:id.
 *
 * @param {string} reason
 * @returns {{ valid: boolean, error: string, value: string }}
 */
export function validateRejectionReason(reason) {
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (!trimmed) {
    return {
      valid: false,
      error: 'El motivo de rechazo es obligatorio cuando se rechaza una solicitud.',
      value: '',
    };
  }
  if (trimmed.length > REJECTION_REASON_MAX) {
    return {
      valid: false,
      error: `El motivo de rechazo no puede superar los ${REJECTION_REASON_MAX} caracteres.`,
      value: trimmed,
    };
  }
  return {
    valid: true,
    error: '',
    value: trimmed,
  };
}
