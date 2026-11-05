import {
  AVATAR_MAX_LENGTH,
  BIO_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  MAX_AVATAR_FILE_SIZE,
  validateAvatarFile,
  validateProfileUpdate,
} from './profileValidation.js';

describe('profileValidation', () => {
  describe('validateProfileUpdate', () => {
    it('should validate and normalize valid profile fields including locale', () => {
      const result = validateProfileUpdate({
        full_name: '  Camila Morales  ',
        bio: '  Coleccionista de artesanía andina.  ',
        avatar_path: '  avatars/camila/avatar.webp  ',
        locale: ' es-PE ',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.values).toEqual({
        full_name: 'Camila Morales',
        bio: 'Coleccionista de artesanía andina.',
        avatar_path: 'avatars/camila/avatar.webp',
        locale: 'es-PE',
      });
    });

    it('should convert empty bio and avatar_path strings to null', () => {
      const result = validateProfileUpdate({
        full_name: 'Camila Morales',
        bio: '   ',
        avatar_path: '',
      });

      expect(result.isValid).toBe(true);
      expect(result.values).toEqual({
        full_name: 'Camila Morales',
        bio: null,
        avatar_path: null,
      });
    });

    it('should fail validation when full_name is empty or shorter than 2 characters', () => {
      const emptyRes = validateProfileUpdate({
        full_name: '   ',
        bio: 'Valid bio',
      });
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.errors.full_name).toBe('El nombre completo debe tener al menos 2 caracteres');

      const tooShort = validateProfileUpdate({ full_name: 'A' });
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.errors.full_name).toBe('El nombre completo debe tener al menos 2 caracteres');
    });

    it('should fail validation when full_name exceeds 100 characters', () => {
      const tooLong = validateProfileUpdate({ full_name: 'A'.repeat(FULL_NAME_MAX_LENGTH + 1) });
      expect(tooLong.isValid).toBe(false);
      expect(tooLong.errors.full_name).toBe('El nombre completo no puede exceder 100 caracteres');
    });

    it('should fail validation when bio exceeds 500 characters', () => {
      const result = validateProfileUpdate({
        full_name: 'Camila Morales',
        bio: 'b'.repeat(BIO_MAX_LENGTH + 1),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.bio).toBe('La biografía no puede exceder 500 caracteres');
    });

    it('should fail validation when avatar_path exceeds 500 characters', () => {
      const result = validateProfileUpdate({
        full_name: 'Camila Morales',
        avatar_path: 'a'.repeat(AVATAR_MAX_LENGTH + 1),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.avatar_path).toBe(
        `La ruta o URL del avatar no puede superar los ${AVATAR_MAX_LENGTH} caracteres.`
      );
    });

    it('should fail validation when locale is invalid', () => {
      const invalidLocale = validateProfileUpdate({
        full_name: 'Camila Morales',
        locale: 'x',
      });

      expect(invalidLocale.isValid).toBe(false);
      expect(invalidLocale.errors.locale).toBe('Idioma no válido');
    });
  });

  describe('validateAvatarFile', () => {
    it('should accept valid JPEG, PNG, and WebP files up to 2 MB', () => {
      const validFile = {
        name: 'avatar.webp',
        type: 'image/webp',
        size: 512 * 1024,
      };
      expect(validateAvatarFile(validFile)).toEqual({
        isValid: true,
        error: '',
      });
    });

    it('should reject files exceeding 2 MB with "La imagen excede el límite de 2 MB"', () => {
      const largeFile = {
        name: 'large.png',
        type: 'image/png',
        size: MAX_AVATAR_FILE_SIZE + 1,
      };
      expect(validateAvatarFile(largeFile)).toEqual({
        isValid: false,
        error: 'La imagen excede el límite de 2 MB',
      });
    });

    it('should reject unsupported MIME types or extensions with "Solo se aceptan imágenes JPEG, PNG y WebP"', () => {
      const gifFile = {
        name: 'anim.gif',
        type: 'image/gif',
        size: 1024,
      };
      expect(validateAvatarFile(gifFile)).toEqual({
        isValid: false,
        error: 'Solo se aceptan imágenes JPEG, PNG y WebP',
      });
    });
  });
});
