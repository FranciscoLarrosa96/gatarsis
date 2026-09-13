const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function formatArsFromCents(value: number): string {
  return moneyFormatter.format(value / 100).replace(/\s/g, '');
}
export function formatAdminDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : '—';
}
export function orderStatusLabel(status: string): string {
  return (
    {
      AWAITING_PAYMENT: 'Esperando pago',
      PAYMENT_PENDING: 'Pago pendiente',
      PAID: 'Pagado',
      EXPIRED: 'Vencido',
      CANCELLED: 'Cancelado',
      REFUNDED: 'Reembolsado',
    }[status] ?? status
  );
}
export function paymentProcessingStatusLabel(status: string): string {
  return (
    {
      RECEIVED: 'Recibido',
      RECORDED: 'Registrado',
      APPLIED: 'Aplicado',
      REQUIRES_REVIEW: 'Requiere revisión',
    }[status] ?? status
  );
}
export function providerStatusLabel(status: string): string {
  return { approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado' }[status] ?? status;
}
export function auditActionLabel(action: string): string {
  return (
    {
      ADMIN_LOGIN: 'Inicio de sesión',
      ADMIN_LOGOUT: 'Cierre de sesión',
      PRODUCT_CREATED: 'Producto creado',
      PRODUCT_UPDATED: 'Producto actualizado',
      PRODUCT_ACTIVATED: 'Producto activado',
      PRODUCT_DEACTIVATED: 'Producto desactivado',
      VARIANT_CREATED: 'Variante creada',
      VARIANT_UPDATED: 'Variante actualizada',
      INVENTORY_RESTOCKED: 'Stock repuesto',
      INVENTORY_ADJUSTED: 'Stock ajustado',
      PAYMENT_REVIEW_RESOLVED: 'Revisión resuelta',
      REFUND_REQUESTED: 'Reembolso solicitado',
      REFUND_SUCCEEDED: 'Reembolso realizado',
      REFUND_FAILED: 'Reembolso fallido',
      REFUND_RECONCILED: 'Reembolso conciliado',
      RAFFLE_CREATED: 'Rifa creada',
      RAFFLE_UPDATED: 'Rifa actualizada',
      RAFFLE_ACTIVATED: 'Rifa activada',
      RAFFLE_PAUSED: 'Rifa pausada',
      RAFFLE_RESUMED: 'Rifa reanudada',
      RAFFLE_CLOSED: 'Rifa cerrada',
      RAFFLE_DRAWN: 'Ganador registrado',
    }[action] ?? action
  );
}

export function raffleStatusLabel(status: string): string {
  return (
    {
      DRAFT: 'Borrador',
      ACTIVE: 'Activa',
      PAUSED: 'Pausada',
      CLOSED: 'Cerrada',
      DRAWN: 'Sorteada',
    }[status] ?? status
  );
}

export function rafflePurchaseStatusLabel(status: string): string {
  return (
    {
      RESERVED: 'Reservada',
      PAYMENT_PENDING: 'Pago pendiente',
      PAID: 'Pagada',
      EXPIRED: 'Vencida',
      REQUIRES_REVIEW: 'Requiere revisión',
      REFUNDED: 'Reembolsada',
    }[status] ?? status
  );
}
