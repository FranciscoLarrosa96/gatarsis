import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  concat,
  EMPTY,
  exhaustMap,
  finalize,
  of,
  Subscription,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { RaffleCheckoutStore } from '../../../raffle/core/raffle-checkout.store';
import { CartStore } from '../../core/cart.store';
import { PublicOrderStatus, PublicOrderStatusResponse } from '../../core/commerce.models';
import { PublicCommerceApiService } from '../../core/public-commerce-api.service';

type CheckoutTone = 'success' | 'pending' | 'attention';

const TERMINAL: PublicOrderStatus[] = ['PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'];
const POLLING_INTERVAL_MS = 5_000;
const POLLING_TIMEOUT_MS = 120_000;

@Component({
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
        class="relative isolate flex flex-1 items-center overflow-hidden px-4 py-12 sm:px-6"
        aria-live="polite"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-70 blur-3xl"
          [style.background]="
            'radial-gradient(circle at 50% 0%, color-mix(in srgb, ' +
            toneColor() +
            ' 22%, transparent), transparent 70%)'
          "
        ></div>

        <section
          class="checkout-card-enter surface-elevated relative mx-auto w-full max-w-xl overflow-hidden rounded-[1.75rem] border p-6 sm:p-8"
          [style.box-shadow]="
            '0 24px 70px color-mix(in srgb, ' + toneColor() + ' 18%, rgba(31,24,37,0.14))'
          "
        >
          <div
            class="absolute inset-x-0 top-0 h-1.5"
            [style.background]="
              'linear-gradient(90deg, transparent, ' + toneColor() + ', transparent)'
            "
          ></div>
          <app-icon
            name="paw"
            class="pointer-events-none absolute -bottom-8 -right-6 size-40 rotate-12 opacity-[0.06]"
            [style.color]="toneColor()"
          />

          <div class="relative flex items-start gap-4">
            <div
              class="grid size-14 shrink-0 place-items-center rounded-2xl text-white"
              [style.background]="
                'linear-gradient(135deg, ' +
                toneColor() +
                ', color-mix(in srgb, ' +
                toneColor() +
                ' 60%, black))'
              "
              [style.box-shadow]="
                '0 8px 20px color-mix(in srgb, ' +
                toneColor() +
                ' 45%, transparent), 0 0 0 6px color-mix(in srgb, ' +
                toneColor() +
                ' 14%, transparent)'
              "
            >
              <app-icon [name]="toneIcon()" class="size-7" />
            </div>
            <div class="min-w-0 pt-0.5">
              <p
                class="text-[11px] font-extrabold uppercase tracking-[0.16em]"
                [style.color]="toneColor()"
              >
                Estado del checkout
              </p>
              <h1 class="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-[1.75rem]">
                {{ title() }}
              </h1>
            </div>
          </div>

          <p class="relative mt-4 text-base leading-7 text-[var(--color-text-muted)]">
            {{ description() }}
          </p>

          @if (orderId()) {
            <div
              class="relative mt-6 flex items-center justify-between gap-3 rounded-2xl border px-5 py-4"
              [style.border-color]="
                'color-mix(in srgb, ' + toneColor() + ' 30%, var(--color-border))'
              "
              [style.background]="'color-mix(in srgb, ' + toneColor() + ' 7%, var(--color-card))'"
            >
              <div class="min-w-0">
                <p
                  class="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]"
                >
                  Pedido
                </p>
                <p class="mt-1 truncate font-mono text-lg font-bold">
                  #{{ orderId()!.slice(0, 8) }}
                </p>
                @if (status() === 'PAID') {
                  <p class="mt-1 text-sm font-bold text-[#18874c]">
                    Pago verificado · retiro a coordinar
                  </p>
                }
              </div>
              <button
                type="button"
                class="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-accent)] active:scale-95"
                [attr.aria-label]="
                  copied() ? 'Número de pedido copiado' : 'Copiar número de pedido'
                "
                (click)="copyOrderId()"
              >
                <app-icon
                  [name]="copied() ? 'check' : 'copy'"
                  class="size-4 text-[var(--color-text-muted)]"
                />
              </button>
            </div>
          }

          @if (error()) {
            <div
              class="relative mt-4 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,#bd2944_30%,var(--color-border))] bg-[var(--color-danger-bg)] p-4"
              role="alert"
            >
              <app-icon name="info" class="mt-0.5 size-4 shrink-0 text-[#bd2944]" />
              <p class="font-bold text-[#bd2944]">{{ error() }}</p>
            </div>
          }

          <div class="relative mt-7 flex flex-col gap-3">
            @if (isPending() && !pollingTimedOut()) {
              <div
                class="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4"
              >
                <svg
                  class="size-7 shrink-0 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    pathLength="100"
                    stroke-dasharray="62 100"
                    [attr.stroke]="toneColor()"
                  />
                </svg>
                <p class="text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                  Confirmando con Mercado Pago. Si ya completaste el pago, no vuelvas a pagarlo.
                </p>
              </div>
            }
            @if (isPending() && pollingTimedOut()) {
              <div
                class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <p class="text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                  La confirmación está demorando más de lo habitual. Podés consultar nuevamente el
                  estado.
                </p>
                <button
                  class="button-primary mt-4 min-h-11 rounded-xl px-5 font-extrabold"
                  type="button"
                  [disabled]="loading()"
                  (click)="consult()"
                >
                  Consultar estado
                </button>
              </div>
            }

            <div class="grid gap-3" [class.sm:grid-cols-2]="!isPending()">
              @if (isPending()) {
                <a
                  class="button-primary inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-extrabold"
                  routerLink="/tienda"
                  >Volver a la tienda</a
                >
              } @else {
                <a
                  class="button-primary inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-extrabold"
                  routerLink="/tienda"
                  >Seguir comprando</a
                >
                <a
                  class="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-5 font-extrabold transition hover:border-[var(--color-accent)]"
                  routerLink="/carrito"
                  >Ver carrito</a
                >
              }
            </div>
          </div>
        </section>
      </main>
      <app-footer />
    </div>
    <app-bottom-navigation />
  `,
  styles: `
    .checkout-card-enter {
      animation: checkout-card-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes checkout-card-in {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .checkout-card-enter {
        animation: none;
      }
    }
  `,
})
export class CheckoutStatusPageComponent implements OnInit {
  readonly status = signal<PublicOrderStatus | null>(null);
  readonly orderId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pollingTimedOut = signal(false);
  readonly copied = signal(false);
  private pollingSubscription: Subscription | null = null;
  private copyResetTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: PublicCommerceApiService,
    private readonly cart: CartStore,
    private readonly clipboard: ClipboardService,
    private readonly destroyRef: DestroyRef,
    private readonly router: Router,
    private readonly raffleCheckout: RaffleCheckoutStore,
  ) {}

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const externalReference = query.get('external_reference');
    const raffleContext = this.raffleCheckout.context();
    if (
      raffleContext &&
      (!externalReference ||
        externalReference === raffleContext.orderId ||
        externalReference === raffleContext.rafflePurchaseId)
    ) {
      void this.router.navigate([`/rifa/checkout/${routeKind(this.route)}`], {
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
      return;
    }
    const context = this.cart.checkoutContext();
    const orderId = isUuid(externalReference ?? '')
      ? externalReference
      : (context?.orderId ?? null);
    this.orderId.set(orderId);
    if (!orderId) {
      this.error.set('No encontramos un pedido válido para consultar.');
      return;
    }
    this.startPolling(orderId);
  }

  consult(): void {
    const orderId = this.orderId();
    if (!orderId || this.loading()) return;

    this.checkStatus(orderId, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.handleStatus(response),
      });
  }

  title(): string {
    if (this.loading() && !this.status()) return 'Confirmando tu pago...';
    switch (this.status()) {
      case 'PAID':
        return 'Pago confirmado';
      case 'PAYMENT_PENDING':
      case 'AWAITING_PAYMENT':
        return 'Estamos confirmando tu pago';
      case 'EXPIRED':
        return 'La reserva venció';
      case 'CANCELLED':
        return 'Pedido cancelado';
      case 'REFUNDED':
        return 'Pedido reembolsado';
      default:
        return routeKind(this.route) === 'failure'
          ? 'No pudimos completar el flujo de pago'
          : 'Confirmando tu pago...';
    }
  }

  description(): string {
    switch (this.status()) {
      case 'PAID':
        return 'Gracias por ser parte del cambio. Vamos a comunicarnos con vos para coordinar el retiro de tu pedido.';
      case 'PAYMENT_PENDING':
      case 'AWAITING_PAYMENT':
        return 'Esto puede demorar unos instantes. No necesitás volver a realizar el pago.';
      case 'EXPIRED':
        return 'El carrito queda disponible para intentar una compra nueva con stock actualizado.';
      case 'CANCELLED':
        return 'El pedido ya no está activo.';
      case 'REFUNDED':
        return 'El backend marcó este pedido como reembolsado.';
      default:
        return routeKind(this.route) === 'failure'
          ? 'Vamos a verificar el estado real de tu pedido.'
          : 'No usamos los parámetros de Mercado Pago para confirmar el cobro.';
    }
  }

  isPending(): boolean {
    return this.status() === 'AWAITING_PAYMENT' || this.status() === 'PAYMENT_PENDING';
  }

  tone(): CheckoutTone {
    if (this.status() === 'PAID') return 'success';
    if (
      this.status() === 'EXPIRED' ||
      this.status() === 'CANCELLED' ||
      this.status() === 'REFUNDED'
    )
      return 'attention';
    if (this.isPending()) return 'pending';
    return routeKind(this.route) === 'failure' ? 'attention' : 'pending';
  }

  toneColor(): string {
    switch (this.tone()) {
      case 'success':
        return '#19ae5c';
      case 'attention':
        return '#bd2944';
      default:
        return 'var(--color-accent)';
    }
  }

  toneIcon(): IconName {
    switch (this.tone()) {
      case 'success':
        return 'check';
      case 'attention':
        return 'info';
      default:
        return 'clock';
    }
  }

  async copyOrderId(): Promise<void> {
    const orderId = this.orderId();
    if (!orderId) return;

    window.clearTimeout(this.copyResetTimer);
    try {
      await this.clipboard.copy(orderId);
      this.copied.set(true);
      this.copyResetTimer = window.setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }

  private startPolling(orderId: string): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingTimedOut.set(false);

    this.pollingSubscription = concat(of(0), timer(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS))
      .pipe(
        takeUntil(timer(POLLING_TIMEOUT_MS)),
        exhaustMap(() => this.checkStatus(orderId, true)),
        takeWhile((response) => !TERMINAL.includes(response.status), true),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.isPending() && !TERMINAL.includes(this.status()!)) {
            this.pollingTimedOut.set(true);
          }
          this.pollingSubscription = null;
        }),
      )
      .subscribe({ next: (response) => this.handleStatus(response) });
  }

  private checkStatus(orderId: string, willRetryAutomatically: boolean) {
    this.loading.set(true);
    this.error.set('');
    return this.api.orderStatus(orderId).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => {
        this.error.set(
          willRetryAutomatically
            ? 'No pudimos consultar el estado del pedido. Vamos a intentar nuevamente.'
            : 'No pudimos consultar el estado del pedido. Podés intentarlo nuevamente.',
        );
        return EMPTY;
      }),
    );
  }

  private handleStatus(response: PublicOrderStatusResponse): void {
    this.status.set(response.status);
    this.orderId.set(response.orderId);

    if (this.isPending()) {
      this.cart.saveCheckoutContext({
        orderId: response.orderId,
        status: response.status,
        reservationExpiresAt: response.reservationExpiresAt,
      });
      return;
    }

    if (response.status === 'PAID') {
      this.cart.clear();
      this.cart.clearCheckoutContext();
      return;
    }

    this.cart.clearCheckoutContext();
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
