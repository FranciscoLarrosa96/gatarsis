import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AdminApiService } from './admin-api.service';
import { ADMIN_API_BASE_URL } from './admin-api.config';
import { adminErrorMessage } from './admin-domain-error';

describe('AdminApiService contracts', () => {
  let api: AdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the real product creation body and flat product list pagination', () => {
    api.products({ active: true, page: 2, pageSize: 10 }).subscribe((response) => {
      expect(response.page).toBe(2);
      expect(response.total).toBe(1);
      expect(response.items[0].variants).toEqual([]);
    });
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products?active=true&page=2&pageSize=10`);
    expect(request.request.method).toBe('GET');
    request.flush({ items: [{ id: 'product-id', name: 'Bolsa', slug: 'bolsa', shortDescription: null, featured: false, sortOrder: 0, active: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', variants: [], media: [] }], page: 2, pageSize: 10, total: 1 });
  });

  it('patches only the base product DTO and never sends variants or media', () => {
    api
      .updateProduct('product-id', {
        name: 'Producto editado',
        slug: 'producto-editado',
        shortDescription: null,
        featured: true,
        sortOrder: 3,
        active: false,
      })
      .subscribe();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Producto editado',
      slug: 'producto-editado',
      shortDescription: null,
      featured: true,
      sortOrder: 3,
      active: false,
    });
    expect('variants' in request.request.body).toBe(false);
    expect('media' in request.request.body).toBe(false);
    expect('inventory' in request.request.body).toBe(false);
    request.flush({ id: 'product-id', name: 'Producto editado', slug: 'producto-editado', shortDescription: null, featured: true, sortOrder: 3, active: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', variants: [], media: [] });
  });

  it('orchestrates variants through their own create and update endpoints', () => {
    api
      .createVariant('product-id', {
        sku: 'SKU-1',
        name: 'Talle M',
        color: 'negro',
        size: 'M',
        priceInCents: 1500000,
        active: true,
        sortOrder: 1,
        lowStockThreshold: 2,
        initialStock: 10,
      })
      .subscribe();

    const create = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/variants`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      sku: 'SKU-1',
      name: 'Talle M',
      color: 'negro',
      size: 'M',
      priceInCents: 1500000,
      active: true,
      sortOrder: 1,
      lowStockThreshold: 2,
      initialStock: 10,
    });
    create.flush({ id: 'variant-id', productId: 'product-id', sku: 'SKU-1', name: 'Talle M', color: 'negro', size: 'M', priceInCents: 1500000, active: true, sortOrder: 1, lowStockThreshold: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });

    api.updateVariant('variant-id', { priceInCents: 1800000, active: false }).subscribe();
    const update = http.expectOne(`${ADMIN_API_BASE_URL}/variants/variant-id`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ priceInCents: 1800000, active: false });
    update.flush({ id: 'variant-id', productId: 'product-id', sku: 'SKU-1', name: 'Talle M', color: 'negro', size: 'M', priceInCents: 1800000, active: false, sortOrder: 1, lowStockThreshold: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  });

  it('orchestrates product media through create update and delete endpoints', () => {
    api
      .createMedia('product-id', {
        url: 'https://cdn.test/image.jpg',
        alt: 'Producto sobre mesa',
        sortOrder: 1,
        isCover: true,
      })
      .subscribe();
    const create = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      url: 'https://cdn.test/image.jpg',
      alt: 'Producto sobre mesa',
      sortOrder: 1,
      isCover: true,
    });
    create.flush({ id: 'media-id', productId: 'product-id', url: 'https://cdn.test/image.jpg', alt: 'Producto sobre mesa', sortOrder: 1, isCover: true, createdAt: '2026-01-01T00:00:00Z' });

    api.updateMedia('media-id', { alt: 'Producto en uso', isCover: false }).subscribe();
    const update = http.expectOne(`${ADMIN_API_BASE_URL}/product-media/media-id`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ alt: 'Producto en uso', isCover: false });
    update.flush({ id: 'media-id', productId: 'product-id', url: 'https://cdn.test/image.jpg', alt: 'Producto en uso', sortOrder: 1, isCover: false, createdAt: '2026-01-01T00:00:00Z' });

    api.deleteMedia('media-id').subscribe();
    const remove = http.expectOne(`${ADMIN_API_BASE_URL}/product-media/media-id`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('uses the catalog deletion endpoints and preserves the explicit result', () => {
    api.deleteProduct('product-id').subscribe((response) => expect(response.result).toBe('ARCHIVED'));
    const product = http.expectOne(ADMIN_API_BASE_URL + '/products/product-id');
    expect(product.request.method).toBe('DELETE');
    product.flush({ result: 'ARCHIVED' });

    api.deleteVariant('variant-id').subscribe((response) => expect(response.result).toBe('DELETED'));
    const variant = http.expectOne(ADMIN_API_BASE_URL + '/variants/variant-id');
    expect(variant.request.method).toBe('DELETE');
    variant.flush({ result: 'DELETED' });
  });

  it('posts restock and adjusts to a target stockOnHand', () => {
    api.restock('variant-id', 3, 'Ingreso').subscribe();
    const restock = http.expectOne(`${ADMIN_API_BASE_URL}/inventory/variant-id/restock`);
    expect(restock.request.body).toEqual({ quantity: 3, reason: 'Ingreso' });
    restock.flush({ id: 'inventory-id', variantId: 'variant-id', stockOnHand: 8, reservedStock: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });

    api.adjust('variant-id', 6, 'Recuento').subscribe();
    const adjust = http.expectOne(`${ADMIN_API_BASE_URL}/inventory/variant-id/adjust`);
    expect(adjust.request.body).toEqual({ stockOnHand: 6, reason: 'Recuento' });
    adjust.flush({ id: 'inventory-id', variantId: 'variant-id', stockOnHand: 6, reservedStock: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  });

  it('keeps the six order statuses and the backend itemsCount read model', () => {
    const statuses = ['AWAITING_PAYMENT', 'PAYMENT_PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'];
    api.orders().subscribe((response) => {
      expect(response.items.map((item) => item.status)).toEqual(statuses);
      expect(response.items[0].itemsCount).toBe(4);
    });
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/orders`);
    request.flush({ items: statuses.map((status, index) => ({ id: `order-${index}`, status, totalInCents: 1000, itemsCount: index === 0 ? 4 : 1, createdAt: '2026-01-01T00:00:00Z', reservationExpiresAt: '2026-01-01T01:00:00Z', paidAt: null })), pagination: { page: 1, pageSize: 20, totalItems: 6, totalPages: 1 } });
  });

  it('uses the local payment UUID for detail and keeps providerPaymentId as data', () => {
    api.payment('local-payment-uuid').subscribe((response) => {
      expect(response.payment.id).toBe('local-payment-uuid');
      expect(response.payment.providerPaymentId).toBe('mp-123');
    });
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/payments/local-payment-uuid`);
    expect(request.request.method).toBe('GET');
    request.flush({ payment: { id: 'local-payment-uuid', providerPaymentId: 'mp-123', orderId: 'order-uuid', providerStatus: 'approved', providerStatusDetail: null, processingStatus: 'APPLIED', transactionAmountInCents: 8000, currencyId: 'ARS', dateApproved: null, createdAt: '2026-01-01T00:00:00Z', reviewReason: null, reviewResolvedAt: null, reviewResolution: null, reviewResolvedByAdminId: null, reviewNote: null }, order: null, refund: null });
  });

  it('posts the allowed review resolution and forwards the refund idempotency key once', () => {
    api.resolveReview('local-payment-uuid', { resolution: 'ACKNOWLEDGED_NO_ACTION', note: 'Verificado' }).subscribe();
    const review = http.expectOne(`${ADMIN_API_BASE_URL}/payments/local-payment-uuid/review/resolve`);
    expect(review.request.body).toEqual({ resolution: 'ACKNOWLEDGED_NO_ACTION', note: 'Verificado' });
    review.flush({});

    api.refund('local-payment-uuid', { reason: 'Solicitud', confirmation: 'REEMBOLSAR' }, 'uuid-key').subscribe();
    const refund = http.expectOne(`${ADMIN_API_BASE_URL}/payments/local-payment-uuid/refund`);
    expect(refund.request.headers.get('Idempotency-Key')).toBe('uuid-key');
    expect(refund.request.body).toEqual({ reason: 'Solicitud', confirmation: 'REEMBOLSAR' });
    refund.flush({ id: 'refund-id' });
  });

  it('maps documented domain errors and leaves unknown errors generic', () => {
    expect(adminErrorMessage(new HttpErrorResponse({ error: { code: 'PAYMENT_REVIEW_NOT_ALLOWED' }, status: 409 }), 'Fallback')).toBe('Este pago no admite esa resolución de review.');
    expect(adminErrorMessage(new HttpErrorResponse({ error: { code: 'NOT_A_DOMAIN_ERROR' }, status: 400 }), 'Fallback')).toBe('Fallback');
  });

  it('accepts audit entries without an admin user and normalized pagination', () => {
    api.audit({ sort: 'createdAt:asc' }).subscribe((response) => {
      expect(response.items[0].adminUser).toBeNull();
      expect(response.pagination.totalPages).toBe(1);
    });
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/audit?sort=createdAt:asc`);
    request.flush({ items: [{ id: 'audit-id', createdAt: '2026-01-01T00:00:00Z', action: 'SYSTEM_JOB', adminUser: null, entityType: null, entityId: null, metadata: null }], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
  });

  it('reads the real dashboard counters without a provisional revenue field', () => {
    api.dashboard().subscribe((dashboard) => {
      expect(dashboard.inventory.reservedUnits).toBe(3);
      expect('revenue' in dashboard).toBe(false);
    });
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/dashboard`);
    request.flush({ products: { active: 2, inactive: 1 }, inventory: { lowStockVariants: 1, outOfStockVariants: 0, reservedUnits: 3 }, orders: { awaitingPayment: 1, paymentPending: 1, paidToday: 2, expiredToday: 0 }, payments: { openReviews: 1 } });
  });

  it('uses the complete admin adoption contract without invented endpoints', () => {
    api.adoptionCats().subscribe();
    const list = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`);
    expect(list.request.method).toBe('GET');
    list.flush([]);

    const body = {
      name: 'Bianca',
      sex: 'FEMALE' as const,
      birthDate: '2024-01-01',
      shortDescription: 'Dulce y compañera.',
      imageUrl: 'https://cdn.test/bianca.jpg',
      status: 'AVAILABLE' as const,
      published: false,
      displayOrder: 1,
    };
    api.createAdoptionCat(body).subscribe();
    const create = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    create.flush({ ...body, id: 'cat-id', createdAt: '', updatedAt: '' });

    api.updateAdoptionCat('cat-id', { name: 'Bianca II' }).subscribe();
    const update = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats/cat-id`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ name: 'Bianca II' });
    update.flush({ ...body, id: 'cat-id', name: 'Bianca II', createdAt: '', updatedAt: '' });

    for (const action of ['publish', 'pause', 'reserve', 'adopt'] as const) {
      api.setAdoptionCatState('cat-id', action).subscribe();
      const state = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats/cat-id/${action}`);
      expect(state.request.method).toBe('POST');
      expect(state.request.body).toEqual({});
      state.flush({ ...body, id: 'cat-id', createdAt: '', updatedAt: '' });
    }

    api.adoptionApplications().subscribe();
    const applications = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/applications`);
    expect(applications.request.method).toBe('GET');
    applications.flush([]);
  });

  it('maps an actual 409 response through the central error helper', () => {
    let message = '';
    api.adjust('variant-id', 0, 'Recuento').subscribe({ error: (error) => (message = adminErrorMessage(error, 'Fallback')) });
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/inventory/variant-id/adjust`);
    request.flush({ code: 'STOCK_ADJUSTMENT_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    expect(message).toBe('El stock en mano no puede quedar por debajo del reservado.');
  });
});
