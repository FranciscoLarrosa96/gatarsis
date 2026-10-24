import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminProductListItem, AdminProductVariant } from '../core/admin.models';
import { AdminManualSaleComponent } from './admin-manual-sale.component';

const variant = {
  id: 'v1',
  productId: 'p1',
  name: 'Hilo rojo',
  model: 'Hilo rojo',
  color: 'Negro',
  size: 'T2',
  priceInCents: 500000,
  active: true,
  sku: 'R-2',
} as AdminProductVariant;
const product = {
  id: 'p1',
  name: 'Remera Gatarsis',
  active: true,
  variants: [variant, { ...variant, id: 'v2', name: 'Sin stock' }],
  media: [],
} as unknown as AdminProductListItem;

describe('AdminManualSaleComponent', () => {
  let fixture: ComponentFixture<AdminManualSaleComponent>;
  let c: AdminManualSaleComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminManualSaleComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AdminManualSaleComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushCatalog();
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function flushCatalog(stock = 4): void {
    http
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ items: [product], page: 1, pageSize: 100, total: 1 });
    http
      .expectOne((r) => r.url.endsWith('/inventory'))
      .flush({
        items: [{ variantId: 'v1', active: true, availableStock: stock }],
        page: 1,
        pageSize: 100,
        total: 1,
      });
  }
  function prepare(): void {
    c.customer.name = ' María ';
    c.paymentMethod = 'TRANSFER';
    c.paymentReceived = true;
    c.changeQuantity('v1', 2);
    c.review();
  }

  it('searches real products and shows model, color and size; zero stock cannot be added', () => {
    expect(fixture.nativeElement.textContent).toContain(
      'Modelo: Hilo rojo · Color: Negro · Talle: T2',
    );
    const add = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(add.filter((b) => b.textContent?.trim() === 'Agregar').map((b) => b.disabled)).toEqual([
      false,
      true,
    ]);
    c.changeQuantity('v2', 1);
    expect(c.lines()).toHaveLength(0);
    c.search.set('negro');
    expect(c.filteredProducts()).toHaveLength(1);
    c.search.set('inexistente');
    expect(c.filteredProducts()).toHaveLength(0);
  });

  it('consolidates quantities, enforces stock and calculates display total; supports removal', () => {
    c.changeQuantity('v1', 2);
    c.changeQuantity('v1', 3);
    expect(c.lines()).toHaveLength(1);
    expect(c.total()).toBe(1500000);
    c.changeQuantity('v1', 5);
    expect(c.quantities()['v1']).toBe(3);
    c.changeQuantity('v1', 1);
    expect(c.total()).toBe(500000);
    c.remove('v1');
    expect(c.total()).toBe(0);
  });

  it('requires customer, valid email and payment acknowledgement before confirmation', () => {
    c.changeQuantity('v1', 1);
    c.review();
    expect(c.confirming()).toBe(false);
    c.customer.name = '   ';
    c.paymentReceived = true;
    c.review();
    expect(c.confirming()).toBe(false);
    c.customer.name = 'Ana';
    c.customer.email = 'invalid';
    c.review();
    expect(c.confirming()).toBe(false);
    c.customer.email = '';
    c.paymentReceived = false;
    c.review();
    expect(c.confirming()).toBe(false);
    c.paymentReceived = true;
    c.review();
    expect(c.confirming()).toBe(true);
    c.closeConfirmation();
    expect(c.confirming()).toBe(false);
    c.submit();
    http.expectNone((r) => r.method === 'POST');
  });

  it('posts only customer, variant IDs, quantities and payment method, prevents double submit and shows server total', () => {
    prepare();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeTruthy();
    c.submit();
    c.submit();
    fixture.detectChanges();
    expect(c.submitting()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Registrando');
    c.closeConfirmation();
    expect(c.confirming()).toBe(true);
    const req = http.expectOne(ADMIN_API_BASE_URL + '/orders/manual');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      customer: { name: 'María', phone: null, email: null },
      paymentMethod: 'TRANSFER',
      items: [{ variantId: 'v1', quantity: 2 }],
    });
    req.flush({ order: { id: 'order-1', totalInCents: 1200000 } });
    fixture.detectChanges();
    expect(c.submitting()).toBe(false);
    expect(c.lines()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Venta manual registrada');
    expect(fixture.nativeElement.textContent).toContain(c.money(1200000));
    expect(fixture.nativeElement.querySelector('a[href="/admin/orders/order-1"]')).toBeTruthy();
    c.reset();
    flushCatalog(2);
    expect(c.customer.name).toBe('');
    expect(c.paymentReceived).toBe(false);
  });

  it('recovers from stock errors, refreshes availability, preserves inputs and blocks stale quantities', () => {
    prepare();
    c.submit();
    http
      .expectOne(ADMIN_API_BASE_URL + '/orders/manual')
      .flush({ code: 'INSUFFICIENT_STOCK' }, { status: 409, statusText: 'Conflict' });
    expect(c.submitting()).toBe(false);
    expect(c.confirming()).toBe(false);
    expect(c.error()).toContain('stock suficiente');
    expect(c.customer.name.trim()).toBe('María');
    flushCatalog(1);
    expect(c.valid()).toBe(false);
    c.changeQuantity('v1', 1);
    expect(c.valid()).toBe(true);
  });

  it('handles unavailable variants and generic errors without blocking the UI', () => {
    prepare();
    c.submit();
    http
      .expectOne(ADMIN_API_BASE_URL + '/orders/manual')
      .flush({ code: 'VARIANT_INACTIVE' }, { status: 409, statusText: 'Conflict' });
    expect(c.error()).toContain('ya no está disponible');
    flushCatalog();
    c.review();
    c.submit();
    http
      .expectOne(ADMIN_API_BASE_URL + '/orders/manual')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(c.error()).toContain('Intentá nuevamente');
    flushCatalog();
    expect(c.submitting()).toBe(false);
  });

  it('fetches every inventory page and fails closed if refreshing fails', () => {
    c.loadCatalog();
    http
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ items: [product], page: 1, pageSize: 100, total: 1 });
    http
      .expectOne((r) => r.url.endsWith('/inventory'))
      .flush({ items: [], page: 1, pageSize: 1, total: 2 });
    http
      .expectOne((r) => r.url.endsWith('/inventory') && r.params.get('page') === '2')
      .flush({
        items: [{ variantId: 'v1', active: true, availableStock: 3 }],
        page: 2,
        pageSize: 1,
        total: 2,
      });
    expect(c.stock('v1')).toBe(3);
    c.loadCatalog();
    http
      .expectOne((r) => r.url.endsWith('/inventory'))
      .flush({}, { status: 500, statusText: 'Error' });
    http.expectOne((r) => r.url.endsWith('/products'));
    expect(c.catalogError()).toBe(true);
    expect(c.valid()).toBe(false);
    expect(c.loading()).toBe(false);
  });
});
