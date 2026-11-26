import {
  BUSINESS_DESC_MAX,
  BUSINESS_DESC_MIN,
  BUSINESS_NAME_MAX,
  BUSINESS_NAME_MIN,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  REJECTION_REASON_MAX,
  validateRejectionReason,
  validateSellerApplicationForm,
} from './sellerApplicationValidation.js';

const validBusiness = () => ({
  business_name: 'Taller Wari',
  business_description: 'Artesanía andina tejida a mano en Cochabamba.',
  account_email: 'hola@wari.example',
});

const phone = () => ({ country_code: '+591', phone_number: '71234567' });

describe('sellerApplicationValidation', () => {
  it('exports the contract limits', () => {
    expect([
      BUSINESS_NAME_MIN,
      BUSINESS_NAME_MAX,
      BUSINESS_DESC_MIN,
      BUSINESS_DESC_MAX,
      CONTACT_PHONE_MAX,
      CONTACT_EMAIL_MAX,
      REJECTION_REASON_MAX,
    ]).toEqual([2, 120, 20, 2000, 15, 255, 500]);
  });

  describe('validateSellerApplicationForm', () => {
    it('validates and sanitizes a complete application', () => {
      expect(
        validateSellerApplicationForm({
          business_name: '  Taller Wari  ',
          business_description: '  Artesanía andina tejida a mano en Cochabamba.  ',
          country_code: ' +591 ',
          phone_number: ' 71234567 ',
          email_option: 'custom',
          custom_contact_email: '  hola@wari.example  ',
        })
      ).toEqual({
        valid: true,
        errors: {},
        sanitized: {
          business_name: 'Taller Wari',
          business_description: 'Artesanía andina tejida a mano en Cochabamba.',
          country_code: '+591',
          phone_number: '71234567',
          contact_email: 'hola@wari.example',
        },
      });
    });

    it('accepts an application without optional phone data and normalizes blanks to null', () => {
      const result = validateSellerApplicationForm(validBusiness());

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitized.country_code).toBeNull();
      expect(result.sanitized.phone_number).toBeNull();
      expect(result.sanitized.contact_email).toBe('hola@wari.example');
    });

    it('uses custom_contact_email for custom email and falls back to contact_email for account email', () => {
      const custom = validateSellerApplicationForm({
        ...validBusiness(),
        email_option: 'custom',
        custom_contact_email: ' contacto@wari.example ',
      });
      expect(custom.sanitized.contact_email).toBe('contacto@wari.example');

      const account = validateSellerApplicationForm({
        business_name: 'Taller Wari',
        business_description: 'Artesanía andina tejida a mano en Cochabamba.',
        contact_email: 'cuenta@wari.example',
      });
      expect(account.sanitized.contact_email).toBe('cuenta@wari.example');
    });

    it('treats a missing argument and non-string fields as empty values', () => {
      expect(validateSellerApplicationForm()).toEqual({
        valid: false,
        errors: {
          business_name: 'El nombre del negocio es obligatorio.',
          business_description: 'La descripción del negocio es obligatoria.',
          contact_email:
            'Tu cuenta debe tener un correo electrónico válido para usarlo como contacto.',
        },
        sanitized: {
          business_name: '',
          business_description: '',
          country_code: null,
          phone_number: null,
          contact_email: '',
        },
      });

      const result = validateSellerApplicationForm({
        business_name: 123,
        business_description: null,
        country_code: {},
        phone_number: [],
        account_email: 42,
      });
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors)).toEqual([
        'business_name',
        'business_description',
        'contact_email',
      ]);
      expect(result.sanitized.country_code).toBeNull();
      expect(result.sanitized.phone_number).toBeNull();
    });

    it('rejects business names shorter and longer than the allowed range, accepting the bounds', () => {
      expect(
        validateSellerApplicationForm({ ...validBusiness(), business_name: 'a' }).errors
          .business_name
      ).toBe(
        `El nombre del negocio debe tener entre ${BUSINESS_NAME_MIN} y ${BUSINESS_NAME_MAX} caracteres.`
      );
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          business_name: 'a'.repeat(BUSINESS_NAME_MAX + 1),
        }).errors.business_name
      ).toBeDefined();

      expect(validateSellerApplicationForm({ ...validBusiness(), business_name: 'ab' }).valid).toBe(
        true
      );
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          business_name: 'a'.repeat(BUSINESS_NAME_MAX),
        }).valid
      ).toBe(true);
    });

    it('rejects descriptions shorter and longer than the allowed range, accepting the bounds', () => {
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          business_description: 'a'.repeat(BUSINESS_DESC_MIN - 1),
        }).errors.business_description
      ).toBe(
        `La descripción debe tener entre ${BUSINESS_DESC_MIN} y ${BUSINESS_DESC_MAX} caracteres.`
      );
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          business_description: 'a'.repeat(BUSINESS_DESC_MAX + 1),
        }).errors.business_description
      ).toBeDefined();

      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          business_description: 'a'.repeat(BUSINESS_DESC_MIN),
        }).valid
      ).toBe(true);
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          business_description: 'a'.repeat(BUSINESS_DESC_MAX),
        }).valid
      ).toBe(true);
    });

    it('rejects a phone number over the limit or with non-digits and accepts one at the limit', () => {
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          country_code: '+591',
          phone_number: '1'.repeat(CONTACT_PHONE_MAX + 1),
        }).errors.phone_number
      ).toBe(
        `El teléfono debe contener solo números y no superar los ${CONTACT_PHONE_MAX} dígitos.`
      );
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          country_code: '+591',
          phone_number: '712-345',
        }).errors.phone_number
      ).toBeDefined();
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          country_code: '+591',
          phone_number: '1'.repeat(CONTACT_PHONE_MAX),
        }).valid
      ).toBe(true);
    });

    it('requires a valid country code when a phone number is provided', () => {
      expect(
        validateSellerApplicationForm({ ...validBusiness(), phone_number: '71234567' }).errors
          .country_code
      ).toBe('Selecciona un código de país válido.');
      expect(
        validateSellerApplicationForm({
          ...validBusiness(),
          country_code: '591',
          phone_number: '71234567',
        }).errors.country_code
      ).toBeDefined();
      expect(validateSellerApplicationForm({ ...validBusiness(), ...phone() }).valid).toBe(true);
    });

    it('rejects malformed and overlong custom emails and accepts an email exactly at the limit', () => {
      const base = { ...validBusiness(), email_option: 'custom' };
      ['correo', 'a@b', 'a b@example.com', 'a@example', 'a@@example.com'].forEach((email) => {
        expect(
          validateSellerApplicationForm({ ...base, custom_contact_email: email }).errors
            .contact_email
        ).toBe('Ingresa un correo electrónico de contacto válido.');
      });

      const overlong = `${'a'.repeat(CONTACT_EMAIL_MAX - 8)}@mail.com`;
      expect(overlong.length).toBe(CONTACT_EMAIL_MAX + 1);
      expect(
        validateSellerApplicationForm({ ...base, custom_contact_email: overlong }).errors
          .contact_email
      ).toBe('Ingresa un correo electrónico de contacto válido.');

      const atLimit = `${'a'.repeat(CONTACT_EMAIL_MAX - 9)}@mail.com`;
      expect(atLimit.length).toBe(CONTACT_EMAIL_MAX);
      expect(validateSellerApplicationForm({ ...base, custom_contact_email: atLimit }).valid).toBe(
        true
      );
    });

    it('rejects malformed account emails with the account-specific message', () => {
      expect(
        validateSellerApplicationForm({ ...validBusiness(), account_email: 'invalido' }).errors
          .contact_email
      ).toBe('Tu cuenta debe tener un correo electrónico válido para usarlo como contacto.');
    });

    it('reports every invalid field at once', () => {
      const result = validateSellerApplicationForm({
        business_name: ' ',
        business_description: 'corta',
        phone_number: '1'.repeat(CONTACT_PHONE_MAX + 1),
        email_option: 'custom',
        custom_contact_email: 'inválido',
      });

      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).sort()).toEqual([
        'business_description',
        'business_name',
        'contact_email',
        'country_code',
        'phone_number',
      ]);
    });
  });

  describe('validateRejectionReason', () => {
    it('accepts a trimmed reason within the limit', () => {
      expect(validateRejectionReason('  No cumple los requisitos  ')).toEqual({
        valid: true,
        error: '',
        value: 'No cumple los requisitos',
      });
      expect(validateRejectionReason('x'.repeat(REJECTION_REASON_MAX)).valid).toBe(true);
    });

    it('rejects missing, empty and whitespace-only reasons', () => {
      [undefined, null, '', '   ', 123, {}].forEach((reason) => {
        expect(validateRejectionReason(reason)).toEqual({
          valid: false,
          error: 'El motivo de rechazo es obligatorio cuando se rechaza una solicitud.',
          value: '',
        });
      });
    });

    it('rejects a reason over 500 characters while returning the trimmed value', () => {
      expect(validateRejectionReason(` ${'x'.repeat(REJECTION_REASON_MAX + 1)} `)).toEqual({
        valid: false,
        error: `El motivo de rechazo no puede superar los ${REJECTION_REASON_MAX} caracteres.`,
        value: 'x'.repeat(REJECTION_REASON_MAX + 1),
      });
    });
  });
});
