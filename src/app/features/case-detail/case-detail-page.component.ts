import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { DONATION_CONFIG } from '../../core/config/donation.config';
import { SITE_CONFIG } from '../../core/config/site.config';
import { RescueCasesService } from '../../core/services/rescue-cases.service';
import { formatDateNumeric } from '../../core/utils/format-date';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { CaseGalleryComponent } from '../../shared/components/case-gallery/case-gallery.component';
import { DonationCardComponent } from '../../shared/components/donation-card/donation-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ShareButtonComponent } from '../../shared/components/share-button/share-button.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { UpdatesTimelineComponent } from '../../shared/components/updates-timeline/updates-timeline.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-case-detail-page',
  imports: [
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    CaseGalleryComponent,
    DonationCardComponent,
    IconComponent,
    ShareButtonComponent,
    StatusBadgeComponent,
    UpdatesTimelineComponent,
    RevealOnScrollDirective,
  ],
  styles: `
    .case-detail-page {
      min-height: calc(100svh - 4rem);
      overflow-x: clip;
      background:
        radial-gradient(circle at 91% 10%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent), transparent 23rem),
        radial-gradient(circle at 7% 70%, color-mix(in srgb, var(--color-surface-strong) 52%, transparent), transparent 26rem),
        var(--color-bg);
    }

    .case-detail-shell { isolation: isolate; }

    .case-detail-decor {
      position: absolute;
      z-index: -1;
      pointer-events: none;
      user-select: none;
    }

    .case-detail-paw {
      width: clamp(5rem, 9vw, 8.5rem);
      opacity: 0.2;
    }

    .case-detail-paw--top { top: 2.75rem; right: 4%; transform: rotate(18deg); }
    .case-detail-paw--bottom { bottom: 10rem; left: -2.5rem; transform: rotate(-20deg); opacity: 0.15; }
    .case-detail-heart { top: 9rem; left: clamp(1rem, 6vw, 6rem); width: clamp(2.4rem, 4vw, 4rem); opacity: 0.58; transform: rotate(-16deg); }

    .case-detail-dots {
      top: 4rem;
      right: 31%;
      width: clamp(8rem, 14vw, 13rem);
      aspect-ratio: 1;
      opacity: 0.35;
      background-image: radial-gradient(circle, color-mix(in srgb, var(--color-accent) 48%, transparent) 1.3px, transparent 1.55px);
      background-size: 0.78rem 0.78rem;
      mask-image: radial-gradient(circle, #000 18%, transparent 72%);
    }

    .case-back-link { transition: color 180ms ease, transform 180ms ease; }
    .case-back-link:hover { transform: translateX(-0.2rem); }

    .case-intro { position: relative; }
    .case-intro::after {
      display: block;
      width: 3.2rem;
      height: 0.22rem;
      margin-top: 1.35rem;
      content: '';
      border-radius: 999px;
      background: linear-gradient(90deg, var(--color-accent), color-mix(in srgb, var(--color-accent-soft) 64%, transparent));
    }

    .case-summary { text-wrap: pretty; }

    .case-tabs {
      border-radius: 1rem;
      background: color-mix(in srgb, var(--color-card) 72%, transparent);
      box-shadow: 0 12px 28px color-mix(in srgb, var(--color-text) 6%, transparent);
    }

    .case-story {
      border: 1px solid color-mix(in srgb, var(--color-border) 86%, transparent);
      background: linear-gradient(145deg, color-mix(in srgb, var(--color-card) 92%, transparent), color-mix(in srgb, var(--color-surface) 58%, transparent));
      box-shadow: var(--shadow-surface);
    }

    :host-context(.dark) .case-detail-paw,
    :host-context(.dark) .case-detail-heart,
    :host-context(.dark) .case-detail-dots { opacity: 0.42; }

    :host-context(.dark) .case-story,
    :host-context(.dark) .case-tabs {
      border-color: var(--dark-neon-border);
      background: linear-gradient(145deg, rgba(42, 34, 59, 0.94), rgba(30, 24, 43, 0.94));
      box-shadow: 0 0 16px var(--dark-neon-glow-wide), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    @media (max-width: 767px) {
      .case-detail-paw--bottom { display: none; }

      .case-detail-paw--top {
        top: 5.25rem;
        right: -1.5rem;
        width: 4.5rem;
        opacity: 0.2;
      }

      .case-detail-heart {
        top: 10rem;
        right: -0.5rem;
        left: auto;
        width: 2.35rem;
        opacity: 0.38;
      }

      .case-detail-dots {
        top: 3.25rem;
        right: -2rem;
        width: 6rem;
        opacity: 0.3;
      }

      .case-story { border-radius: 1.25rem; }
    }
  `,
  template: `
    <app-header />

    <main id="contenido" class="case-detail-page pb-28 md:pb-0">
      @if (caseData(); as item) {
        <section class="case-detail-shell relative mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-12 lg:px-8">
          <img src="images/extra/paw.png" alt="" aria-hidden="true" class="case-detail-decor case-detail-paw case-detail-paw--top page-decor" style="--decor-delay: 300ms; --drift-duration: 10s" />
          <img src="images/extra/paw.png" alt="" aria-hidden="true" class="case-detail-decor case-detail-paw case-detail-paw--bottom page-decor" style="--decor-delay: 700ms; --drift-duration: 12s" />
          <img src="images/extra/corazoncito-empty.png" alt="" aria-hidden="true" class="case-detail-decor case-detail-heart page-decor" style="--decor-delay: 550ms; --drift-duration: 7s" />
          <span aria-hidden="true" class="case-detail-decor case-detail-dots page-decor" style="--decor-delay: 450ms; --drift-duration: 13s"></span>
          <a
            routerLink="/casos"
            class="case-back-link page-intro inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            <app-icon name="arrow" class="size-4 rotate-180" />
            Casos
          </a>

          <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            <div>
              <div class="case-intro mb-7">
                <div class="page-intro flex flex-wrap gap-2" style="--intro-step: 1">
                  @for (status of item.statuses; track status) {
                    <app-status-badge [status]="status" />
                  }
                </div>
                <h1
                  class="page-intro page-intro--title mt-5 text-5xl font-black leading-tight sm:text-6xl"
                  style="--intro-step: 2"
                >
                  {{ item.name }}
                </h1>
                <p
                  style="--intro-step: 3"
                  class="case-summary page-intro mt-4 max-w-3xl text-lg text-[var(--color-text-muted)] text-justify"
                >
                  {{ item.summary }}
                </p>
                @if (item.updatedAt) {
                  <p class="page-intro mt-4 text-sm text-[var(--color-text-muted)]" style="--intro-step: 4">
                    Actualizado el {{ formatDate(item.updatedAt) }}
                  </p>
                }
              </div>

              <div class="case-gallery-wrap page-intro page-intro--pop" style="--intro-step: 4">
                <app-case-gallery [cover]="item.coverImage" [gallery]="item.gallery" />
              </div>

              <nav
                aria-label="Navegación del caso"
                appReveal
                [appRevealDelay]="120"
                class="case-tabs mt-8 overflow-x-auto border border-[var(--color-border)] px-4"
              >
                <div
                  class="flex w-max min-w-full gap-6 text-sm font-bold text-[var(--color-text-muted)]"
                >
                  <button
                    type="button"
                    class="border-b-2 border-transparent px-1 py-3 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    (click)="scrollToSection('historia')"
                  >
                    Historia
                  </button>
                  <button
                    type="button"
                    class="border-b-2 border-transparent px-1 py-3 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    (click)="scrollToSection('historial-clinico')"
                  >
                    Historial clínico
                  </button>
                </div>
              </nav>

              <section
                id="historia"
                appReveal
                class="case-story mt-12 max-w-[68ch] scroll-mt-24 rounded-2xl p-6 md:p-8"
              >
                <h2 class="text-3xl font-extrabold">Su historia</h2>
                <div class="mt-5 space-y-6 leading-7 text-[var(--color-text)] sm:text-justify">
                  @for (paragraph of item.story.slice(0, 3); track paragraph) {
                    <p>{{ paragraph }}</p>
                  }

                  @if (item.story.length > 3) {
                    <div
                      id="historia-contenido-adicional"
                      class="space-y-6 md:block"
                      [class.hidden]="!isStoryExpanded()"
                    >
                      @for (paragraph of item.story.slice(3); track paragraph) {
                        <p>{{ paragraph }}</p>
                      }
                    </div>
                  }
                </div>
                @if (item.story.length > 3) {
                  <button
                    type="button"
                    class="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] md:hidden"
                    [attr.aria-expanded]="isStoryExpanded()"
                    aria-controls="historia-contenido-adicional"
                    (click)="isStoryExpanded.set(!isStoryExpanded())"
                  >
                    {{ isStoryExpanded() ? 'Mostrar menos' : 'Leer historia completa' }}
                    <app-icon
                      name="chevron"
                      class="size-4 transition"
                      [class.rotate-90]="isStoryExpanded()"
                    />
                  </button>
                }
              </section>

              @if (item.updates.length > 0) {
                <div appReveal class="mt-12 max-w-[68ch]">
                  <app-updates-timeline [updates]="item.updates" />
                </div>
              }
            </div>

            <aside
              style="--intro-step: 5"
              class="page-intro page-intro--right hidden lg:sticky lg:top-24 lg:block"
            >
              <app-donation-card
                title="¿Querés ayudar?"
                [buttonVariant]="'primary'"
                [shareTitle]="shareTitle(item.name)"
                [shareText]="item.summary"
              />
            </aside>
          </div>
        </section>

        <div
          class="surface-glass fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 lg:hidden"
        >
          <div class="mx-auto flex max-w-md">
            <app-share-button
              class="min-w-0 flex-1"
              [title]="shareTitle(item.name)"
              [text]="item.summary"
              [showLabel]="true"
              [fullWidth]="true"
              [variant]="'primary'"
            />
          </div>
        </div>
      } @else {
        <section class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 class="text-4xl font-black">No encontramos este caso.</h1>
          <p class="mt-4 text-[var(--color-text-muted)]">
            Puede que el enlace haya cambiado o que el caso todavía no esté cargado.
          </p>
          <a
            routerLink="/casos"
            class="button-primary mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 font-extrabold"
          >
            Ver todos los casos
          </a>
        </section>
      }
    </main>

    <app-footer />
  `,
})
export class CaseDetailPageComponent {
  readonly slug = input.required<string>();

