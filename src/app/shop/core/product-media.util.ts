import { PublicProduct, PublicProductMedia, PublicProductVariant } from './commerce.models';
import { variantAttribute } from './variant-color.util';

export function selectCoverMedia(product: PublicProduct): PublicProductMedia | null {
  const general = selectCoverFromMedia(product.media);
  if (general) return general;
  const variantMedia = product.variants
    .filter((variant) => variant.availableStock > 0)
    .flatMap((variant) => sortedMedia(variant.media ?? []));
  return variantMedia.find((item) => item.isCover) ?? variantMedia[0] ?? null;
}

export function galleryForVariant(
  product: PublicProduct,
  variant: PublicProductVariant | null,
): PublicProductMedia[] {
  const specific = sortedMedia(variant?.media ?? []);
  if (specific.length) return specific;
  const model = variant ? variantAttribute(variant, 'model') : null;
  const color = variant ? variantAttribute(variant, 'color') : null;
  if (model) {
    const sameModelMedia = product.variants
      .filter((candidate) => variantAttribute(candidate, 'model') === model && (!color || variantAttribute(candidate, 'color') === color))
      .flatMap((candidate) => sortedMedia(candidate.media ?? []));
    if (sameModelMedia.length) return sameModelMedia;
    return sortedMedia(product.media);
  }
  if (color) {
    const sameColorMedia = product.variants
      .filter(
        (candidate) =>
          candidate.id !== variant?.id && variantAttribute(candidate, 'color') === color,
      )
      .flatMap((candidate) => sortedMedia(candidate.media ?? []));
    if (sameColorMedia.length) return sameColorMedia;
  }
  return sortedMedia(product.media);
}

export function selectGalleryCover(media: PublicProductMedia[]): PublicProductMedia | null {
  const sorted = sortedMedia(media);
  return sorted.find((item) => item.isCover) ?? sorted[0] ?? null;
}

export function selectVariantDisplayMedia(
  product: PublicProduct,
  variant: PublicProductVariant,
): PublicProductMedia | null {
  return selectGalleryCover(galleryForVariant(product, variant));
}

function selectCoverFromMedia(media: PublicProductMedia[]): PublicProductMedia | null {
  return selectGalleryCover(media);
}

function sortedMedia(media: PublicProductMedia[]): PublicProductMedia[] {
  return [...media].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function activeVariants(product: PublicProduct) {
  return product.variants.filter((variant) => variant.availableStock > 0);
}

export function productPriceLabel(
  product: PublicProduct,
  formatter: (value: number) => string,
): string {
  const variants = product.variants.filter(
    (variant) =>
      variant.availableStock > 0 &&
      Number.isFinite(variant.priceInCents) &&
      variant.priceInCents > 0,
  );
  if (!variants.length) return 'Sin precio';
  const prices = variants.map((variant) => variant.priceInCents);
  const min = Math.min(...prices);
  return prices.every((price) => price === min) ? formatter(min) : `${formatter(min)}`;
}
