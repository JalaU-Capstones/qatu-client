/**
 * Formats a shipping_address JSON object into a multi-line address string
 * suitable for display.
 *
 * @param {Object|string|null} address - The shipping_address JSON object or legacy string.
 * @returns {Array<{ line: string, className?: string }>} Array of lines.
 */
export function formatShippingAddress(address) {
  if (!address) return [];
  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed ? [{ line: trimmed, className: 'street' }] : [];
  }
  if (typeof address !== 'object') return [];

  const lines = [];
  if (address.full_name && String(address.full_name).trim()) {
    lines.push({ line: String(address.full_name).trim(), className: 'name' });
  }
  if (address.street && String(address.street).trim()) {
    lines.push({ line: String(address.street).trim(), className: 'street' });
  }

  // City + State + Postal code on one line if any is present
  const cityLineParts = [
    address.city && String(address.city).trim(),
    address.state && String(address.state).trim(),
    address.postal_code && String(address.postal_code).trim(),
  ].filter(Boolean);

  if (cityLineParts.length > 0) {
    lines.push({ line: cityLineParts.join(', '), className: 'city-line' });
  }

  if (address.country && String(address.country).trim()) {
    lines.push({ line: String(address.country).trim(), className: 'country' });
  }
  if (address.phone && String(address.phone).trim()) {
    lines.push({ line: `Tel. ${String(address.phone).trim()}`, className: 'phone' });
  }

  return lines;
}
