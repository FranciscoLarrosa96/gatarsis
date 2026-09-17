import {
  auditActionLabel,
  formatAdminDate,
  formatArsFromCents,
  orderStatusLabel,
  paymentProcessingStatusLabel,
  providerStatusLabel,
} from './admin-formatters';

describe('admin formatters', () => {
  it('localizes Mercado Pago states without losing unknown provider values', () => {
    expect(providerStatusLabel('refunded')).toBe('Reembolsado');
    expect(providerStatusLabel('cancelled')).toBe('Cancelado');
    expect(providerStatusLabel('in_process')).toBe('En proceso');
    expect(providerStatusLabel('future_status')).toBe('future_status');
  });
  it('formats cents as Argentine pesos with two decimal places', () => {
    expect(formatArsFromCents(150)).toBe('$1,50');
    expect(formatArsFromCents(1_500_000)).toBe('$15.000,00');
  });

  it('formats UTC dates for an Argentine user and handles null', () => {
    expect(formatAdminDate(null)).toBe('—');
    expect(formatAdminDate('2026-08-18T22:40:00.000Z')).toMatch(/^18\/08\/2026, 19:40$/);
  });

  it('humanizes admin statuses and audit actions', () => {
    expect(orderStatusLabel('PAYMENT_PENDING')).toBe('Pago pendiente');
    expect(paymentProcessingStatusLabel('REQUIRES_REVIEW')).toBe('Requiere revisión');
    expect(auditActionLabel('REFUND_SUCCEEDED')).toBe('Reembolso realizado');
  });
});
