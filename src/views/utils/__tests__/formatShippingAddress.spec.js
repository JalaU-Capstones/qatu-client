import { formatShippingAddress } from '../formatShippingAddress.js';

describe('formatShippingAddress', () => {
  it('formats full address with all fields into 5 lines', () => {
    const address = {
      full_name: 'Geeky Gaming',
      street: 'CL 04 #03-11',
      city: 'Buga',
      state: 'Valle de Cauca',
      postal_code: '760001',
      country: 'CO',
      phone: '+3137323311',
    };

    const lines = formatShippingAddress(address);
    expect(lines).toEqual([
      { line: 'Geeky Gaming', className: 'name' },
      { line: 'CL 04 #03-11', className: 'street' },
      { line: 'Buga, Valle de Cauca, 760001', className: 'city-line' },
      { line: 'CO', className: 'country' },
      { line: 'Tel. +3137323311', className: 'phone' },
    ]);
  });

  it('formats address without postal_code without trailing comma on city line', () => {
    const address = {
      full_name: 'Geeky Gaming',
      street: 'CL 04 #03-11',
      city: 'Buga',
      state: 'Valle de Cauca',
      postal_code: null,
      country: 'CO',
      phone: '+3137323311',
    };

    const lines = formatShippingAddress(address);
    expect(lines[2]).toEqual({ line: 'Buga, Valle de Cauca', className: 'city-line' });
  });

  it('does not emit city line when city, state and postal_code are missing', () => {
    const address = {
      full_name: 'Geeky Gaming',
      street: 'CL 04 #03-11',
      country: 'CO',
      phone: '+3137323311',
    };

    const lines = formatShippingAddress(address);
    expect(lines.find((l) => l.className === 'city-line')).toBeUndefined();
    expect(lines.length).toBe(4);
  });

  it('returns empty array for null or non-object address', () => {
    expect(formatShippingAddress(null)).toEqual([]);
    expect(formatShippingAddress(undefined)).toEqual([]);
    expect(formatShippingAddress(123)).toEqual([]);
  });

  it('skips fields that are empty strings or whitespace', () => {
    const address = {
      full_name: 'Geeky Gaming',
      street: '   ',
      city: '',
      state: null,
      postal_code: '   ',
      country: 'CO',
      phone: '',
    };

    const lines = formatShippingAddress(address);
    expect(lines).toEqual([
      { line: 'Geeky Gaming', className: 'name' },
      { line: 'CO', className: 'country' },
    ]);
  });

  it('supports legacy string addresses', () => {
    const lines = formatShippingAddress('Av. Siempre Viva 742, Springfield');
    expect(lines).toEqual([{ line: 'Av. Siempre Viva 742, Springfield', className: 'street' }]);
  });
});
