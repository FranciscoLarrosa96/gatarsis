import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, forkJoin, switchMap } from 'rxjs';

import { formatArs } from '../../../core/utils/format-ars';
import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { PublicRaffleApiService } from '../../core/public-raffle-api.service';
import { RaffleCheckoutContext, RaffleCheckoutStore } from '../../core/raffle-checkout.store';
import {
  PublicRaffle,
  PublicRaffleNumber,
  PublicRaffleStatus,
  RaffleNumberStatus,
  RafflePurchaseStatus,
  RaffleReservationResponse,
  raffleApiError,
  unavailableNumbers,
} from '../../core/raffle.models';

type PurchasePhase = 'IDLE' | 'RESERVING' | 'CREATING_PREFERENCE' | 'REDIRECTING' | 'ERROR';

const MAX_NUMBERS = 10;
const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-raffle-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    IconComponent,
  ],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-header />

      <main id="contenido" class="raffle-page flex-1 pb-28 lg:pb-12">
        @if (loading()) {
          <section class="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:px-8" aria-live="polite">
            <span class="sr-only">Cargando rifa solidaria</span>
            <div class="grid animate-pulse gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <div class="h-4 w-32 rounded-full bg-[var(--color-surface-strong)]"></div>
                <div class="mt-5 h-12 w-4/5 rounded-2xl bg-[var(--color-surface-strong)]"></div>
                <div class="mt-3 h-8 w-3/5 rounded-xl bg-[var(--color-surface)]"></div>
                <div class="mt-7 h-24 rounded-3xl bg-[var(--color-surface)]"></div>
              </div>
              <div class="aspect-[4/3] rounded-[2rem] bg-[var(--color-surface-strong)]"></div>
            </div>
          </section>
        } @else if (noActiveRaffle()) {
          <section
            class="mx-auto grid min-h-[68svh] max-w-xl place-items-center px-5 py-12 text-center"
          >
            <div class="surface-elevated dark-neon-card w-full rounded-[2rem] border p-7 sm:p-10">
              <span
                class="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--color-recovering-bg)] text-[var(--color-accent)]"
              >
                <app-icon name="ticket" class="size-8" />
              </span>
              <p
                class="mt-6 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-accent)]"
              >
                Rifas solidarias
              </p>
              <h1 class="mt-2 text-3xl font-black sm:text-4xl">
                No hay una rifa activa en este momento
              </h1>
              <p class="mx-auto mt-4 max-w-md text-center leading-7 text-[var(--color-text-muted)]">
                Cuando publiquemos una nueva rifa solidaria vas a poder participar desde acá.
              </p>
              <a
                routerLink="/casos"
                class="button-primary mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 font-extrabold"
              >
                Ver historias <app-icon name="arrow" class="size-4" />
              </a>
            </div>
          </section>
        } @else if (loadError()) {
          <section
            class="mx-auto grid min-h-[68svh] max-w-xl place-items-center px-5 py-12 text-center"
          >
            <div class="surface-elevated w-full rounded-[2rem] border p-8">
              <app-icon name="info" class="mx-auto size-10 text-[var(--color-accent)]" />
              <h1 class="mt-5 text-3xl font-black">No pudimos cargar la rifa</h1>
              <p class="mt-3 text-center text-[var(--color-text-muted)]">
                Reintentá en unos segundos.
              </p>
              <button
                type="button"
                class="button-primary mt-6 min-h-12 rounded-xl px-6 font-extrabold"
                (click)="loadRaffle()"
              >
                Volver a intentar
              </button>
            </div>
          </section>
        } @else if (raffle(); as currentRaffle) {
          <section class="raffle-hero relative isolate overflow-hidden">
            <span class="raffle-dots raffle-dots--one" aria-hidden="true"></span>
            <span class="raffle-dots raffle-dots--two" aria-hidden="true"></span>
            <app-icon name="paw" class="raffle-paw raffle-paw--one" />
            <div
              class="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14 lg:px-8 lg:py-16"
            >
              <div class="order-2 lg:order-1">
                <p
                  class="text-left text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--color-accent)]"
                >
                  {{ currentRaffle.status === 'DRAWN' ? 'Rifa finalizada' : currentRaffle.title }}
                </p>
                <h1 class="mt-3 text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl">
                  {{ currentRaffle.prizeName }}
                </h1>
                <p
                  class="mt-5 max-w-2xl text-left text-base leading-7 text-[var(--color-text-muted)] sm:text-lg"
                >
                  {{
                    currentRaffle.description ||
                      'Cada número que elegís nos ayuda a seguir sosteniendo rescates.'
                  }}
                </p>

                @if (currentRaffle.status === 'DRAWN' && currentRaffle.winningNumber != null) {
                  <div
                    class="winner-panel mt-7 inline-flex items-center gap-4 rounded-2xl border px-5 py-4"
                  >
                    <span
                      class="grid size-12 place-items-center rounded-xl bg-[var(--color-accent)] text-white"
                      ><app-icon name="trophy" class="size-6"
                    /></span>
                    <div>
                      <p
                        class="text-left text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]"
                      >
                        Número ganador
                      </p>
                      <p class="text-left text-3xl font-black text-[var(--color-accent)]">
                        {{ numberLabel(currentRaffle.winningNumber) }}
                      </p>
                    </div>
                  </div>
                  <p class="mt-4 text-left font-bold">
                    ¡Gracias a todas las personas que participaron!
                  </p>
                } @else if (currentRaffle.status === 'ACTIVE' || currentRaffle.status === 'PAUSED') {
                  <div class="mt-7 flex flex-wrap items-end gap-x-7 gap-y-3">
                    <div>
                      <p
                        class="text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]"
                      >
                        Valor
                      </p>
                      <p class="text-left text-3xl font-black text-[var(--color-accent)]">
                        {{ money(currentRaffle.priceInCents) }}
                        <span class="text-base font-bold text-[var(--color-text-muted)]"
                          >por número</span
                        >
                      </p>
                    </div>
                    <p class="pb-1 text-left text-sm font-semibold text-[var(--color-text-muted)]">
                      Podés elegir hasta {{ maxNumbers }} números por compra.
                    </p>
                  </div>
                }

                <div class="mt-7 max-w-xl" aria-label="Avance de la rifa">
                  <div class="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
                    <span>{{ currentStats().sold }} de {{ currentStats().total }} vendidos</span>
                    <span class="text-[var(--color-text-muted)]"
                      >{{ currentStats().available }} disponibles</span
                    >
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-strong)]">
                    <div
                      class="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
                      [style.width.%]="soldPercentage()"
                    ></div>
                  </div>
                  <div class="mt-2 flex gap-4 text-xs font-semibold text-[var(--color-text-muted)]">
                    <span>{{ currentStats().reserved }} reservados</span>
                    <span>{{ currentStats().available }} disponibles</span>
                  </div>
                </div>
              </div>

              <figure
                class="raffle-prize order-1 m-0 overflow-hidden rounded-[2rem] border lg:order-2"
              >
                @if (!imageFailed() && currentRaffle.imageUrl) {
                  @if (!imageLoaded()) {
                    <div
                      class="absolute inset-0 animate-pulse bg-[var(--color-surface-strong)]"
                      aria-hidden="true"
                    ></div>
                  }
                  <img
                    [src]="currentRaffle.imageUrl"
                    [alt]="'Premio de la rifa: ' + currentRaffle.prizeName"
                    class="raffle-prize-image h-full w-full object-contain transition-opacity duration-300"
                    [class.opacity-0]="!imageLoaded()"
                    (load)="imageLoaded.set(true)"
                    (error)="imageFailed.set(true)"
                  />
                } @else {
                  <div class="grid h-full min-h-64 place-items-center p-8 text-center">
                    <div>
                      <app-icon name="gift" class="mx-auto size-14 text-[var(--color-accent)]" />
                      <p class="mt-4 text-center font-black">{{ currentRaffle.prizeName }}</p>
                    </div>
                  </div>
                }
              </figure>
            </div>
          </section>

          @if (currentRaffle.status === 'PAUSED' || currentRaffle.status === 'CLOSED') {
            <section class="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
              <div
                class="inactive-raffle-card surface-card relative overflow-hidden rounded-3xl border p-6 text-center sm:p-8"
                [class.inactive-raffle-card--paused]="currentRaffle.status === 'PAUSED'"
                [class.inactive-raffle-card--closed]="currentRaffle.status === 'CLOSED'"
                role="status"
              >
                <app-icon name="paw" class="inactive-raffle-paw inactive-raffle-paw--one" />
                <app-icon name="heart" class="inactive-raffle-paw inactive-raffle-paw--two" />
                <app-icon
                  [name]="inactiveIcon(currentRaffle.status)"
                  class="inactive-raffle-icon mx-auto grid size-14 place-items-center rounded-2xl p-3 text-[var(--color-accent)]"
                />
                <h2 class="mt-4 text-2xl font-black">{{ inactiveTitle(currentRaffle.status) }}</h2>
                <p class="mt-2 text-center leading-7 text-[var(--color-text-muted)]">
                  {{ inactiveDescription(currentRaffle) }}
                </p>
              </div>
            </section>
          }

          @if (currentRaffle.status === 'DRAWN') {
            <section class="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
              <div
                class="draw-result-card surface-card relative overflow-hidden rounded-3xl border px-6 py-6 text-center sm:p-8"
                role="status"
              >
                <p
                  class="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-accent)]"
                >
                  Resultado del sorteo
                </p>
                @if (currentRaffle.drawnAt) {
                  <p class="mt-2 text-sm font-bold text-[var(--color-text-muted)]">
                    Sorteado el {{ formatDateTime(currentRaffle.drawnAt) }}
                  </p>
                }
                <p class="mx-auto mt-3 max-w-md text-center leading-7 text-[var(--color-text-muted)]">
                  El número se sorteó de forma pública y no exponemos datos de quién participó.
                </p>
              </div>
            </section>
          }

          @if (checkoutBanner(); as banner) {
            <section class="mx-auto max-w-3xl px-5 pt-10 sm:px-6 lg:px-8">
              <div
                class="checkout-banner surface-elevated relative overflow-hidden rounded-2xl border p-5 sm:p-6"
                [class.checkout-banner--success]="banner.status === 'PAID'"
                [class.checkout-banner--attention]="
                  banner.status === 'EXPIRED' || banner.status === 'REFUNDED'
                "
                role="status"
              >
                <button
                  type="button"
                  class="checkout-banner-dismiss"
                  aria-label="Cerrar aviso de compra"
                  (click)="dismissCheckoutBanner()"
                >
                  <app-icon name="x" class="size-4" />
                </button>
                <div class="flex items-start gap-3 pr-6">
                  <span
                    class="checkout-banner-icon grid size-11 shrink-0 place-items-center rounded-xl text-white"
                  >
                    <app-icon [name]="checkoutBannerIcon(banner.status)" class="size-5" />
                  </span>
                  <div class="min-w-0 text-left">
                    <h2 class="text-lg font-black">{{ checkoutBannerTitle(banner.status) }}</h2>
                    <p class="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                      {{ checkoutBannerDescription(banner.status) }}
                    </p>
                    @if (banner.status === 'PAID' && banner.numbers.length) {
                      <div class="mt-3 flex flex-wrap gap-2">
                        @for (number of sortedBannerNumbers(); track number) {
                          <span class="number-chip">{{ numberLabel(number) }}</span>
                        }
                      </div>
                    }
                    <a
                      [routerLink]="checkoutBannerRoute(banner.status)"
                      class="button-primary mt-4 inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-extrabold"
                      >{{ checkoutBannerCta(banner.status) }}</a
                    >
                  </div>
                </div>
              </div>
            </section>
          }

          @if (numbersLoaded()) {
            <section class="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
              <div
                class="grid items-start gap-7"
                [class]="currentRaffle.status === 'ACTIVE' ? 'lg:grid-cols-[minmax(0,1fr)_21rem]' : ''"
              >
                <div class="surface-card dark-neon-card rounded-[1.75rem] border p-4 sm:p-6">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p
                        class="text-left text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-accent)]"
                      >
                        Elegí el que te guste
                      </p>
                      <h2 class="mt-1 text-3xl font-black">Tus números</h2>
                    </div>
                    <button
                      type="button"
                      class="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-[var(--color-border)] px-4 text-sm font-bold transition hover:border-[var(--color-accent)]"
                      [disabled]="numbersRefreshing()"
                      (click)="refreshNumbers()"
                    >
                      <app-icon name="refresh" class="size-4" />
                      {{ numbersRefreshing() ? 'Actualizando...' : 'Actualizar' }}
                    </button>
                  </div>

                  <div
                    class="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[var(--color-text-muted)]"
                    aria-label="Referencias de la grilla"
                  >
                    <span class="inline-flex items-center gap-1.5"
                      ><i class="legend-dot legend-dot--available" aria-hidden="true"></i
                      >Disponible</span
                    >
                    <span class="inline-flex items-center gap-1.5"
                      ><i class="legend-dot legend-dot--selected" aria-hidden="true">✓</i
                      >Seleccionado</span
                    >
                    <span class="inline-flex items-center gap-1.5"
                      ><i class="legend-dot legend-dot--reserved" aria-hidden="true">·</i
                      >Reservado</span
                    >
                    <span class="inline-flex items-center gap-1.5"
                      ><i class="legend-dot legend-dot--sold" aria-hidden="true">×</i>Vendido</span
                    >
                  </div>

                  @if (selectionMessage()) {
                    <div
                      class="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-recovering-bg)] px-4 py-3 text-sm font-bold"
                      role="status"
                    >
                      {{ selectionMessage() }}
                    </div>
                  }

                  <div class="number-grid mt-5" aria-label="Números de la rifa">
                    @for (item of gridNumbers(); track item.number) {
                      <button
                        type="button"
                        class="raffle-number"
                        [class.raffle-number--selected]="isSelected(item.number)"
                        [class.raffle-number--reserved]="item.status === 'RESERVED'"
                        [class.raffle-number--sold]="item.status === 'SOLD'"
                        [class.raffle-number--conflict]="conflictNumbers().has(item.number)"
                        [class.raffle-number--winner]="
                          currentRaffle.status === 'DRAWN' &&
                          currentRaffle.winningNumber === item.number
                        "
                        [disabled]="item.status !== 'AVAILABLE' || !canSelectNumbers()"
                        [attr.aria-pressed]="
                          item.status === 'AVAILABLE' ? isSelected(item.number) : null
                        "
                        [attr.aria-label]="numberAriaLabel(item)"
                        [attr.title]="numberTitle(item)"
                        (click)="toggleNumber(item)"
                      >
                        <span>{{ numberLabel(item.number) }}</span>
                        @if (isSelected(item.number)) {
                          <app-icon name="check" class="number-check size-3" />
                        }
                        @if (
                          currentRaffle.status === 'DRAWN' &&
                          currentRaffle.winningNumber === item.number
                        ) {
                          <app-icon name="trophy" class="winner-trophy size-3" aria-hidden="true" />
                          <span class="winner-dot" aria-hidden="true"></span>
                          <span class="sr-only">Número ganador</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                @if (currentRaffle.status === 'ACTIVE') {
                <aside
                  class="selection-card surface-elevated rounded-[1.75rem] border p-5 lg:sticky lg:top-24"
                  aria-labelledby="selection-title"
                >
                  <div class="flex items-center justify-between gap-3">
                    <h2 id="selection-title" class="text-xl font-black">Tu selección</h2>
                    <span
                      class="rounded-full bg-[var(--color-recovering-bg)] px-3 py-1 text-xs font-extrabold text-[var(--color-accent)]"
                      >{{ selectedCount() }}/{{ maxNumbers }}</span
                    >
                  </div>

                  @if (selectedCount()) {
                    <p
                      class="mt-4 text-left text-lg font-black tracking-wide text-[var(--color-accent)]"
                    >
                      {{ selectedLabels() }}
                    </p>
                    <div class="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
                      <div class="flex justify-between gap-3 text-[var(--color-text-muted)]">
                        <span
                          >{{ selectedCount() }}
                          {{ selectedCount() === 1 ? 'número' : 'números' }} ×
                          {{ money(currentRaffle.priceInCents) }}</span
                        >
                      </div>
                      <div class="flex items-end justify-between gap-3">
                        <span class="font-bold">Total</span
                        ><strong class="text-2xl text-[var(--color-accent)]">{{
                          totalPrice()
                        }}</strong>
                      </div>
                    </div>

                    @if (!showForm() && !reservation()) {
                      <button
                        type="button"
                        class="button-primary mt-5 min-h-12 w-full rounded-xl px-5 font-extrabold"
                        [disabled]="currentRaffle.status !== 'ACTIVE'"
                        (click)="continueToForm()"
                      >
                        Continuar
                      </button>
                    }
                  } @else {
                    <p class="mt-4 text-left text-sm leading-6 text-[var(--color-text-muted)]">
                      Elegí uno o más números disponibles para continuar.
                    </p>
                  }

                  @if (showForm() || reservation()) {
                    <form
                      class="mt-6 border-t border-[var(--color-border)] pt-5"
                      [formGroup]="buyerForm"
                      (ngSubmit)="pay()"
                      novalidate
                    >
                      <h3 class="text-lg font-black">Tus datos</h3>
                      <p class="mt-1 text-left text-xs leading-5 text-[var(--color-text-muted)]">
                        Los usamos únicamente para identificar tu compra y poder contactarte si hace
                        falta.
                      </p>

                      <label class="field-label mt-4" for="raffle-buyer-name"
                        >Nombre y apellido *</label
                      >
                      <input
                        #buyerNameInput
                        id="raffle-buyer-name"
                        class="field-input"
                        type="text"
                        formControlName="name"
                        autocomplete="name"
                        [attr.aria-invalid]="hasError('name')"
                        [attr.aria-describedby]="
                          hasError('name') ? 'raffle-buyer-name-error' : null
                        "
                      />
                      @if (hasError('name')) {
                        <p id="raffle-buyer-name-error" class="field-error">
                          Ingresá tu nombre y apellido.
                        </p>
                      }

                      <label class="field-label" for="raffle-buyer-email">Email *</label>
                      <input
                        id="raffle-buyer-email"
                        class="field-input"
                        type="email"
                        formControlName="email"
                        autocomplete="email"
                        inputmode="email"
                        [attr.aria-invalid]="hasError('email')"
                        [attr.aria-describedby]="
                          hasError('email') ? 'raffle-buyer-email-error' : null
                        "
                      />
                      @if (hasError('email')) {
                        <p id="raffle-buyer-email-error" class="field-error">
                          Ingresá un email válido.
                        </p>
                      }

                      <label class="field-label" for="raffle-buyer-phone">WhatsApp *</label>
                      <input
                        id="raffle-buyer-phone"
                        class="field-input"
                        type="tel"
                        formControlName="phone"
                        autocomplete="tel"
                        inputmode="tel"
                        [attr.aria-invalid]="hasError('phone')"
                        [attr.aria-describedby]="
                          hasError('phone') ? 'raffle-buyer-phone-error' : null
                        "
                      />
                      @if (hasError('phone')) {
                        <p id="raffle-buyer-phone-error" class="field-error">
                          Ingresá un teléfono o WhatsApp válido.
                        </p>
                      }

                      @if (paymentMessage()) {
                        <div
                          class="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-danger-bg)] px-4 py-3 text-sm font-bold"
                          role="alert"
                        >
                          {{ paymentMessage() }}
                        </div>
                      }
                      @if (reservation()) {
                        <p
                          class="mt-4 text-left text-xs font-semibold leading-5 text-[var(--color-text-muted)]"
                        >
                          Tus números quedaron reservados por unos minutos mientras completás el
                          pago.
                        </p>
                      }

                      <button
                        type="submit"
                        class="mercado-pago-button mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-black transition disabled:cursor-not-allowed disabled:opacity-55"
                        [disabled]="paymentDisabled()"
                      >
                        @if (isBusy()) {
                          <span
                            class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                            aria-hidden="true"
                          ></span>
                        } @else {
                          <img
                            src="images/mp%20icon.svg"
                            alt=""
                            class="size-6 shrink-0 object-contain"
                            loading="lazy"
                          />
                        }
                        {{ paymentButtonLabel() }}
                      </button>
                    </form>
                  }
                </aside>
                }
              </div>
            </section>
          }
        }
      </main>

      <app-footer />
    </div>
    <app-bottom-navigation />
  `,
  styleUrl: './raffle-page.component.css',
})
export class RafflePageComponent implements OnInit {
  @ViewChild('buyerNameInput') private buyerNameInput?: ElementRef<HTMLInputElement>;

  private readonly api = inject(PublicRaffleApiService);
  private readonly checkoutStore = inject(RaffleCheckoutStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly maxNumbers = MAX_NUMBERS;
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly noActiveRaffle = signal(false);
  readonly raffle = signal<PublicRaffle | null>(null);
  readonly numbers = signal<PublicRaffleNumber[]>([]);
  readonly numbersLoaded = signal(false);
  readonly numbersRefreshing = signal(false);
  readonly selected = signal<ReadonlySet<number>>(new Set());
  readonly selectionMessage = signal('');
  readonly paymentMessage = signal('');
  readonly conflictNumbers = signal<ReadonlySet<number>>(new Set());
  readonly showForm = signal(false);
  readonly submitted = signal(false);
  readonly phase = signal<PurchasePhase>('IDLE');
  readonly reservation = signal<RaffleReservationResponse | null>(null);
  readonly imageLoaded = signal(false);
  readonly imageFailed = signal(false);

  readonly buyerForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[+\d][\d\s()-]{5,}$/)],
    }),
  });

  readonly selectedCount = computed(() => this.selected().size);
  readonly gridNumbers = computed(() => {
    const byNumber = new Map(this.numbers().map((item) => [item.number, item]));
    return Array.from(
      { length: 100 },
      (_, number) =>
        byNumber.get(number) ?? ({ number, status: 'SOLD' } satisfies PublicRaffleNumber),
    );
  });
  readonly currentStats = computed(() => {
    const items = this.numbers();
    const raffle = this.raffle();
    if (!items.length && raffle) return raffle.stats;
    return {
      available: items.filter((item) => item.status === 'AVAILABLE').length,
      reserved: items.filter((item) => item.status === 'RESERVED').length,
      sold: items.filter((item) => item.status === 'SOLD').length,
      total: items.length || 100,
    };
  });
  readonly soldPercentage = computed(() => {
    const stats = this.currentStats();
    if (!stats.total) return 0;
    const pct = Math.min(100, (stats.sold / stats.total) * 100);
    return stats.sold > 0 ? Math.max(pct, 2.5) : 0;
  });
  readonly selectedLabels = computed(() =>
    [...this.selected()]
      .sort((left, right) => left - right)
      .map((number) => this.numberLabel(number))
      .join(' · '),
  );
  readonly totalPrice = computed(() =>
    this.money((this.raffle()?.priceInCents ?? 0) * this.selectedCount()),
  );
  readonly isBusy = computed(() =>
    ['RESERVING', 'CREATING_PREFERENCE', 'REDIRECTING'].includes(this.phase()),
  );
  readonly canSelectNumbers = computed(
    () => this.raffle()?.status === 'ACTIVE' && !this.isBusy() && !this.reservation(),
  );

  readonly checkoutBanner = signal<RaffleCheckoutContext | null>(null);
  readonly sortedBannerNumbers = computed(() =>
    (this.checkoutBanner()?.numbers ?? []).slice().sort((left, right) => left - right),
  );

  private attemptKey: string | null = null;
  private conflictResetTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadRaffle();
    this.refreshCheckoutBanner();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    if (this.raffle() && !this.isBusy()) this.refreshNumbers();
  }

  loadRaffle(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.noActiveRaffle.set(false);
    this.api
      .active()
      .pipe(
        catchError((error: unknown) => {
          if (raffleApiError(error)?.code === 'RAFFLE_ACTIVE_NOT_FOUND') return this.api.latest();
          throw error;
        }),
        switchMap((raffle) =>
          forkJoin({ raffle: this.api.byId(raffle.id), numbers: this.api.numbers(raffle.id) }),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ raffle, numbers }) => {
          this.raffle.set(raffle);
          this.applyNumbers(numbers.numbers, numbers.status);
          this.numbersLoaded.set(true);
        },
        error: (error: unknown) => {
          if (raffleApiError(error)?.code === 'RAFFLE_NOT_FOUND') {
            this.noActiveRaffle.set(true);
            return;
          }
          this.loadError.set(true);
        },
      });
  }

  refreshNumbers(conflicts: number[] = []): void {
    const raffle = this.raffle();
    if (!raffle || this.numbersRefreshing()) return;
    this.numbersRefreshing.set(true);
    this.api
      .numbers(raffle.id)
      .pipe(
        finalize(() => this.numbersRefreshing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const statusChanged = response.status !== raffle.status;
          this.applyNumbers(response.numbers, response.status, conflicts);
          this.numbersLoaded.set(true);
          if (statusChanged) this.refreshRaffleDetail();
        },
        error: () => {
          if (conflicts.length) {
            const conflictSet = new Set(conflicts);
            this.numbers.update((items) =>
              items.map((item) =>
                conflictSet.has(item.number) ? { ...item, status: 'RESERVED' } : item,
              ),
            );
            this.removeUnavailableSelection(conflicts);
          }
        },
      });
  }

  toggleNumber(item: PublicRaffleNumber): void {
    if (item.status !== 'AVAILABLE' || !this.canSelectNumbers()) return;
    const next = new Set(this.selected());
    if (next.has(item.number)) {
      next.delete(item.number);
      this.selectionMessage.set('');
    } else if (next.size >= MAX_NUMBERS) {
      this.selectionMessage.set('Máximo alcanzado ✓ Ya elegiste tus 10 números.');
      return;
    } else {
      next.add(item.number);
      this.selectionMessage.set('');
    }
    this.selected.set(next);
    this.resetPendingIntent();
  }

  continueToForm(): void {
    if (!this.selectedCount()) return;
    this.showForm.set(true);
    window.setTimeout(() => this.buyerNameInput?.nativeElement.focus(), 0);
  }

  pay(): void {
    if (this.isBusy() || this.raffle()?.status !== 'ACTIVE') return;
    if (this.reservation()) {
      this.createPreference(this.reservation()!);
      return;
    }

    this.submitted.set(true);
    if (this.buyerForm.invalid || !this.selectedCount()) {
      this.buyerForm.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    const raffle = this.raffle()!;
    const buyer = this.buyerForm.getRawValue();
    this.attemptKey ??= crypto.randomUUID();
    this.paymentMessage.set('');
    this.phase.set('RESERVING');

    this.api
      .reserve(
        raffle.id,
        {
          numbers: [...this.selected()].sort((left, right) => left - right),
          buyerName: buyer.name.trim(),
          buyerEmail: buyer.email.trim(),
          buyerPhone: buyer.phone.trim(),
        },
        this.attemptKey,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reservation) => {
          this.reservation.set(reservation);
          this.checkoutStore.save({
            rafflePurchaseId: reservation.rafflePurchaseId,
            orderId: reservation.orderId,
            raffleId: reservation.raffleId,
            numbers: reservation.numbers,
            reservationExpiresAt: reservation.reservationExpiresAt,
          });
          this.checkoutBanner.set(this.checkoutStore.context());
          this.createPreference(reservation);
        },
        error: (error: unknown) => this.handleReservationError(error),
      });
  }

  hasError(controlName: 'name' | 'email' | 'phone'): boolean {
    const control = this.buyerForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  isSelected(number: number): boolean {
    return this.selected().has(number);
  }

  numberLabel(number: number): string {
    return number.toString().padStart(2, '0');
  }

  numberAriaLabel(item: PublicRaffleNumber): string {
    const number = this.numberLabel(item.number);
    if (this.raffle()?.status === 'DRAWN' && this.raffle()?.winningNumber === item.number) {
      return `Número ${number}, ganador`;
    }
    if (this.isSelected(item.number)) return `Número ${number} seleccionado`;
    return `Número ${number} ${this.statusLabel(item.status).toLowerCase()}`;
  }

  numberTitle(item: PublicRaffleNumber): string {
    if (this.isSelected(item.number)) return 'Seleccionado';
    if (item.status === 'RESERVED') return 'Reservado temporalmente';
    return this.statusLabel(item.status);
  }

  money(priceInCents: number): string {
    return formatArs(priceInCents / 100);
  }

  inactiveTitle(status: PublicRaffleStatus): string {
    return {
      ACTIVE: '',
      PAUSED: 'La rifa está pausada temporalmente',
      CLOSED: 'La venta finalizó',
      DRAWN: 'La rifa ya fue sorteada',
    }[status];
  }

  inactiveIcon(status: PublicRaffleStatus): 'clock' | 'trophy' {
    return status === 'DRAWN' ? 'trophy' : 'clock';
  }

  inactiveDescription(raffle: PublicRaffle): string {
    if (raffle.status === 'PAUSED') return 'Las compras ya iniciadas continúan normalmente.';
    if (raffle.status === 'CLOSED') {
      return raffle.drawAt
        ? `Gracias por participar. El sorteo se realizará el ${this.formatDateTime(raffle.drawAt)}.`
        : 'Gracias por participar. El sorteo se realizará próximamente.';
    }
    return '';
  }

  formatDateTime(value: string): string {
    return dateTimeFormatter.format(new Date(value));
  }

  checkoutBannerIcon(status: RafflePurchaseStatus): IconName {
    switch (status) {
      case 'PAID':
        return 'check';
      case 'REQUIRES_REVIEW':
        return 'shield';
      case 'EXPIRED':
      case 'REFUNDED':
        return 'info';
      default:
        return 'clock';
    }
  }

  checkoutBannerTitle(status: RafflePurchaseStatus): string {
    switch (status) {
      case 'PAID':
        return 'Tu pago fue confirmado';
      case 'EXPIRED':
        return 'Tu reserva venció';
      case 'REQUIRES_REVIEW':
        return 'Estamos revisando tu pago';
      case 'REFUNDED':
        return 'Tu pago fue reembolsado';
      default:
        return 'Tenés una compra pendiente';
    }
  }

  checkoutBannerDescription(status: RafflePurchaseStatus): string {
    switch (status) {
      case 'PAID':
        return 'Gracias por ser parte de esta ayuda. Tus números quedaron confirmados.';
      case 'EXPIRED':
        return 'La reserva venció antes de confirmarse el pago. Podés elegir números otra vez sin riesgo de pagar dos veces.';
      case 'REQUIRES_REVIEW':
        return 'No vuelvas a pagar mientras confirmamos el estado con Mercado Pago.';
      case 'REFUNDED':
        return 'Si necesitás ayuda con este reembolso, contactanos.';
      default:
        return 'Estamos esperando la confirmación de Mercado Pago. No necesitás volver a pagar.';
    }
  }

  checkoutBannerCta(status: RafflePurchaseStatus): string {
    return status === 'PAID' ? 'Ver compra' : status === 'EXPIRED' ? 'Ver detalle' : 'Ver estado del pago';
  }

  checkoutBannerRoute(status: RafflePurchaseStatus): string {
    if (status === 'PAID') return '/rifa/checkout/success';
    if (status === 'EXPIRED' || status === 'REFUNDED') return '/rifa/checkout/failure';
    return '/rifa/checkout/pending';
  }

  dismissCheckoutBanner(): void {
    this.checkoutStore.clear();
    this.checkoutBanner.set(null);
  }

  private refreshCheckoutBanner(): void {
    const context = this.checkoutStore.context();
    if (!context) return;
    this.checkoutBanner.set(context);
    this.api
      .purchaseStatus(context.rafflePurchaseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.checkoutStore.updateStatus(response.rafflePurchaseId, response.status, response.numbers);
          this.checkoutBanner.set(this.checkoutStore.context());
        },
        error: () => undefined,
      });
  }

  paymentButtonLabel(): string {
    switch (this.phase()) {
      case 'RESERVING':
        return 'Estamos reservando tus números...';
      case 'CREATING_PREFERENCE':
        return 'Preparando Mercado Pago...';
      case 'REDIRECTING':
        return 'Abriendo Mercado Pago...';
      case 'ERROR':
        return this.reservation() ? 'Reintentar Mercado Pago' : 'Intentar nuevamente';
      default:
        return 'Pagar con Mercado Pago';
    }
  }

  paymentDisabled(): boolean {
    return (
      this.isBusy() ||
      this.raffle()?.status !== 'ACTIVE' ||
      (!this.reservation() && (!this.selectedCount() || this.buyerForm.invalid))
    );
  }

  protected redirectTo(initPoint: string): void {
    window.location.assign(initPoint);
  }

  private createPreference(reservation: RaffleReservationResponse): void {
    this.phase.set('CREATING_PREFERENCE');
    this.paymentMessage.set('');
    this.api
      .createPreference(reservation.rafflePurchaseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preference) => {
          this.phase.set('REDIRECTING');
          this.redirectTo(preference.initPoint);
        },
        error: () => {
          this.phase.set('ERROR');
          this.paymentMessage.set(
            'Tus números ya están reservados, pero no pudimos abrir Mercado Pago. Reintentá sin volver a reservar.',
          );
        },
      });
  }

  private handleReservationError(error: unknown): void {
    this.phase.set('ERROR');
    const apiError = raffleApiError(error);
    switch (apiError?.code) {
      case 'RAFFLE_NUMBER_UNAVAILABLE': {
        const conflicts = unavailableNumbers(error);
        this.showConflicts(conflicts);
        this.paymentMessage.set(
          'Algunos números dejaron de estar disponibles. Actualizamos tu selección para que puedas continuar.',
        );
        this.refreshNumbers(conflicts);
        return;
      }
      case 'RAFFLE_TOO_MANY_NUMBERS':
        this.paymentMessage.set('Podés elegir hasta 10 números por compra.');
        return;
      case 'ACTIVE_RESERVATION_LIMIT':
        this.paymentMessage.set(
          'Ya tenés el máximo de reservas activas para esta rifa. Esperá a que finalice una compra o venza una reserva antes de intentar nuevamente.',
        );
        return;
      case 'RAFFLE_NOT_ACTIVE':
        this.paymentMessage.set('La rifa cambió de estado. Actualizamos la información.');
        this.refreshRaffleDetail();
        return;
      case 'RAFFLE_RESERVATION_EXPIRED':
        this.paymentMessage.set('La reserva venció. Volvé a elegir tus números para continuar.');
        this.resetPendingIntent();
        this.refreshNumbers();
        return;
      case 'IDEMPOTENCY_CONFLICT':
        this.attemptKey = null;
        this.paymentMessage.set(
          'No pudimos validar este intento. Revisá tu selección y volvé a intentarlo.',
        );
        return;
      default:
        this.paymentMessage.set(
          'No pudimos completar la operación. Reintentá en unos segundos; conservamos este mismo intento de forma segura.',
        );
    }
  }

  private applyNumbers(
    numbers: PublicRaffleNumber[],
    status: PublicRaffleStatus,
    conflicts: number[] = [],
  ): void {
    this.numbers.set(
      numbers
        .filter(
          (item) =>
            Number.isInteger(item.number) &&
            item.number >= 0 &&
            item.number <= 99 &&
            ['AVAILABLE', 'RESERVED', 'SOLD'].includes(item.status),
        )
        .sort((left, right) => left.number - right.number),
    );
    this.raffle.update((raffle) => (raffle ? { ...raffle, status } : raffle));
    const unavailable = new Set(
      numbers.filter((item) => item.status !== 'AVAILABLE').map((item) => item.number),
    );
    const removed = [...this.selected()].filter((number) => unavailable.has(number));
    this.removeUnavailableSelection(removed);
    if (removed.length && !conflicts.length) {
      this.showConflicts(removed);
      this.selectionMessage.set(
        'Algunos números cambiaron de disponibilidad y los quitamos de tu selección.',
      );
    }
  }

  private removeUnavailableSelection(numbers: number[]): void {
    if (!numbers.length) return;
    const next = new Set(this.selected());
    numbers.forEach((number) => next.delete(number));
    this.selected.set(next);
    this.attemptKey = null;
    if (!next.size) {
      this.selectionMessage.set('Elegí otro número para continuar.');
      this.showForm.set(false);
    }
  }

  private showConflicts(numbers: number[]): void {
    window.clearTimeout(this.conflictResetTimer);
    this.conflictNumbers.set(new Set(numbers));
    this.conflictResetTimer = window.setTimeout(() => this.conflictNumbers.set(new Set()), 5000);
  }

  private refreshRaffleDetail(): void {
    const raffle = this.raffle();
    if (!raffle) return;
    forkJoin({ raffle: this.api.byId(raffle.id), numbers: this.api.numbers(raffle.id) })
      .pipe(
        catchError(() => EMPTY),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ raffle: detail, numbers }) => {
        this.raffle.set(detail);
        this.applyNumbers(numbers.numbers, numbers.status);
      });
  }

  private resetPendingIntent(): void {
    if (this.reservation()) return;
    this.attemptKey = null;
    this.phase.set('IDLE');
    this.paymentMessage.set('');
    this.submitted.set(false);
  }

  private focusFirstInvalidField(): void {
    const invalid = document.querySelector<HTMLInputElement>(
      '#raffle-buyer-name.ng-invalid, #raffle-buyer-email.ng-invalid, #raffle-buyer-phone.ng-invalid',
    );
    invalid?.focus();
  }

  private statusLabel(status: RaffleNumberStatus): string {
    return { AVAILABLE: 'Disponible', RESERVED: 'Reservado', SOLD: 'Vendido' }[status];
  }
}
