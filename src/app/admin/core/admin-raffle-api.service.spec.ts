import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminApiService } from './admin-api.service';
import { ADMIN_API_BASE_URL } from './admin-api.config';

describe('Admin raffle API contracts', () => {
  let api: AdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the real list, dashboard, number and purchase endpoints', () => {
    api.raffles({ page: 1, pageSize: 100 }).subscribe();
    expect(http.expectOne(`${ADMIN_API_BASE_URL}/raffles?page=1&pageSize=100`).request.method).toBe(
      'GET',
    );

    api.raffle('raffle-id').subscribe();
    expect(http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id`).request.method).toBe('GET');

    api.raffleNumbers('raffle-id').subscribe();
    expect(http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id/numbers`).request.method).toBe(
      'GET',
    );

    api.rafflePurchases('raffle-id', { page: 2, pageSize: 20 }).subscribe();
    expect(
      http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id/purchases?page=2&pageSize=20`).request
        .method,
    ).toBe('GET');

    api.rafflePurchase('raffle-id', 'purchase-id').subscribe();
    expect(
      http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id/purchases/purchase-id`).request
        .method,
    ).toBe('GET');
  });

  it('creates and edits with the backend DTO without unsupported scheduling fields', () => {
    const body = {
      title: 'Rifa solidaria',
      prizeName: 'Premio',
      description: 'Ayuda para rescates',
      imageUrls: ['https://cdn.test/premio.jpg', 'https://cdn.test/detalle.jpg'],
      priceInCents: 500_000,
      drawAt: '2026-12-20T20:00:00.000Z',
    };

    api.createRaffle(body).subscribe();
    const create = http.expectOne(`${ADMIN_API_BASE_URL}/raffles`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    expect('startsAt' in create.request.body).toBe(false);
    expect('endsAt' in create.request.body).toBe(false);

    api.updateRaffle('raffle-id', { prizeName: 'Premio actualizado' }).subscribe();
    const update = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ prizeName: 'Premio actualizado' });
  });

  it('uses explicit lifecycle endpoints and sends the manual winner', () => {
    const actions = [
      ['publish', () => api.publishRaffle('raffle-id')],
      ['pause', () => api.pauseRaffle('raffle-id')],
      ['resume', () => api.resumeRaffle('raffle-id')],
      ['close', () => api.closeRaffle('raffle-id')],
    ] as const;

    for (const [action, request] of actions) {
      request().subscribe();
      const call = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id/${action}`);
      expect(call.request.method).toBe('POST');
      expect(call.request.body).toEqual({});
    }

    api.drawRaffle('raffle-id', 37).subscribe();
    const draw = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id/draw`);
    expect(draw.request.method).toBe('POST');
    expect(draw.request.body).toEqual({ winningNumber: 37 });
  });

  it('registers a manual sale with buyer data and an idempotency key', () => {
    const body = {
      numbers: [12, 37],
      buyer: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        whatsapp: '+54 249 4000000',
      },
      paymentMethod: 'TRANSFER' as const,
      note: 'Transferencia recibida',
      idempotencyKey: 'manual-sale-key',
    };

    api.createManualRaffleSale('raffle-id', body).subscribe();
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/raffles/raffle-id/manual-sales`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
  });
});
