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

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    const updateButton = buttons.find((button) => button.textContent?.includes('Actualizar estado'));
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

  function setup(query: Record<string, string> = {}): void {
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
              routeConfig: { path: 'rifa/checkout/success' },
            },
          },
        },
      ],
    });
    store = TestBed.inject(RaffleCheckoutStore);
    store.save({
      rafflePurchaseId: purchaseId,
      orderId,
      raffleId,
      numbers: [7, 23, 65],
      reservationExpiresAt: '2026-09-13T20:00:00.000Z',
    });
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
