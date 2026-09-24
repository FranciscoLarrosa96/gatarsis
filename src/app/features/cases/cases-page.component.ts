import { Component, computed, inject, signal } from '@angular/core';

import { RescueCaseStatus } from '../../core/models/rescue-case.model';
import { RescueCasesService } from '../../core/services/rescue-cases.service';
import { ThemeService } from '../../core/services/theme.service';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { CaseCardComponent } from '../../shared/components/case-card/case-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type CaseFilter = RescueCaseStatus | 'all';
type CaseSort = 'name-asc' | 'name-desc';

@Component({
  selector: 'app-cases-page',
  imports: [
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    CaseCardComponent,
    EmptyStateComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  styles: `
    .cases-page {
      min-height: calc(100svh - 4rem);
      background:
        radial-gradient(
          circle at 94% 15%,
          color-mix(in srgb, var(--color-accent-soft) 36%, transparent),
          transparent 23rem
        ),
        radial-gradient(
          circle at 5% 72%,
          color-mix(in srgb, var(--color-surface-strong) 65%, transparent),
          transparent 21rem
        ),
        var(--color-bg);
    }

    .cases-decor-paw,
    .cases-decor-heart,
    .cases-decor-dots {
      position: absolute;
      z-index: -1;
      pointer-events: none;
      user-select: none;
    }

    .cases-decor-paw {
      width: clamp(7rem, 12vw, 10rem);
      opacity: 0.2;
    }

    .cases-decor-paw--hero {
      top: 3rem;
      left: -4.5rem;
      transform: rotate(-14deg);
    }

    .cases-decor-paw--cards-left {
      top: 13rem;
      left: -4.5rem;
      width: clamp(5.5rem, 9vw, 8rem);
      opacity: 0.16;
      transform: rotate(-25deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-right {
      top: 28rem;
      right: -3.5rem;
      width: clamp(5rem, 8vw, 7.5rem);
      opacity: 0.14;
      transform: rotate(22deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-bottom-left {
      bottom: -3.5rem;
      left: -3rem;
      width: clamp(5rem, 8vw, 7rem);
      opacity: 0.16;
      transform: rotate(-18deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-bottom-middle {
      bottom: 3rem;
      left: 46%;
      width: clamp(3.5rem, 6vw, 5.25rem);
      opacity: 0.13;
      transform: rotate(16deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-bottom-right {
      right: -2.75rem;
      bottom: -1.25rem;
      width: clamp(6rem, 9vw, 8rem);
      opacity: 0.18;
      transform: rotate(24deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-upper-right {
      top: 4.5rem;
      right: 2.5rem;
      width: clamp(3.5rem, 5.5vw, 5rem);
      opacity: 0.16;
      transform: rotate(25deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-middle-left {
      top: 34rem;
      left: 1.5rem;
      width: clamp(3.75rem, 6vw, 5.5rem);
      opacity: 0.15;
      transform: rotate(-20deg);
      z-index: 0;
    }

    .cases-decor-paw--cards-middle-right {
      top: 47rem;
      right: 4rem;
      width: clamp(3.25rem, 5vw, 4.75rem);
      opacity: 0.14;
      transform: rotate(15deg);
      z-index: 0;
    }

    .cases-decor-heart {
      top: 4.5rem;
      right: clamp(5rem, 13vw, 14rem);
      width: clamp(4rem, 6vw, 5.5rem);
      opacity: 0.5;
      transform: rotate(10deg);
    }

    .cases-decor-dots {
      width: clamp(11rem, 17vw, 16rem);
      aspect-ratio: 1;
      opacity: 0.32;
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--color-accent) 40%, transparent) 1.3px,
        transparent 1.55px
      );
      background-size: 0.78rem 0.78rem;
      mask-image: radial-gradient(circle, #000 20%, transparent 71%);
    }

    .cases-decor-dots--top {
      top: 1.5rem;
      left: 45%;
    }

    .cases-decor-dots--left {
      top: 27rem;
      left: -5rem;
    }

    .cases-decor-dots--cards {
      right: -3.5rem;
      bottom: -4rem;
      width: 11rem;
      opacity: 0.22;
      z-index: 0;
    }

    .cases-sort {
      appearance: auto;
    }

    :host-context(.dark) .cases-page {
      background:
        radial-gradient(
          circle at 93% 17%,
          color-mix(in srgb, var(--color-accent) 10%, transparent),
          transparent 25rem
        ),
        radial-gradient(
          circle at 5% 68%,
          color-mix(in srgb, var(--color-accent) 8%, transparent),
          transparent 23rem
        ),
        var(--color-bg);
    }

    :host-context(.dark) .cases-decor-paw,
    :host-context(.dark) .cases-decor-heart {
      opacity: 0.36;
      filter: drop-shadow(0 0 0.9rem rgba(181, 118, 255, 0.18));
    }

    :host-context(.dark) .cases-decor-dots {
      opacity: 0.42;
    }

    .cases-filter-idle {
      background: var(--color-card);
      border-color: var(--color-border-subtle);
    }

    :host-context(.dark) .cases-filter-idle {
      background: rgba(40, 32, 55, 0.94) !important;
      border-color: rgba(190, 130, 255, 0.36) !important;
      color: var(--color-text);
    }

    @media (max-width: 767px) {
      .cases-page {
        min-height: calc(100svh - 7.5rem);
        background:
          linear-gradient(155deg, color-mix(in srgb, var(--color-accent-soft) 46%, transparent), transparent 48%),
          linear-gradient(25deg, color-mix(in srgb, var(--color-surface-strong) 56%, transparent), transparent 56%),
          var(--color-bg);
      }
      .cases-decor-paw--hero {
        top: 3.25rem;
        left: -4rem;
        width: 4.75rem;
        opacity: 0.2;
      }
      .cases-decor-heart {
        top: 7rem;
        right: -0.65rem;
        width: 2.5rem;
      }
      .cases-decor-dots--top {
        top: 2.25rem;
        right: -2rem;
        left: auto;
        width: 6.5rem;
      }

      :host-context(.dark) .cases-page {
        background:
          linear-gradient(155deg, rgba(139, 81, 211, 0.24), transparent 52%),
          linear-gradient(25deg, rgba(81, 47, 132, 0.2), transparent 58%),
          var(--color-bg);
      }
    }
  `,
  template: `
    <app-header />

    <main id="contenido" class="cases-page relative isolate overflow-hidden">
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="cases-decor-paw cases-decor-paw--hero page-decor"
        style="--decor-delay: 250ms; --drift-duration: 10s"
      />
      <img
        src="images/extra/corazoncito-empty.png"
        alt=""
        aria-hidden="true"
        class="cases-decor-heart page-decor"
        style="--decor-delay: 550ms; --drift-duration: 7s"
      />
      <span
        aria-hidden="true"
        class="cases-decor-dots cases-decor-dots--top page-decor"
        style="--decor-delay: 400ms; --drift-duration: 12s"
      ></span>
      <span
        aria-hidden="true"
        class="cases-decor-dots cases-decor-dots--left page-decor hidden md:block"
        style="--decor-delay: 650ms; --drift-duration: 13s"
      ></span>
      <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
        <div class="max-w-2xl">
          <h1 class="page-intro page-intro--title text-5xl font-black leading-[0.98] md:text-6xl">
            Sus historias
            <span class="hidden align-middle text-[var(--color-accent)] sm:inline-flex"
              ><app-icon name="heart" class="page-heartbeat ml-2 size-9 md:size-10"
            /></span>
          </h1>
          <p
            class="page-intro mt-4 max-w-xl text-lg leading-7 text-[var(--color-text-muted)]"
            style="--intro-step: 1"
          >
            Seguí de cerca su evolución, tratamientos y recuperación desde el momento de su rescate.
          </p>
        </div>

        <div
          class="page-intro mt-9 flex justify-end md:absolute md:right-8 md:top-[13.5rem] md:mt-0"
          style="--intro-step: 2"
        >
          <label class="shrink-0">
            <span class="sr-only">Ordenar historias</span>
            <select
              class="cases-sort min-h-12 max-w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 pr-10 text-sm font-bold text-[var(--color-text)] shadow-sm"
              [value]="sort()"
              aria-label="Ordenar historias"
              (change)="setSort($any($event.target).value)"
            >
              <option value="name-asc">Ordenar: A-Z</option>
              <option value="name-desc">Ordenar: Z-A</option>
            </select>
          </label>
        </div>

        <div
          class="page-intro -mx-4 mt-3 flex gap-3 overflow-x-auto overscroll-x-contain px-4 py-2 sm:mx-0 sm:px-0"
          style="--intro-step: 3"
          aria-label="Filtrar casos"
        >
          @for (filter of filters; track filter.value) {
            <button
              type="button"
              [class]="filterClass(filter.value)"
              [style.background-color]="
                activeFilter() === filter.value || !theme.isDark() ? null : '#282037'
              "
              [style.color]="activeFilter() === filter.value || !theme.isDark() ? null : '#f8f4ff'"
              (click)="activeFilter.set(filter.value)"
              [attr.aria-pressed]="activeFilter() === filter.value"
            >
              <app-icon [name]="filter.icon" class="size-4" />
              {{ filter.label }}
            </button>
          }
        </div>

        <section class="relative mt-7 md:mt-8">
          @if (filteredCases().length > 0) {
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-left page-decor hidden md:block"
              style="--decor-delay: 620ms; --drift-duration: 10.5s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-right page-decor hidden md:block"
              style="--decor-delay: 740ms; --drift-duration: 12s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-upper-right page-decor hidden md:block"
              style="--decor-delay: 860ms; --drift-duration: 13.5s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-middle-left page-decor hidden md:block"
              style="--decor-delay: 980ms; --drift-duration: 9s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-middle-right page-decor hidden md:block"
              style="--decor-delay: 1100ms; --drift-duration: 10.5s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-bottom-left page-decor hidden md:block"
              style="--decor-delay: 1220ms; --drift-duration: 12s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-bottom-middle page-decor hidden md:block"
              style="--decor-delay: 1340ms; --drift-duration: 13.5s"
            />
            <img
              src="images/extra/paw.png"
              alt=""
              aria-hidden="true"
              class="cases-decor-paw cases-decor-paw--cards-bottom-right page-decor hidden md:block"
              style="--decor-delay: 1460ms; --drift-duration: 9s"
            />
            <span
              aria-hidden="true"
              class="cases-decor-dots cases-decor-dots--cards page-decor hidden md:block"
              style="--decor-delay: 700ms; --drift-duration: 14s"
            ></span>
            <div class="relative z-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              @for (item of filteredCases(); track item.slug) {
                <app-case-card
                  appReveal
                  class="relative z-10"
                  [appRevealDelay]="$index * 90"
                  [item]="item"
                />
              }
            </div>
          } @else {
            <app-empty-state message="No hay casos con este estado por el momento." />
          }
        </section>
      </div>
    </main>

    <app-footer />
    <app-bottom-navigation />
  `,
})
export class CasesPageComponent {
  private readonly casesService = inject(RescueCasesService);

  protected readonly theme = inject(ThemeService);

  protected readonly activeFilter = signal<CaseFilter>('all');
  protected readonly sort = signal<CaseSort>('name-asc');
  protected readonly filters: readonly {
    readonly value: CaseFilter;
    readonly label: string;
    readonly icon: IconName;
  }[] = [
    { value: 'all', label: 'Todos', icon: 'paw' },
    { value: 'treatment', label: 'En tratamiento', icon: 'stethoscope' },
    { value: 'recovering', label: 'Recuperados', icon: 'heart' },
    { value: 'closed', label: 'Adoptados', icon: 'home' },
    { value: 'memorial', label: 'En memoria', icon: 'spark' },
  ];
  protected readonly filteredCases = computed(() => {
    const direction = this.sort() === 'name-asc' ? 1 : -1;
    return [...this.casesService.getByStatus(this.activeFilter())].sort(
      (left, right) =>
        direction * left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
    );
  });

  protected setSort(value: string): void {
    if (value === 'name-asc' || value === 'name-desc') this.sort.set(value);
  }

  protected filterClass(value: CaseFilter): string {
    const baseClasses =
      'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition active:scale-[0.97]';
    const stateClasses =
      this.activeFilter() === value
        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
        : 'cases-filter-idle border text-[var(--color-text)]';

    return `${baseClasses} ${stateClasses}`;
  }
}
