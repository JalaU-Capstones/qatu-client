import {
  getOrderStatusLabel,
  getSellerNextStatuses,
  isTerminalOrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
} from './orderStatus.js';

describe('orderStatus', () => {
  it('contains exactly the 5 contract statuses without refunded', () => {
    expect(ORDER_STATUSES).toEqual(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
    expect(ORDER_STATUSES).not.toContain('refunded');
  });

  it('maps valid statuses to human-readable Spanish labels', () => {
    expect(ORDER_STATUS_LABELS.pending).toBe('Pendiente');
    expect(getOrderStatusLabel('pending')).toBe('Pendiente');
    expect(getOrderStatusLabel('confirmed')).toBe('Confirmada');
    expect(getOrderStatusLabel('shipped')).toBe('Enviada');
    expect(getOrderStatusLabel('delivered')).toBe('Entregada');
    expect(getOrderStatusLabel('cancelled')).toBe('Cancelada');
  });

  it('falls back gracefully to raw status or empty string for unknown statuses', () => {
    expect(getOrderStatusLabel('unknown')).toBe('unknown');
    expect(getOrderStatusLabel('')).toBe('');
    expect(getOrderStatusLabel(null)).toBe('');
  });

  it('exposes seller transitions and terminal flags (ADR-017)', () => {
    expect(getSellerNextStatuses('pending')).toEqual(['confirmed']);
    expect(getSellerNextStatuses('confirmed')).toEqual(['shipped', 'cancelled']);
    expect(getSellerNextStatuses('delivered')).toEqual([]);
    expect(isTerminalOrderStatus('delivered')).toBe(true);
    expect(isTerminalOrderStatus('pending')).toBe(false);
  });
});
