import {
  AVATAR_MAX_LENGTH,
  BIO_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  MAX_AVATAR_FILE_SIZE,
  validateAvatarFile,
  validateAvatarPath,
  validateProfileUpdate,
} from './profileValidation.js';

describe('profileValidation', () => {
  describe('validateAvatarPath', () => {
    it('accepts supported storage paths and HTTP URLs, and rejects unsupported formats', () => {
      expect(validateAvatarPath('avatars/user/avatar.webp')).toBeUndefined();
      expect(validateAvatarPath('https://localhost/assets/avatar-preset.svg')).toBeUndefined();
      expect(validateAvatarPath('/assets/avatar-preset.svg')).toBe(
        'Usa una ruta válida (avatars/...) o una URL HTTP/HTTPS.'
      );
      expect(validateAvatarPath('avatars/../private/avatar.webp')).toBe(
        'Usa una ruta válida (avatars/...) o una URL HTTP/HTTPS.'
      );
    });

    it('accepts supported paths at the API limit and rejects longer paths after trimming', () => {
      const pathAtLimit = `avatars/${'a'.repeat(AVATAR_MAX_LENGTH - 13)}.webp`;
      const pathOverLimit = `avatars/${'a'.repeat(AVATAR_MAX_LENGTH - 12)}.webp`;

      expect(pathAtLimit.length).toBe(AVATAR_MAX_LENGTH);
      expect(validateAvatarPath(` ${pathAtLimit} `)).toBeUndefined();
      expect(validateAvatarPath(pathOverLimit)).toBe(
        `La ruta o URL del avatar no puede superar los ${AVATAR_MAX_LENGTH} caracteres.`
      );
    });
  });

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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('profileValidation (recovered 1)', () => {
    describe('validateAvatarFile (recovered 2)', () => {
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

  (() => {
    describe('profileValidation additional branches (recovered 3)', () => {
      describe('validateAvatarPath (recovered 4)', () => {
        it('accepts missing and blank values', () => {
          for (const value of [undefined, null, '', '   ', 42, {}]) {
            expect(validateAvatarPath(value)).toBeUndefined();
          }
        });

        it('accepts http and uppercase scheme/extension variants', () => {
          expect(validateAvatarPath('http://cdn.example.test/a.png')).toBeUndefined();
          expect(validateAvatarPath('HTTP://CDN.EXAMPLE/A.PNG')).toBeUndefined();
          expect(validateAvatarPath('avatars/u/a.PNG')).toBeUndefined();
          expect(validateAvatarPath('https://cdn.example.test/a.png?x=1')).toBeUndefined();
          expect(validateAvatarPath('https://cdn.example.test/a.png#thumb')).toBeUndefined();
        });

        it('rejects traversal, unsupported extensions and malformed URLs', () => {
          for (const value of [
            'https://cdn.example.test/a/../b.png',
            'avatars/u/a.svg',
            'avatars/u/a.gif',
            '/avatars/u/a.png',
            'avatar.png',
            '//cdn.example.test/a.png',
            'ftp://cdn.example.test/a.png',
            'https://cdn.example.test/a.png with spaces',
          ]) {
            expect(validateAvatarPath(value)).toBe(
              'Usa una ruta válida (avatars/...) o una URL HTTP/HTTPS.'
            );
          }
        });

        it('checks the length limit before the pattern', () => {
          const tooLong = `avatars/${'a'.repeat(AVATAR_MAX_LENGTH)}.png`;
          expect(validateAvatarPath(tooLong)).toBe(
            `La ruta o URL del avatar no puede superar los ${AVATAR_MAX_LENGTH} caracteres.`
          );
        });
      });

      describe('validateProfileUpdate (recovered 5)', () => {
        it('uses defaults when called without arguments', () => {
          expect(validateProfileUpdate()).toEqual({
            values: { full_name: '', bio: null, avatar_path: null },
            errors: { full_name: 'El nombre completo debe tener al menos 2 caracteres' },
            isValid: false,
          });
        });

        it('normalizes non-string and null optional fields', () => {
          const result = validateProfileUpdate({
            full_name: 123,
            bio: null,
            avatar_path: 42,
          });
          expect(result.values).toEqual({ full_name: '', bio: null, avatar_path: null });
          expect(result.isValid).toBe(false);
        });

        it('accepts exact lower and upper boundaries', () => {
          expect(
            validateProfileUpdate({
              full_name: 'ab',
              bio: 'b'.repeat(BIO_MAX_LENGTH),
              avatar_path: `avatars/${'a'.repeat(AVATAR_MAX_LENGTH - 13)}.webp`,
            }).isValid
          ).toBe(true);
          expect(
            validateProfileUpdate({ full_name: 'a'.repeat(FULL_NAME_MAX_LENGTH) }).isValid
          ).toBe(true);
        });

        it('omits the locale key for absent, null and empty values', () => {
          for (const locale of [undefined, null, '']) {
            const result = validateProfileUpdate({ full_name: 'Camila', locale });
            expect(Object.hasOwn(result.values, 'locale')).toBe(false);
            expect(result.errors.locale).toBeUndefined();
          }
        });

        it('handles whitespace-only and non-string locales', () => {
          expect(validateProfileUpdate({ full_name: 'Camila', locale: '   ' }).errors.locale).toBe(
            'Idioma no válido'
          );
          expect(validateProfileUpdate({ full_name: 'Camila', locale: 123 }).errors.locale).toBe(
            'Idioma no válido'
          );
          expect(
            validateProfileUpdate({ full_name: 'Camila', locale: 'es_PE' }).errors.locale
          ).toBe('Idioma no válido');
        });

        it('accepts locale variants within the pattern', () => {
          for (const locale of ['es', 'eng', 'es-419', 'ES-pe']) {
            expect(validateProfileUpdate({ full_name: 'Camila', locale }).isValid).toBe(true);
          }
        });

        it('accumulates all field errors while normalizing the valid fields', () => {
          const result = validateProfileUpdate({
            full_name: 'x'.repeat(FULL_NAME_MAX_LENGTH + 1),
            bio: 'b'.repeat(BIO_MAX_LENGTH + 1),
            avatar_path: 'avatar.png',
            locale: 'x',
          });

          expect(result.isValid).toBe(false);
          expect(Object.keys(result.errors).sort()).toEqual([
            'avatar_path',
            'bio',
            'full_name',
            'locale',
          ]);
          expect(result.values.bio).toBe('b'.repeat(BIO_MAX_LENGTH + 1));
        });
      });

      describe('validateAvatarFile (recovered 6)', () => {
        it('rejects non-object inputs', () => {
          for (const file of [null, undefined, 'x', 42, true, () => {}]) {
            expect(validateAvatarFile(file)).toEqual({
              isValid: false,
              error: 'Solo se aceptan imágenes JPEG, PNG y WebP',
            });
          }
        });

        it('accepts all allowed MIME types and extensions, with normalization', () => {
          for (const type of ['image/jpeg', 'image/png', 'image/webp', ' IMAGE/PNG ']) {
            expect(validateAvatarFile({ name: 'a.jpg', type, size: 1 }).isValid).toBe(true);
          }
          for (const name of ['a.jpeg', 'a.png', 'a.webp', 'my.a.webp', '.webp', 'A.PNG']) {
            expect(validateAvatarFile({ name, type: 'image/png', size: 1 }).isValid).toBe(true);
          }
        });

        it('rejects mismatched MIME/extension combinations independently', () => {
          expect(validateAvatarFile({ name: 'x.gif', type: 'image/png' }).isValid).toBe(false);
          expect(validateAvatarFile({ name: 'x.png', type: 'image/gif' }).isValid).toBe(false);
          expect(validateAvatarFile({ name: 'a.', type: 'image/png' }).isValid).toBe(false);
          expect(
            validateAvatarFile({ name: 'a.png', type: 'image/png; charset=binary' }).isValid
          ).toBe(false);
        });

        it('accepts a file with no name and checks the exact size boundary', () => {
          expect(validateAvatarFile({ type: 'image/png' }).isValid).toBe(true);
          expect(validateAvatarFile({ type: 'image/png', size: 2 * 1024 * 1024 }).isValid).toBe(
            true
          );
          expect(validateAvatarFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 }).error).toBe(
            'La imagen excede el límite de 2 MB'
          );
          expect(validateAvatarFile({ type: 'image/png', size: '9999999999' }).isValid).toBe(true);
        });
      });
    });
  })();
})();
