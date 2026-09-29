import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminOrderDetail, AdminOrderListItem } from '../core/admin.models';
import { AdminSimplePaymentsComponent } from './admin-simple-payments.component';

describe('AdminSimplePaymentsComponent', () => {
  let fixture: ComponentFixture<AdminSimplePaymentsComponent>;
  let component: AdminSimplePaymentsComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminSimplePaymentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AdminSimplePaymentsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('loads the existing orders endpoint newest-first and provides mobile cards and desktop table layouts', () => {
    const request = http.expectOne(
      (candidate) => candidate.url === ADMIN_API_BASE_URL + '/orders' &&
        candidate.params.get('sort') === 'createdAt:desc',
    );
    expect(request.request.params.get('pageSize')).toBe('50');
    request.flush({ items: [storeOrder()], pagination: pagination() });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.mobile-payment-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.desktop-payment-table table')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('María Elena Piloni');
  });

  it('shows store and raffle distinctly without inferring a raffle for an unknown order', () => {
    const unknown = { ...storeOrder(), id: 'unknown', kind: null, raffle: null, items: [] };
    http.expectOne((request) => request.url.endsWith('/orders')).flush({
      items: [storeOrder(), raffleOrder(), unknown],
      pagination: pagination(),
    });
    fixture.detectChanges();
    expect(component.kindLabel(storeOrder())).toBe('TIENDA');
    expect(component.kindLabel(raffleOrder())).toBe('RIFA');
    expect(component.kindLabel(unknown)).toBe('');
    expect(component.purchaseTitle(unknown)).toBe('Compra');
    expect(fixture.nativeElement.textContent).toContain('Llavero Gatarsis — Patita');
    expect(fixture.nativeElement.textContent).toContain('Rifa solidaria');
    expect(fixture.nativeElement.textContent).toContain('07 · 23 · 48');
  });

  it('uses human labels and filters by status, purchase type, and buyer', () => {
    const pending = {
      ...storeOrder(),
      id: 'pending',
      status: 'PAYMENT_PENDING' as const,
      customer: { name: 'Juan Pérez', email: null, phone: null },
    };
    http.expectOne((request) => request.url.endsWith('/orders')).flush({
      items: [storeOrder(), raffleOrder(), pending],
      pagination: pagination(),
    });
    fixture.detectChanges();
    expect(component.statusLabel(storeOrder())).toBe('Pagado');
    expect(component.statusLabel(pending)).toBe('Pago pendiente');

    component.statusFilter = 'PENDING';
    fixture.detectChanges();
    expect(component.filteredOrders().map((item) => item.id)).toEqual(['pending']);
    component.statusFilter = '';
    component.kindFilter = 'RAFFLE';
    fixture.detectChanges();
    expect(component.filteredOrders().map((item) => item.id)).toEqual(['raffle']);
    component.kindFilter = '';
    component.search = 'maría';
    fixture.detectChanges();
    expect(component.filteredOrders().map((item) => item.id)).toEqual(['store']);
  });

  it('keeps technical IDs collapsed below the simple purchase summary', () => {
    http.expectOne((request) => request.url.endsWith('/orders')).flush({
      items: [storeOrder()],
      pagination: pagination(),
    });
    fixture.detectChanges();
    component.showDetail(storeOrder());
    http.expectOne(ADMIN_API_BASE_URL + '/orders/store').flush(orderDetail());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Compró:');
    expect(fixture.nativeElement.textContent).toContain('Ver información técnica');
    expect(fixture.nativeElement.querySelector('.technical-info').open).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('provider-payment-id');
  });

  it('shows loading and friendly error/retry messages without leaking backend errors', () => {
    expect(fixture.nativeElement.querySelector('[aria-label="Cargando pagos"]')).toBeTruthy();
    http.expectOne((request) => request.url.endsWith('/orders')).flush({
      items: [],
      pagination: pagination(),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay pagos para mostrar.');

    component.load();
    http.expectOne((request) => request.url.endsWith('/orders')).flush(
      { message: 'database detail must not leak' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los pagos.');
    expect(fixture.nativeElement.textContent).not.toContain('database detail');
    const retry = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === 'Reintentar')!;
    retry.click();
    http.expectOne((request) => request.url.endsWith('/orders')).flush({
      items: [storeOrder()],
      pagination: pagination(),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('María Elena Piloni');
  });

  it('summarizes many raffle numbers and can reveal the full list', () => {
    http.expectOne((request) => request.url.endsWith('/orders')).flush({
      items: [],
      pagination: pagination(),
    });
    const numbers = [7, 12, 18, 23, 31, 48, 52];
    expect(component.numberSummary(numbers, false)).toBe('07 · 12 · 18 · 23 · 31 · 48…');
    expect(component.numberSummary(numbers, true)).toContain('52');
  });

  function storeOrder(): AdminOrderListItem {
    return {
      id: 'store',
      status: 'PAID',
      kind: 'MERCH',
      totalInCents: 1000000,
      itemsCount: 2,
      createdAt: '2026-09-29T17:21:00Z',
      reservationExpiresAt: '2026-09-29T17:36:00Z',
      paidAt: '2026-09-29T17:21:00Z',
      customer: { name: 'María Elena Piloni', email: 'maria@example.com', phone: '+54 11 5555' },
      items: [{ label: 'Llavero Gatarsis — Patita', quantity: 2 }],
      raffle: null,
      paymentProcessingStatus: 'APPLIED',
    };
  }

  function raffleOrder(): AdminOrderListItem {
    return {
      id: 'raffle',
      status: 'PAID',
      kind: 'RAFFLE',
      totalInCents: 1500000,
      itemsCount: 3,
      createdAt: '2026-09-29T19:40:00Z',
      reservationExpiresAt: '2026-09-29T19:55:00Z',
      paidAt: '2026-09-29T19:40:00Z',
      customer: { name: 'Francisco Larrosa', email: null, phone: null },
      items: [],
      raffle: { title: 'Rifa solidaria', numbers: [7, 23, 48] },
      paymentProcessingStatus: 'APPLIED',
    };
  }

  function pagination() {
    return { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 };
  }

  function orderDetail(): AdminOrderDetail {
    return {
      order: {
        id: 'store', status: 'PAID', totalInCents: 1000000,
        createdAt: '2026-09-29T17:21:00Z', reservationExpiresAt: '2026-09-29T17:36:00Z',
        paidAt: '2026-09-29T17:21:00Z', kind: 'MERCH',
      },
      items: [],
      paymentPreference: {
        id: 'preference-local', providerPreferenceId: 'preference-id', status: 'READY',
        createdAt: '2026-09-29T17:20:00Z', readyAt: '2026-09-29T17:20:00Z',
      },
      payments: [{
        id: 'payment-local', providerPaymentId: 'provider-payment-id', orderId: 'store',
        providerStatus: 'approved', providerStatusDetail: null, processingStatus: 'APPLIED',
        transactionAmountInCents: 1000000, currencyId: 'ARS', dateApproved: '2026-09-29T17:21:00Z',
        createdAt: '2026-09-29T17:21:00Z', reviewReason: null, reviewResolvedAt: null,
        reviewResolution: null, reviewResolvedByAdminId: null, reviewNote: null,
      }],
      inventoryMovements: [],
      fulfillment: null,
    };
  }
});
