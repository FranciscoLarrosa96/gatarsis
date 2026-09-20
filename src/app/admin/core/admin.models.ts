export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN';
}

export interface AdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  admin: AdminUser;
}

export interface AdminPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminPaginatedResponse<T> {
  items: T[];
  pagination: AdminPagination;
}

// These three endpoints still return flat pagination in the backend commit dae772e.
export interface AdminFlatPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminProductMedia {
  id: string;
  productId: string;
  variantId?: string | null;
  url: string;
  alt: string;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface AdminProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  color: string | null;
  size: string | null;
  attributes?: Record<string, string> | null;
  priceInCents: number;
  active: boolean;
  sortOrder: number;
  lowStockThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  featured: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  variants: AdminProductVariant[];
  media: AdminProductMedia[];
}

export interface AdminProductDetail extends AdminProductListItem {}

export interface CreateAdminProductRequest {
  name: string;
  slug: string;
  shortDescription?: string;
  active?: boolean;
  featured?: boolean;
  sortOrder?: number;
}

export interface UpdateAdminProductRequest {
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  active?: boolean;
  featured?: boolean;
  sortOrder?: number;
}

export interface CreateAdminVariantRequest {
  sku: string;
  name: string;
  color?: string | null;
  size?: string | null;
  attributes?: Record<string, string>;
  priceInCents: number;
  active?: boolean;
  sortOrder?: number;
  lowStockThreshold?: number | null;
  initialStock: number;
}

export interface UpdateAdminVariantRequest {
  sku?: string;
  name?: string;
  color?: string | null;
  size?: string | null;
  attributes?: Record<string, string>;
  priceInCents?: number;
  active?: boolean;
  sortOrder?: number;
  lowStockThreshold?: number | null;
}

export interface AdminCatalogDeletionResult {
  result: 'DELETED' | 'ARCHIVED';
}

export interface CreateAdminProductMediaRequest {
  url: string;
  alt: string;
  sortOrder?: number;
  isCover?: boolean;
  variantId?: string | null;
}

export interface UpdateAdminProductMediaRequest {
  url?: string;
  alt?: string;
  sortOrder?: number;
  isCover?: boolean;
  variantId?: string | null;
}

export interface AdminProductListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean;
  sort?: string;
}

export interface AdminInventoryItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  active: boolean;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number | null;
}

export interface AdminInventoryListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean;
  lowStock?: boolean;
  outOfStock?: boolean;
  sort?: string;
}

