export type PublicRaffleStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAWN';

export type RaffleNumberStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface PublicRaffleStats {
  available: number;
  reserved: number;
  sold: number;
  total: number;
}

export interface PublicRaffle {
  id: string;
  title: string;
  prizeName: string;
  description: string;
  imageUrl: string | null;
  priceInCents: number;
  status: PublicRaffleStatus;
  drawAt: string | null;
  drawnAt?: string | null;
  winningNumber?: number | null;
  stats: PublicRaffleStats;
}

export interface PublicRaffleNumber {
  number: number;
  status: RaffleNumberStatus;
}

export interface PublicRaffleNumbersResponse {
  raffleId: string;
  status: PublicRaffleStatus;
  numbers: PublicRaffleNumber[];
}

export interface RaffleReservationRequest {
  numbers: number[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

export interface RaffleReservationResponse {
  rafflePurchaseId: string;
  orderId: string;
  raffleId: string;
  numbers: number[];
  unitPriceInCents: number;
  totalInCents: number;
  reservationExpiresAt: string;
}

export interface RafflePreferenceResponse {
  orderId: string;
  preferenceId: string;
  initPoint: string;
  expiration?: string | null;
  reservationExpiresAt?: string | null;
}

export type RafflePurchaseStatus =
  'RESERVED' | 'PAYMENT_PENDING' | 'PAID' | 'EXPIRED' | 'REQUIRES_REVIEW' | 'REFUNDED';

export interface RafflePurchaseStatusResponse {
  rafflePurchaseId: string;
  orderId: string;
  status: RafflePurchaseStatus;
  numbers: number[];
  reservationExpiresAt?: string | null;
  paidAt?: string | null;
}

export interface RaffleApiError {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
}

export function raffleApiError(error: unknown): RaffleApiError | null {
  if (!isRecord(error)) return null;
  const nested = error['error'];
  const payload = isRecord(nested) ? nested : error;
  if (typeof payload['code'] !== 'string') return null;

  return {
    code: payload['code'],
    message: typeof payload['message'] === 'string' ? payload['message'] : undefined,
    details: isRecord(payload['details']) ? payload['details'] : undefined,
  };
}

export function unavailableNumbers(error: unknown): number[] {
  const numbers = raffleApiError(error)?.details?.['numbers'];
  if (!Array.isArray(numbers)) return [];
  return numbers.filter(
    (number): number is number =>
      typeof number === 'number' && Number.isInteger(number) && number >= 0 && number <= 99,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
