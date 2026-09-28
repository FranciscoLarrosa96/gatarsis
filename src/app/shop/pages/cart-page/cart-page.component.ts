import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, switchMap, tap } from 'rxjs';
import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RevealOnScrollDirective } from '../../../shared/directives/reveal-on-scroll.directive';
import { CartItem } from '../../core/cart.models';
import { CartStore } from '../../core/cart.store';
import { PublicProduct } from '../../core/commerce.models';
import { formatArsFromCents } from '../../core/money.util';
import { PublicCommerceApiService } from '../../core/public-commerce-api.service';

type CheckoutState =
  'IDLE' | 'RESERVING' | 'RESERVED' | 'CREATING_PREFERENCE' | 'REDIRECTING' | 'ERROR';

interface StockIssue {
  variantId: string;
  requested: number;
  available: number;
}

@Component({
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-header />
      <main
        id="contenido"
        class="cart-page relative isolate flex w-full max-w-none flex-1 flex-col overflow-hidden px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8"
      >
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="cart-decor cart-decor-paw cart-decor-paw--top-right"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="cart-decor cart-decor-paw cart-decor-paw--bottom-left hidden lg:block"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="cart-decor cart-decor-paw cart-decor-paw--middle-right hidden lg:block"
        />
        <img
          src="images/extra/corazoncito-empty.png"
          alt=""
          aria-hidden="true"
          class="cart-decor cart-decor-heart cart-decor-heart--left hidden lg:block"
        />
        <img
          src="images/extra/corazon-lleno.png"
          alt=""
          aria-hidden="true"
          class="cart-decor cart-decor-heart cart-decor-heart--top"
        />
        <span aria-hidden="true" class="cart-decor cart-dots cart-dots--top"></span>
        <span
          aria-hidden="true"
          class="cart-decor cart-dots cart-dots--right hidden lg:block"
        ></span>
        <div class="cart-content relative z-10 mx-auto w-full max-w-7xl">
          <h1 appReveal class="cart-title text-4xl font-black">Tu carrito</h1>
          @if (availabilityRefreshing()) {
            <p class="mt-2 text-sm font-bold text-[var(--color-text-muted)]" aria-live="polite">
              Actualizando disponibilidad...
            </p>
          }
          @if (cart.items().length) {
            <section
              class="cart-layout mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(25rem,.9fr)]"
            >
              <div
                class="cart-items divide-y divide-[var(--color-border)] rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 shadow-[0_14px_34px_rgba(58,45,72,0.1)] dark-neon-card sm:px-6"
              >
                @for (item of cart.items(); track item.variantId) {
                  <article
                    appReveal="up"
                    [appRevealDelay]="$index * 70"
                    class="cart-item grid grid-cols-[5.5rem_1fr] gap-x-5 gap-y-2 py-5 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center"
                    [class.cart-item--unavailable]="item.availableStock <= 0"
                    [class.cart-item--reduced]="
                      item.availableStock > 0 && item.quantity > item.availableStock
                    "
                    [id]="cartItemId(item.variantId)"
                    tabindex="-1"
                  >
                    <div
                      class="size-[5.5rem] overflow-hidden rounded-2xl bg-[var(--color-surface)] sm:size-[6.5rem]"
                    >
                      @if (item.imageUrl) {
                        <img
                          class="h-full w-full object-cover"
                          [src]="item.imageUrl"
                          [alt]="item.productName"
                          loading="lazy"
                        />
                      }
                    </div>
                    <div>
                      <h2 class="text-lg font-black">{{ item.productName }}</h2>
                      <p class="mt-1 text-sm font-bold text-[var(--color-text-muted)]">
                        {{ item.variantName }}
                      </p>
                      @if (item.availableStock <= 0) {
                        <span class="stock-badge stock-badge--empty mt-2">Sin stock</span>
                      } @else if (item.quantity > item.availableStock) {
                        <span class="stock-badge stock-badge--reduced mt-2"
                          >Solo quedan {{ item.availableStock }}</span
                        >
                      }
                      <div class="cart-item-actions mt-2">
                        <button
                          class="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-bold text-[var(--color-accent)] transition hover:bg-[var(--color-danger-bg)] hover:text-[#bd2944]"
                          type="button"
                          [attr.aria-label]="
                            (item.availableStock <= 0 ? 'Quitar ' : 'Eliminar ') +
                            item.productName +
                            ', variante ' +
                            item.variantName
                          "
                          (click)="removeUnavailable(item.variantId)"
                        >
                          <app-icon name="trash" class="size-4" />
                          {{ item.availableStock <= 0 ? 'Quitar del carrito' : 'Eliminar' }}
                        </button>
                        @if (item.availableStock > 0 && item.quantity > item.availableStock) {
                          <button
                            type="button"
                            class="stock-action"
                            [attr.aria-label]="
                              'Ajustar ' +
                              item.productName +
                              ' a ' +
                              item.availableStock +
                              ' unidades'
                            "
                            (click)="adjustToAvailable(item.variantId, item.availableStock)"
                          >
                            <app-icon name="check" class="size-4" /> Ajustar a
                            {{ item.availableStock }}
                          </button>
                        }
                      </div>
                    </div>
                    <div
                      class="col-span-2 mt-1 flex items-center justify-between gap-5 sm:col-span-1 sm:mt-0 sm:justify-end"
                    >
                      <div
                        class="cart-quantity inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1"
                        [class.cart-quantity--disabled]="item.availableStock <= 0"
                      >
                        <button
                          class="grid size-9 place-items-center rounded-lg hover:bg-[var(--color-recovering-bg)]"
                          type="button"
                          aria-label="Disminuir cantidad"
                          [disabled]="item.availableStock <= 0"
                          (click)="setQuantity(item.variantId, item.quantity - 1)"
                        >
                          <app-icon name="minus" class="size-4" />
                        </button>
                        <span class="min-w-8 text-center font-black">{{ item.quantity }}</span>
                        <button
                          class="grid size-9 place-items-center rounded-lg hover:bg-[var(--color-recovering-bg)]"
                          type="button"
                          aria-label="Aumentar cantidad"
                          [disabled]="
                            item.availableStock <= 0 || item.quantity >= item.availableStock
                          "
                          (click)="setQuantity(item.variantId, item.quantity + 1)"
                        >
                          <app-icon name="plus" class="size-4" />
                        </button>
                      </div>
                      <div class="text-right">
                        @if (item.quantity > 1) {
                          <span class="block text-xs text-[var(--color-text-muted)]"
                            >{{ item.quantity }} × {{ money(item.unitPriceInCents) }}</span
                          >
                        }
                        <strong>{{ money(item.unitPriceInCents * item.quantity) }}</strong>
                      </div>
                    </div>
                  </article>
                }
              </div>

              <aside
                appReveal="right"
                [appRevealDelay]="100"
                class="cart-summary h-max rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[0_14px_34px_rgba(58,45,72,0.1)] dark-neon-card lg:sticky lg:top-5"
              >
                <p
                  class="text-sm font-extrabold uppercase tracking-wide text-[var(--color-accent)]"
                >
                  Resumen
                </p>
                <div class="flex justify-between text-lg">
                  <span>Subtotal</span>
                  <strong>{{ money(cart.subtotalInCents()) }}</strong>
                </div>
                <p class="mt-3 text-sm text-[var(--color-text-muted)]">
                  <app-icon name="info" class="mr-1 inline size-4 align-text-bottom" /> El stock se
                  reserva cuando iniciás el pago.
                </p>
                <section class="mt-6 border-t border-[var(--color-border)] pt-5">
                  <p class="text-base font-black">Datos para coordinar el retiro</p>
                  <div class="mt-4 grid gap-3">
                    <label class="grid gap-1 text-sm font-bold"
                      >Nombre y apellido *
                      <input
                        class="rounded-xl border border-[var(--color-border)] px-3 py-2 font-normal"
                        [(ngModel)]="customer.name"
                        name="customerName"
                        autocomplete="name"
                        placeholder="Ingresá tu nombre y apellido"
                      />
                    </label>
                    <label class="grid gap-1 text-sm font-bold"
                      >Email *
                      <input
                        class="rounded-xl border border-[var(--color-border)] px-3 py-2 font-normal"
                        [(ngModel)]="customer.email"
                        name="customerEmail"
                        type="email"
                        autocomplete="email"
                        placeholder="ejemplo@correo.com"
                      />
                    </label>
                    <label class="grid gap-1 text-sm font-bold"
                      >Teléfono / WhatsApp *
                      <input
                        class="rounded-xl border border-[var(--color-border)] px-3 py-2 font-normal"
                        [(ngModel)]="customer.phone"
                        name="customerPhone"
                        type="tel"
                        autocomplete="tel"
                        placeholder="11 1234 5678"
                      />
                    </label>
                    <label class="grid gap-1 text-sm font-bold"
                      >Nota opcional
                      <textarea
                        class="min-h-20 rounded-xl border border-[var(--color-border)] px-3 py-2 font-normal"
                        [(ngModel)]="customer.note"
                        name="fulfillmentNote"
                        placeholder="Dejanos cualquier detalle útil para el retiro..."
                      ></textarea>
                    </label>
                  </div>
                  <p class="mt-3 text-xs text-[var(--color-text-muted)]">
                    Usaremos estos datos únicamente para coordinar tu pedido.
                  </p>
                  @if (customerError()) {
                    <p
                      class="mt-3 rounded-xl bg-[var(--color-danger-bg)] p-3 text-sm font-bold"
                      role="alert"
                    >
                      {{ customerError() }}
                    </p>
                  }
                </section>
                @if (message()) {
                  <p
                    class="mt-4 rounded-xl bg-[var(--color-danger-bg)] p-3 font-bold"
                    role="alert"
                    aria-live="polite"
                  >
                    {{ message() }}
                  </p>
                }
                @if (stockIssue(); as issue) {
                  @if (affectedItem(); as item) {
                    <section class="stock-issue mt-4 rounded-2xl border p-4" aria-live="polite">
                      @if (issue.available === 0) {
                        <p class="font-black">Este producto se agotó mientras estabas comprando.</p>
                      } @else {
                        <p class="font-black">Cambió la disponibilidad de este producto.</p>
                      }
                      <p class="mt-1 text-sm font-extrabold">
                        {{ item.productName }} · {{ item.variantName }}
                      </p>
                      @if (issue.available === 0) {
                        <p class="mt-2 text-sm text-[var(--color-text-muted)]">
                          Revisá tu carrito para continuar.
                        </p>
                      } @else {
                        <p class="mt-2 text-sm text-[var(--color-text-muted)]">
                          Pediste {{ issue.requested }} unidades, pero ahora quedan
                          {{ issue.available }}.
                        </p>
                      }
                    </section>
                  }
                }
                @if (reservationText()) {
                  <p class="mt-4 rounded-xl bg-[#e7f6eb] p-3 font-bold text-[#23623a]">
                    {{ reservationText() }}
                  </p>
                }
                @if (pendingCheckout(); as pending) {
                  <section
                    class="cart-pending mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                    aria-live="polite"
                  >
                    <p class="font-black">Tenés un pago en proceso</p>
                    <p class="mt-2 text-sm text-[var(--color-text-muted)]">
                      Estamos esperando la confirmación de Mercado Pago para el pedido #{{
                        pending.orderId.slice(0, 8)
                      }}.
                    </p>
                    <a
                      class="mt-4 inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-4 text-sm font-extrabold"
                      routerLink="/checkout/pending"
                      >Consultar estado del pago</a
                    >
                  </section>
                } @else {
                  <button
                    class="button-primary mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-extrabold disabled:opacity-50"
                    type="button"
                    [disabled]="
                      (state() !== 'IDLE' && state() !== 'ERROR') || availabilityRefreshing()
                    "
                    (click)="stockIssue() || hasInvalidAvailability() ? reviewCart() : checkout()"
                  >
                    <app-icon name="arrow" class="size-4" /> {{ ctaLabel() }}
                  </button>
                }
              </aside>
            </section>
          } @else {
            <div
              class="cart-empty-state surface-card mx-auto mt-8 max-w-md rounded-3xl border p-7 text-center"
            >
              <span
                class="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-recovering-bg)] text-[var(--color-accent)]"
                ><app-icon name="shop" class="size-7"
              /></span>
              <p class="mt-4 text-lg font-black text-center">Todavía no agregaste productos.</p>
              <a
                class="button-primary mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 font-extrabold"
                routerLink="/tienda"
                ><app-icon name="shop" class="size-5" /> Ver tienda</a
              >
            </div>
          }
        </div>
      </main>
      <app-footer />
    </div>
    <app-bottom-navigation />
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .cart-page {
      background:
        radial-gradient(
          circle at 6% 80%,
          color-mix(in srgb, var(--color-accent-soft) 52%, transparent),
          transparent 19rem
        ),
        radial-gradient(
          circle at 94% 30%,
          color-mix(in srgb, var(--color-accent-soft) 36%, transparent),
          transparent 20rem
        ),
        var(--color-bg);
    }

    .cart-decor {
      position: absolute;
      z-index: -1;
      pointer-events: none;
      user-select: none;
    }

    .cart-decor-paw {
      width: clamp(5.5rem, 8vw, 8rem);
      opacity: 0.22;
    }
    .cart-decor-paw--top-right {
      top: 8rem;
      right: clamp(2rem, 8vw, 10rem);
      transform: rotate(18deg);
    }
    .cart-decor-paw--middle-right {
      top: 43%;
      right: clamp(1.5rem, 4vw, 6rem);
      transform: rotate(-18deg);
    }
    .cart-decor-paw--bottom-left {
      bottom: 7rem;
      left: clamp(2rem, 5vw, 7rem);
      transform: rotate(22deg);
    }
    .cart-decor-heart {
      width: clamp(2.5rem, 4vw, 4rem);
      opacity: 0.34;
    }
    .cart-decor-heart--left {
      top: 17rem;
      left: clamp(2rem, 7vw, 9rem);
      transform: rotate(-18deg);
    }
    .cart-decor-heart--top {
      top: 7rem;
      left: 24%;
      transform: rotate(18deg);
    }
    .cart-dots {
      width: 10rem;
      aspect-ratio: 1;
      opacity: 0.32;
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--color-accent) 44%, transparent) 1.35px,
        transparent 1.65px
      );
      background-size: 0.8rem 0.8rem;
      mask-image: radial-gradient(circle, #000 20%, transparent 70%);
    }
    .cart-dots--top {
      top: 0.5rem;
      left: -2rem;
    }
    .cart-dots--right {
      top: 53%;
      right: -2rem;
    }

    .cart-layout {
      align-items: start;
    }
    .cart-items {
      min-height: 0;
    }
    .cart-item:first-child {
      padding-top: 1.7rem;
    }
    .cart-item:last-child {
      padding-bottom: 1.7rem;
    }
    .cart-item--unavailable,
    .cart-item--reduced {
      background: transparent;
    }
    .cart-item--unavailable {
      box-shadow: none;
    }
    .stock-badge {
      display: inline-flex;
      width: max-content;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid color-mix(in srgb, #b27c21 28%, var(--color-border));
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.02em;
    }
    .stock-badge::before {
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 50%;
      background: currentColor;
      content: '';
      opacity: 0.8;
    }
    .stock-badge--empty {
      background: color-mix(in srgb, #b27c21 10%, var(--color-card));
      color: color-mix(in srgb, #8b641c 82%, var(--color-text));
    }
    .stock-badge--reduced {
      background: color-mix(in srgb, #d99628 17%, var(--color-card));
      color: color-mix(in srgb, #a76500 75%, var(--color-text));
    }
    .cart-quantity--disabled {
      opacity: 0.58;
    }
    .cart-item-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0.65rem;
    }
    .stock-action {
      display: inline-flex;
      min-height: 2.25rem;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      color: var(--color-accent);
      font-size: 0.78rem;
      font-weight: 900;
      transition:
        background-color 180ms ease,
        border-color 180ms ease;
    }
    .stock-action:hover {
      border-color: var(--color-accent);
      background: var(--color-accent-soft);
    }
    .stock-issue {
      border-color: color-mix(in srgb, var(--color-accent) 36%, var(--color-border));
      background: linear-gradient(
        125deg,
        color-mix(in srgb, var(--color-accent-soft) 44%, var(--color-card)),
        var(--color-card)
      );
    }
    .cart-summary {
      border: 0.8rem solid transparent;
      background:
        linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-card) 93%, var(--color-accent-soft)),
            var(--color-card)
          )
          padding-box,
        linear-gradient(135deg, #ead8ff, #cf9cff 48%, #e7c8ff) border-box;
      box-shadow:
        0 0.9rem 2.1rem rgba(58, 45, 72, 0.1),
        inset 0 1px rgba(255, 255, 255, 0.6);
    }
    .cart-summary input,
    .cart-summary textarea {
      background: color-mix(in srgb, var(--color-card) 94%, var(--color-surface));
    }
    .cart-summary input::placeholder,
    .cart-summary textarea::placeholder {
      color: color-mix(in srgb, var(--color-text-muted) 62%, transparent);
    }
    .cart-pending {
      background: linear-gradient(
        125deg,
        var(--color-accent-soft),
        color-mix(in srgb, var(--color-accent-soft) 46%, var(--color-card))
      );
    }

    :host-context(.dark) .cart-page {
      background:
        radial-gradient(circle at 6% 80%, rgba(153, 94, 220, 0.15), transparent 19rem),
        radial-gradient(circle at 94% 30%, rgba(153, 94, 220, 0.12), transparent 20rem),
        var(--color-bg);
    }

    :host-context(.dark) .cart-decor-paw,
    :host-context(.dark) .cart-decor-heart {
      opacity: 0.34;
      filter: drop-shadow(0 0 0.8rem rgba(183, 126, 255, 0.16));
    }
    :host-context(.dark) .cart-dots {
      opacity: 0.44;
    }
    :host-context(.dark) .cart-item--unavailable,
    :host-context(.dark) .cart-item--reduced {
      background: transparent;
    }
    :host-context(.dark) .stock-badge {
      border-color: rgba(224, 183, 103, 0.3);
    }
    :host-context(.dark) .stock-badge--empty {
      color: #edc879;
      background: rgba(187, 126, 37, 0.16);
    }
    :host-context(.dark) .stock-badge--reduced {
      color: #f1c879;
      background: rgba(187, 126, 37, 0.2);
    }
    :host-context(.dark) .stock-issue {
      border-color: rgba(202, 158, 255, 0.42);
      background: linear-gradient(125deg, rgba(92, 64, 127, 0.92), rgba(43, 33, 59, 0.98));
    }

    @media (max-width: 767px) {
      .cart-decor-paw--top-right {
        top: 2.5rem;
        right: -1.2rem;
        width: 4.5rem;
      }
      .cart-decor-heart--top {
        top: 3.5rem;
        left: -0.45rem;
        width: 2.25rem;
      }
      .cart-dots--top {
        top: 1rem;
        right: -2rem;
        left: auto;
        width: 6.5rem;
      }
    }
    :host-context(.dark) .cart-summary {
      border-color: transparent;
      background:
        linear-gradient(145deg, rgba(43, 31, 60, 0.98), rgba(28, 22, 42, 0.98)) padding-box,
        linear-gradient(
            135deg,
            rgba(214, 170, 255, 0.78),
            rgba(121, 73, 184, 0.36) 52%,
            rgba(216, 173, 255, 0.64)
          )
          border-box;
      box-shadow:
        0 0 0.6rem rgba(193, 133, 255, 0.26),
        0 0 1.8rem rgba(157, 94, 220, 0.2),
        0 1.25rem 2.8rem rgba(0, 0, 0, 0.32),
        inset 0 1px rgba(229, 205, 255, 0.16);
    }
    :host-context(.dark) .cart-pending {
      background: linear-gradient(125deg, rgba(86, 60, 119, 0.9), rgba(48, 36, 69, 0.96));
    }

    @media (max-width: 1023px) {
      .cart-layout {
        max-width: 44rem;
        margin-inline: auto;
      }
    }

    @media (min-width: 1024px) {
      :host-context(.dark) .cart-summary {
        margin-top: -1.25rem;
      }
    }

    @media (max-width: 639px) {
      .cart-title {
        font-size: 2.2rem;
      }
      .cart-item {
        column-gap: 1rem;
      }
      .cart-summary {
        padding: 1.25rem;
      }
    }
  `,
})
export class CartPageComponent implements OnInit {
  readonly state = signal<CheckoutState>('IDLE');
  readonly message = signal('');
  readonly reservationText = signal('');
  readonly customerError = signal('');
  readonly stockIssue = signal<StockIssue | null>(null);
  readonly availabilityRefreshing = signal(false);
  readonly affectedItem = computed(() => {
    const issue = this.stockIssue();
    return issue
      ? (this.cart.items().find((item) => item.variantId === issue.variantId) ?? null)
      : null;
  });
  readonly hasInvalidAvailability = computed(() =>
    this.cart.items().some((item) => item.quantity > Math.max(0, item.availableStock)),
  );
  readonly pendingCheckout = computed(() => {
    const checkout = this.cart.activeCheckout();
    return checkout?.status === 'AWAITING_PAYMENT' || checkout?.status === 'PAYMENT_PENDING'
      ? checkout
      : null;
  });
  customer = { name: '', email: '', phone: '', note: '' };
  private attemptKey: string | null = null;

  constructor(
    readonly cart: CartStore,
    private readonly api: PublicCommerceApiService,
  ) {}

  ngOnInit(): void {
    this.refreshAvailability();
  }

  checkout(): void {
    if (
      !this.cart.items().length ||
      this.pendingCheckout() ||
      this.state() === 'RESERVING' ||
      this.state() === 'CREATING_PREFERENCE'
    )
      return;
    if (this.hasInvalidAvailability()) {
      this.state.set('ERROR');
      this.message.set('Revisá las cantidades disponibles antes de volver a intentar.');
      return;
    }
    this.message.set('');
    this.reservationText.set('');
    this.customerError.set('');
    const customer = this.validCustomer();
    if (!customer) return;
    this.attemptKey = crypto.randomUUID();
    this.state.set('RESERVING');
    this.api
      .reserve(
        {
          ...this.cart.reservePayload(),
          customer: { name: customer.name, email: customer.email, phone: customer.phone },
          fulfillment: { method: 'PICKUP', note: customer.note || null },
        },
        this.attemptKey,
      )
      .pipe(
        tap((order) => {
          this.state.set('RESERVED');
          this.cart.saveCheckoutContext({
            orderId: order.orderId,
            status: 'AWAITING_PAYMENT',
            reservationExpiresAt: order.reservationExpiresAt,
          });
          this.reservationText.set(`Tu stock está reservado temporalmente.`);
        }),
        tap(() => this.state.set('CREATING_PREFERENCE')),
        switchMap((order) => this.api.createMercadoPagoPreference(order.orderId)),
        finalize(() => {
          if (this.state() !== 'REDIRECTING' && this.state() !== 'ERROR') this.state.set('IDLE');
        }),
      )
      .subscribe({
        next: (preference) => {
          this.state.set('REDIRECTING');
          this.redirectTo(preference.initPoint);
        },
        error: (error: unknown) => {
          this.state.set('ERROR');
          const issue = parseStockIssue(error);
          const affectedItem = issue
            ? this.cart.items().find((item) => item.variantId === issue.variantId)
            : null;
          if (issue && affectedItem) {
            this.cart.updateAvailability(issue.variantId, issue.available);
            this.stockIssue.set(issue);
            this.message.set('');
            return;
          }
          this.stockIssue.set(null);
          this.message.set(
            'Algunos productos cambiaron de disponibilidad mientras comprabas. Revisá el carrito para continuar.',
          );
        },
      });
  }

  ctaLabel(): string {
    if (
      (this.state() === 'ERROR' && (this.stockIssue() || this.hasInvalidAvailability())) ||
      (this.state() === 'IDLE' && this.hasInvalidAvailability())
    ) {
      return 'Revisar carrito';
    }
    return {
      IDLE: 'Finalizar compra',
      RESERVING: 'Reservando productos...',
      RESERVED: 'Stock reservado',
      CREATING_PREFERENCE: 'Preparando Mercado Pago...',
      REDIRECTING: 'Te estamos llevando a Mercado Pago...',
      ERROR: 'Intentar nuevamente',
    }[this.state()];
  }

  cartItemId(variantId: string): string {
    return `cart-item-${variantId}`;
  }

  reviewCart(): void {
    this.refreshAvailability();
    const variantId = this.stockIssue()?.variantId;
    if (!variantId || typeof document === 'undefined') return;
    window.setTimeout(() => {
      const item = document.getElementById(this.cartItemId(variantId));
      item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item?.focus({ preventScroll: true });
    }, 0);
  }

  adjustToAvailable(variantId: string, available: number): void {
    this.setQuantity(variantId, available);
  }

  setQuantity(variantId: string, quantity: number): void {
    this.cart.setQuantity(variantId, quantity);
    const issue = this.stockIssue();
    const item = this.cart.items().find((current) => current.variantId === variantId);
    if (issue?.variantId === variantId && item && item.quantity <= item.availableStock) {
      this.clearStockIssueIfResolved(variantId);
    } else if (!issue && !this.hasInvalidAvailability()) {
      this.message.set('');
      if (this.state() === 'ERROR') this.state.set('IDLE');
    }
  }

  removeUnavailable(variantId: string): void {
    this.cart.remove(variantId);
    this.clearStockIssueIfResolved(variantId);
  }

  money(value: number): string {
    return formatArsFromCents(value);
  }

  private validCustomer(): { name: string; email: string; phone: string; note: string } | null {
    const customer = {
      name: this.customer.name.trim(),
      email: this.customer.email.trim(),
      phone: this.customer.phone.trim(),
      note: this.customer.note.trim(),
    };
    if (customer.name.length < 2) {
      this.customerError.set('Ingresá tu nombre y apellido.');
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      this.customerError.set('Ingresá un email válido.');
      return null;
    }
    if (!customer.phone) {
      this.customerError.set('Ingresá un teléfono o WhatsApp.');
      return null;
    }
    return customer;
  }

  protected redirectTo(initPoint: string): void {
    window.location.assign(initPoint);
  }

  private refreshAvailability(): void {
    if (!this.cart.items().length || this.availabilityRefreshing()) return;
    this.availabilityRefreshing.set(true);
    this.api
      .products()
      .pipe(finalize(() => this.availabilityRefreshing.set(false)))
      .subscribe({
        next: (products) => {
          for (const item of this.cart.items()) {
            const variant = findVariant(products, item);
            if (variant) this.cart.updateAvailability(item.variantId, variant.availableStock);
          }
          const issue = this.stockIssue();
          if (issue) {
            const item = this.cart.items().find((current) => current.variantId === issue.variantId);
            if (!item || item.quantity <= item.availableStock) {
              this.stockIssue.set(null);
              this.message.set('');
              if (this.state() === 'ERROR') this.state.set('IDLE');
            }
          }
        },
        error: () => undefined,
      });
  }

  private clearStockIssueIfResolved(variantId: string): void {
    if (this.stockIssue()?.variantId !== variantId) return;
    this.stockIssue.set(null);
    this.message.set('');
    this.state.set('IDLE');
  }
}

function findVariant(products: PublicProduct[], item: CartItem) {
  return products
    .find((product) => product.id === item.productId || product.slug === item.productSlug)
    ?.variants.find((variant) => variant.id === item.variantId);
}

function parseStockIssue(error: unknown): StockIssue | null {
  const nestedError = isRecord(error) ? error['error'] : undefined;
  const payload = isRecord(nestedError) ? nestedError : error;
  if (!isRecord(payload) || payload['code'] !== 'OUT_OF_STOCK' || !isRecord(payload['details'])) {
    return null;
  }
  const details = payload['details'];
  const { variantId, requested, available } = details;
  if (
    typeof variantId !== 'string' ||
    typeof requested !== 'number' ||
    typeof available !== 'number' ||
    !Number.isFinite(requested) ||
    !Number.isFinite(available)
  ) {
    return null;
  }
  return {
    variantId,
    requested: Math.max(1, Math.floor(requested)),
    available: Math.max(0, Math.floor(available)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
