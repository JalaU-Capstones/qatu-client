// Limits mirror the POST /v1/orders contract; the API re-validates everything.
export const SHIPPING_LIMITS = Object.freeze({
  fullName: { min: 2, max: 100 },
  phone: { min: 6, max: 20 },
  street: { min: 3, max: 200 },
  city: { min: 2, max: 100 },
  state: { max: 100 },
});

const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;

export const COUNTRIES = Object.freeze([
  { code: 'BO', name: 'Bolivia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'MX', name: 'México' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
]);

export const PAYMENT_METHODS = Object.freeze([
  { value: 'simulated', label: 'Tarjeta', hint: 'Pago simulado' },
  { value: 'cash_on_delivery', label: 'Contra entrega', hint: '' },
]);

export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS[0].value;

// Same order as on screen, so the first invalid field is the one focused.
export const SHIPPING_FIELDS = Object.freeze([
  'fullName',
  'phone',
  'street',
  'city',
  'country',
  'state',
]);

export function createEmptyShippingForm({ fullName = '' } = {}) {
  return {
    fullName,
    phone: '',
    street: '',
    city: '',
    country: '',
    state: '',
    paymentMethod: DEFAULT_PAYMENT_METHOD,
  };
}

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export function validateShippingForm(form = {}) {
  const errors = {};

  const fullName = clean(form.fullName);
  if (fullName.length < SHIPPING_LIMITS.fullName.min) {
    errors.fullName = 'Ingresa tu nombre completo.';
  } else if (fullName.length > SHIPPING_LIMITS.fullName.max) {
    errors.fullName = `El nombre no puede superar ${SHIPPING_LIMITS.fullName.max} caracteres.`;
  }

  if (!PHONE_PATTERN.test(clean(form.phone))) {
    errors.phone = 'Ingresa un teléfono válido (solo números, +, - y paréntesis).';
  }

  const street = clean(form.street);
  if (street.length < SHIPPING_LIMITS.street.min) {
    errors.street = `Ingresa tu dirección (mínimo ${SHIPPING_LIMITS.street.min} caracteres).`;
  } else if (street.length > SHIPPING_LIMITS.street.max) {
    errors.street = `La dirección no puede superar ${SHIPPING_LIMITS.street.max} caracteres.`;
  }

  const city = clean(form.city);
  if (city.length < SHIPPING_LIMITS.city.min) {
    errors.city = 'Ingresa tu ciudad.';
  } else if (city.length > SHIPPING_LIMITS.city.max) {
    errors.city = `La ciudad no puede superar ${SHIPPING_LIMITS.city.max} caracteres.`;
  }

  if (!COUNTRIES.some((country) => country.code === clean(form.country).toUpperCase())) {
    errors.country = 'Selecciona un país.';
  }

  if (clean(form.state).length > SHIPPING_LIMITS.state.max) {
    errors.state = `No puede superar ${SHIPPING_LIMITS.state.max} caracteres.`;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

// Optional fields left blank are omitted instead of sent as empty strings.
export function toCreateOrderInput(form = {}) {
  const shippingAddress = {
    full_name: clean(form.fullName),
    phone: clean(form.phone),
    street: clean(form.street),
    city: clean(form.city),
    country: clean(form.country).toUpperCase(),
  };
  if (clean(form.state)) shippingAddress.state = clean(form.state);

  return { shippingAddress, paymentMethod: form.paymentMethod || DEFAULT_PAYMENT_METHOD };
}

// Maps an API field like `shipping_address.full_name` to the form field name.
export function apiFieldToFormField(field) {
  const name = String(field || '').replace(/^shipping_address\./, '');
  const map = {
    full_name: 'fullName',
    phone: 'phone',
    street: 'street',
    city: 'city',
    state: 'state',
    country: 'country',
    payment_method: 'paymentMethod',
  };
  return Object.hasOwn(map, name) ? map[name] : null;
}
