/**
 * Order status contract mapping and utilities.
 * Defines valid statuses according to OpenAPI contract:
 * pending, confirmed, shipped, delivered, cancelled.
 */
export const ORDER_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]);

export const ORDER_STATUS_LABELS = Object.freeze({
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  shipped: 'Enviada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
});

/**
 * Maps raw API order status to human-readable label.
 * @param {string} status
 * @returns {string}
 */
export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status || '';
}
