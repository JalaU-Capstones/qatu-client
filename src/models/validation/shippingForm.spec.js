import {
  apiFieldToFormField,
  COUNTRIES,
  createEmptyShippingForm,
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  SHIPPING_FIELDS,
  SHIPPING_LIMITS,
  toCreateOrderInput,
  validateShippingForm,
} from './shippingForm.js';

const validForm = (overrides = {}) => ({
  fullName: 'Aaron Florez',
  phone: '71234567',
  street: 'Av. Arce #123',
  city: 'La Paz',
  country: 'BO',
  state: 'La Paz',
  paymentMethod: 'simulated',
  ...overrides,
});

describe('shippingForm', () => {
  describe('createEmptyShippingForm', () => {
    it('starts empty, without a country, paying by (simulated) card', () => {
      expect(createEmptyShippingForm()).toEqual({
        fullName: '',
        phone: '',
        street: '',
        city: '',
        country: '',
        state: '',
        postalCode: '',
        paymentMethod: DEFAULT_PAYMENT_METHOD,
      });
      expect(DEFAULT_PAYMENT_METHOD).toBe('simulated');
    });

    it('can be prefilled with the buyer name', () => {
      expect(createEmptyShippingForm({ fullName: 'Aaron Florez' }).fullName).toBe('Aaron Florez');
    });
  });

  describe('validateShippingForm', () => {
    it('accepts a complete form', () => {
      expect(validateShippingForm(validForm())).toEqual({ isValid: true, errors: {} });
    });

    it('treats the state as optional', () => {
      expect(validateShippingForm(validForm({ state: '' })).isValid).toBe(true);
    });

    it('treats postal_code as optional when empty', () => {
      expect(validateShippingForm(validForm({ postal_code: '' })).isValid).toBe(true);
      expect(validateShippingForm(validForm({ postalCode: '' })).isValid).toBe(true);
      expect(validateShippingForm(validForm({ postal_code: null })).isValid).toBe(true);
    });

    it('accepts postal_code with valid pattern', () => {
      expect(validateShippingForm(validForm({ postal_code: '760001' })).isValid).toBe(true);
      expect(validateShippingForm(validForm({ postalCode: 'CP 1425-A' })).isValid).toBe(true);
    });

    it('rejects postal_code with invalid characters or too long', () => {
      const invalidChars = validateShippingForm(validForm({ postal_code: '!!!' }));
      expect(invalidChars.isValid).toBe(false);
      expect(invalidChars.errors.postalCode || invalidChars.errors.postal_code).toBeDefined();

      const tooLong = validateShippingForm(validForm({ postal_code: 'x'.repeat(25) }));
      expect(tooLong.isValid).toBe(false);
      expect(tooLong.errors.postalCode || tooLong.errors.postal_code).toContain('20');
    });

    it('requires name, phone, street and city', () => {
      const { isValid, errors } = validateShippingForm(
        validForm({ fullName: ' a ', phone: '', street: ' ab ', city: ' x ' })
      );

      expect(isValid).toBe(false);
      expect(errors.fullName).toBe('Ingresa tu nombre completo.');
      expect(errors.phone).toContain('teléfono');
      expect(errors.street).toContain(String(SHIPPING_LIMITS.street.min));
      expect(errors.city).toBe('Ingresa tu ciudad.');
    });

    it('accepts common phone formats', () => {
      ['+591 71234567', '(2) 245-6789', '71234567'].forEach((phone) => {
        expect(validateShippingForm(validForm({ phone })).errors.phone).toBeUndefined();
      });
    });

    it('rejects phones with letters or a wrong length', () => {
      ['call me', '123', 'x'.repeat(21)].forEach((phone) => {
        expect(validateShippingForm(validForm({ phone })).errors.phone).toBeDefined();
      });
    });

    it('rejects values over the contract maximum', () => {
      const { errors } = validateShippingForm(
        validForm({
          fullName: 'x'.repeat(SHIPPING_LIMITS.fullName.max + 1),
          street: 'x'.repeat(SHIPPING_LIMITS.street.max + 1),
          city: 'x'.repeat(SHIPPING_LIMITS.city.max + 1),
          state: 'x'.repeat(SHIPPING_LIMITS.state.max + 1),
        })
      );

      expect(Object.keys(errors).sort()).toEqual(['city', 'fullName', 'state', 'street']);
    });

    it('requires a country from the list', () => {
      expect(validateShippingForm(validForm({ country: '' })).errors.country).toBe(
        'Selecciona un país.'
      );
      expect(validateShippingForm(validForm({ country: 'ZZ' })).errors.country).toBe(
        'Selecciona un país.'
      );
      expect(validateShippingForm(validForm({ country: 'bo' })).isValid).toBe(true);
    });

    it('treats a missing form as empty', () => {
      const { isValid, errors } = validateShippingForm();

      expect(isValid).toBe(false);
      expect(Object.keys(errors)).toEqual(['fullName', 'phone', 'street', 'city', 'country']);
    });
  });

  describe('toCreateOrderInput', () => {
    it('maps to the API contract (snake_case, upper-case country, trimmed)', () => {
      expect(toCreateOrderInput(validForm({ fullName: '  Aaron Florez ', country: 'bo' }))).toEqual(
        {
          shippingAddress: {
            full_name: 'Aaron Florez',
            phone: '71234567',
            street: 'Av. Arce #123',
            city: 'La Paz',
            state: 'La Paz',
            country: 'BO',
          },
          paymentMethod: 'simulated',
        }
      );
    });

    it('omits a blank state instead of sending an empty string', () => {
      const { shippingAddress } = toCreateOrderInput(validForm({ state: ' ' }));

      expect('state' in shippingAddress).toBe(false);
    });

    it('includes postal_code when provided and trims it', () => {
      const { shippingAddress } = toCreateOrderInput(validForm({ postal_code: '  760001  ' }));
      expect(shippingAddress.postal_code).toBe('760001');

      const { shippingAddress: addr2 } = toCreateOrderInput(validForm({ postalCode: 'CP1234' }));
      expect(addr2.postal_code).toBe('CP1234');
    });

    it('sends the chosen payment method and falls back to the default', () => {
      expect(
        toCreateOrderInput(validForm({ paymentMethod: 'cash_on_delivery' })).paymentMethod
      ).toBe('cash_on_delivery');
      expect(toCreateOrderInput(validForm({ paymentMethod: '' })).paymentMethod).toBe('simulated');
    });
  });

  describe('apiFieldToFormField', () => {
    it('maps API field names back to form fields', () => {
      expect(apiFieldToFormField('shipping_address.full_name')).toBe('fullName');
      expect(apiFieldToFormField('shipping_address.street')).toBe('street');
      expect(apiFieldToFormField('shipping_address.postal_code')).toBe('postalCode');
      expect(apiFieldToFormField('payment_method')).toBe('paymentMethod');
    });

    it('returns null for unknown fields', () => {
      expect(apiFieldToFormField('items.123')).toBeNull();
      expect(apiFieldToFormField('')).toBeNull();
      expect(apiFieldToFormField(undefined)).toBeNull();
    });
  });

  it('exposes the on-screen focus order, the payment methods and unique ISO country codes', () => {
    expect(SHIPPING_FIELDS).toEqual([
      'fullName',
      'phone',
      'street',
      'city',
      'country',
      'state',
      'postalCode',
    ]);
    expect(PAYMENT_METHODS.map((method) => method.value)).toEqual([
      'simulated',
      'cash_on_delivery',
    ]);
    const codes = COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const validForm = (overrides = {}) => ({
      fullName: 'Aaron Florez',
      phone: '71234567',
      street: 'Av. Arce #123',
      city: 'La Paz',
      country: 'BO',
      state: 'La Paz',
      postalCode: '760001',
      paymentMethod: 'simulated',
      ...overrides,
    });

    describe('shippingForm additional branches (recovered 1)', () => {
      it('keeps a null prefilled name and throws for an explicit null options object', () => {
        expect(createEmptyShippingForm({ fullName: null }).fullName).toBeNull();
        expect(() => createEmptyShippingForm(null)).toThrowError(TypeError);
      });

      it('normalizes non-string fields to empty values', () => {
        const result = validateShippingForm({
          fullName: null,
          phone: 123,
          street: {},
          city: 42,
          country: null,
          state: 123,
          postalCode: 42,
        });

        expect(result.isValid).toBe(false);
        expect(Object.keys(result.errors).sort()).toEqual([
          'city',
          'country',
          'fullName',
          'phone',
          'street',
        ]);
      });

      it('accepts exact lower and upper boundaries for every field', () => {
        expect(
          validateShippingForm(
            validForm({
              fullName: 'ab',
              phone: '123456',
              street: 'abc',
              city: 'ab',
              state: 'a'.repeat(SHIPPING_LIMITS.state.max),
              postalCode: 'a'.repeat(SHIPPING_LIMITS.postalCode.max),
            })
          ).isValid
        ).toBe(true);
        expect(
          validateShippingForm(validForm({ fullName: 'a'.repeat(SHIPPING_LIMITS.fullName.max) }))
            .isValid
        ).toBe(true);
        expect(
          validateShippingForm(validForm({ street: 'a'.repeat(SHIPPING_LIMITS.street.max) }))
            .isValid
        ).toBe(true);
        expect(
          validateShippingForm(validForm({ city: 'a'.repeat(SHIPPING_LIMITS.city.max) })).isValid
        ).toBe(true);
      });

      it('trims and uppercases the country, and rejects full country names', () => {
        expect(validateShippingForm(validForm({ country: ' bo ' })).isValid).toBe(true);
        expect(validateShippingForm(validForm({ country: 'Bolivia' })).errors.country).toBe(
          'Selecciona un país.'
        );
      });

      it('uses camelCase postalCode precedence and sets both error keys for the snake_case alias', () => {
        expect(
          validateShippingForm(validForm({ postalCode: '!!!', postal_code: '760001' })).errors
            .postalCode
        ).toBe('Ingresa un código postal válido.');

        const aliasResult = validateShippingForm(
          validForm({ postalCode: undefined, postal_code: '!!!' })
        );
        expect(aliasResult.errors.postalCode).toBe('Ingresa un código postal válido.');
        expect(aliasResult.errors.postal_code).toBe('Ingresa un código postal válido.');

        const longAlias = validateShippingForm(
          validForm({ postalCode: undefined, postal_code: 'x'.repeat(21) })
        );
        expect(longAlias.errors.postal_code).toContain('20');
      });

      it('rejects invalid postal characters', () => {
        for (const postalCode of ['CP_123', 'CP.1', 'CP-Ñ', 'CP/1']) {
          expect(validateShippingForm(validForm({ postalCode })).errors.postalCode).toBe(
            'Ingresa un código postal válido.'
          );
        }
      });

      it('builds an empty order input from no arguments', () => {
        expect(toCreateOrderInput()).toEqual({
          shippingAddress: {
            full_name: '',
            phone: '',
            street: '',
            city: '',
            country: '',
          },
          paymentMethod: 'simulated',
        });
      });

      it('normalizes non-string inputs and omits blank optional fields in order input', () => {
        const { shippingAddress } = toCreateOrderInput({
          fullName: null,
          phone: 42,
          street: {},
          city: undefined,
          country: ' bo ',
          state: '   ',
          postalCode: '   ',
          paymentMethod: null,
        });

        expect(shippingAddress).toEqual({
          full_name: '',
          phone: '',
          street: '',
          city: '',
          country: 'BO',
        });
      });

      it('maps the remaining API field names and protects against prototype keys', () => {
        expect(apiFieldToFormField('shipping_address.phone')).toBe('phone');
        expect(apiFieldToFormField('shipping_address.city')).toBe('city');
        expect(apiFieldToFormField('shipping_address.state')).toBe('state');
        expect(apiFieldToFormField(null)).toBeNull();
        expect(apiFieldToFormField(0)).toBeNull();
        expect(apiFieldToFormField(false)).toBeNull();
        expect(apiFieldToFormField('__proto__')).toBeNull();
        expect(apiFieldToFormField('toString')).toBeNull();
        expect(apiFieldToFormField(123)).toBeNull();
        expect(apiFieldToFormField('billing_address.street')).toBeNull();
      });

      it('does not strip a prefix without a dot', () => {
        expect(apiFieldToFormField('shipping_addressfull_name')).toBeNull();
        expect(apiFieldToFormField('shipping_address.shipping_address.street')).toBeNull();
      });
    });
  })();
})();
