export type AdminRaffleStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAWN';

export type AdminRaffleNumberStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export type AdminRafflePurchaseStatus =
  'RESERVED' | 'PAYMENT_PENDING' | 'PAID' | 'EXPIRED' | 'REQUIRES_REVIEW' | 'REFUNDED';

export type AdminManualRafflePaymentMethod = 'CASH' | 'TRANSFER' | 'OTHER';

export type AdminRafflePaymentSource = 'MERCADO_PAGO' | 'MANUAL';

export interface AdminRaffleListItem {
  id: string;
  title: string;
  prizeName: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  priceInCents: number;
  status: AdminRaffleStatus;
  drawAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRaffleHistoryItem {
  id: string;
  adminUserId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminRaffleDetail extends AdminRaffleListItem {
  description: string | null;
  winningNumber: number | null;
  drawnAt: string | null;
  drawnByAdminId: string | null;
  numberSummary: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
  stats: {
    totalNumbers: number;
    available: number;
    reserved: number;
    sold: number;
    paidPurchases: number;
    activeReservations: number;
    revenueInCents: number;
  };
  history: AdminRaffleHistoryItem[];
}

export interface AdminRafflePaymentView {
  id: string;
  providerPaymentId: string;
  providerStatus: string;
  processingStatus: string;
  reviewReason: string | null;
  transactionAmountInCents: number;
  currencyId: string;
  dateCreated: string | null;
  dateApproved: string | null;
  dateLastUpdated: string | null;
}

export interface AdminRaffleNumber {
  number: number;
  status: AdminRaffleNumberStatus;
  reservedUntil: string | null;
  soldAt: string | null;
  rafflePurchaseId: string | null;
  buyer: { name: string; email: string; phone: string } | null;
  order: { id: string; status: string } | null;
  payment: AdminRafflePaymentView | null;
}

export interface AdminRafflePurchase {
  rafflePurchaseId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  numbers: number[];
  unitPriceInCents: number;
  totalInCents: number;
  status: AdminRafflePurchaseStatus;
  orderId: string;
  orderStatus: string;
  payment: AdminRafflePaymentView | null;
  createdAt: string;
  reservationExpiresAt: string;
  paidAt: string | null;
  paymentSource?: AdminRafflePaymentSource;
  manualPaymentMethod?: AdminManualRafflePaymentMethod | null;
  manualSaleNote?: string | null;
}

export interface AdminRafflePurchaseDetail extends AdminRafflePurchase {
  preference: {
    id: string;
    providerPreferenceId: string | null;
    status: string;
    readyAt: string | null;
    lastErrorCode: string | null;
    lastErrorAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  refunds: Array<{
    id: string;
    status: string;
    amountInCents: number;
    providerRefundId: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface AdminRaffleListQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminRafflePurchaseListQuery extends AdminRaffleListQuery {}

export interface CreateAdminRaffleRequest {
  title: string;
  prizeName: string;
  description?: string | null;
  imageUrls: string[];
  priceInCents: number;
  drawAt?: string | null;
}

export type UpdateAdminRaffleRequest = Partial<CreateAdminRaffleRequest>;

export interface CreateAdminManualRaffleSaleRequest {
  numbers: number[];
  buyer: {
    name: string;
    email?: string;
    whatsapp?: string;
  };
  paymentMethod: AdminManualRafflePaymentMethod;
  note?: string;
  idempotencyKey: string;
}
