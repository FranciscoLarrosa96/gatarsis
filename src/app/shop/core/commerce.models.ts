export const PUBLIC_API_BASE_URL = 'https://gatarsisback.onrender.com/api/v1';

export interface PublicProductMedia {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  isCover: boolean;
}

export type VariantAttributes = Readonly<Record<string, string>>;

export interface PublicProductVariant {
  id: string;
  sku: string;
  name: string;
  color: string | null;
  size: string | null;
  attributes?: VariantAttributes | null;
  priceInCents: number;
  availableStock: number;
  media?: PublicProductMedia[];
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  media: PublicProductMedia[];
  variants: PublicProductVariant[];
}

export interface ReserveCheckoutRequest {
  items: Array<{ variantId: string; quantity: number }>;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  fulfillment: {
    method: 'PICKUP';
    note?: string | null;
  };
}

export type PublicOrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PublicOrderStatusHttp =
  | 'awaiting_payment'
  | 'payment_pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'refunded';

export interface ReservedOrderItem {
  variantId: string;
  quantity: number;
  unitPriceInCents?: number;
  lineTotalInCents?: number;
  productNameSnapshot?: string;
  variantNameSnapshot?: string;
  skuSnapshot?: string;
}

export interface ReserveCheckoutResponse {
  orderId: string;
  status: PublicOrderStatusHttp;
  totalInCents: number;
  reservationExpiresAt: string;
  items?: ReservedOrderItem[];
}

export interface MercadoPagoPreferenceResponse {
  orderId: string;
  preferenceId: string;
  initPoint: string;
  reservationExpiresAt?: string;
}

export interface PublicOrderStatusResponse {
  orderId: string;
  status: PublicOrderStatus;
  totalInCents?: number;
  reservationExpiresAt?: string | null;
  paidAt?: string | null;
}

export interface PublicOrderStatusHttpResponse extends Omit<PublicOrderStatusResponse, 'status'> {
  status: PublicOrderStatusHttp;
}
