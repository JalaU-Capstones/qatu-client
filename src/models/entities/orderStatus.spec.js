import {
  getOrderStatusLabel,
  getSellerNextStatuses,
  isTerminalOrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  ORDER_VIEWS,
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('orderStatus additional branches (recovered 1)', () => {
      it('exports frozen status, view and label contracts', () => {
        expect(ORDER_VIEWS).toEqual(['buyer', 'seller', 'admin']);
        expect(Object.isFrozen(ORDER_STATUSES)).toBe(true);
        expect(Object.isFrozen(ORDER_VIEWS)).toBe(true);
        expect(Object.isFrozen(ORDER_STATUS_LABELS)).toBe(true);
        expect(ORDER_STATUS_LABELS).toEqual({
          pending: 'Pendiente',
          confirmed: 'Confirmada',
          shipped: 'Enviada',
          delivered: 'Entregada',
          cancelled: 'Cancelada',
        });
      });

      it('maps labels for prototype-like keys and missing values', () => {
        expect(getOrderStatusLabel('shipped')).toBe('Enviada');
        expect(getOrderStatusLabel(undefined)).toBe('');
        expect(getOrderStatusLabel('unknown')).toBe('unknown');
      });

      it('returns a copy of the seller transitions for every status', () => {
        expect(getSellerNextStatuses('shipped')).toEqual(['delivered']);
        expect(getSellerNextStatuses('delivered')).toEqual([]);
        expect(getSellerNextStatuses('cancelled')).toEqual([]);
        expect(getSellerNextStatuses(undefined)).toEqual([]);

        const copy = getSellerNextStatuses('pending');
        copy.push('delivered');
        expect(getSellerNextStatuses('pending')).toEqual(['confirmed']);
      });

      it('identifies terminal and non-terminal statuses', () => {
        expect(isTerminalOrderStatus('cancelled')).toBe(true);
        expect(isTerminalOrderStatus('delivered')).toBe(true);
        expect(isTerminalOrderStatus('confirmed')).toBe(false);
        expect(isTerminalOrderStatus('shipped')).toBe(false);
        expect(isTerminalOrderStatus(null)).toBe(false);
        expect(isTerminalOrderStatus('Delivered')).toBe(false);
      });
    });
  })();
})();
