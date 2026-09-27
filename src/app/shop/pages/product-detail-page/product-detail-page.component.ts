import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CartStore } from '../../core/cart.store';
import {
  PublicProduct,
  PublicProductMedia,
  PublicProductVariant,
} from '../../core/commerce.models';
import { formatArsFromCents } from '../../core/money.util';
import {
  galleryForVariant,
  selectGalleryCover,
  selectVariantDisplayMedia,
} from '../../core/product-media.util';
import {
  attributeKeys,
  attributeLabel,
  colorSwatch,
  hasStructuredAttributes,
  isValidAttributeValue,
  publicVariantLabel,
  sortAttributeValues,
  variantAttribute,
} from '../../core/variant-color.util';
import { PublicCommerceApiService } from '../../core/public-commerce-api.service';
import { RescueImage } from '../../../core/models/rescue-image.model';
import { PhotoSwipeService } from '../../../core/services/photo-swipe.service';

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
    <app-header />
    <main id="contenido" class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <a routerLink="/tienda" class="text-sm font-bold text-[var(--color-accent)]"
        >Volver a tienda</a
      >

      @if (loading()) {
        <div class="mt-10 rounded-2xl border border-[var(--color-border)] p-8">
          Cargando producto...
        </div>
      } @else if (error()) {
        <div class="mt-10 rounded-2xl border border-[var(--color-border)] p-8" role="alert">
          No pudimos cargar este producto.
        </div>
      } @else if (product(); as item) {
        <section class="mt-8 grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <button
              type="button"
              class="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[var(--color-surface)] text-left"
              (click)="openGallery(item)"
              aria-label="Abrir imágenes del producto en tamaño completo"
            >
              @if (selectedMedia(); as media) {
                <img
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                  [src]="media.url"
                  [alt]="media.alt"
                  decoding="async"
                />
                <span
                  class="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-lg bg-black/55 text-white shadow-sm backdrop-blur transition duration-300 group-hover:scale-105 group-focus-visible:scale-105"
                  aria-hidden="true"
                >
                  <app-icon name="expand" class="size-5" />
                </span>
              } @else {
                <div
                  class="grid h-full place-items-center font-black text-[var(--color-text-muted)]"
                >
                  Gatarsis
                </div>
              }
            </button>
            @if (galleryMedia(item).length > 1) {
              <div class="mt-4 flex gap-3 overflow-auto">
                @for (media of galleryMedia(item); track media.id) {
                  <button
                    type="button"
                    class="size-20 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)]"
                    (click)="selectedMedia.set(media)"
                    [attr.aria-label]="'Ver imagen ' + media.alt"
                  >
                    <img
                      class="h-full w-full object-cover"
                      [src]="media.url"
                      [alt]="media.alt"
                      loading="lazy"
                    />
                  </button>
                }
              </div>
            }
          </div>

          <div class="lg:pt-8">
            <p class="text-sm font-extrabold uppercase tracking-wide text-[var(--color-accent)]">
              Tienda Gatarsis
            </p>
            <h1 class="mt-3 text-4xl font-black">{{ item.name }}</h1>
            @if (item.shortDescription) {
              <p class="mt-4 text-lg text-[var(--color-text-muted)]">{{ item.shortDescription }}</p>
            }
            <p class="mt-6 text-2xl font-black">{{ priceLabel(item) }}</p>

            @if (usesStructuredAttributes(item)) {
              @for (key of structuredAttributeKeys(item); track key) {
                <fieldset class="mt-8">
                  <legend
                    class="text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]"
                  >
                    {{ attributeLabel(key) }}
                  </legend>
                  @if (attributeOptions(item, key).length) {
                    <div class="mt-3 flex flex-wrap gap-2">
                      @for (value of attributeOptions(item, key); track value) {
                        <button
                          type="button"
                          [class]="attributeButtonClass(item, key, value)"
                          [disabled]="isAttributeOptionDisabled(item, key, value)"
                          [attr.aria-pressed]="selectedAttributes()[key] === value"
                          (click)="selectAttribute(item, key, value)"
                        >
                          @if (key === 'color' && colorSwatch(value); as swatch) {
                            <span
                              class="size-3 rounded-full border border-[var(--color-text-muted)] shadow-[0_0_0_2px_var(--color-card)]"
                              [style.background-color]="swatch"
                              aria-hidden="true"
                            ></span>
                          }
                          {{ value }}
                        </button>
                      }
                    </div>
                  } @else {
                    <p class="mt-3 text-sm font-bold text-[var(--color-text-muted)]">
                      {{ emptyAttributeMessage(key) }}
                    </p>
                  }
                </fieldset>
              }
            } @else {
              <fieldset class="mt-8">
                <legend
                  class="text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]"
                >
                  Variante
                </legend>
                <div class="mt-3 grid gap-3">
                  @for (variant of item.variants; track variant.id) {
                    <button
                      type="button"
                      class="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-left disabled:opacity-50"
                      [style.border-color]="
                        selectedVariant()?.id === variant.id ? 'var(--color-accent)' : null
                      "
                      [disabled]="variant.availableStock <= 0"
                      (click)="selectVariant(variant)"
                    >
                      <span>
                        <strong>{{ publicVariantLabel(variant) }}</strong>
                      </span>
                      <span class="font-black">{{ money(variant.priceInCents) }}</span>
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (selectedVariant(); as variant) {
              <p class="mt-5 font-bold">{{ stockText(variant) }}</p>
              <div class="mt-5 flex items-center gap-3">
                <button
                  class="rounded-full border border-[var(--color-border)] px-4 py-2"
                  type="button"
                  aria-label="Disminuir cantidad"
                  (click)="quantity.set(max(1, quantity() - 1))"
                >
                  -
                </button>
                <span class="min-w-8 text-center font-black">{{ quantity() }}</span>
                <button
                  class="rounded-full border border-[var(--color-border)] px-4 py-2"
                  type="button"
                  aria-label="Aumentar cantidad"
                  (click)="quantity.set(min(variant.availableStock, quantity() + 1))"
                >
                  +
                </button>
              </div>
              <button
                class="button-primary mt-6 min-h-12 rounded-full px-7 font-extrabold disabled:opacity-50"
                type="button"
                [disabled]="variant.availableStock <= 0"
                (click)="addToCart(item, variant)"
              >
                Agregar al carrito
              </button>
              @if (added()) {
                <p class="mt-3 font-bold text-[#23623a]" aria-live="polite">
                  Producto agregado al carrito.
                </p>
              }
            } @else {
              <p class="mt-5 font-bold text-[var(--color-text-muted)]">
                {{
                  usesStructuredAttributes(item)
                    ? 'Elegí las opciones para continuar.'
                    : 'Sin stock.'
                }}
              </p>
              <button
                class="button-primary mt-6 min-h-12 rounded-full px-7 font-extrabold opacity-50"
                type="button"
                disabled
              >
                Agregar al carrito
              </button>
            }
            <p class="mt-5 text-sm text-[var(--color-text-muted)]">
              El stock se reserva recién al iniciar el pago.
            </p>
          </div>
        </section>
      }
    </main>
    <app-footer />
    <app-bottom-navigation />
  `,
})
export class ProductDetailPageComponent implements OnInit {
  private readonly photoSwipe = inject(PhotoSwipeService);
  readonly product = signal<PublicProduct | null>(null);
  readonly selectedMedia = signal<PublicProductMedia | null>(null);
  readonly selectedVariant = signal<PublicProductVariant | null>(null);
  readonly selectedAttributes = signal<Record<string, string>>({});
  readonly quantity = signal(1);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly added = signal(false);
  readonly min = Math.min;
  readonly max = Math.max;
  protected readonly attributeLabel = attributeLabel;
  protected readonly colorSwatch = colorSwatch;
  protected readonly publicVariantLabel = publicVariantLabel;

  constructor(
    private readonly api: PublicCommerceApiService,
    private readonly route: ActivatedRoute,
    private readonly cart: CartStore,
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.api
      .products()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => {
          const product = products.find((item) => item.slug === slug) ?? null;
          this.product.set(product);
          if (product) this.initializeSelection(product);
          this.error.set(!product);
        },
        error: () => this.error.set(true),
      });
  }

  usesStructuredAttributes(product: PublicProduct): boolean {
    return product.variants.some(hasStructuredAttributes);
  }

  structuredAttributeKeys(product: PublicProduct): string[] {
    const model = this.selectedAttributes()['model'];
    return attributeKeys(model ? product.variants.filter((item) => variantAttribute(item, 'model') === model) : product.variants);
  }

  attributeOptions(product: PublicProduct, key: string): string[] {
    const keys = this.structuredAttributeKeys(product);
    const previousKeys = keys.slice(0, keys.indexOf(key));
    return sortAttributeValues(key, [
      ...new Set(
        product.variants
          .filter((variant) =>
            previousKeys.every(
              (previous) =>
                variantAttribute(variant, previous) === this.selectedAttributes()[previous],
            ),
          )
          .map((variant) => variantAttribute(variant, key))
          .filter((value): value is string => isValidAttributeValue(key, value)),
      ),
    ]);
  }

  isAttributeOptionDisabled(product: PublicProduct, key: string, value: string): boolean {
    const keys = this.structuredAttributeKeys(product);
    const previousKeys = keys.slice(0, keys.indexOf(key));
    const matching = product.variants.filter(
      (variant) =>
        variantAttribute(variant, key) === value &&
        previousKeys.every(
          (previous) => variantAttribute(variant, previous) === this.selectedAttributes()[previous],
        ),
    );
    return !matching.length || matching.every((variant) => variant.availableStock <= 0);
  }

  attributeButtonClass(product: PublicProduct, key: string, value: string): string {
    const selected = this.selectedAttributes()[key] === value;
    const shape = key === 'color' ? 'inline-flex items-center gap-2 rounded-full' : 'rounded-xl';
    const base =
      'min-h-11 border px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 ' +
      shape;
    return selected
      ? base + ' border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
      : base +
          ' border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]';
  }

  emptyAttributeMessage(key: string): string {
    return key === 'size'
      ? 'Los talles de este producto todavía no están disponibles.'
      : 'No hay opciones disponibles.';
  }

  selectAttribute(product: PublicProduct, key: string, value: string): void {
    const keys = this.structuredAttributeKeys(product);
    const keyIndex = keys.indexOf(key);
    const next = Object.fromEntries(
      keys.slice(0, keyIndex).filter((previous) => !!this.selectedAttributes()[previous])
        .map((previous) => [previous, this.selectedAttributes()[previous]]),
    );
    next[key] = value;
    this.selectedAttributes.set(next);
    this.selectedVariant.set(this.variantForAttributes(product, next));
    this.selectedMedia.set(selectGalleryCover(this.galleryMedia(product)));
    this.quantity.set(1);
    this.added.set(false);
  }

  galleryMedia(product: PublicProduct): PublicProductMedia[] {
    const variant =
      this.selectedVariant() ?? this.variantForAttributes(product, this.selectedAttributes(), true);
    return galleryForVariant(product, variant);
  }

  async openGallery(product: PublicProduct): Promise<void> {
    const media = this.galleryMedia(product);
    const selectedId = this.selectedMedia()?.id;
    const index = Math.max(
      0,
      media.findIndex((item) => item.id === selectedId),
    );
    await this.photoSwipe.open(
      media.map(
        (item) =>
          ({
            src: item.url,
            alt: item.alt,
            width: 1600,
            height: 1200,
          }) satisfies RescueImage,
      ),
      index,
    );
  }

  selectVariant(variant: PublicProductVariant): void {
    this.selectedVariant.set(variant);
    const product = this.product();
    this.selectedMedia.set(
      product ? selectGalleryCover(galleryForVariant(product, variant)) : null,
    );
    this.quantity.set(1);
    this.added.set(false);
  }

  addToCart(product: PublicProduct, variant: PublicProductVariant): void {
    this.cart.add({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: publicVariantLabel(variant),
      sku: variant.sku,
      unitPriceInCents: variant.priceInCents,
      quantity: this.quantity(),
      availableStock: variant.availableStock,
      imageUrl: selectVariantDisplayMedia(product, variant)?.url ?? null,
    });
    this.added.set(true);
  }

  priceLabel(product: PublicProduct): string {
    const selected = this.selectedVariant();
    if (selected) return this.money(selected.priceInCents);
    const selection = this.selectedAttributes();
    const variants = product.variants.filter(
      (variant) =>
        variant.availableStock > 0 &&
        variant.priceInCents > 0 &&
        Object.entries(selection).every(([key, value]) => variantAttribute(variant, key) === value),
    );
    if (!variants.length) return 'Sin precio';
    const prices = variants.map((variant) => variant.priceInCents);
    const min = Math.min(...prices);
    return prices.every((price) => price === min) ? this.money(min) : this.money(min);
  }

  money(value: number): string {
    return formatArsFromCents(value);
  }

  stockText(variant: PublicProductVariant): string {
    if (variant.availableStock <= 0) return 'Sin stock';
    return variant.availableStock <= 3 ? 'Quedan ' + variant.availableStock : 'Disponible';
  }

  private initializeSelection(product: PublicProduct): void {
    if (!this.usesStructuredAttributes(product)) {
      const variant = product.variants.find((item) => item.availableStock > 0);
      if (variant) this.selectVariant(variant);
      else this.selectedMedia.set(selectGalleryCover(galleryForVariant(product, null)));
      return;
    }
    const firstKey = this.structuredAttributeKeys(product)[0];
    const firstValue = firstKey
      ? this.attributeOptions(product, firstKey).find(
          (value) => !this.isAttributeOptionDisabled(product, firstKey, value),
        )
      : null;
    if (firstKey && firstValue) this.selectAttribute(product, firstKey, firstValue);
    else this.selectedMedia.set(selectGalleryCover(galleryForVariant(product, null)));
  }

  private variantForAttributes(
    product: PublicProduct,
    selection: Record<string, string>,
    allowPartial = false,
  ): PublicProductVariant | null {
    const keys = this.structuredAttributeKeys(product);
    if (!allowPartial && keys.some((key) => !selection[key])) return null;
    return (
      product.variants.find((variant) =>
        Object.entries(selection).every(([key, value]) => variantAttribute(variant, key) === value),
      ) ?? null
    );
  }
}
