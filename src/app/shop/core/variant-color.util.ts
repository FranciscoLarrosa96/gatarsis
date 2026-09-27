import { PublicProductVariant, VariantAttributes } from './commerce.models';

const VARIANT_COLOR_MAP: Record<string, string> = {
  blanco: '#f6f2ed',
  white: '#f6f2ed',
  negro: '#161616',
  black: '#161616',
  gris: '#8b8f98',
  gray: '#8b8f98',
  grey: '#8b8f98',
  lila: '#a56bdc',
  lilac: '#a56bdc',
  violeta: '#725a9c',
  purple: '#725a9c',
  rosa: '#e58a9e',
  pink: '#e58a9e',
  naranja: '#f28c28',
  orange: '#f28c28',
};

const ATTRIBUTE_LABELS: Readonly<Record<string, string>> = {
  model: 'Modelo',
  color: 'Color',
  size: 'Talle',
};

const SIZE_ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL'];

export function variantColor(variant: PublicProductVariant): string | null {
  return colorSwatch(variantAttribute(variant, 'color'));
}

export function publicVariantLabel(variant: PublicProductVariant): string {
  const model = variantAttribute(variant, 'model');
  if (model) return [model, variantAttribute(variant, 'color'), variantAttribute(variant, 'size')].filter(Boolean).join(' · ');
  if (!hasExplicitAttributes(variant)) return variant.name;
  const color = variantAttribute(variant, 'color');
  const size = variantAttribute(variant, 'size');
  if (color && size) return color + ' · Talle ' + size;
  return color ?? size ?? variant.name;
}

export function variantAttribute(variant: PublicProductVariant, key: string): string | null {
  const value = effectiveAttributes(variant)[key];
  const normalized = value?.trim();
  return normalized || null;
}

export function hasStructuredAttributes(variant: PublicProductVariant): boolean {
  return Object.keys(effectiveAttributes(variant)).length > 0;
}

export function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key;
}

export function attributeKeys(variants: PublicProductVariant[]): string[] {
  const keys = new Set<string>();
  variants.forEach((variant) =>
    Object.entries(effectiveAttributes(variant)).forEach(([key, value]) => {
      if (value.trim()) keys.add(key);
    }),
  );
  const priority = ['model', 'color', 'size'];
  return [...keys].sort(
    (left, right) =>
      (priority.indexOf(left) + 1 || 99) - (priority.indexOf(right) + 1 || 99) ||
      left.localeCompare(right),
  );
}

export function attributesForVariant(variant: PublicProductVariant): VariantAttributes {
  return effectiveAttributes(variant);
}

export function colorSwatch(color: string | null): string | null {
  const normalized = color?.trim().toLowerCase();
  return normalized ? (VARIANT_COLOR_MAP[normalized] ?? null) : null;
}

export function isValidAttributeValue(key: string, value: string | null): boolean {
  return !!value && (key !== 'size' || !/[,/]/.test(value));
}

export function sortAttributeValues(key: string, values: readonly string[]): string[] {
  if (key !== 'size') return [...values];

  return [...values].sort((left, right) => compareSizes(left, right));
}

function compareSizes(left: string, right: string): number {
  const leftNormalized = left.trim().toUpperCase();
  const rightNormalized = right.trim().toUpperCase();
  const leftRank = SIZE_ORDER.indexOf(leftNormalized);
  const rightRank = SIZE_ORDER.indexOf(rightNormalized);

  if (leftRank !== -1 || rightRank !== -1) {
    return (leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank) -
      (rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank);
  }

  const leftNumber = Number(leftNormalized);
  const rightNumber = Number(rightNormalized);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;

  return leftNormalized.localeCompare(rightNormalized, 'es');
}

function effectiveAttributes(variant: PublicProductVariant): VariantAttributes {
  return {
    ...(variant.model ? { model: variant.model } : {}),
    ...(variant.color ? { color: variant.color } : {}),
    ...(variant.size ? { size: variant.size } : {}),
    ...(variant.attributes ?? {}),
  };
}

function hasExplicitAttributes(variant: PublicProductVariant): boolean {
  return Object.values(variant.attributes ?? {}).some((value) => value.trim().length > 0);
}
