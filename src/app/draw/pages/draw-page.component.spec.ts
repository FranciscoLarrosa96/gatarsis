import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ADMIN_API_BASE_URL } from '../../admin/core/admin-api.config';
import {
  AdminRaffleDetail,
  AdminRaffleNumber,
  AdminRafflePurchase,
} from '../../admin/core/admin-raffle.models';
import { DrawPageComponent } from './draw-page.component';

const raffleId = 'raffle-draw-id';
const purchaseId = 'purchase-paid-id';

describe('DrawPageComponent', () => {
  let fixture: ComponentFixture<DrawPageComponent>;
  let component: DrawPageComponent;
  let http: HttpTestingController;

  afterEach(() => {
    fixture?.destroy();
    http?.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads the selector, hides drafts and separates completed raffles', () => {
    setup(null);
    http.expectOne(`${ADMIN_API_BASE_URL}/raffles?page=1&pageSize=100`).flush({
      items: [listItem('DRAFT'), listItem('CLOSED', 'closed'), listItem('DRAWN', 'drawn')],
      page: 1,
      pageSize: 100,
      total: 3,
    });
    fixture.detectChanges();

    expect(component.availableRaffles().map((item) => item.status)).toEqual(['CLOSED']);
    expect(component.completedRaffles()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Rifas disponibles');
    expect(fixture.nativeElement.textContent).toContain('Sorteos realizados');
  });

  it('prepares a CLOSED raffle with only SOLD and PAID participants', () => {
    setup(raffleId);
    loadDetail(detail('CLOSED'), numbers(), [purchase('PAID')]);
    fixture.detectChanges();

    expect(component.step()).toBe('PREPARE');
    expect(component.eligibleNumbers().map((item) => item.number)).toEqual([37]);
    expect(component.ready()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Todo listo para sortear');
    expect(fixture.nativeElement.textContent).toContain('1');
  });

  it('blocks a raffle with unresolved payments', () => {
    setup(raffleId);
    loadDetail(detail('CLOSED'), numbers(), [purchase('PAYMENT_PENDING')]);

    expect(component.ready()).toBe(false);
    expect(component.readinessIssues().join(' ')).toContain('pagos u órdenes pendientes');
    component.requestAutomaticDraw();
    expect(component.step()).toBe('PREPARE');
  });

  it('requests an AUTOMATIC draw without a winning number and only then reveals the backend result', () => {
    vi.useFakeTimers();
    setup(raffleId);
    loadDetail(detail('CLOSED'), numbers(), [purchase('PAID')]);
    component.requestAutomaticDraw();
    component.confirmAutomaticDraw();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/draw`);
    expect(request.request.body).toEqual({ method: 'AUTOMATIC' });
    expect('winningNumber' in request.request.body).toBe(false);
    request.flush(detail('DRAWN', 37));

    expect(component.step()).toBe('DRAWING');
    vi.advanceTimersByTime(3600);
    expect(component.step()).toBe('RESULT');
    expect(component.winnerNumber()).toBe(37);
    expect(component.buyerName(component.winner())).toBe('Francisco Larrosa');
  });

  it('shortens the reveal with reduced motion', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }) as MediaQueryList),
    );
    setup(raffleId);
    loadDetail(detail('CLOSED'), numbers(), [purchase('PAID')]);
    component.requestAutomaticDraw();
    component.confirmAutomaticDraw();
    http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/draw`).flush(detail('DRAWN', 37));

    vi.advanceTimersByTime(180);
    expect(component.step()).toBe('RESULT');
    expect(component.winnerNumber()).toBe(37);
  });

  it('registers an EXTERNAL eligible result with its optional note and skips the animation', () => {
    setup(raffleId);
    loadDetail(detail('CLOSED'), numbers(), [purchase('PAID')]);
    component.openExternal();
    component.externalWinningNumber.set(37);
    component.externalNote = 'Sorteo mediante Instagram Live';
    component.reviewExternal();
    component.confirmExternal();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/draw`);
    expect(request.request.body).toEqual({
      method: 'EXTERNAL',
      winningNumber: 37,
      note: 'Sorteo mediante Instagram Live',
    });
    request.flush(detail('DRAWN', 37));

    expect(component.step()).toBe('RESULT');
    expect(component.drawMethod()).toBe('EXTERNAL');
  });

  it('shows a persisted DRAWN result directly after reloading', () => {
    setup(raffleId);
    loadDetail(detail('DRAWN', 37), numbers(), [purchase('PAID')]);

    expect(component.step()).toBe('RESULT');
    expect(component.winnerNumber()).toBe(37);
  });

  it('reloads the persisted winner when another device won the concurrency race', () => {
    setup(raffleId);
    loadDetail(detail('CLOSED'), numbers(), [purchase('PAID')]);
    component.requestAutomaticDraw();
    component.confirmAutomaticDraw();
    http
      .expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/draw`)
      .flush({ code: 'RAFFLE_ALREADY_DRAWN' }, { status: 409, statusText: 'Conflict' });
    loadDetail(detail('DRAWN', 37), numbers(), [purchase('PAID')]);

    expect(component.step()).toBe('RESULT');
    expect(component.error()).toContain('ya fue sorteada');
  });

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [DrawPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap(id ? { raffleId: id } : {})) },
        },
      ],
    });
    fixture = TestBed.createComponent(DrawPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function loadDetail(
    raffle: AdminRaffleDetail,
    numberItems: AdminRaffleNumber[],
    purchaseItems: AdminRafflePurchase[],
  ): void {
    http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}`).flush(raffle);
    http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/numbers`).flush(numberItems);
    http
      .expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/purchases?page=1&pageSize=100`)
      .flush({ items: purchaseItems, page: 1, pageSize: 100, total: purchaseItems.length });
  }

  function listItem(status: AdminRaffleDetail['status'], suffix = status.toLowerCase()) {
    return {
      id: `${raffleId}-${suffix}`,
      title: `Rifa ${suffix}`,
      prizeName: 'Air Fryer Zenith',
      priceInCents: 500_000,
      status,
      drawAt: null,
      createdAt: `2026-09-${status === 'DRAWN' ? '25' : '26'}T12:00:00.000Z`,
      updatedAt: '2026-09-26T12:00:00.000Z',
    };
  }

  function detail(status: AdminRaffleDetail['status'], winningNumber: number | null = null) {
    return {
      ...listItem(status, 'detail'),
      id: raffleId,
      description: null,
      winningNumber,
      drawnAt: winningNumber === null ? null : '2026-09-26T20:43:00.000Z',
      drawnByAdminId: winningNumber === null ? null : 'admin-id',
      numberSummary: { total: 100, available: 99, reserved: 0, sold: 1 },
      stats: {
        totalNumbers: 100,
        available: 99,
        reserved: 0,
        sold: 1,
        paidPurchases: 1,
        activeReservations: 0,
        revenueInCents: 500_000,
      },
      history:
        winningNumber === null
          ? []
          : [
              {
                id: 'event-id',
                adminUserId: 'admin-id',
                action: 'RAFFLE_DRAWN',
                metadata: { drawMethod: 'AUTOMATIC' },
                createdAt: '2026-09-26T20:43:00.000Z',
              },
            ],
    } satisfies AdminRaffleDetail;
  }

  function numbers(): AdminRaffleNumber[] {
    return Array.from({ length: 100 }, (_, number) => ({
      number,
      status: number === 37 ? 'SOLD' : 'AVAILABLE',
      reservedUntil: null,
      soldAt: number === 37 ? '2026-09-26T18:00:00.000Z' : null,
      rafflePurchaseId: number === 37 ? purchaseId : null,
      buyer:
        number === 37
          ? { name: 'Francisco Larrosa', email: 'francisco@example.com', phone: '' }
          : null,
      order: number === 37 ? { id: 'order-id', status: 'PAID' } : null,
      payment: null,
    }));
  }

  function purchase(status: AdminRafflePurchase['status']): AdminRafflePurchase {
    return {
      rafflePurchaseId: purchaseId,
      buyerName: 'Francisco Larrosa',
      buyerEmail: 'francisco@example.com',
      buyerPhone: '',
      numbers: [37],
      unitPriceInCents: 500_000,
      totalInCents: 500_000,
      status,
      orderId: 'order-id',
      orderStatus: status === 'PAID' ? 'PAID' : 'PAYMENT_PENDING',
      payment: null,
      createdAt: '2026-09-26T18:00:00.000Z',
      reservationExpiresAt: '2026-09-26T19:00:00.000Z',
      paidAt: status === 'PAID' ? '2026-09-26T18:02:00.000Z' : null,
    };
  }
});