  private readonly casesService = inject(RescueCasesService);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly alias = DONATION_CONFIG.alias;
  protected readonly caseData = computed(() => this.casesService.getBySlug(this.slug()));
  protected readonly formatDate = formatDateNumeric;
  protected readonly isStoryExpanded = signal(false);

  constructor() {
    effect(() => {
      const item = this.caseData();
      const pageTitle = item
        ? `${item.name} | ${SITE_CONFIG.brandName}`
        : `Caso no encontrado | ${SITE_CONFIG.brandName}`;
      const description = item?.seoDescription ?? item?.summary ?? SITE_CONFIG.defaultDescription;
      this.title.setTitle(pageTitle);
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:title', content: pageTitle });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ property: 'og:image', content: this.shareImageUrl() });
      this.meta.updateTag({ property: 'og:image:alt', content: 'Gatarsis - Donde una vida vuelve a empezar' });
      this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
      this.meta.updateTag({ name: 'twitter:description', content: description });
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:image', content: this.shareImageUrl() });
    });
  }

  protected shareTitle(name: string): string {
    return `${name} | ${SITE_CONFIG.brandName}`;
  }

  private shareImageUrl(): string {
    return `${this.document.location.origin}/images/ui/hero-concepto-1.jpg`;
  }

  protected scrollToSection(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
