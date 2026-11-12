import {
  COUNTRIES,
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  SHIPPING_FIELDS,
  SHIPPING_LIMITS,
  apiFieldToFormField,
  createEmptyShippingForm,
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
      expect(apiFieldToFormField('payment_method')).toBe('paymentMethod');
    });

    it('returns null for unknown fields', () => {
      expect(apiFieldToFormField('items.123')).toBeNull();
      expect(apiFieldToFormField('')).toBeNull();
      expect(apiFieldToFormField(undefined)).toBeNull();
    });
  });

  it('exposes the on-screen focus order, the payment methods and unique ISO country codes', () => {
    expect(SHIPPING_FIELDS).toEqual(['fullName', 'phone', 'street', 'city', 'country', 'state']);
    expect(PAYMENT_METHODS.map((method) => method.value)).toEqual([
      'simulated',
      'cash_on_delivery',
    ]);
    const codes = COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });
});
