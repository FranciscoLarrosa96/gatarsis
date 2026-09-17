import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PUBLIC_API_BASE_URL } from '../../../shop/core/commerce.models';
import { RaffleCheckoutStore } from '../../core/raffle-checkout.store';
import { RafflePurchaseStatus } from '../../core/raffle.models';
import { RaffleStatusPageComponent } from './raffle-status-page.component';

const raffleId = '49de99a5-a861-4fd0-a3c4-c0d53dca616d';
const purchaseId = '8d91f074-d466-4df0-9198-c11636786592';
const orderId = '6392488e-8ad6-469a-8e0b-3a51c41592bd';
const statusUrl = `${PUBLIC_API_BASE_URL}/raffle-purchases/${purchaseId}/status`;

describe('RaffleStatusPageComponent', () => {
  let fixture: ComponentFixture<RaffleStatusPageComponent>;
  let component: RaffleStatusPageComponent;
  let http: HttpTestingController;
  let store: RaffleCheckoutStore;

  afterEach(() => {
    fixture?.destroy();
    http?.verify();
    sessionStorage.clear();
  });

  it.each([
    ['PAID', '¡Pago confirmado!', '07'],
    ['EXPIRED', 'La reserva venció', 'Volver a elegir números'],
    ['REQUIRES_REVIEW', 'Estamos revisando tu pago', 'No vuelvas a pagar por ahora'],
    ['REFUNDED', 'Pago reembolsado', 'Este pago fue reembolsado'],
  ] as const)('renders the safe %s state from the backend', (status, title, copy) => {
    setup();
    flushStatus(status);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(title);
    expect(fixture.nativeElement.textContent).toContain(copy);
    expect(store.context()?.status).toBe(status);
  });

  it('keeps the checkout context so /rifa can show a recently-processed banner', () => {
    setup();
    flushStatus('PAID');
    fixture.detectChanges();

    expect(store.context()).not.toBeNull();
    expect(store.context()?.numbers).toEqual([7, 23, 65]);
  });

  it('keeps polling while payment is pending and ignores redirect status params', () => {
    setup({ status: 'approved' });
    flushStatus('PAYMENT_PENDING');
    fixture.detectChanges();

    expect(component.title()).toBe('Estamos confirmando tu pago...');
    expect(component.title()).not.toContain('confirmado!');
    expect(store.context()).not.toBeNull();
  });

  it('offers an immediate "Actualizar estado" action while pending, without waiting for a timeout', () => {
    setup();
    flushStatus('PAYMENT_PENDING');
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const updateButton = buttons.find((button) =>
      button.textContent?.includes('Actualizar estado'),
    );
    expect(updateButton).toBeTruthy();
    expect(updateButton?.disabled).toBe(false);

    updateButton!.click();
    flushStatus('PAID');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('¡Pago confirmado!');
  });

  it('uses the success treatment when the backend confirms payment', () => {
    setup();
    flushStatus('PAID');
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.status-icon') as HTMLElement;
    expect(icon.classList.contains('status-icon--success')).toBe(true);
    expect(icon.classList.contains('status-icon--attention')).toBe(false);
  });

  it.each(['success', 'pending', 'failure'] as const)(
    'uses the explicit purchase ID on %s returns without sessionStorage',
    (kind) => {
      setup(
        { rafflePurchaseId: purchaseId, external_reference: orderId, status: 'approved' },
        false,
        `rifa/checkout/${kind}`,
      );

      expect(component.purchaseId()).toBe(purchaseId);
      expect(store.context()).toBeNull();
      flushStatus('PAID');
      expect(component.status()).toBe('PAID');
      http.expectNone(`${PUBLIC_API_BASE_URL}/raffle-purchases/${orderId}/status`);
    },
  );

  it('restores a legacy purchase from sessionStorage when external_reference matches its order', () => {
    setup({ external_reference: orderId });
    expect(component.purchaseId()).toBe(purchaseId);
    flushStatus('PAID');
  });

  it('prefers the explicit purchase over unrelated local context and does not display stale numbers', () => {
    const otherPurchaseId = 'cf693fc9-0a87-49af-8d54-87113432f714';
    setup({ rafflePurchaseId: otherPurchaseId, external_reference: orderId });

    expect(component.purchaseId()).toBe(otherPurchaseId);
    expect(component.numbers()).toEqual([]);
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffle-purchases/${otherPurchaseId}/status`).flush({
      rafflePurchaseId: otherPurchaseId,
      orderId,
      status: 'PAID',
      numbers: [42],
    });
    expect(component.numbers()).toEqual([42]);
    expect(store.context()?.rafflePurchaseId).toBe(purchaseId);
  });

  it('never interprets external_reference as a purchase ID without local context', () => {
    setup({ external_reference: orderId }, false);

    expect(component.purchaseId()).toBeNull();
    expect(component.title()).toBe('Estamos verificando tu compra.');
    expect(component.description()).toContain('No pudimos identificar');
    expect(fixture.nativeElement.querySelector('a[routerLink="/rifa"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Reserva realizada');
    expect(fixture.nativeElement.textContent).not.toContain('Actualizar estado');
    component.consult();
    http.expectNone((request) => request.url.includes('/raffle-purchases/'));
  });

  it.each(['cf693fc9-0a87-49af-8d54-87113432f714', purchaseId])(
    'does not invent a purchase association for an unmatched reference %s',
    (reference) => {
      setup({ external_reference: reference });
      expect(component.purchaseId()).toBeNull();
      expect(component.numbers()).toEqual([]);
      http.expectNone((request) => request.url.includes('/raffle-purchases/'));
    },
  );

  it('offers a safe recovery state for a missing or invalid purchase ID without storage', () => {
    setup({ rafflePurchaseId: 'invalid' }, false);
    expect(component.purchaseId()).toBeNull();
    expect(component.error()).toBe('');
    http.expectNone((request) => request.url.includes('/raffle-purchases/'));
  });

  function setup(
    query: Record<string, string> = {},
    withContext = true,
    path = 'rifa/checkout/success',
  ): void {
    TestBed.configureTestingModule({
      imports: [RaffleStatusPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(query),
              routeConfig: { path },
            },
          },
        },
      ],
    });
    if (withContext)
      sessionStorage.setItem(
        'gatarsis.raffle.checkout.v1',
        JSON.stringify({
          rafflePurchaseId: purchaseId,
          orderId,
          raffleId,
          numbers: [7, 23, 65],
          reservationExpiresAt: '2026-09-13T20:00:00.000Z',
          status: 'RESERVED',
          updatedAt: new Date().toISOString(),
        }),
      );
    store = TestBed.inject(RaffleCheckoutStore);
    fixture = TestBed.createComponent(RaffleStatusPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function flushStatus(status: RafflePurchaseStatus): void {
    http.expectOne(statusUrl).flush({
      rafflePurchaseId: purchaseId,
      orderId,
      status,
      numbers: [7, 23, 65],
    });
  }
});
