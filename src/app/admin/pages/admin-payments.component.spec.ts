import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminPaymentDetailResponse, AdminRefundOperation } from '../core/admin.models';
import { AdminPaymentsComponent } from './admin-payments.component';

describe('AdminPaymentsComponent refunds', () => {
  let fixture: ComponentFixture<AdminPaymentsComponent>;
  let component: AdminPaymentsComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminPaymentsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ paymentId: 'payment-id' }), url: [] },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(AdminPaymentsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('hides refund action on SUCCEEDED and retains technical details even if order is still PAID', () => {
    load('SUCCEEDED');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Reembolsado');
    expect(text).toContain('Reembolso completado correctamente');
    expect(text).toContain('Provider Refund ID');
    expect(text).toContain('provider-refund-id');
    expect(text).toContain(component.date('2026-09-01T12:00:00Z'));
    expect(text).toContain('SUCCEEDED');
    expect(refundButton()).toBeUndefined();
    expect(text).not.toContain('Números liberados');
    expect(text).not.toContain('Números no liberados');
  });

  for (const status of ['REQUESTING', 'REQUIRES_REVIEW', 'FAILED'] as const) {
    it(`does not present ${status} as a completed refund or released numbers`, () => {
      load(status);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain(status);
      expect(text).not.toContain('Reembolsado');
      expect(text).not.toContain('Reembolso completado');
      expect(text).not.toContain('Números liberados');
    });
  }

  it('uses provider status as the main badge and preserves internal processing separately', () => {
    load(null);
    expect(fixture.nativeElement.querySelector('.detail-hero .badge').textContent.trim()).toBe(
      'Aprobado',
    );
    expect(fixture.nativeElement.querySelector('.detail-hero').textContent).toContain('APPLIED');
    const detail = component.detail()!;
    component.detail.set({ ...detail, payment: { ...detail.payment, providerStatus: 'refunded' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detail-hero .badge').textContent.trim()).toBe(
      'Reembolsado',
    );
    expect(refundButton()).toBeUndefined();
  });

  it('keeps the stock rule scoped to non-raffle orders and explains the conditional raffle rule', () => {
    load(null);
    refundButton()!.click();
    fixture.detectChanges();
    const warning = fixture.nativeElement
      .querySelector('.warning-note')
      .textContent.replace(/\s+/g, ' ');
    expect(warning).toContain('si el reembolso se completa y la rifa continúa abierta');
    expect(warning).toContain('los números volverán a quedar disponibles');
    expect(warning).toContain(
      'Para pedidos que no son de rifa, el stock no se repone automáticamente',
    );
    http.expectNone((request) => request.method !== 'GET');
  });

  it('submits only the existing refund request and reloads backend detail without releasing numbers locally', () => {
    load(null);
    component.openRefund(component.detail()!.payment);
    component.reason = 'Solicitud del comprador';
    component.confirmation = 'REEMBOLSAR';
    component.sendRefund();
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/payments/payment-id/refund`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(request.request.body).toEqual({
      reason: 'Solicitud del comprador',
      confirmation: 'REEMBOLSAR',
    });
    request.flush(refund('SUCCEEDED'));
    load('SUCCEEDED');
    expect(component.refund()).toBeNull();
    expect(component.message()).toBe('Reembolso completado correctamente.');
    expect(refundButton()).toBeUndefined();
  });

  function load(status: AdminRefundOperation['status'] | null): void {
    const detail: AdminPaymentDetailResponse = {
      payment: {
        id: 'payment-id',
        providerPaymentId: 'provider-payment-id',
        orderId: 'order-id',
        providerStatus: 'approved',
        providerStatusDetail: null,
        processingStatus: 'APPLIED',
        transactionAmountInCents: 50000,
        currencyId: 'ARS',
        dateApproved: null,
        createdAt: '2026-09-01T12:00:00Z',
        reviewReason: null,
        reviewResolvedAt: null,
        reviewResolution: null,
        reviewResolvedByAdminId: null,
        reviewNote: null,
      },
      order: {
        id: 'order-id',
        status: 'PAID',
        totalInCents: 50000,
        createdAt: '2026-09-01T12:00:00Z',
        paidAt: null,
      },
      refund: status ? refund(status) : null,
    };
    http.expectOne(`${ADMIN_API_BASE_URL}/payments/payment-id`).flush(detail);
    fixture.detectChanges();
  }

  function refund(status: AdminRefundOperation['status']): AdminRefundOperation {
    return {
      id: 'refund-id',
      paymentId: 'payment-id',
      orderId: 'order-id',
      amountInCents: 50000,
      status,
      providerRefundId: 'provider-refund-id',
      createdAt: '2026-09-01T12:00:00Z',
      completedAt: status === 'SUCCEEDED' ? '2026-09-01T12:00:00Z' : null,
    };
  }

  function refundButton(): HTMLButtonElement | undefined {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === 'Reembolsar');
  }
});
