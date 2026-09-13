import { Injectable, signal } from '@angular/core';

import { RafflePurchaseStatus } from './raffle.models';

const RAFFLE_CHECKOUT_KEY = 'gatarsis.raffle.checkout.v1';
const PENDING_STATUSES: RafflePurchaseStatus[] = ['RESERVED', 'PAYMENT_PENDING'];
const STALE_TERMINAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RaffleCheckoutContext {
  rafflePurchaseId: string;
  orderId: string;
  raffleId: string;
  numbers: number[];
  reservationExpiresAt?: string | null;
  status: RafflePurchaseStatus;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RaffleCheckoutStore {
  readonly activeCheckout = signal<RaffleCheckoutContext | null>(restore());

  save(context: {
    rafflePurchaseId: string;
    orderId: string;
    raffleId: string;
    numbers: number[];
    reservationExpiresAt?: string | null;
  }): void {
    this.persist({ ...context, status: 'RESERVED', updatedAt: new Date().toISOString() });
  }

  updateStatus(rafflePurchaseId: string, status: RafflePurchaseStatus, numbers: number[]): void {
    const current = this.activeCheckout();
    if (!current || current.rafflePurchaseId !== rafflePurchaseId) return;
    this.persist({ ...current, status, numbers, updatedAt: new Date().toISOString() });
  }

  context(): RaffleCheckoutContext | null {
    return this.activeCheckout();
  }

  clear(): void {
    sessionStorageSafe()?.removeItem(RAFFLE_CHECKOUT_KEY);
    this.activeCheckout.set(null);
  }

  private persist(context: RaffleCheckoutContext): void {
    sessionStorageSafe()?.setItem(RAFFLE_CHECKOUT_KEY, JSON.stringify(context));
    this.activeCheckout.set(context);
  }
}

function restore(): RaffleCheckoutContext | null {
  const raw = sessionStorageSafe()?.getItem(RAFFLE_CHECKOUT_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<RaffleCheckoutContext>;
    if (
      !isUuid(value.rafflePurchaseId ?? '') ||
      !isUuid(value.orderId ?? '') ||
      !isUuid(value.raffleId ?? '') ||
      !Array.isArray(value.numbers) ||
      !value.numbers.every(isRaffleNumber)
    ) {
      sessionStorageSafe()?.removeItem(RAFFLE_CHECKOUT_KEY);
      return null;
    }

    const status = isRafflePurchaseStatus(value.status) ? value.status : 'RESERVED';
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString();
    if (!PENDING_STATUSES.includes(status) && isStale(updatedAt)) {
      sessionStorageSafe()?.removeItem(RAFFLE_CHECKOUT_KEY);
      return null;
    }

    return {
      rafflePurchaseId: value.rafflePurchaseId!,
      orderId: value.orderId!,
      raffleId: value.raffleId!,
      numbers: value.numbers,
      reservationExpiresAt: value.reservationExpiresAt ?? null,
      status,
      updatedAt,
    };
  } catch {
    sessionStorageSafe()?.removeItem(RAFFLE_CHECKOUT_KEY);
    return null;
  }
}

function isStale(updatedAt: string): boolean {
  const timestamp = Date.parse(updatedAt);
  return Number.isNaN(timestamp) || Date.now() - timestamp > STALE_TERMINAL_WINDOW_MS;
}

function sessionStorageSafe(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRaffleNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99;
}

function isRafflePurchaseStatus(value: unknown): value is RafflePurchaseStatus {
  return (
    typeof value === 'string' &&
    ['RESERVED', 'PAYMENT_PENDING', 'PAID', 'EXPIRED', 'REQUIRES_REVIEW', 'REFUNDED'].includes(
      value,
    )
  );
}
