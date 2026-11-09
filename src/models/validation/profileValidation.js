/**
 * Client-side validation rules for updating a user profile and uploading an avatar.
 * Mirrors backend constraints for `PATCH /v1/profiles/me` and `POST /v1/profiles/me/avatar`.
 */

export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 100;
export const BIO_MAX_LENGTH = 500;
export const AVATAR_MAX_LENGTH = 500;
export const LOCALE_MIN_LENGTH = 2;
export const LOCALE_MAX_LENGTH = 20;
export const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024; // 2 MB per SP-10
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const LOCALE_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?$/;

/**
 * Normalizes and validates profile update form fields.
 *
 * @param {Object} [raw={}]
 * @param {string} [raw.full_name]
 * @param {string|null} [raw.bio]
 * @param {string|null} [raw.avatar_path]
 * @param {string} [raw.locale]
 * @returns {{
 *   values: { full_name: string, bio: string|null, avatar_path: string|null, locale?: string },
 *   errors: { full_name?: string, bio?: string, avatar_path?: string, locale?: string },
 *   isValid: boolean
 * }}
 */
export function validateProfileUpdate(raw = {}) {
  const fullName = typeof raw.full_name === 'string' ? raw.full_name.trim() : '';
  const rawBio = typeof raw.bio === 'string' ? raw.bio.trim() : '';
  const rawAvatar = typeof raw.avatar_path === 'string' ? raw.avatar_path.trim() : '';
  const hasLocale = raw.locale !== undefined && raw.locale !== null && String(raw.locale) !== '';
  const rawLocale = hasLocale ? String(raw.locale).trim() : '';

  const errors = {};

  if (!fullName || fullName.length < FULL_NAME_MIN_LENGTH) {
    errors.full_name = 'El nombre completo debe tener al menos 2 caracteres';
  } else if (fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.full_name = 'El nombre completo no puede exceder 100 caracteres';
  }

  if (rawBio.length > BIO_MAX_LENGTH) {
    errors.bio = 'La biografía no puede exceder 500 caracteres';
  }

  if (rawAvatar.length > AVATAR_MAX_LENGTH) {
    errors.avatar_path = `La ruta o URL del avatar no puede superar los ${AVATAR_MAX_LENGTH} caracteres.`;
  }

  if (hasLocale) {
    if (
      rawLocale.length < LOCALE_MIN_LENGTH ||
      rawLocale.length > LOCALE_MAX_LENGTH ||
      !LOCALE_PATTERN.test(rawLocale)
    ) {
      errors.locale = 'Idioma no válido';
    }
  }

  const values = {
    full_name: fullName,
    bio: rawBio === '' ? null : rawBio,
    avatar_path: rawAvatar === '' ? null : rawAvatar,
  };

  if (hasLocale) {
    values.locale = rawLocale;
  }

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

/**
 * Validates an avatar image file before uploading (`POST /v1/profiles/me/avatar`).
 *
 * @param {File|Blob|Object|null|undefined} file
 * @returns {{ isValid: boolean, error: string }}
 */
export function validateAvatarFile(file) {
  if (!file || typeof file !== 'object') {
    return {
      isValid: false,
      error: 'Solo se aceptan imágenes JPEG, PNG y WebP',
    };
  }

  const mimeType = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';
  const fileName = typeof file.name === 'string' ? file.name.trim() : '';
  const hasExtension = fileName.includes('.');
  const extension = hasExtension ? fileName.split('.').pop().toLowerCase() : '';

  const isValidMime = ALLOWED_AVATAR_MIME_TYPES.includes(mimeType);
  const isValidExt = !hasExtension || ALLOWED_AVATAR_EXTENSIONS.includes(extension);

  if (!isValidMime || !isValidExt) {
    return {
      isValid: false,
      error: 'Solo se aceptan imágenes JPEG, PNG y WebP',
    };
  }

  if (typeof file.size === 'number' && file.size > MAX_AVATAR_FILE_SIZE) {
    return {
      isValid: false,
      error: 'La imagen excede el límite de 2 MB',
    };
  }

  return {
    isValid: true,
    error: '',
  };
}
