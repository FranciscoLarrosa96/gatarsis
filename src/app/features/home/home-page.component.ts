import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DONATION_CONFIG } from '../../core/config/donation.config';
import { RescueCase } from '../../core/models/rescue-case.model';
import { RescueCasesService } from '../../core/services/rescue-cases.service';
import { formatArs } from '../../core/utils/format-ars';
import { MERCH_PRODUCTS } from '../../data/merch/merch-products.data';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { CopyAliasButtonComponent } from '../../shared/components/copy-alias-button/copy-alias-button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';
import { HeroMotionDirective } from './hero-motion.directive';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    NgOptimizedImage,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    CopyAliasButtonComponent,
    IconComponent,
    RevealOnScrollDirective,
    HeroMotionDirective,
  ],
  styleUrl: './home-hero-motion.css',
  styles: `
    .home-page {
      overflow-x: clip;
      background:
        radial-gradient(
          circle at 94% 13%,
          color-mix(in srgb, var(--color-accent-soft) 45%, transparent),
          transparent 30rem
        ),
        radial-gradient(
          circle at 4% 39%,
          color-mix(in srgb, var(--color-surface-strong) 55%, transparent),
          transparent 26rem
        ),
        var(--color-bg);
    }

    .home-hero {
      position: relative;
      isolation: isolate;
      display: grid;
      min-height: calc(100svh - 4rem);
      align-items: center;
      overflow: clip;
    }

    .home-hero::after {
      position: absolute;
      z-index: -4;
      top: 2%;
      right: -4%;
      width: min(58vw, 58rem);
      aspect-ratio: 1;
      content: '';
      pointer-events: none;
      background: radial-gradient(
        circle,
        color-mix(in srgb, var(--color-accent) 16%, transparent) 0%,
        color-mix(in srgb, var(--color-accent-soft) 12%, transparent) 36%,
        transparent 72%
      );
      filter: blur(2.75rem);
    }

    .home-hero-copy {
      max-width: 47rem;
    }

    .home-mobile-decor {
      display: none;
    }

    .home-title-heart {
      position: relative;
      display: inline-block;
      width: 2.8rem;
      height: 2.8rem;
      overflow: hidden;
      vertical-align: -0.18em;
    }

    .home-title-heart img {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5.55rem;
      max-width: none;
      transform: translate(-50%, -48%);
    }

    /* El JPG incluye un lienzo claro; lo fundimos antes de sus bordes físicos. */
    .home-hero-art {
      position: relative;
      isolation: isolate;
      width: min(138%, 58rem);
      aspect-ratio: 1.08;
      margin-inline: auto;
      -webkit-mask-image: radial-gradient(
        ellipse 63% 64% at 51% 52%,
        #000 0%,
        #000 54%,
        rgba(0, 0, 0, 0.9) 65%,
        rgba(0, 0, 0, 0.48) 75%,
        rgba(0, 0, 0, 0.12) 84%,
        transparent 93%
      );
      mask-image: radial-gradient(
        ellipse 63% 64% at 51% 52%,
        #000 0%,
        #000 54%,
        rgba(0, 0, 0, 0.9) 65%,
        rgba(0, 0, 0, 0.48) 75%,
        rgba(0, 0, 0, 0.12) 84%,
        transparent 93%
      );
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;
      transform: translateX(2.5rem);
    }

    /* Halo detrás del logo para que el fade se lea como luz ambiental. */
    .home-hero-art::before {
      position: absolute;
      z-index: -1;
      inset: 11% 7% 10% 5%;
      content: '';
      border-radius: 48% 52% 54% 46% / 45% 45% 55% 55%;
      background: radial-gradient(
        circle at 48% 48%,
        color-mix(in srgb, var(--color-accent-soft) 72%, transparent) 0%,
        color-mix(in srgb, var(--color-accent-soft) 38%, transparent) 38%,
        transparent 72%
      );

      filter: blur(34px);
      opacity: 0.72;
      pointer-events: none;
    }

    .home-hero-art img {
      position: absolute;
      inset: -18% -13% -12% -10% !important;
      width: 123% !important;
      height: 130% !important;
      max-width: none;
      object-fit: contain;
      object-position: center 52%;
      mix-blend-mode: multiply;
      mix-blend-mode: multiply;
      filter: saturate(0.98) contrast(1.015) brightness(1.015);
      -webkit-mask-image: radial-gradient(
        ellipse 58% 60% at 49% 53%,
        #000 0%,
        #000 58%,
        rgba(0, 0, 0, 0.82) 70%,
        rgba(0, 0, 0, 0.34) 80%,
        transparent 91%
      );
      mask-image: radial-gradient(
        ellipse 58% 60% at 49% 53%,
        #000 0%,
        #000 58%,
        rgba(0, 0, 0, 0.82) 70%,
        rgba(0, 0, 0, 0.34) 80%,
        transparent 91%
      );
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;
      pointer-events: none;
      user-select: none;
    }

    .home-hero-art::after {
      position: absolute;
      z-index: 5;
      content: '';
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(
          to bottom,
          var(--color-bg) 0%,
          color-mix(in srgb, var(--color-bg) 88%, transparent) 12%,
          transparent 26%
        ),
        linear-gradient(
          to right,
          var(--color-bg) 0%,
          color-mix(in srgb, var(--color-bg) 76%, transparent) 14%,
          transparent 30%
        );
      -webkit-mask-image: radial-gradient(ellipse 65% 68% at 52% 54%, transparent 52%, #000 100%);
      mask-image: radial-gradient(ellipse 65% 68% at 52% 54%, transparent 52%, #000 100%);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;
    }

    :host-context(.dark) .home-hero-art::after {
      display: none;
    }

    :host-context(.dark) .home-hero-art img {
      mix-blend-mode: screen;
    }

    .home-hero-art__dark {
      display: none;
    }

    :host-context(.dark) .home-hero-art__light {
      display: none;
    }

    :host-context(.dark) .home-hero-art__dark {
      display: block;
      mix-blend-mode: normal;
      filter: brightness(1.28) contrast(1.06) saturate(1.08);
      opacity: 1;
      -webkit-mask-image: none;
      mask-image: none;
    }

    :host-context(.dark) .home-hero-art::before {
      opacity: 0.38;
    }

    .home-decor-paw {
      position: absolute;
      width: clamp(3.5rem, 7vw, 6rem);
      opacity: 0.3;
      pointer-events: none;
      user-select: none;
    }

    .home-decor-paw--back {
      z-index: -1;
    }

    .home-decor-paw--soft {
      z-index: 0;
      width: clamp(2.8rem, 5vw, 4.8rem);
      opacity: 0.18;
    }

    .home-decor-paw--tiny {
      width: clamp(2.1rem, 3.2vw, 3rem);
      opacity: 0.14;
    }

    .home-decor-dots {
      position: absolute;
      z-index: -1;
      width: clamp(8rem, 14vw, 13rem);
      aspect-ratio: 1;
      opacity: 0.46;
      pointer-events: none;
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--color-accent) 46%, transparent) 1.35px,
        transparent 1.55px
      );
      background-size: 0.78rem 0.78rem;
      mask-image: radial-gradient(circle, black 15%, transparent 70%);
    }

    :host-context(.dark) .home-decor-dots {
      opacity: 0.28;
    }

    .home-donation-shell {
      background: linear-gradient(135deg, var(--color-card), var(--color-surface));
      box-shadow: var(--shadow-elevated);
    }

    .home-donation-card {
      box-shadow: 0 12px 28px color-mix(in srgb, var(--color-text) 9%, transparent);
    }

    .home-carousel-panel {
      background: linear-gradient(135deg, var(--color-card), var(--color-surface));
      box-shadow: var(--shadow-surface);
    }

    .home-carousel-window {
      overflow: hidden;
      mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
    }

    .home-carousel-track {
      display: flex;
      width: max-content;
      gap: 0.85rem;
      animation: home-infinite-carousel 32s linear infinite;
      will-change: transform;
    }

    .home-carousel-window:hover .home-carousel-track,
    .home-carousel-window:focus-within .home-carousel-track {
      animation-play-state: paused;
    }

    .home-case-slide {
      width: clamp(10rem, 17vw, 12.5rem);
      flex: 0 0 auto;
    }

    .home-product-slide {
      width: clamp(10.5rem, 18vw, 13rem);
      flex: 0 0 auto;
    }

    @keyframes home-infinite-carousel {
      to {
        transform: translateX(calc(-50% - 0.425rem));
      }
    }

    @media (max-width: 767px) {
      .home-mobile-decor {
        position: absolute;
        z-index: 0;
        display: block;
        pointer-events: none;
        user-select: none;
      }

      .home-mobile-decor--paw-top {
        top: 3.5rem;
        right: -1.35rem;
        width: 4.5rem;
        opacity: 0.2;
        transform: rotate(18deg);
      }

      .home-mobile-decor--paw-bottom {
        bottom: 7rem;
        left: -1.5rem;
        width: 3.75rem;
        opacity: 0.16;
        transform: rotate(-18deg);
      }

      .home-mobile-decor--dots {
        top: 11rem;
        right: -2rem;
        width: 6rem;
        aspect-ratio: 1;
        opacity: 0.3;
        background-image: radial-gradient(
          circle,
          color-mix(in srgb, var(--color-accent) 46%, transparent) 1.25px,
          transparent 1.5px
        );
        background-size: 0.72rem 0.72rem;
        mask-image: radial-gradient(circle, #000 18%, transparent 72%);
      }

      :host-context(.dark) .home-mobile-decor {
        opacity: 0.4;
        filter: drop-shadow(0 0 0.75rem rgba(183, 126, 255, 0.16));
      }

      .home-hero::before {
        display: none;
      }

      .home-decor-paw {
        display: none;
      }

      .home-decor-dots {
        display: none;
      }

      .home-carousel-window {
        margin-right: -1.5rem;
        mask-image: linear-gradient(to right, black 0%, black 86%, transparent 100%);
      }

      .home-carousel-track {
        animation-duration: 26s;
      }
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      .home-hero > div {
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        gap: 1.5rem;
      }

      .home-hero-art {
        width: 100%;
        max-width: 30rem;
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .home-carousel-window {
        overflow-x: auto;
        mask-image: none;
        scroll-snap-type: x mandatory;
      }

      .home-carousel-track {
        width: auto;
        animation: none;
      }

      .home-case-slide,
      .home-product-slide {
        scroll-snap-align: start;
      }
    }
  `,
  template: `
    <app-header />

    <main id="contenido" class="home-page">
      <section appHeroMotion class="home-hero relative">
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-mobile-decor home-mobile-decor--paw-top"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-mobile-decor home-mobile-decor--paw-bottom"
        />
        <span aria-hidden="true" class="home-mobile-decor home-mobile-decor--dots"></span>
        <span aria-hidden="true" class="home-decor-dots left-[42%] top-36 hidden lg:block"></span>
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--back left-[14%] top-7 hidden rotate-12 lg:block"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--back left-[38%] top-16 hidden -rotate-12 lg:block"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--back right-[6%] top-[28rem] hidden rotate-12 lg:block"
        />
        <div
          class="mx-auto grid w-full max-w-[90rem] gap-10 px-6 py-12 sm:px-8 md:grid-cols-[0.88fr_1.12fr] md:items-center md:gap-6 md:py-16 lg:px-10 lg:py-20 xl:px-12"
        >
          <div class="home-hero-copy relative z-10">
            <p
              class="hero-eyebrow text-xs font-extrabold uppercase tracking-[0.11em] text-[var(--color-accent)] sm:text-sm"
            >
              Cada historia merece continuar
            </p>
            <h1
              class="mt-5 max-w-3xl text-[2.75rem] font-black leading-[0.96] sm:text-6xl lg:text-[4.85rem] xl:text-[5.35rem]"
            >
              <span class="hero-title-clip block"
                ><span class="hero-title-line">Ayudanos a</span></span
              >
              <span class="hero-title-clip block sm:whitespace-nowrap"
                ><span class="hero-title-line">seguir salvando</span></span
              >
              <span class="hero-title-clip mt-[0.5rem] block text-[var(--color-accent)]"
                ><span class="hero-title-line"
                  ><span class="hero-lives">vidas</span>
                  <span class="home-title-heart"
                    ><img
                      class="w-[4.2rem]"
                      src="images/extra/corazoncito-empty.png"
                      alt="corazon" /></span></span
              ></span>
            </h1>
            <p
              class="hero-description mt-7 max-w-xl text-left text-base leading-7 text-[var(--color-text-muted)] sm:text-lg lg:text-[1.2rem] lg:leading-8"
            >
              Rescatar es apenas el comienzo. Cada paso que sigue los acerca más a la oportunidad de
              volver a empezar.
            </p>
          </div>

          <div class="hero-art-layer relative hidden min-w-0 md:block">
            <figure class="home-hero-art relative m-0">
              <img
                ngSrc="images/ui/hero-concepto-1.jpg"
                alt="Gatarsis - Donde una vida vuelve a empezar"
                class="home-hero-art__light"
                fill
                priority
                sizes="(min-width: 1024px) 44vw, (min-width: 768px) 48vw, 100vw"
              />
              <img
                ngSrc="images/ui/hero-concepto-1-dark.jpg"
                alt=""
                aria-hidden="true"
                class="home-hero-art__dark"
                fill
                priority
                sizes="(min-width: 1024px) 44vw, (min-width: 768px) 48vw, 100vw"
              />
            </figure>
          </div>
        </div>
      </section>

      <section
        id="aporte"
        class="relative isolate mx-auto max-w-6xl px-6 pb-3 sm:px-6 md:pb-3 lg:px-8"
      >
        <span
          aria-hidden="true"
          class="home-decor-dots -left-16 top-1/2 hidden -translate-y-1/2 md:block"
        ></span>
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--soft home-decor-paw--tiny -left-10 bottom-8 hidden -rotate-12 md:block"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--soft right-4 -bottom-2 hidden rotate-12 md:block"
        />
        <div
          appReveal
          class="home-donation-shell dark-neon-card dark-neon-card--featured relative z-10 grid rounded-[2rem] border border-[var(--color-border)] p-6 md:grid-cols-[1.05fr_0.95fr]"
        >
          <div
            class="flex flex-col items-start gap-4 border-b border-[var(--color-border)] pb-7 md:flex-row md:items-center md:gap-5 md:border-b-0 md:border-r md:pb-0 md:pr-10"
          >
            <span
              class="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--color-surface-strong)] text-[var(--color-accent)]"
            >
              <app-icon name="wallet" class="size-7" />
            </span>
            <div>
              <p
                class="text-sm font-extrabold uppercase tracking-[0.07em] text-[var(--color-accent)]"
              >
                Deuda actual
              </p>
              <p
                class="mt-2 whitespace-nowrap text-[2.6rem] font-black leading-none text-[var(--color-accent)] sm:text-6xl"
              >
                {{ formattedDebt }}
              </p>
              <p class="mt-5 max-w-sm text-left leading-6 text-[var(--color-text-muted)]">
                Esta deuda corresponde a gastos veterinarios acumulados de distintos rescates.
              </p>
            </div>
          </div>

          <section
            class="home-donation-card dark-neon-card dark-neon-card--featured mt-7 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 md:-my-3 md:ml-8 md:mt-0"
          >
            <h2 class="text-xl font-black">Tu aporte</h2>
            <p class="mt-2 text-left text-sm leading-6 text-[var(--color-text-muted)]">
              Transferencia directa a la cuenta de la rescatista para ayudar con los gastos
              veterinarios.
            </p>
            <dl
              class="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div
                class="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-2 text-sm"
              >
                <dt class="text-[var(--color-text-muted)]">Titular</dt>
                <dd class="font-extrabold">{{ donationConfig.accountHolder }}</dd>
              </div>
              <div class="pt-2">
                <dt class="text-sm text-[var(--color-text-muted)]">Alias bancario</dt>
                <dd
                  class="mt-1 select-text break-all text-xl font-black text-[var(--color-accent)]"
                >
                  {{ donationConfig.alias }}
                </dd>
              </div>
            </dl>
            <a
              [href]="donationConfig.mercadoPagoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mercado-pago-button mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-black shadow-sm transition"
            >
              <img src="images/mp%20icon.svg" alt="" class="size-6 object-contain" loading="lazy" />
              Donar con Mercado Pago
            </a>
            <div class="mt-3">
              <app-copy-alias-button [text]="donationConfig.alias" variant="secondary" />
            </div>
          </section>
        </div>
      </section>

      <section appReveal class="relative isolate mx-auto max-w-6xl px-6 py-3 sm:px-6 lg:px-8">
        <span aria-hidden="true" class="home-decor-dots right-[21%] -top-10 hidden md:block"></span>
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--soft -left-14 top-8 hidden rotate-12 md:block"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--soft home-decor-paw--tiny right-0 bottom-1 hidden -rotate-12 md:block"
        />
        <div
          class="home-carousel-panel dark-neon-card dark-neon-card--featured relative z-10 grid gap-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 md:grid-cols-[0.75fr_1.25fr] md:items-center dark-neon-card dark-neon-card--featured"
        >
          <div>
            <h2 class="text-2xl font-black">
              Por ellos estamos acá <span class="text-[var(--color-accent)]">♡</span>
            </h2>
            <p class="mt-3 max-w-sm text-left text-sm leading-6 text-[var(--color-text-muted)]">
              Conocé a quienes hoy están bajo nuestro cuidado.
            </p>
            <a
              routerLink="/casos"
              class="button-primary mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold"
              >Ver casos <app-icon name="arrow" class="size-4"
            /></a>
          </div>
          <div class="home-carousel-window overflow-hidden" aria-label="Historias destacadas">
            <div class="home-carousel-track">
              @for (item of caseCarousel; track $index) {
                <a
                  [routerLink]="['/casos', item!.slug]"
                  class="home-case-slide group relative aspect-[1.06] overflow-hidden rounded-2xl bg-[var(--color-surface)]"
                >
                  <img
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                    [ngSrc]="item!.coverImage.src"
                    [alt]="item!.coverImage.alt"
                    [width]="item!.coverImage.width"
                    [height]="item!.coverImage.height"
                    loading="lazy"
                    sizes="(min-width: 768px) 17vw, 52vw"
                  />
                  <span
                    class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10 text-base font-black text-white"
                    >{{ item!.name }}</span
                  >
                </a>
              }
            </div>
          </div>
        </div>
      </section>

      <section
        appReveal
        class="relative isolate mx-auto max-w-6xl px-6 py-3 sm:px-6 lg:px-8 pb-[18px]"
      >
        <span aria-hidden="true" class="home-decor-dots -right-14 bottom-0 hidden md:block"></span>
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--soft home-decor-paw--tiny left-[32%] -top-2 hidden rotate-12 md:block"
        />
        <img
          src="images/extra/paw.png"
          alt=""
          aria-hidden="true"
          class="home-decor-paw home-decor-paw--soft right-8 top-8 hidden -rotate-12 md:block"
        />
        <div
          class="home-carousel-panel dark-neon-card dark-neon-card--featured relative z-10 grid gap-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:grid-cols-[0.75fr_1.25fr] md:items-center"
        >
          <div>
            <h2 class="text-2xl font-black">
              Tu compra también rescata <span class="text-[var(--color-accent)]">♡</span>
            </h2>
            <p class="mt-3 max-w-sm text-left text-sm leading-6 text-[var(--color-text-muted)]">
              Productos creados para sostener lo que hacemos.
            </p>
            <a
              routerLink="/tienda"
              class="button-primary mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold"
              >Ver tienda <app-icon name="arrow" class="size-4"
            /></a>
          </div>
          <div class="home-carousel-window overflow-hidden" aria-label="Productos solidarios">
            <div class="home-carousel-track">
              @for (image of productCarousel; track $index) {
                <a
                  routerLink="/tienda"
                  class="home-product-slide overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]"
                >
                  <img
                    class="aspect-square h-full w-full object-cover"
                    [ngSrc]="image.src"
                    [alt]="image.alt"
                    [width]="image.width"
                    [height]="image.height"
                    loading="lazy"
                    sizes="(min-width: 768px) 18vw, 55vw"
                  />
                </a>
              }
            </div>
          </div>
        </div>
      </section>
    </main>

    <app-footer />
    <app-bottom-navigation />
  `,
})
export class HomePageComponent {
  private readonly casesService = inject(RescueCasesService);

  protected readonly donationConfig = DONATION_CONFIG;
  protected readonly formattedDebt = formatArs(DONATION_CONFIG.currentDebt);
  private readonly highlightedCases = [
    'fenix',
    'gina',
    'matilda',
    'maxine',
    'patan',
    'pochoclo',
    'rafa',
    'tiky',
    'tom',
  ].map((slug) => this.casesService.getBySlug(slug));
  protected readonly caseCarousel = [...this.highlightedCases, ...this.highlightedCases];
  private readonly productImages = MERCH_PRODUCTS.flatMap((product) => [
    product.coverImage,
    ...product.gallery,
  ]);
  protected readonly productCarousel = [...this.productImages, ...this.productImages];
}
