import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminRaffleDetail, AdminRaffleNumber } from '../core/admin-raffle.models';
import { AdminRaffleEditorComponent } from './admin-raffle-editor.component';

const raffleId = '49de99a5-a861-4fd0-a3c4-c0d53dca616d';
const purchaseId = '8d91f074-d466-4df0-9198-c11636786592';

describe('AdminRaffleEditorComponent', () => {
  let fixture: ComponentFixture<AdminRaffleEditorComponent>;
  let component: AdminRaffleEditorComponent;
  let http: HttpTestingController;

  afterEach(() => {
    fixture?.destroy();
    http?.verify();
  });

  it('creates a DRAFT with a fixed 00–99 range and the exact backend DTO', () => {
    setup(null);
    component.model = {
      title: 'Rifa solidaria',
      prizeName: 'Air Fryer',
      description: 'A beneficio de rescates',
      imageUrl: 'https://cdn.test/premio.jpg',
      price: '5000',
      drawAt: '2026-12-20T17:00',
    };
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.save();
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/raffles`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      title: 'Rifa solidaria',
      prizeName: 'Air Fryer',
      priceInCents: 500_000,
    });
    request.flush({ id: raffleId, status: 'DRAFT' });

    expect(navigate).toHaveBeenCalledWith(['/admin/raffles', raffleId]);
    expect(fixture.nativeElement.textContent).toContain('00–99');
  });

  it('renders metrics and all 100 admin numbers with buyer-only data', () => {
    setup(raffleId);
    loadDetail(detail('ACTIVE'), numbers());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.admin-number')).toHaveLength(100);
    expect(fixture.nativeElement.textContent).toContain('$100.000,00');
    component.inspectNumber(numbers()[37]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Compradora Gatarsis');
    expect(fixture.nativeElement.textContent).toContain('compradora@example.com');
  });

  it('asks for confirmation before closing and then uses the lifecycle endpoint', () => {
    setup(raffleId);
    loadDetail(detail('ACTIVE'), numbers());

    component.requestClose();
    expect(component.confirmation()).toBe('close');
    expect(component.confirmationText()).toContain('dejará de aceptar nuevas reservas');
    component.confirmDangerousAction();
    const close = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/close`);
    expect(close.request.method).toBe('POST');
    close.flush({ ...detail('CLOSED') });
    loadDetail(detail('CLOSED'), numbers());
  });

  it('only offers PAID/SOLD numbers and confirms a manual winner', () => {
    setup(raffleId);
    const closedRaffle = detail('CLOSED');
    closedRaffle.numberSummary = { total: 100, available: 99, reserved: 0, sold: 1 };
    closedRaffle.stats = {
      ...closedRaffle.stats,
      available: 99,
      reserved: 0,
      activeReservations: 0,
    };
    loadDetail(closedRaffle, numbers(false));

    expect(component.eligibleWinningNumbers()).toEqual([37]);
    component.selectedWinningNumber.set(37);
    component.requestDraw();
    expect(component.confirmationText()).toContain('número 37');
    component.confirmDangerousAction();
    const draw = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/draw`);
    expect(draw.request.body).toEqual({ winningNumber: 37 });
    draw.flush({ ...detail('DRAWN'), winningNumber: 37 });
    loadDetail({ ...detail('DRAWN'), winningNumber: 37 }, numbers());
  });

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [AdminRaffleEditorComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { raffleId: id } : {}) } },
        },
      ],
    });
    fixture = TestBed.createComponent(AdminRaffleEditorComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function loadDetail(raffle: AdminRaffleDetail, numberItems: AdminRaffleNumber[]): void {
    http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}`).flush(raffle);
    http.expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/numbers`).flush(numberItems);
    http
      .expectOne(`${ADMIN_API_BASE_URL}/raffles/${raffleId}/purchases?page=1&pageSize=100`)
      .flush({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      });
  }

  function detail(status: AdminRaffleDetail['status']): AdminRaffleDetail {
    return {
      id: raffleId,
      title: 'Rifa solidaria',
      prizeName: 'Air Fryer',
      description: 'Ayuda para rescates',
      imageUrl: null,
      priceInCents: 50_000,
      status,
      drawAt: '2026-12-20T20:00:00.000Z',
      winningNumber: null,
      drawnAt: null,
      drawnByAdminId: null,
      createdAt: '2026-09-13T12:00:00.000Z',
      updatedAt: '2026-09-13T12:00:00.000Z',
      numberSummary: { total: 100, available: 98, reserved: 1, sold: 1 },
      stats: {
        totalNumbers: 100,
        available: 98,
        reserved: 1,
        sold: 1,
        paidPurchases: 1,
        activeReservations: 1,
        revenueInCents: 10_000_000,
      },
      history: [],
    };
  }

  function numbers(includeReservation = true): AdminRaffleNumber[] {
    return Array.from({ length: 100 }, (_, number) => ({
      number,
      status:
        number === 37 ? 'SOLD' : number === 38 && includeReservation ? 'RESERVED' : 'AVAILABLE',
      reservedUntil: number === 38 && includeReservation ? '2026-09-13T13:00:00.000Z' : null,
      soldAt: number === 37 ? '2026-09-13T12:30:00.000Z' : null,
      rafflePurchaseId: number === 37 || (number === 38 && includeReservation) ? purchaseId : null,
      buyer:
        number === 37 || (number === 38 && includeReservation)
          ? {
              name: 'Compradora Gatarsis',
              email: 'compradora@example.com',
              phone: '+54 249 4000000',
            }
          : null,
      order:
        number === 37
          ? { id: 'order-paid', status: 'PAID' }
          : number === 38 && includeReservation
            ? { id: 'order-reserved', status: 'AWAITING_PAYMENT' }
            : null,
      payment: null,
    }));
  }
});
