export const BUSINESS_NAME_MIN = 2;
export const BUSINESS_NAME_MAX = 120;
export const BUSINESS_DESC_MIN = 20;
export const BUSINESS_DESC_MAX = 2000;
export const CONTACT_PHONE_MAX = 40;
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
 *     contact_phone: string|null,
 *     contact_email: string|null,
 *   }
 * }}
 */
export function validateSellerApplicationForm(data = {}) {
  const errors = {};

  const businessName = typeof data.business_name === 'string' ? data.business_name.trim() : '';
  const businessDescription =
    typeof data.business_description === 'string' ? data.business_description.trim() : '';
  const contactPhone = typeof data.contact_phone === 'string' ? data.contact_phone.trim() : '';
  const contactEmail = typeof data.contact_email === 'string' ? data.contact_email.trim() : '';

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

  if (contactPhone.length > CONTACT_PHONE_MAX) {
    errors.contact_phone = `El teléfono no puede superar los ${CONTACT_PHONE_MAX} caracteres.`;
  }

  if (contactEmail) {
    if (contactEmail.length > CONTACT_EMAIL_MAX || !EMAIL_PATTERN.test(contactEmail)) {
      errors.contact_email = 'Ingresa un correo electrónico de contacto válido.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      business_name: businessName,
      business_description: businessDescription,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
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
