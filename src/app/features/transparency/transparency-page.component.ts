import { Component } from '@angular/core';

import { DONATION_CONFIG } from '../../core/config/donation.config';
import { formatArs } from '../../core/utils/format-ars';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { CopyAliasButtonComponent } from '../../shared/components/copy-alias-button/copy-alias-button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-transparency-page',
  imports: [
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    CopyAliasButtonComponent,
    IconComponent,
    CountUpDirective,
    RevealOnScrollDirective,
  ],
  styles: `
    .transparency-page {
      min-height: calc(100svh - 4rem);
      background:
        radial-gradient(
          circle at 97% 28%,
          color-mix(in srgb, var(--color-accent-soft) 33%, transparent),
          transparent 21rem
        ),
        radial-gradient(
          circle at 3% 76%,
          color-mix(in srgb, var(--color-accent-soft) 27%, transparent),
          transparent 19rem
        ),
        var(--color-bg);
    }

    .transparency-decor {
      position: absolute;
      z-index: -1;
      pointer-events: none;
      user-select: none;
    }

    .transparency-decor-paw {
      width: clamp(5rem, 9vw, 8.5rem);
      opacity: 0.2;
    }

    .transparency-decor-paw--top {
      top: 3rem;
      left: clamp(2rem, 4vw, 5rem);
      transform: rotate(-18deg);
    }

    .transparency-decor-paw--bottom {
      right: clamp(1rem, 5vw, 7rem);
      bottom: 4rem;
      transform: rotate(24deg);
    }

    .transparency-decor-heart {
      top: 8rem;
      right: clamp(2rem, 5vw, 7rem);
      width: clamp(3.5rem, 6vw, 5rem);
      opacity: 0.34;
      transform: rotate(12deg);
    }

    .transparency-dots {
      width: clamp(9rem, 14vw, 13rem);
      aspect-ratio: 1;
      opacity: 0.28;
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--color-accent) 44%, transparent) 1.35px,
        transparent 1.6px
      );
      background-size: 0.8rem 0.8rem;
      mask-image: radial-gradient(circle, #000 18%, transparent 70%);
    }

    .transparency-dots--top {
      top: 2.5rem;
      left: 52%;
    }
    .transparency-dots--left {
      top: 25rem;
      left: -4rem;
    }

    .transparency-hero-title {
      max-width: 10ch;
      letter-spacing: 0;
    }
    .transparency-debt-panel {
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--color-card) 90%, var(--color-accent-soft)),
        #cf9ffb
      );
    }
    .transparency-debt-amount {
      letter-spacing: -0.04em;
    }
    .transparency-total-paw {
      background: color-mix(in srgb, var(--color-accent-soft) 62%, var(--color-card));
    }
    .transparency-total-paw img {
      width: 3.1rem;
      height: 3.1rem;
      object-fit: contain;
    }
    .transparency-help-card,
    .transparency-clinic-card {
      min-height: 22rem;
    }
    .transparency-transfer {
      background: color-mix(in srgb, var(--color-surface) 80%, var(--color-card));
    }
    .transparency-thanks {
      background: linear-gradient(
        100deg,
        var(--color-accent-soft),
        color-mix(in srgb, var(--color-accent-soft) 56%, var(--color-card))
      );
    }

    :host-context(.dark) .transparency-page {
      background:
        radial-gradient(circle at 97% 28%, rgba(157, 95, 220, 0.11), transparent 22rem),
        radial-gradient(circle at 3% 76%, rgba(157, 95, 220, 0.08), transparent 20rem),
        var(--color-bg);
    }

    :host-context(.dark) .transparency-decor-paw,
    :host-context(.dark) .transparency-decor-heart {
      opacity: 0.26;
      filter: drop-shadow(0 0 0.8rem rgba(183, 126, 255, 0.2));
    }

    :host-context(.dark) .transparency-dots {
      opacity: 0.45;
    }

    :host-context(.dark) .transparency-debt-panel {
      border-color: rgba(205, 150, 255, 0.74);
      background: linear-gradient(145deg, #493268, #2a1d3c);
      box-shadow:
        0 0 0.4rem rgba(197, 136, 255, 0.34),
        0 0 1.4rem rgba(169, 101, 237, 0.28),
        0 0 3.4rem rgba(139, 76, 210, 0.18),
        0 1.25rem 2.75rem rgba(0, 0, 0, 0.34);
    }

    :host-context(.dark) .transparency-debt-panel > div {
      background: linear-gradient(145deg, rgba(34, 25, 48, 0.99), rgba(26, 20, 38, 0.99));
    }

    :host-context(.dark) .transparency-total-paw {
      background: rgba(195, 154, 242, 0.48);
      border-color: rgba(218, 184, 255, 0.52);
      box-shadow: 0 0 1.4rem rgba(190, 132, 255, 0.2);
    }

    :host-context(.dark) .transparency-thanks {
      border: 1px solid rgba(202, 153, 255, 0.26);
      background: linear-gradient(100deg, rgba(91, 64, 126, 0.9), rgba(50, 37, 72, 0.96));
      color: #e4d9f7;
    }

    :host-context(.dark) .transparency-thanks strong {
      color: #fff;
    }

    @media (max-width: 767px) {
      .transparency-page {
        min-height: calc(100svh - 7.5rem);
      }
      .transparency-decor-paw--top {
        top: 1.75rem;
        left: -1.25rem;
        width: 4.5rem;
      }
      .transparency-decor-heart {
        top: 12rem;
        right: -0.5rem;
        width: 2.75rem;
      }
      .transparency-dots--top {
        top: 3rem;
        right: -2rem;
        left: auto;
        width: 6rem;
      }
      .transparency-total-paw {
        display: none;
      }
    }
  `,
  template: `
    <app-header />

    <main id="contenido" class="transparency-page relative isolate overflow-hidden">
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="transparency-decor transparency-decor-paw transparency-decor-paw--top page-decor"
        style="--decor-delay: 250ms; --drift-duration: 10s"
      />
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="transparency-decor transparency-decor-paw transparency-decor-paw--bottom page-decor hidden md:block"
        style="--decor-delay: 700ms; --drift-duration: 12s"
      />
      <img
        src="images/extra/corazoncito-empty.png"
        alt=""
        aria-hidden="true"
        class="transparency-decor transparency-decor-heart page-decor"
        style="--decor-delay: 550ms; --drift-duration: 7s"
      />
      <span
        aria-hidden="true"
        class="transparency-decor transparency-dots transparency-dots--top page-decor"
        style="--decor-delay: 400ms; --drift-duration: 12s"
      ></span>
      <span
        aria-hidden="true"
        class="transparency-decor transparency-dots transparency-dots--left page-decor hidden md:block"
        style="--decor-delay: 650ms; --drift-duration: 13s"
      ></span>

      <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <section
          class="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,.95fr)] lg:gap-16"
        >
          <div>
            <p
              class="page-intro inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-extrabold uppercase text-[var(--color-accent)]"
            >
              <app-icon name="heart" class="size-4 fill-current" />
              Deuda veterinaria activa
            </p>
            <h1
              class="transparency-hero-title page-intro page-intro--title mt-5 text-5xl font-black leading-[0.98] md:text-6xl"
              style="--intro-step: 1"
            >
              Transparencia para <span class="text-[var(--color-accent)]">ayudar</span> mejor
              <img
                src="images/extra/corazoncito-empty.png"
                alt=""
                aria-hidden="true"
                class="page-heartbeat ml-2 inline-block size-10 align-middle object-contain"
              />
            </h1>
            <p
              class="page-intro mt-5 max-w-xl text-lg leading-7 text-[var(--color-text-muted)] md:text-xl md:leading-8"
              style="--intro-step: 2"
            >
              Cada número refleja una vida en recuperación. Nuestra prioridad es saldar las cuentas
              de quienes ya están sanando para poder ayudar a los que siguen esperando.
            </p>
          </div>

          <section
            style="--intro-step: 2"
            class="page-intro page-intro--right transparency-debt-panel dark-neon-card dark-neon-card--featured rounded-3xl border border-[var(--color-border)] p-3 shadow-[var(--shadow-elevated)] md:p-4"
          >
            <div
              class="relative overflow-hidden rounded-2xl bg-[var(--color-card)] px-6 py-7 md:px-8 md:py-8"
            >
              <span
                class="transparency-total-paw absolute right-6 top-6 grid size-20 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-accent)]"
              >
                <img src="images/extra/paw.png" alt="" aria-hidden="true" />
              </span>
              <p
                class="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
              >
                Total a pagar
              </p>
              <p
                [appCountUp]="config.currentDebt"
                [countUpFormat]="formatArs"
                [countUpDelay]="450"
                class="transparency-debt-amount mt-4 text-[clamp(2.6rem,5vw,4rem)] font-black leading-none tabular-nums text-[var(--color-accent)]"
              >
                {{ formattedDebt }}
              </p>
              <div
                class="mt-7 flex items-center gap-2 border-t border-[var(--color-border)] pt-5 text-sm font-medium text-[var(--color-text-muted)]"
              >
                <app-icon name="calendar" class="size-4 text-[var(--color-accent)]" />
                Actualizado el {{ config.debtUpdatedAt }}
              </div>
            </div>
          </section>
        </section>

        <section id="ayudar" class="mt-10 grid gap-6 lg:grid-cols-2">
          <article
            appReveal
            class="transparency-help-card dark-neon-card rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-elevated)] md:p-7"
          >
            <div class="flex items-start gap-4">
              <span
                class="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl  text-[var(--color-accent)]"
                ><img
                  src="images/extra/corazon-lleno.png"
                  alt=""
                  aria-hidden="true"
                  class="w-20 h-20 object-contain"
                />
              </span>
              <div>
                <h2 class="text-2xl font-extrabold">Datos para ayudar</h2>
                <p class="mt-1.5 leading-6 text-[var(--color-text-muted)]">
                  Transferencia directa a la cuenta de la rescatista para ayudar con los gastos
                  veterinarios.
                </p>
              </div>
            </div>

            <dl
              class="transparency-transfer mt-6 grid gap-4 rounded-2xl border border-[var(--color-border)] p-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center"
            >
              <div class="space-y-3">
                <div
                  class="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)] pb-3"
                >
                  <dt class="text-sm text-[var(--color-text-muted)]">Titular</dt>
                  <dd class="text-sm font-bold">{{ config.accountHolder }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-[var(--color-text-muted)]">Alias bancario</dt>
                  <dd
                    class="mt-1 select-text break-all text-2xl font-black leading-tight text-[var(--color-accent)]"
                  >
                    {{ config.alias }}
                  </dd>
                </div>
              </div>
              <div class="space-y-3">
                <a
                  [href]="config.mercadoPagoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mercado-pago-button inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full px-4 py-3 text-sm font-black shadow-sm transition"
                >
                  <img
                    src="images/mp%20icon.svg"
                    alt=""
                    class="h-7 w-7 object-contain"
                    loading="lazy"
                  />
                  Donar con Mercado Pago
                </a>
                <app-copy-alias-button [text]="config.alias" [variant]="'secondary'" />
              </div>
            </dl>

            <aside
              class="transparency-thanks mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--color-text-muted)]"
            >
              <span
                class="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white"
                ><img
                  src="images/extra/corazon-lleno.png"
                  alt=""
                  aria-hidden="true"
                  class="size-6 object-contain brightness-0 invert"
                />
              </span>
              <p>
                Cada aporte, por pequeño que sea, cambia una vida.
                <strong class="block text-[var(--color-text)]"
                  >¡Gracias por ser parte de esta comunidad!</strong
                >
              </p>
              <img
                src="images/extra/corazoncito-empty.png"
                alt=""
                aria-hidden="true"
                class="ml-auto size-7 shrink-0 object-contain"
              />
            </aside>
          </article>

          <article
            appReveal
            [appRevealDelay]="100"
            class="transparency-clinic-card dark-neon-card rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-elevated)] md:p-7"
          >
            <div class="flex items-start gap-4">
              <span
                class="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                ><app-icon name="shop" class="size-7"
              /></span>
              <div>
                <h2 class="text-2xl font-extrabold">{{ config.veterinary.name }}</h2>
                <p class="mt-1 inline-flex items-center gap-2 font-bold text-[var(--color-accent)]">
                  <app-icon name="info" class="size-4" />{{ config.veterinary.address }}
                </p>
              </div>
            </div>
            <p class="mt-5 leading-6 text-[var(--color-text-muted)]">
              También podés colaborar directamente en la clínica veterinaria. Acercate a recepción y
              avisá que el aporte es para los rescates de Aldana Salazar.
            </p>
            <div
              class="relative mt-4 aspect-[16/7] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white sm:aspect-[16/8]"
            >
              <iframe
                class="absolute inset-0 h-full w-full"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6345.545974524255!2d-59.1445204!3d-37.324204699999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95911f4128af5d19%3A0xe61909a2682661b9!2sCl%C3%ADnica%20Veterinaria%20San%20Lorenzo!5e0!3m2!1ses!2sar!4v1786305112384!5m2!1ses!2sar"
                title="Ubicación de Clínica Veterinaria San Lorenzo"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              ></iframe>
            </div>
          </article>
        </section>
      </div>
    </main>

    <app-footer />
    <app-bottom-navigation />
  `,
})
export class TransparencyPageComponent {
  protected readonly config = DONATION_CONFIG;
  protected readonly formattedDebt = formatArs(DONATION_CONFIG.currentDebt);
  protected readonly formatArs = formatArs;
}
