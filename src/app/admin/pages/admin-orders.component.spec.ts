import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminOrderDetail } from '../core/admin.models';
import { AdminOrdersComponent } from './admin-orders.component';

const orderId = 'd7f5ff29-2c18-4e3b-b635-630eda25b5d8';

describe('AdminOrdersComponent fulfillment', () => {
  let fixture: ComponentFixture<AdminOrdersComponent>;
  let component: AdminOrdersComponent;
  let http: HttpTestingController;

  afterEach(() => http.verify());

  it('renders fulfillment information and handles historical orders without it', () => {
    setup(detail());
    expect(fixture.nativeElement.textContent).toContain('Entrega');
    expect(fixture.nativeElement.textContent).toContain('Retiro coordinado');
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.textContent).toContain('Pendiente de preparación');

    setup(detail({ fulfillment: null }));
    expect(fixture.nativeElement.textContent).toContain('No hay datos de entrega informados');
    expect(fixture.nativeElement.textContent).not.toContain('anterior al sistema');
  });

  it('does not infer a raffle from an empty expired order', () => {
    setup(
      detail({
        items: [],
        fulfillment: null,
        order: { ...detail().order, status: 'EXPIRED', paidAt: null },
      }),
    );
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Origen no informado');
    expect(text).toContain('Reserva vencida sin pago registrado');
    expect(text).not.toContain('Participación de rifa');
  });

  it('identifies a manual sale without pretending there is a Mercado Pago payment', () => {
    setup(
      detail({
        order: {
          ...detail().order,
          paymentSource: 'MANUAL',
          manualPaymentMethod: 'TRANSFER',
          manualSaleNote: 'Transferencia recibida',
        },
        fulfillment: null,
      }),
    );

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Venta manual · Transferencia');
    expect(text).toContain('Transferencia recibida');
    expect(text).toContain('No existe un pago de Mercado Pago');
    expect(text).not.toContain('Payment ID de Mercado Pago');
  });

  it('shows only the applicable fulfillment CTA', () => {
    setup(detail());
    expect(fixture.nativeElement.textContent).toContain('Marcar listo para retirar');

    setup(detail({ order: { ...detail().order, status: 'AWAITING_PAYMENT' } }));
    expect(fixture.nativeElement.textContent).not.toContain('Marcar listo para retirar');

    setup(detail({ fulfillment: { ...detail().fulfillment!, status: 'READY_FOR_PICKUP' } }));
    expect(fixture.nativeElement.textContent).toContain('Marcar como entregado');

    setup(detail({ fulfillment: { ...detail().fulfillment!, status: 'COMPLETED' } }));
    expect(fixture.nativeElement.textContent).not.toContain('Marcar como entregado');

    setup(
      detail({
        order: { ...detail().order, status: 'REFUNDED' },
        fulfillment: { ...detail().fulfillment!, status: 'READY_FOR_PICKUP' },
      }),
    );
    expect(fixture.nativeElement.textContent).toContain('Pedido reembolsado');
    expect(fixture.nativeElement.textContent).not.toContain('Marcar como entregado');
  });

  it('sends the exact READY_FOR_PICKUP mutation and reloads detail', () => {
    setup(detail());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.updateFulfillment('READY_FOR_PICKUP');
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/orders/${orderId}/fulfillment`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'READY_FOR_PICKUP' });
    request.flush({
      id: 'fulfillment-id',
      status: 'READY_FOR_PICKUP',
      adminNote: null,
      readyAt: '2026-08-19T12:00:00Z',
      completedAt: null,
    });
    http
      .expectOne(`${ADMIN_API_BASE_URL}/orders/${orderId}`)
      .flush(detail({ fulfillment: { ...detail().fulfillment!, status: 'READY_FOR_PICKUP' } }));
  });

  it('sends the exact COMPLETED mutation and maps backend domain errors', () => {
    setup(detail({ fulfillment: { ...detail().fulfillment!, status: 'READY_FOR_PICKUP' } }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.updateFulfillment('COMPLETED');
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/orders/${orderId}/fulfillment`);
    expect(request.request.body).toEqual({ status: 'COMPLETED' });
    request.flush({ code: 'ORDER_NOT_PAID' }, { status: 409, statusText: 'Conflict' });
    expect(component.message()).toBe('El pedido todavía no tiene un pago confirmado.');
  });

  function setup(response: AdminOrderDetail): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminOrdersComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ orderId }) } },
        },
      ],
    });
    fixture = TestBed.createComponent(AdminOrdersComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${ADMIN_API_BASE_URL}/orders/${orderId}`).flush(response);
    fixture.detectChanges();
  }
});

function detail(overrides: Partial<AdminOrderDetail> = {}): AdminOrderDetail {
  const result: AdminOrderDetail = {
    order: {
      id: orderId,
      status: 'PAID',
      totalInCents: 1500,
      createdAt: '2026-08-19T10:00:00Z',
      reservationExpiresAt: '2026-08-19T10:10:00Z',
      paidAt: '2026-08-19T10:01:00Z',
    },
    items: [],
    paymentPreference: null,
    payments: [],
    inventoryMovements: [],
    fulfillment: {
      id: 'fulfillment-id',
      method: 'PICKUP',
      status: 'PENDING',
      customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '2494000000' },
      customerNote: null,
      adminNote: null,
      readyAt: null,
      completedAt: null,
      createdAt: '2026-08-19T10:00:00Z',
      updatedAt: '2026-08-19T10:00:00Z',
    },
  };
  return { ...result, ...overrides };
}
