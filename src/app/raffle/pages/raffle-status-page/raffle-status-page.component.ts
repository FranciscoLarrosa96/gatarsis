import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EMPTY,
  Subscription,
  catchError,
  concat,
  exhaustMap,
  finalize,
  of,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';

import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { PublicRaffleApiService } from '../../core/public-raffle-api.service';
import { RaffleCheckoutStore } from '../../core/raffle-checkout.store';
import { RafflePurchaseStatus, RafflePurchaseStatusResponse } from '../../core/raffle.models';

const PENDING_STATUSES: RafflePurchaseStatus[] = ['RESERVED', 'PAYMENT_PENDING'];
const POLLING_INTERVAL_MS = 2_500;
const POLLING_TIMEOUT_MS = 120_000;

@Component({
  selector: 'app-raffle-status-page',
  standalone: true,
  imports: [
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    IconComponent,
  ],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-header />
      <main
        id="contenido"
        class="relative isolate flex flex-1 items-center overflow-hidden px-5 py-12 pb-28 sm:px-6 lg:pb-12"
        aria-live="polite"
      >
        <div class="status-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"></div>
        <section
          class="surface-elevated status-card mx-auto w-full max-w-xl overflow-hidden rounded-[1.8rem] border p-6 sm:p-8"
        >
          <div
            class="status-line absolute inset-x-0 top-0 h-1.5"
            [class.status-line--success]="status() === 'PAID'"
            [class.status-line--attention]="
              status() === 'EXPIRED' || status() === 'REFUNDED' || status() === 'REQUIRES_REVIEW'
            "
          ></div>
          <app-icon
            name="paw"
            class="pointer-events-none absolute -bottom-9 -right-7 size-40 rotate-12 opacity-[0.06] text-[var(--color-accent)]"
          />

          <div class="relative flex items-start gap-4">
            <span
              class="status-icon grid size-14 shrink-0 place-items-center rounded-2xl text-white"
              [class.status-icon--success]="status() === 'PAID'"
              [class.status-icon--attention]="
                status() === 'EXPIRED' || status() === 'REFUNDED' || status() === 'REQUIRES_REVIEW'
              "
            >
              <app-icon [name]="icon()" class="size-7" />
            </span>
            <div class="min-w-0 pt-0.5">
              <p
                class="text-left text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-accent)]"
                [class.status-label--success]="status() === 'PAID'"
                [class.status-label--attention]="
                  status() === 'EXPIRED' ||
                  status() === 'REFUNDED' ||
                  status() === 'REQUIRES_REVIEW'
                "
              >
                Estado de tu rifa
              </p>
              <h1 class="mt-1 text-2xl font-black leading-tight sm:text-[1.75rem]">
                {{ title() }}
              </h1>
            </div>
          </div>

          <p class="relative mt-5 text-left leading-7 text-[var(--color-text-muted)]">
            {{ description() }}
          </p>

          @if (numbers().length) {
            <div
              class="relative mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
            >
              <p
                class="text-left text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]"
              >
                Tus números
              </p>
              <p
                class="mt-2 text-left text-2xl font-black tracking-wide text-[var(--color-accent)]"
              >
                {{ numberLabels() }}
              </p>
            </div>
          }

          @if (error()) {
            <div
              class="relative mt-5 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,#bd2944_30%,var(--color-border))] bg-[var(--color-danger-bg)] p-4"
              role="alert"
            >
              <app-icon name="info" class="mt-0.5 size-4 shrink-0 text-[#bd2944]" />
              <p class="text-left text-sm font-bold">{{ error() }}</p>
            </div>
          }

          @if (isPending() && !pollingTimedOut()) {
            <div
              class="relative mt-5 flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4"
            >
              <span
                class="size-6 shrink-0 animate-spin rounded-full border-2 border-[var(--color-accent)] border-r-transparent"
                aria-hidden="true"
              ></span>
              <p class="text-left text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                Consultamos el estado real con Gatarsis. No necesitás volver a realizar el pago.
              </p>
            </div>
          }

          @if (isPending() && pollingTimedOut()) {
            <div
              class="relative mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <p class="text-left text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                La confirmación está demorando más de lo habitual.
              </p>
              <button
                type="button"
                class="button-primary mt-4 min-h-11 rounded-xl px-5 font-extrabold"
                [disabled]="loading()"
                (click)="consult()"
              >
                Consultar estado
              </button>
            </div>
          }

          <div class="relative mt-7 grid gap-3 sm:grid-cols-2">
            <a
              class="button-primary inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-extrabold"
              [routerLink]="primaryRoute()"
              >{{ primaryLabel() }}</a
            >
            <a
              class="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-5 font-extrabold transition hover:border-[var(--color-accent)]"
              routerLink="/"
              >Volver a Gatarsis</a
            >
          </div>
        </section>
      </main>
      <app-footer />
    </div>
    <app-bottom-navigation />
  `,
  styles: `
    .status-card {
      position: relative;
      animation: status-card-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .status-glow {
      background: radial-gradient(
        circle at 50% 0%,
        color-mix(in srgb, var(--color-accent) 18%, transparent),
        transparent 70%
      );
      filter: blur(2rem);
    }
    .status-line {
      background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
    }
    .status-line--success {
      background: linear-gradient(90deg, transparent, #22b866, transparent);
    }
    .status-line--attention {
      background: linear-gradient(90deg, transparent, #bd2944, transparent);
    }
    .status-label--success {
      color: #18874c;
    }
    .status-label--attention {
      color: #bd2944;
    }
    .status-icon {
      background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
      box-shadow:
        0 8px 20px color-mix(in srgb, var(--color-accent) 35%, transparent),
        0 0 0 6px color-mix(in srgb, var(--color-accent) 12%, transparent);
    }
    .status-icon--success {
      background: linear-gradient(135deg, #22b866, #13894b);
      box-shadow:
        0 8px 20px color-mix(in srgb, #22b866 35%, transparent),
        0 0 0 6px color-mix(in srgb, #22b866 12%, transparent);
    }
    .status-icon--attention {
      background: linear-gradient(135deg, #d45a68, #a92b43);
      box-shadow:
        0 8px 20px color-mix(in srgb, #bd2944 35%, transparent),
        0 0 0 6px color-mix(in srgb, #bd2944 12%, transparent);
    }
    @keyframes status-card-in {
      from {
        opacity: 0;
        transform: translateY(14px) scale(0.985);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .status-card {
        animation: none;
      }
    }
  `,
})
export class RaffleStatusPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicRaffleApiService);
  private readonly checkoutStore = inject(RaffleCheckoutStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<RafflePurchaseStatus | null>(null);
  readonly purchaseId = signal<string | null>(null);
  readonly numbers = signal<number[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pollingTimedOut = signal(false);
  readonly isPending = computed(
    () => this.status() === 'RESERVED' || this.status() === 'PAYMENT_PENDING',
  );
  readonly numberLabels = computed(() =>
    this.numbers()
      .slice()
      .sort((left, right) => left - right)
      .map((number) => number.toString().padStart(2, '0'))
      .join(' · '),
  );

  private pollingSubscription: Subscription | null = null;

  ngOnInit(): void {
    const context = this.checkoutStore.context();
    const query = this.route.snapshot.queryParamMap;
    const explicitPurchaseId =
      query.get('rafflePurchaseId') ?? query.get('raffle_purchase_id') ?? query.get('purchase_id');
    const externalReference = query.get('external_reference');
    const contextMatchesReturn =
      !!context &&
      (!externalReference ||
        externalReference === context.orderId ||
        externalReference === context.rafflePurchaseId);
    const purchaseId = isUuid(explicitPurchaseId ?? '')
      ? explicitPurchaseId
      : contextMatchesReturn
        ? context.rafflePurchaseId
        : isUuid(externalReference ?? '')
          ? externalReference
          : null;

    this.purchaseId.set(purchaseId);
    if (contextMatchesReturn || explicitPurchaseId === context?.rafflePurchaseId) {
      this.numbers.set(context!.numbers);
    }
    if (!purchaseId) {
      this.error.set('No encontramos una compra de rifa válida para consultar.');
      return;
    }
    this.startPolling(purchaseId);
  }

  consult(): void {
    const purchaseId = this.purchaseId();
    if (!purchaseId || this.loading()) return;
    this.checkStatus(purchaseId, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => this.handleStatus(response));
  }

  title(): string {
    if (this.loading() && !this.status()) return 'Confirmando tu pago...';
    switch (this.status()) {
      case 'PAID':
        return '¡Pago confirmado!';
      case 'RESERVED':
      case 'PAYMENT_PENDING':
        return 'Estamos confirmando tu pago...';
      case 'EXPIRED':
        return 'La reserva venció';
      case 'REQUIRES_REVIEW':
        return 'Estamos revisando tu pago';
      case 'REFUNDED':
        return 'Pago reembolsado';
      default:
        return routeKind(this.route) === 'failure'
          ? 'Vamos a verificar tu compra'
          : 'Confirmando tu pago...';
    }
  }

  description(): string {
    switch (this.status()) {
      case 'PAID':
        return 'Gracias por ser parte de esta ayuda. Tus números quedaron confirmados.';
      case 'RESERVED':
      case 'PAYMENT_PENDING':
        return 'Esto puede demorar unos instantes. No necesitás volver a realizar el pago.';
      case 'EXPIRED':
        return 'La reserva venció antes de poder confirmarse el pago. Podés volver a elegir números.';
      case 'REQUIRES_REVIEW':
        return 'Estamos revisando el estado de tu pago. No vuelvas a pagar por ahora.';
      case 'REFUNDED':
        return 'Este pago fue reembolsado. Si necesitás ayuda, contactanos.';
      default:
        return 'El estado informado por Mercado Pago no se usa como confirmación: verificamos siempre con el backend.';
    }
  }

  icon(): IconName {
    if (this.status() === 'PAID') return 'check';
    if (this.status() === 'REQUIRES_REVIEW') return 'shield';
    if (this.status() === 'EXPIRED' || this.status() === 'REFUNDED') return 'info';
    return 'clock';
  }

  primaryRoute(): string {
    return this.status() === 'PAID' ? '/' : '/rifa';
  }

  primaryLabel(): string {
    if (this.status() === 'PAID') return 'Volver al inicio';
    if (this.status() === 'EXPIRED') return 'Volver a elegir números';
    return 'Ver la rifa';
  }

  private startPolling(purchaseId: string): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingTimedOut.set(false);
    this.pollingSubscription = concat(of(0), timer(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS))
      .pipe(
        takeUntil(timer(POLLING_TIMEOUT_MS)),
        exhaustMap(() => this.checkStatus(purchaseId, true)),
        takeWhile((response) => PENDING_STATUSES.includes(response.status), true),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.isPending()) this.pollingTimedOut.set(true);
          this.pollingSubscription = null;
        }),
      )
      .subscribe((response) => this.handleStatus(response));
  }

  private checkStatus(purchaseId: string, willRetry: boolean) {
    this.loading.set(true);
    this.error.set('');
    return this.api.purchaseStatus(purchaseId).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => {
        this.error.set(
          willRetry
            ? 'No pudimos consultar el estado. Vamos a intentar nuevamente.'
            : 'No pudimos consultar el estado. Podés volver a intentarlo.',
        );
        return EMPTY;
      }),
    );
  }

  private handleStatus(response: RafflePurchaseStatusResponse): void {
    this.status.set(response.status);
    this.purchaseId.set(response.rafflePurchaseId);
    this.numbers.set(response.numbers);

    if (!PENDING_STATUSES.includes(response.status)) this.checkoutStore.clear();
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function routeKind(route: ActivatedRoute): 'success' | 'pending' | 'failure' {
  const path = route.snapshot.routeConfig?.path ?? '';
  if (path.includes('pending')) return 'pending';
  if (path.includes('failure')) return 'failure';
  return 'success';
}