export interface AdminInventoryMutationResponse {
  id: string;
  variantId: string;
  stockOnHand: number;
  reservedStock: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminInventoryMovementType = 'RESTOCK' | 'RESERVE' | 'RELEASE' | 'SALE' | 'ADJUSTMENT';

export interface AdminInventoryMovement {
  id: string;
  variantId: string;
  orderId: string | null;
  type: AdminInventoryMovementType;
  onHandDelta: number;
  reservedDelta: number;
  reason: string | null;
  createdAt: string;
}

export interface AdminInventoryMovementsQuery {
  page?: number;
  pageSize?: number;
  type?: AdminInventoryMovementType;
  dateFrom?: string;
  dateTo?: string;
}

export type AdminOrderStatus =
  'AWAITING_PAYMENT' | 'PAYMENT_PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export type AdminOrderPaymentSource = 'MERCADO_PAGO' | 'MANUAL';
export type AdminOrderManualPaymentMethod = 'CASH' | 'TRANSFER' | 'OTHER';

export interface AdminOrderListItem {
  id: string;
  status: AdminOrderStatus;
  totalInCents: number;
  itemsCount: number;
  createdAt: string;
  reservationExpiresAt: string;
  paidAt: string | null;
  paymentSource?: AdminOrderPaymentSource;
  manualPaymentMethod?: AdminOrderManualPaymentMethod | null;
}

export interface AdminOrderListQuery {
  page?: number;
  pageSize?: number;
  status?: AdminOrderStatus;
  dateFrom?: string;
  dateTo?: string;
  orderId?: string;
  providerPaymentId?: string;
  sort?: string;
}

export interface AdminOrderItemSnapshot {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
}

export interface AdminPaymentPreference {
  id: string;
  providerPreferenceId: string | null;
  status: string;
  createdAt: string;
  readyAt: string | null;
}

export type AdminPaymentProcessingStatus = 'RECEIVED' | 'RECORDED' | 'APPLIED' | 'REQUIRES_REVIEW';

export type AdminReviewResolution = 'ACKNOWLEDGED_NO_ACTION' | 'MANUAL_INVESTIGATION_COMPLETE';

export interface AdminPaymentListItem {
  id: string;
  providerPaymentId: string;
  orderId: string;
  providerStatus: string;
  providerStatusDetail: string | null;
  processingStatus: AdminPaymentProcessingStatus;
  transactionAmountInCents: number;
  currencyId: string;
  dateApproved: string | null;
  createdAt: string;
  reviewReason: string | null;
  reviewResolvedAt: string | null;
  reviewResolution: AdminReviewResolution | null;
}

export interface AdminPaymentDetail extends AdminPaymentListItem {
  reviewResolvedByAdminId: string | null;
  reviewNote: string | null;
}

export interface AdminOrderDetail {
  order: {
    id: string;
    status: AdminOrderStatus;
    totalInCents: number;
    createdAt: string;
    reservationExpiresAt: string;
    paidAt: string | null;
    paymentSource?: AdminOrderPaymentSource;
    manualPaymentMethod?: AdminOrderManualPaymentMethod | null;
    manualSaleNote?: string | null;
  };
  items: AdminOrderItemSnapshot[];
  paymentPreference: AdminPaymentPreference | null;
  payments: AdminPaymentDetail[];
  inventoryMovements: AdminInventoryMovement[];
  fulfillment: AdminOrderFulfillment | null;
}

export type AdminFulfillmentStatus = 'PENDING' | 'READY_FOR_PICKUP' | 'COMPLETED';

export interface AdminOrderFulfillment {
  id: string;
  method: 'PICKUP';
  status: AdminFulfillmentStatus;
  customer: { name: string; email: string; phone: string };
  customerNote: string | null;
  adminNote: string | null;
  readyAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAdminFulfillmentRequest {
  status: 'READY_FOR_PICKUP' | 'COMPLETED';
  adminNote?: string | null;
}

export interface UpdateAdminFulfillmentResponse {
  id: string;
  status: AdminFulfillmentStatus;
  adminNote: string | null;
  readyAt: string | null;
  completedAt: string | null;
}

export interface AdminPaymentListQuery {
  page?: number;
  pageSize?: number;
  providerStatus?: string;
  processingStatus?: AdminPaymentProcessingStatus;
  orderId?: string;
  providerPaymentId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

export interface AdminRefundOperation {
  id: string;
  paymentId: string;
  orderId: string;
  amountInCents: number;
  status: 'REQUESTING' | 'SUCCEEDED' | 'FAILED' | 'REQUIRES_REVIEW';
  providerRefundId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminPaymentDetailResponse {
  payment: AdminPaymentDetail;
  order: {
    id: string;
    status: AdminOrderStatus;
    totalInCents: number;
    createdAt: string;
    paidAt: string | null;
  } | null;
  refund: AdminRefundOperation | null;
}

export interface ResolveAdminPaymentReviewRequest {
  resolution: AdminReviewResolution;
  note: string;
}

export interface CreateAdminRefundRequest {
  reason: string;
  confirmation: 'REEMBOLSAR';
}

export interface AdminAuditMetadata {
  [key: string]: unknown;
}

export interface AdminAuditLog {
  id: string;
  createdAt: string;
  action: string;
  adminUser: Pick<AdminUser, 'id' | 'email'> | null;
  entityType: string | null;
  entityId: string | null;
  metadata: AdminAuditMetadata | null;
}

export interface AdminAuditQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  adminUserId?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'createdAt:asc' | 'createdAt:desc';
}

export interface AdminDashboard {
  products: { active: number; inactive: number };
  inventory: { lowStockVariants: number; outOfStockVariants: number; reservedUnits: number };
  orders: {
    awaitingPayment: number;
    paymentPending: number;
    paidToday: number;
    expiredToday: number;
  };
  payments: { openReviews: number };
}
