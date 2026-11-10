/**
 * Order status contract mapping and utilities.
 * Defines valid statuses according to OpenAPI / ADR-017:
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

/** Seller transitions */
const SELLER_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['confirmed']),
  confirmed: Object.freeze(['shipped', 'cancelled']),
  shipped: Object.freeze(['delivered']),
  delivered: Object.freeze([]),
  cancelled: Object.freeze([]),
});

/**
 * Maps raw API order status to human-readable label.
 * @param {string} status
 * @returns {string}
 */
export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status || '';
}

/**
 * Next statuses a seller may choose from the current status.
 * @param {string} status
 * @returns {string[]}
 */
export function getSellerNextStatuses(status) {
  return [...(SELLER_TRANSITIONS[status] || [])];
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalOrderStatus(status) {
  return status === 'delivered' || status === 'cancelled';
}
