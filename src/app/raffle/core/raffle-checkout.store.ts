import { Injectable, signal } from '@angular/core';

const RAFFLE_CHECKOUT_KEY = 'gatarsis.raffle.checkout.v1';

export interface RaffleCheckoutContext {
  rafflePurchaseId: string;
  orderId: string;
  raffleId: string;
  numbers: number[];
  reservationExpiresAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RaffleCheckoutStore {
  readonly activeCheckout = signal<RaffleCheckoutContext | null>(restore());

  save(context: RaffleCheckoutContext): void {
    sessionStorageSafe()?.setItem(RAFFLE_CHECKOUT_KEY, JSON.stringify(context));
    this.activeCheckout.set(context);
  }

  context(): RaffleCheckoutContext | null {
    return this.activeCheckout();
  }

  clear(): void {
    sessionStorageSafe()?.removeItem(RAFFLE_CHECKOUT_KEY);
    this.activeCheckout.set(null);
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

    return {
      rafflePurchaseId: value.rafflePurchaseId!,
      orderId: value.orderId!,
      raffleId: value.raffleId!,
      numbers: value.numbers,
      reservationExpiresAt: value.reservationExpiresAt ?? null,
    };
  } catch {
    sessionStorageSafe()?.removeItem(RAFFLE_CHECKOUT_KEY);
    return null;
  }
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
