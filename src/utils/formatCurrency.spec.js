import { formatPrice, getCurrencySymbol } from './formatCurrency.js';

describe('formatCurrency', () => {
  it('formats USD amounts with the storefront convention', () => {
    expect(formatPrice(40)).toBe('US$ 40.00');
    expect(formatPrice(6.5)).toBe('US$ 6.50');
  });

  it('uses the currency symbol when known', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(formatPrice(10, 'EUR')).toBe('€ 10.00');
  });

  it('falls back to the currency code for unknown currencies', () => {
    expect(getCurrencySymbol('BRL')).toBe('BRL');
    expect(formatPrice(10, 'BRL')).toBe('BRL 10.00');
  });

  it('handles invalid amounts as zero', () => {
    expect(formatPrice('not-a-number')).toBe('US$ 0.00');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('formatCurrency additional branches (recovered 1)', () => {
      it('returns an empty symbol for falsy currency values', () => {
        for (const currency of ['', null, 0, false]) {
          expect(getCurrencySymbol(currency)).toBe('');
          expect(formatPrice(10, currency)).toBe('10.00');
        }
        expect(getCurrencySymbol(undefined)).toBe('US$');
        expect(formatPrice(10, undefined)).toBe('US$ 10.00');
      });

      it('exposes every known currency symbol', () => {
        expect(getCurrencySymbol('MXN')).toBe('MX$');
        expect(getCurrencySymbol('ARS')).toBe('AR$');
        expect(getCurrencySymbol('CLP')).toBe('CL$');
        expect(getCurrencySymbol('COP')).toBe('CO$');
        expect(getCurrencySymbol('PEN')).toBe('S/');
        expect(getCurrencySymbol('BOB')).toBe('Bs');
        expect(getCurrencySymbol('GTQ')).toBe('Q');
      });

      it('keeps unknown codes verbatim and is case/whitespace sensitive', () => {
        expect(getCurrencySymbol('usd')).toBe('usd');
        expect(getCurrencySymbol(' USD ')).toBe(' USD ');
        expect(formatPrice(1, 'XYZ')).toBe('XYZ 1.00');
      });

      it('coerces valid numeric strings and maps non-finite amounts to zero', () => {
        expect(formatPrice('40')).toBe('US$ 40.00');
        expect(formatPrice('6.5')).toBe('US$ 6.50');
        expect(formatPrice('')).toBe('US$ 0.00');
        expect(formatPrice('   ')).toBe('US$ 0.00');
        expect(formatPrice(null)).toBe('US$ 0.00');
        expect(formatPrice(undefined)).toBe('US$ 0.00');
        expect(formatPrice(Infinity)).toBe('US$ 0.00');
        expect(formatPrice(-Infinity)).toBe('US$ 0.00');
        expect(formatPrice(NaN)).toBe('US$ 0.00');
        expect(formatPrice(false)).toBe('US$ 0.00');
        expect(formatPrice(true)).toBe('US$ 1.00');
      });

      it('handles negative amounts and rounding', () => {
        expect(formatPrice(-5)).toBe('US$ -5.00');
        expect(formatPrice(2.345)).toBe('US$ 2.35');
        expect(formatPrice(-0)).toBe('US$ 0.00');
      });
    });
  })();
})();
