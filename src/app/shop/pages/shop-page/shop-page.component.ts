import { Component, computed, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RevealOnScrollDirective } from '../../../shared/directives/reveal-on-scroll.directive';
import { PublicCommerceApiService } from '../../core/public-commerce-api.service';
import { PublicProduct } from '../../core/commerce.models';
import { formatArsFromCents } from '../../core/money.util';
import { productPriceLabel, selectCoverMedia } from '../../core/product-media.util';

type ProductSort = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

@Component({
  standalone: true,
  imports: [
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  template: `
    <app-header />
    <main
      id="contenido"
      class="shop-page relative isolate w-full max-w-none flex-1 overflow-hidden px-4 py-10 pb-28 sm:px-6 sm:pb-10 lg:px-8"
    >
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="shop-decor shop-decor-paw shop-decor-paw--left hidden lg:block"
      />
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="shop-decor shop-decor-paw shop-decor-paw--right hidden lg:block"
      />
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="shop-decor shop-decor-paw shop-decor-paw--top hidden lg:block"
      />
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="shop-decor shop-decor-paw shop-decor-paw--bottom-left hidden lg:block"
      />
      <img
        src="images/extra/corazoncito-empty.png"
        alt=""
        aria-hidden="true"
        class="shop-decor shop-decor-heart hidden lg:block"
      />
      <span aria-hidden="true" class="shop-decor shop-dots shop-dots--left hidden lg:block"></span>
      <span aria-hidden="true" class="shop-decor shop-dots shop-dots--right hidden lg:block"></span>
      <section appReveal="up" class="shop-intro max-w-none p-0">
        <p class="text-sm font-extrabold uppercase tracking-wide text-[var(--color-accent)]">
          Tienda online
        </p>

        <p class="mt-4 text-lg text-[var(--color-text-muted)]">
          Elegí lo que más te guste y llevate <br />un pedacito de <br />
          <span class="text-[var(--color-accent)]">Gatarsis</span> con vos.
          <img
            src="images/extra/corazon-lleno.png"
            alt=""
            aria-hidden="true"
            class="ml-2 inline-block size-10 align-middle object-contain w-20 h-20 img-corazon-lleno"
          />
        </p>
      </section>

      @if (loading()) {
        <div
          class="mt-12 rounded-2xl border border-[var(--color-border)] p-8 text-[var(--color-text-muted)]"
        >
          Cargando tienda...
        </div>
      } @else if (error()) {
        <div class="mt-12 rounded-2xl border border-[var(--color-border)] p-8" role="alert">
          <p class="font-bold">No pudimos cargar la tienda en este momento.</p>
          <button
            class="button-primary mt-4 rounded-full px-5 py-2 font-extrabold"
            type="button"
            (click)="load()"
          >
            Reintentar
          </button>
        </div>
      } @else if (products().length) {
        <div
          appReveal="up"
          [appRevealDelay]="90"
          class="shop-sort mt-8 flex flex-wrap items-center gap-3"
        >
          <label class="grid gap-1 text-sm font-bold text-[var(--color-text-muted)]">
            Ordenar por:
            <select
              class="soft-chip min-h-11 rounded-xl border px-3 text-sm font-bold text-[var(--color-text)]"
              [value]="sort()"
              (change)="setSort($any($event.target).value)"
            >
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
            </select>
          </label>
        </div>

        <section
          class="shop-grid mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-5 sm:gap-6"
        >
          @for (product of visibleProducts(); track product.id) {
            <article
              appReveal="up"
              [appRevealDelay]="$index * 65"
              class="shop-card dark-neon-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_12px_28px_rgba(58,45,72,0.08)]"
            >
              <a
                [routerLink]="['/tienda', product.slug]"
                class="block"
                [attr.aria-label]="'Ver producto ' + product.name"
              >
                <div
                  class="shop-card-media product-media-hover relative aspect-[3/2] overflow-hidden bg-[var(--color-surface)] transition-shadow duration-200 ease-out group-hover:shadow-[0_12px_24px_rgba(58,45,72,0.14)]"
                >
                  @if (cover(product); as media) {
                    <img
                      class="h-full w-full object-cover"
                      [src]="media.url"
                      [alt]="media.alt"
                      loading="lazy"
                      decoding="async"
                    />
                  } @else {
                    <div
                      class="grid h-full place-items-center px-6 text-center text-sm font-bold text-[var(--color-text-muted)]"
                    >
                      Gatarsis
                    </div>
                  }
                </div>
                <div class="mt-4 flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <h2 class="text-xl font-black">{{ product.name }}</h2>
                    @if (product.shortDescription) {
                      <p class="mt-1 text-sm text-[var(--color-text-muted)]">
                        {{ product.shortDescription }}
                      </p>
                    }
                  </div>
                  <p class="shrink-0 text-lg font-black">{{ priceLabel(product) }}</p>
                </div>
                <div
                  class="mt-3 flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-3"
                >
                  <p class="text-sm font-bold text-[var(--color-text-muted)]">
                    {{ stockLabel(product) }}
                  </p>
                  <span
                    class="inline-flex items-center gap-1 text-sm font-extrabold text-[var(--color-accent)]"
                    >Ver producto <app-icon name="arrow" class="size-4"
                  /></span>
                </div>
              </a>
            </article>
          }
        </section>
        <aside
          appReveal="up"
          class="shop-thanks mt-9 flex items-center gap-4 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 shadow-[0_12px_30px_rgba(58,45,72,0.08)] dark-neon-card sm:px-7"
        >
          <span
            class="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--color-accent)]"
            ><img
              src="images/extra/corazon-lleno.png"
              alt=""
              aria-hidden="true"
              class="size-8 object-contain brightness-0 invert"
          /></span>
          <p class="text-sm leading-5 text-[var(--color-text-muted)]">
            Cada compra nos ayuda a seguir rescatando vidas.<strong
              class="block text-base text-[var(--color-text)]"
              >¡Gracias por ser parte de esta comunidad!</strong
            >
          </p>
          <img
            src="images/extra/paw.png"
            alt=""
            aria-hidden="true"
            class="ml-auto hidden size-14 shrink-0 rotate-12 object-contain opacity-35 sm:block"
          />
        </aside>
      } @else {
        <div class="mt-12 rounded-2xl border border-[var(--color-border)] p-8">
          <p class="text-xl font-black">La tienda está preparando una nueva tanda.</p>
          <p class="mt-2 text-[var(--color-text-muted)]">
            Volvé pronto para ver los próximos productos solidarios.
          </p>
        </div>
      }
    </main>
    <app-footer />
    <app-bottom-navigation />
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100dvh;
      flex-direction: column;
    }

    .shop-page {
      background:
        radial-gradient(
          circle at 4% 47%,
          color-mix(in srgb, var(--color-accent-soft) 43%, transparent),
          transparent 18rem
        ),
        radial-gradient(
          circle at 96% 74%,
          color-mix(in srgb, var(--color-accent-soft) 33%, transparent),
          transparent 22rem
        ),
        var(--color-bg);
    }

    .shop-page > :not(.shop-decor) {
      width: min(100%, 80rem);
      margin-right: auto;
      margin-left: auto;
    }

    .shop-intro > p:first-child {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
    }

    .shop-intro > p:first-child::before,
    .shop-intro > p:first-child::after {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: var(--color-accent);
      content: '';
      box-shadow: 0 0 0 0.25rem color-mix(in srgb, var(--color-accent) 12%, transparent);
    }

    .shop-intro > p:last-child {
      max-width: 54rem;
      font-size: clamp(2rem, 3vw, 2.6rem);
      font-weight: 900;
      line-height: 1.17;
      text-align: left;
      color: var(--color-text);
    }

    .shop-decor {
      position: absolute;
      z-index: -1;
      pointer-events: none;
      user-select: none;
    }

    .shop-decor-paw {
      width: clamp(6.5rem, 10vw, 10rem);
      opacity: 0.24;
    }

    .shop-decor-paw--left {
      top: 12rem;
      left: clamp(1rem, 4vw, 5rem);
      transform: rotate(-18deg);
    }

    .shop-decor-paw--right {
      right: clamp(1rem, 4vw, 5rem);
      bottom: 4rem;
      transform: rotate(20deg);
    }

    .shop-decor-paw--top {
      top: 9rem;
      right: clamp(2rem, 8vw, 9rem);
      transform: rotate(16deg);
    }

    .shop-decor-paw--bottom-left {
      bottom: 7rem;
      left: clamp(2rem, 7vw, 8rem);
      transform: rotate(-26deg);
    }

    .shop-decor-heart {
      top: 10rem;
      right: clamp(11rem, 19vw, 19rem);
      width: clamp(5rem, 9vw, 8rem);
      opacity: 0.32;
      transform: rotate(14deg);
    }

    .shop-dots {
      width: 12rem;
      aspect-ratio: 1;
      opacity: 0.28;
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--color-accent) 46%, transparent) 1.35px,
        transparent 1.65px
      );
      background-size: 0.8rem 0.8rem;
      mask-image: radial-gradient(circle, #000 18%, transparent 70%);
    }

    .shop-dots--left {
      top: 1rem;
      left: -2rem;
    }
    .shop-dots--right {
      top: 0;
      right: 1rem;
    }

    .shop-sort {
      width: min(100%, 36rem);
      border: 1px solid color-mix(in srgb, var(--color-border) 74%, #fff);
      border-radius: 1rem;
      background: var(--color-card);
      padding: 0.65rem 1rem;
      box-shadow: 0 0.75rem 1.9rem rgba(58, 45, 72, 0.08);
    }

    .shop-sort label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .shop-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .shop-card > a {
      display: grid;
      height: 100%;
      min-height: 13.5rem;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 0 1rem;
      padding: 0.8rem;
    }

    .shop-card {
      border-color: transparent;
      box-shadow: 0 0.9rem 2rem rgba(58, 45, 72, 0.08);
    }

    .shop-card-media {
      grid-row: 1 / span 2;
      min-height: 0;
      aspect-ratio: auto;
      border-radius: 0.75rem;
    }

    .shop-card-media > img {
      position: absolute;
      inset: 0;
    }

    .shop-card > a > div:nth-child(2) {
      margin-top: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: 0.7rem 0.2rem 0.45rem;
    }

    .shop-card > a > div:nth-child(2) h2 {
      font-size: 1.05rem;
      line-height: 1.28;
    }
    .shop-card > a > div:nth-child(2) > div > p {
      display: none;
    }
    .shop-card > a > div:nth-child(2) p {
      margin-top: 0.55rem;
      color: var(--color-accent);
    }
    .shop-card > a > div:nth-child(2) p:not(:last-child) {
      display: none;
    }

    .shop-card > a > div:nth-child(3) {
      margin-top: 0;
      flex-direction: column;
      align-items: stretch;
      padding: 0.55rem 0.2rem 0.7rem;
    }

    .shop-card > a > div:nth-child(3) p::before {
      display: inline-block;
      width: 0.7rem;
      height: 0.7rem;
      margin-right: 0.45rem;
      border-radius: 50%;
      background: #22a447;
      content: '';
      box-shadow: inset 0 0 0 0.2rem var(--color-card);
    }

    .shop-card > a > div:nth-child(3) span {
      min-height: 2.7rem;
      width: 100%;
      margin-top: 0.9rem;
      justify-content: center;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      padding: 0.55rem 0.7rem;
    }

    .shop-card > a:hover > div:nth-child(3) span {
      border-color: var(--color-accent);
      background: var(--color-accent-soft);
    }

    :host-context(.dark) .shop-page {
      background:
        radial-gradient(circle at 4% 47%, rgba(153, 94, 220, 0.14), transparent 18rem),
        radial-gradient(circle at 96% 74%, rgba(153, 94, 220, 0.1), transparent 22rem),
        var(--color-bg);
    }

    :host-context(.dark) .shop-decor-paw,
    :host-context(.dark) .shop-decor-heart {
      opacity: 0.3;
      filter: drop-shadow(0 0 0.8rem rgba(183, 126, 255, 0.18));
    }

    :host-context(.dark) .shop-card {
      border-color: var(--dark-neon-border);
    }

    :host-context(.dark) .shop-dots {
      opacity: 0.44;
    }

    @media (max-width: 1100px) {
      .shop-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 639px) {
      .shop-page {
        background:
          linear-gradient(155deg, color-mix(in srgb, var(--color-accent-soft) 44%, transparent), transparent 49%),
          linear-gradient(28deg, color-mix(in srgb, var(--color-surface-strong) 55%, transparent), transparent 58%),
          var(--color-bg);
      }
      .shop-intro {
        padding-left: 0;
      }
      .shop-intro > p:last-child {
        position: relative;
        padding-right: 4.75rem;
        font-size: 2rem;
      }
      .img-corazon-lleno {
        position: absolute;
        top: 0;
        right: 0;
        margin: 0;
      }
      :host-context(.dark) .shop-page {
        background:
          linear-gradient(155deg, rgba(139, 81, 211, 0.22), transparent 52%),
          linear-gradient(28deg, rgba(81, 47, 132, 0.18), transparent 58%),
          var(--color-bg);
      }
      .shop-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .shop-card > a {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        min-height: 12.5rem;
        gap: 0 0.8rem;
        padding: 0.65rem;
      }
      .shop-card > a > div:nth-child(2) {
        padding: 0.7rem 0.1rem 0.3rem;
      }
      .shop-card > a > div:nth-child(3) {
        padding: 0.45rem 0.1rem 0.7rem;
      }
    }

    @media (max-width: 639px) {
      .img-corazon-lleno {
        position: absolute !important;
        top: 0 !important;
        right: 0 !important;
      }
    }
  `,
})
export class ShopPageComponent implements OnInit {
  readonly products = signal<PublicProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly sort = signal<ProductSort>('name-asc');
  readonly visibleProducts = computed(() => {
    const direction = this.sort() === 'name-desc' ? -1 : 1;

    return [...this.products()].sort((left, right) => {
      if (this.sort() === 'price-asc' || this.sort() === 'price-desc') {
        const leftPrice = this.lowestSellablePrice(left);
        const rightPrice = this.lowestSellablePrice(right);
        if (!Number.isFinite(leftPrice)) return Number.isFinite(rightPrice) ? 1 : 0;
        if (!Number.isFinite(rightPrice)) return -1;
        if (leftPrice !== rightPrice) {
          return this.sort() === 'price-asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
        }
      }
      return direction * left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
    });
  });

  constructor(private readonly api: PublicCommerceApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .products()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.error.set(true),
      });
  }

  cover(product: PublicProduct) {
    return selectCoverMedia(product);
  }

  priceLabel(product: PublicProduct): string {
    return productPriceLabel(product, formatArsFromCents);
  }

  stockLabel(product: PublicProduct): string {
    const total = this.totalAvailableStock(product);
    return total > 0 ? 'Disponible' : 'Sin stock';
  }

  setSort(value: string): void {
    if (
      value === 'name-asc' ||
      value === 'name-desc' ||
      value === 'price-asc' ||
      value === 'price-desc'
    ) {
      this.sort.set(value);
    }
  }

  private totalAvailableStock(product: PublicProduct): number {
    return product.variants.reduce((sum, variant) => sum + variant.availableStock, 0);
  }

  private lowestSellablePrice(product: PublicProduct): number {
    const prices = product.variants
      .filter((variant) => variant.availableStock > 0 && variant.priceInCents > 0)
      .map((variant) => variant.priceInCents);
    return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
  }
}
