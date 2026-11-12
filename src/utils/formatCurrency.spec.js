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
