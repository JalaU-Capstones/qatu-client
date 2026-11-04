import {
  AVATAR_MAX_LENGTH,
  BIO_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  FULL_NAME_MIN_LENGTH,
  validateProfileUpdate,
} from './profileValidation.js';

describe('profileValidation', () => {
  it('should validate and normalize valid profile fields', () => {
    const result = validateProfileUpdate({
      full_name: '  Camila Morales  ',
      bio: '  Coleccionista de artesanía andina.  ',
      avatar_path: '  avatars/camila/avatar.webp  ',
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({
      full_name: 'Camila Morales',
      bio: 'Coleccionista de artesanía andina.',
      avatar_path: 'avatars/camila/avatar.webp',
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

  it('should fail validation when full_name is empty or whitespace', () => {
    const result = validateProfileUpdate({
      full_name: '   ',
      bio: 'Valid bio',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.full_name).toBe('El nombre completo es obligatorio.');
  });

  it('should fail validation when full_name is shorter than 2 or longer than 100 characters', () => {
    const tooShort = validateProfileUpdate({ full_name: 'A' });
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.errors.full_name).toBe(
      `El nombre completo debe tener entre ${FULL_NAME_MIN_LENGTH} y ${FULL_NAME_MAX_LENGTH} caracteres.`
    );

    const tooLong = validateProfileUpdate({ full_name: 'A'.repeat(FULL_NAME_MAX_LENGTH + 1) });
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.errors.full_name).toBe(
      `El nombre completo debe tener entre ${FULL_NAME_MIN_LENGTH} y ${FULL_NAME_MAX_LENGTH} caracteres.`
    );
  });

  it('should fail validation when bio exceeds 500 characters', () => {
    const result = validateProfileUpdate({
      full_name: 'Camila Morales',
      bio: 'b'.repeat(BIO_MAX_LENGTH + 1),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.bio).toBe(
      `La biografía no puede superar los ${BIO_MAX_LENGTH} caracteres.`
    );
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
});
