import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PUBLIC_API_BASE_URL } from '../../../shop/core/commerce.models';
import { RaffleCheckoutStore } from '../../core/raffle-checkout.store';
import { PublicRaffle, PublicRaffleNumber } from '../../core/raffle.models';
import { RafflePageComponent } from './raffle-page.component';

const raffleId = '49de99a5-a861-4fd0-a3c4-c0d53dca616d';
const purchaseId = '8d91f074-d466-4df0-9198-c11636786592';
const orderId = '6392488e-8ad6-469a-8e0b-3a51c41592bd';

const raffle: PublicRaffle = {
  id: raffleId,
  title: 'Rifa solidaria',
  prizeName: 'Air Fryer Zenith',
  description: 'Cada número ayuda a sostener rescates.',
  imageUrl: null,
  priceInCents: 500_000,
  status: 'ACTIVE',
  drawAt: null,
  stats: { available: 98, reserved: 1, sold: 1, total: 100 },
};

describe('RafflePageComponent', () => {
  let fixture: ComponentFixture<RafflePageComponent>;
  let component: RafflePageComponent;
  let http: HttpTestingController;

  afterEach(() => {
    fixture?.destroy();
    http?.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders 00–99 and exposes accessible availability states', () => {
    setup();
    loadActive(numbers());

    const numberButtons = fixture.nativeElement.querySelectorAll('.raffle-number');
    expect(numberButtons).toHaveLength(100);
    expect(numberButtons[0].textContent.trim()).toBe('00');
    expect(numberButtons[99].textContent.trim()).toBe('99');
    expect(numberButtons[23].disabled).toBe(true);
    expect(numberButtons[23].getAttribute('aria-label')).toBe('Número 23 reservado');
    expect(numberButtons[65].disabled).toBe(true);
    expect(numberButtons[65].getAttribute('aria-label')).toBe('Número 65 vendido');
  });

  it('makes a previously sold number selectable when the normal refresh returns AVAILABLE', () => {
    setup();
    loadActive(numbers());
    const button = () => fixture.nativeElement.querySelectorAll('.raffle-number')[65] as HTMLButtonElement;
    expect(button().disabled).toBe(true);

    component.onWindowFocus();
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}/numbers`).flush({
      raffleId,
      status: 'ACTIVE',
      numbers: numbers().map((item) => item.number === 65 ? { ...item, status: 'AVAILABLE' } : item),
    });
    fixture.detectChanges();

    expect(button().disabled).toBe(false);
    expect(button().getAttribute('aria-label')).toBe('Número 65 disponible');
    button().click();
    expect(component.isSelected(65)).toBe(true);
  });

  it('selects, deselects and enforces the maximum of ten numbers', () => {
    setup();
    loadActive(numbers());

    component.toggleNumber({ number: 0, status: 'AVAILABLE' });
    expect(component.isSelected(0)).toBe(true);
    component.toggleNumber({ number: 0, status: 'AVAILABLE' });
    expect(component.isSelected(0)).toBe(false);

    for (let number = 0; number < 10; number += 1) {
      component.toggleNumber({ number, status: 'AVAILABLE' });
    }
    component.toggleNumber({ number: 10, status: 'AVAILABLE' });

    expect(component.selectedCount()).toBe(10);
    expect(component.isSelected(10)).toBe(false);
    expect(component.selectionMessage()).toContain('Máximo alcanzado');
  });

  it('calculates the summary and keeps buyer PII out of localStorage', () => {
    setup();
    loadActive(numbers());
    component.toggleNumber({ number: 7, status: 'AVAILABLE' });
    component.toggleNumber({ number: 12, status: 'AVAILABLE' });
    component.continueToForm();
    fixture.detectChanges();

    const paymentButton = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(component.totalPrice()).toContain('10.000');
    expect(paymentButton.disabled).toBe(true);

    component.buyerForm.setValue({
      name: 'Francisco Larrosa',
      email: 'mail@example.com',
      phone: '+54 249 4000000',
    });
    fixture.detectChanges();
    expect(paymentButton.disabled).toBe(false);

    component.pay();
    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}/reservations`);
    expect(request.request.headers.has('Idempotency-Key')).toBe(true);
    expect(request.request.body).toEqual({
      numbers: [7, 12],
      buyerName: 'Francisco Larrosa',
      buyerEmail: 'mail@example.com',
      buyerPhone: '+54 249 4000000',
    });
    expect(localStorage.getItem('gatarsis.raffle.checkout.v1')).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain('Francisco');
    request.flush({ code: 'SERVICE_UNAVAILABLE' }, { status: 503, statusText: 'Unavailable' });
  });

  it('refreshes after a number conflict and removes only unavailable selections', () => {
    setup();
    loadActive(numbers());
    [7, 23, 64].forEach((number) => component.toggleNumber({ number, status: 'AVAILABLE' }));
    component.continueToForm();
    component.buyerForm.setValue({
      name: 'Persona Compradora',
      email: 'persona@example.com',
      phone: '+54 249 4000000',
    });

    component.pay();
    http
      .expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}/reservations`)
      .flush(
        { code: 'RAFFLE_NUMBER_UNAVAILABLE', details: { numbers: [23] } },
        { status: 409, statusText: 'Conflict' },
      );
    const refreshed = numbers().map((item) =>
      item.number === 23 ? { ...item, status: 'RESERVED' as const } : item,
    );
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}/numbers`).flush({
      raffleId,
      status: 'ACTIVE',
      numbers: refreshed,
    });

    expect([...component.selected()].sort((left, right) => left - right)).toEqual([7, 64]);
    expect(component.conflictNumbers().has(23)).toBe(true);
    expect(component.paymentMessage()).toContain('dejaron de estar disponibles');
  });

  it('shows a friendly empty state when no raffle has ever been published', () => {
    setup();
    http
      .expectOne(`${PUBLIC_API_BASE_URL}/raffles/active`)
      .flush(
        { code: 'RAFFLE_ACTIVE_NOT_FOUND', message: 'No hay una rifa activa.' },
        { status: 404, statusText: 'Not Found' },
      );
    http
      .expectOne(`${PUBLIC_API_BASE_URL}/raffles/latest`)
      .flush(
        { code: 'RAFFLE_NOT_FOUND', message: 'Todavía no publicamos ninguna rifa.' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay una rifa activa en este momento');
    expect(fixture.nativeElement.textContent).toContain('Ver historias');
  });

  it('falls back to the latest raffle when there is none active, so results stay reachable', () => {
    setup();
    const drawnRaffle: PublicRaffle = {
      ...raffle,
      status: 'DRAWN',
      winningNumber: 42,
      drawnAt: '2026-09-01T18:00:00.000Z',
    };
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/active`).flush(
      { code: 'RAFFLE_ACTIVE_NOT_FOUND', message: 'No hay una rifa activa.' },
      { status: 404, statusText: 'Not Found' },
    );
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/latest`).flush(drawnRaffle);
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}`).flush(drawnRaffle);
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}/numbers`).flush({
      raffleId,
      status: 'DRAWN',
      numbers: numbers(),
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rifa finalizada');
    expect(fixture.nativeElement.textContent).toContain('42');
    expect(component.noActiveRaffle()).toBe(false);
  });

  it('highlights the winning number distinctly and marks it read-only once drawn', () => {
    setup();
    const drawnRaffle: PublicRaffle = { ...raffle, status: 'DRAWN', winningNumber: 65 };
    loadActive(numbers(), drawnRaffle);

    const numberButtons = fixture.nativeElement.querySelectorAll('.raffle-number');
    const winnerButton = numberButtons[65] as HTMLButtonElement;
    expect(winnerButton.classList.contains('raffle-number--winner')).toBe(true);
    expect(winnerButton.disabled).toBe(true);
    expect(winnerButton.getAttribute('aria-label')).toBe('Número 65, ganador');
    expect(winnerButton.querySelector('.winner-trophy')).toBeTruthy();
  });

  it('hides the purchase form once the raffle is no longer active', () => {
    setup();
    const drawnRaffle: PublicRaffle = { ...raffle, status: 'DRAWN', winningNumber: 65 };
    loadActive(numbers(), drawnRaffle);

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Pagar con Mercado Pago');
  });

  it('gives explicit feedback when the maximum of ten numbers is reached', () => {
    setup();
    loadActive(numbers());
    for (let number = 0; number < 10; number += 1) {
      component.toggleNumber({ number, status: 'AVAILABLE' });
    }
    component.toggleNumber({ number: 10, status: 'AVAILABLE' });

    expect(component.selectionMessage()).toContain('Máximo alcanzado');
  });

  it('shows a persistent banner for a pending checkout and lets the user jump back to its status', () => {
    TestBed.configureTestingModule({
      imports: [RafflePageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(RaffleCheckoutStore);
    store.save({ rafflePurchaseId: purchaseId, orderId, raffleId, numbers: [7, 23] });
    fixture = TestBed.createComponent(RafflePageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(`${PUBLIC_API_BASE_URL}/raffle-purchases/${purchaseId}/status`).flush({
      rafflePurchaseId: purchaseId,
      orderId,
      status: 'PAYMENT_PENDING',
      numbers: [7, 23],
    });
    loadActive(numbers());

    expect(fixture.nativeElement.textContent).toContain('Tenés una compra pendiente');
    const cta = fixture.nativeElement.querySelector('a[href="/rifa/checkout/pending"]');
    expect(cta).toBeTruthy();
  });

  function setup(): void {
    TestBed.configureTestingModule({
      imports: [RafflePageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(RafflePageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function loadActive(numberItems: PublicRaffleNumber[], overrideRaffle: PublicRaffle = raffle): void {
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/active`).flush(overrideRaffle);
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}`).flush(overrideRaffle);
    http.expectOne(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}/numbers`).flush({
      raffleId,
      status: overrideRaffle.status,
      numbers: numberItems,
    });
    fixture.detectChanges();
  }

  function numbers(): PublicRaffleNumber[] {
    return Array.from({ length: 100 }, (_, number) => ({
      number,
      status: number === 23 ? 'RESERVED' : number === 65 ? 'SOLD' : 'AVAILABLE',
    }));
  }
});
