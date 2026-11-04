/**
 * Client-side validation rules for updating a user profile.
 * Mirrors backend constraints for `PATCH /v1/profiles/me`.
 */

export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 100;
export const BIO_MAX_LENGTH = 500;
export const AVATAR_MAX_LENGTH = 500;

/**
 * Normalizes and validates profile update form fields.
 *
 * @param {Object} [raw={}]
 * @param {string} [raw.full_name]
 * @param {string|null} [raw.bio]
 * @param {string|null} [raw.avatar_path]
 * @returns {{
 *   values: { full_name: string, bio: string|null, avatar_path: string|null },
 *   errors: { full_name?: string, bio?: string, avatar_path?: string },
 *   isValid: boolean
 * }}
 */
export function validateProfileUpdate(raw = {}) {
  const fullName = typeof raw.full_name === 'string' ? raw.full_name.trim() : '';
  const rawBio = typeof raw.bio === 'string' ? raw.bio.trim() : '';
  const rawAvatar = typeof raw.avatar_path === 'string' ? raw.avatar_path.trim() : '';

  const errors = {};

  if (!fullName) {
    errors.full_name = 'El nombre completo es obligatorio.';
  } else if (fullName.length < FULL_NAME_MIN_LENGTH || fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.full_name = `El nombre completo debe tener entre ${FULL_NAME_MIN_LENGTH} y ${FULL_NAME_MAX_LENGTH} caracteres.`;
  }

  if (rawBio.length > BIO_MAX_LENGTH) {
    errors.bio = `La biografía no puede superar los ${BIO_MAX_LENGTH} caracteres.`;
  }

  if (rawAvatar.length > AVATAR_MAX_LENGTH) {
    errors.avatar_path = `La ruta o URL del avatar no puede superar los ${AVATAR_MAX_LENGTH} caracteres.`;
  }

  return {
    values: {
      full_name: fullName,
      bio: rawBio === '' ? null : rawBio,
      avatar_path: rawAvatar === '' ? null : rawAvatar,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
