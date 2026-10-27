const CURRENCY_SYMBOLS = {
  USD: 'US$',
  EUR: '€',
  MXN: 'MX$',
  ARS: 'AR$',
  CLP: 'CL$',
  COP: 'CO$',
  PEN: 'S/',
  BOB: 'Bs',
  GTQ: 'Q',
};

/**
 * Returns the display symbol for a currency code.
 * @param {string} [currency='USD']
 * @returns {string}
 */
export function getCurrencySymbol(currency = 'USD') {
  return CURRENCY_SYMBOLS[currency] || currency || '';
}

/**
 * Formats an amount using the same convention as the rest of the storefront,
 * e.g. `formatPrice(40, 'USD')` → `"US$ 40.00"`.
 *
 * @param {number|string} amount
 * @param {string} [currency='USD']
 * @returns {string}
 */
export function formatPrice(amount, currency = 'USD') {
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  const symbol = getCurrencySymbol(currency);
  const formattedAmount = safeAmount.toFixed(2);
  return symbol ? `${symbol} ${formattedAmount}` : formattedAmount;
}
