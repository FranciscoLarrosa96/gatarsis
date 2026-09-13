import { HttpErrorResponse } from '@angular/common/http';

export type AdminDomainErrorCode =
  | 'PRODUCT_SLUG_CONFLICT'
  | 'SKU_ALREADY_EXISTS'
  | 'STOCK_ADJUSTMENT_CONFLICT'
  | 'PAYMENT_REVIEW_NOT_ALLOWED'
  | 'PAYMENT_NOT_REFUNDABLE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_NOT_FOUND'
  | 'INVALID_DATE_RANGE'
  | 'ORDER_NOT_PAID'
  | 'INVALID_FULFILLMENT_TRANSITION'
  | 'FULFILLMENT_NOT_ALLOWED'
  | 'FULFILLMENT_NOT_FOUND'
  | 'RAFFLE_NOT_FOUND'
  | 'RAFFLE_PURCHASE_NOT_FOUND'
  | 'RAFFLE_INVALID_IMAGE_URL'
  | 'RAFFLE_EDIT_NOT_ALLOWED'
  | 'RAFFLE_ACTIVE_ALREADY_EXISTS'
  | 'RAFFLE_PUBLISH_NOT_ALLOWED'
  | 'RAFFLE_PAUSE_NOT_ALLOWED'
  | 'RAFFLE_RESUME_NOT_ALLOWED'
  | 'RAFFLE_CLOSE_NOT_ALLOWED'
  | 'RAFFLE_DRAW_NOT_ALLOWED'
  | 'RAFFLE_ALREADY_DRAWN'
  | 'RAFFLE_WINNING_NUMBER_NOT_ELIGIBLE';

interface DomainErrorBody {
  code?: string;
}

const messages: Record<AdminDomainErrorCode, string> = {
  PRODUCT_SLUG_CONFLICT: 'Ya existe un producto con ese slug.',
  SKU_ALREADY_EXISTS: 'Ya existe una variante con ese SKU.',
  STOCK_ADJUSTMENT_CONFLICT: 'El stock en mano no puede quedar por debajo del reservado.',
  PAYMENT_REVIEW_NOT_ALLOWED: 'Este pago no admite esa resolución de review.',
  PAYMENT_NOT_REFUNDABLE: 'Este pago no puede reembolsarse.',
  IDEMPOTENCY_CONFLICT: 'La operación ya fue solicitada con una clave de idempotencia diferente.',
  PAYMENT_NOT_FOUND: 'No encontramos el pago solicitado.',
  INVALID_DATE_RANGE: 'La fecha desde no puede ser posterior a la fecha hasta.',
  ORDER_NOT_PAID: 'El pedido todavía no tiene un pago confirmado.',
  INVALID_FULFILLMENT_TRANSITION: 'Este cambio de estado ya no es válido.',
  FULFILLMENT_NOT_ALLOWED: 'No se puede modificar la entrega de este pedido.',
  FULFILLMENT_NOT_FOUND: 'La entrega no está disponible para este pedido.',
  RAFFLE_NOT_FOUND: 'No encontramos la rifa solicitada.',
  RAFFLE_PURCHASE_NOT_FOUND: 'No encontramos la compra de rifa solicitada.',
  RAFFLE_INVALID_IMAGE_URL: 'La imagen debe usar una URL HTTPS válida.',
  RAFFLE_EDIT_NOT_ALLOWED: 'Sólo se puede editar una rifa en borrador.',
  RAFFLE_ACTIVE_ALREADY_EXISTS: 'Ya existe otra rifa activa. Pausala o cerrala antes de continuar.',
  RAFFLE_PUBLISH_NOT_ALLOWED: 'La rifa no cumple las condiciones para publicarse.',
  RAFFLE_PAUSE_NOT_ALLOWED: 'La rifa no puede pausarse desde su estado actual.',
  RAFFLE_RESUME_NOT_ALLOWED: 'La rifa no puede reanudarse desde su estado actual.',
  RAFFLE_CLOSE_NOT_ALLOWED: 'La rifa no puede cerrarse desde su estado actual.',
  RAFFLE_DRAW_NOT_ALLOWED: 'La rifa todavía tiene reservas o pagos sin resolver.',
  RAFFLE_ALREADY_DRAWN: 'La rifa ya fue sorteada y el ganador no puede modificarse.',
  RAFFLE_WINNING_NUMBER_NOT_ELIGIBLE: 'El ganador debe ser un número vendido con pago confirmado.',
};

function isDomainErrorBody(value: unknown): value is DomainErrorBody {
  return typeof value === 'object' && value !== null;
}

export function adminErrorCode(error: unknown): AdminDomainErrorCode | null {
  if (!(error instanceof HttpErrorResponse) || !isDomainErrorBody(error.error)) return null;
  const code = error.error.code;
  return code && code in messages ? (code as AdminDomainErrorCode) : null;
}

export function adminErrorMessage(error: unknown, fallback: string): string {
  const code = adminErrorCode(error);
  return code ? messages[code] : fallback;
}
