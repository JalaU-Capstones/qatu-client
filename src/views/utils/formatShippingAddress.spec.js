import { formatShippingAddress } from './formatShippingAddress.js';

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

(() => {
  describe('formatShippingAddress additional branches', () => {
    const line = (text, className) => ({ line: text, className });

    it('returns [] for remaining falsy and non-object inputs', () => {
      for (const value of [
        '',
        false,
        0,
        NaN,
        true,
        1n,
        Symbol('x'),
        () => {},
        ['Calle 1'],
        new String('Calle 1'),
        {},
        new Date(),
      ]) {
        expect(formatShippingAddress(value)).toEqual([]);
      }
    });

    it('trims legacy strings, drops whitespace-only strings and preserves embedded breaks', () => {
      expect(formatShippingAddress('  \t\n ')).toEqual([]);
      expect(formatShippingAddress('  Av. Siempre Viva 742  ')).toEqual([
        line('Av. Siempre Viva 742', 'street'),
      ]);
      expect(formatShippingAddress('Calle 1\nApto 2')).toEqual([line('Calle 1\nApto 2', 'street')]);
    });

    it('skips whitespace-only full_name and country but keeps a valid street', () => {
      expect(
        formatShippingAddress({
          full_name: '   ',
          country: '\t\n',
          street: 'Calle 1',
        })
      ).toEqual([line('Calle 1', 'street')]);
    });

    it('skips falsy scalar fields instead of coercing them into lines', () => {
      expect(
        formatShippingAddress({
          full_name: 0,
          street: false,
          city: 0,
          state: false,
          postal_code: 0,
          country: 0,
          phone: 0,
        })
      ).toEqual([]);
    });

    it('coerces non-string full_name into a name line', () => {
      expect(formatShippingAddress({ full_name: 123 })).toEqual([line('123', 'name')]);
    });

    it('builds the city line from each individual supported subset', () => {
      expect(formatShippingAddress({ city: 'Buga' })).toEqual([line('Buga', 'city-line')]);
      expect(formatShippingAddress({ state: 'Valle de Cauca' })).toEqual([
        line('Valle de Cauca', 'city-line'),
      ]);
      expect(formatShippingAddress({ postal_code: '760001' })).toEqual([
        line('760001', 'city-line'),
      ]);
      expect(formatShippingAddress({ city: 'Buga', postal_code: '760001' })).toEqual([
        line('Buga, 760001', 'city-line'),
      ]);
      expect(formatShippingAddress({ state: 'Valle de Cauca', postal_code: '760001' })).toEqual([
        line('Valle de Cauca, 760001', 'city-line'),
      ]);
    });

    it('coerces numeric postal codes and preserves newlines inside city fields', () => {
      expect(formatShippingAddress({ postal_code: 760001 })).toEqual([line('760001', 'city-line')]);
      expect(formatShippingAddress({ city: 'Buga\nCentro', state: 'Valle' })).toEqual([
        line('Buga\nCentro, Valle', 'city-line'),
      ]);
    });

    it('trims country and phone values while preserving internal phone formatting', () => {
      expect(formatShippingAddress({ country: ' Colombia ' })).toEqual([
        line('Colombia', 'country'),
      ]);
      expect(formatShippingAddress({ phone: '  +591 71234567  ' })).toEqual([
        line('Tel. +591 71234567', 'phone'),
      ]);
      expect(formatShippingAddress({ phone: '+591 7-123-456' })).toEqual([
        line('Tel. +591 7-123-456', 'phone'),
      ]);
      expect(formatShippingAddress({ phone: 71234567 })).toEqual([line('Tel. 71234567', 'phone')]);
      expect(formatShippingAddress({ phone: 'Tel. 71234567' })).toEqual([
        line('Tel. Tel. 71234567', 'phone'),
      ]);
      expect(formatShippingAddress({ phone: '712\n34567' })).toEqual([
        line('Tel. 712\n34567', 'phone'),
      ]);
    });

    it('does not truncate very long street values', () => {
      const street = 'x'.repeat(500);
      expect(formatShippingAddress({ street })).toEqual([line(street, 'street')]);
    });

    it('formats a US-style address without locale-specific normalization', () => {
      expect(
        formatShippingAddress({
          full_name: 'Jane Doe',
          street: '1 Market St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country: 'US',
          phone: '+1 415 555 0100',
        })
      ).toEqual([
        line('Jane Doe', 'name'),
        line('1 Market St', 'street'),
        line('San Francisco, CA, 94105', 'city-line'),
        line('US', 'country'),
        line('Tel. +1 415 555 0100', 'phone'),
      ]);
    });
  });
})();
