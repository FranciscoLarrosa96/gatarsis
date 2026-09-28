import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PUBLIC_API_BASE_URL } from '../../core/commerce.models';
import { CartStore } from '../../core/cart.store';
import { CartPageComponent } from './cart-page.component';

describe('CartPageComponent checkout', () => {
  let fixture: ComponentFixture<CartPageComponent>;
  let component: CartPageComponent;
  let http: HttpTestingController;
  let cart: CartStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CartPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
    cart = TestBed.inject(CartStore);
    http = TestBed.inject(HttpTestingController);
    cart.add({
      variantId: 'variant-id',
      productId: 'product-id',
      productSlug: 'producto',
      productName: 'Producto',
      variantName: 'Variante',
      sku: 'SKU',
      unitPriceInCents: 100,
      quantity: 2,
      availableStock: 2,
      imageUrl: null,
    });
    fixture.detectChanges();
    http.expectOne(`${PUBLIC_API_BASE_URL}/products`).flush([
      {
        id: 'product-id',
        slug: 'producto',
        name: 'Producto',
        media: [],
        variants: [
          { id: 'variant-id', sku: 'SKU', name: 'Variante', priceInCents: 100, availableStock: 2 },
        ],
      },
    ]);
    component.customer = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '249 400 0000',
      note: 'Llamar por la tarde',
    };
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('shows the human variant label without exposing its SKU', () => {
    expect(fixture.nativeElement.textContent).toContain('Variante');
    expect(fixture.nativeElement.textContent).not.toContain('SKU');
  });

  it('keeps the contact form without the outdated pickup notice', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Datos para coordinar el retiro');
    expect(content).not.toContain('Retiro coordinado');
    expect(content).not.toContain('Una vez confirmado el pago, nos comunicaremos con vos');
  });

  it('double click creates only one reserve request', () => {
    const redirect = vi
      .spyOn(component as unknown as { redirectTo: (url: string) => void }, 'redirectTo')
      .mockImplementation(() => undefined);
    component.checkout();
    component.checkout();

    const requests = http.match(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    expect(requests.length).toBe(1);
    expect(requests[0].request.headers.has('Idempotency-Key')).toBe(true);
    expect(requests[0].request.body).toEqual({
      items: [{ variantId: 'variant-id', quantity: 2 }],
      customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '249 400 0000' },
      fulfillment: { method: 'PICKUP', note: 'Llamar por la tarde' },
    });
    requests[0].flush({
      orderId: 'order-id',
      status: 'awaiting_payment',
      totalInCents: 200,
      reservationExpiresAt: '2026-01-01T00:10:00Z',
    });
    const preference = http.expectOne(
      `${PUBLIC_API_BASE_URL}/checkout/order-id/mercado-pago/preference`,
    );
    preference.flush({
      orderId: 'order-id',
      preferenceId: 'provider-preference',
      initPoint: 'https://mp.test/init',
    });
    expect(redirect).toHaveBeenCalledWith('https://mp.test/init');
  });

  it('blocks a new reservation while a checkout is awaiting payment, including after reload context restore', () => {
    cart.saveCheckoutContext({
      orderId: 'd7f5ff29-2c18-4e3b-b635-630eda25b5d8',
      status: 'AWAITING_PAYMENT',
      reservationExpiresAt: '2026-01-01T00:10:00Z',
    });
    fixture.detectChanges();
    expect(component.pendingCheckout()?.orderId).toBe('d7f5ff29-2c18-4e3b-b635-630eda25b5d8');
    expect(fixture.nativeElement.textContent).toContain('Tenés un pago en proceso');
    component.checkout();
    http.expectNone(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
  });

  it('reserve failure does not create Mercado Pago preference', () => {
    component.checkout();
    const reserve = http.expectOne(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    reserve.flush({ code: 'OUT_OF_STOCK' }, { status: 409, statusText: 'Conflict' });
    http.expectNone((request) => request.url.includes('/mercado-pago/preference'));
    expect(component.state()).toBe('ERROR');
  });

  it('identifies and highlights an exhausted variant from the reserve error', () => {
    component.checkout();
    const reserve = http.expectOne(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    reserve.flush(
      {
        code: 'OUT_OF_STOCK',
        details: { variantId: 'variant-id', requested: 1, available: 0 },
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(component.stockIssue()).toEqual({ variantId: 'variant-id', requested: 1, available: 0 });
    expect(component.cart.items()[0].availableStock).toBe(0);
    expect(component.ctaLabel()).toBe('Revisar carrito');
    expect(fixture.nativeElement.textContent).toContain(
      'Este producto se agotó mientras estabas comprando.',
    );
    expect(fixture.nativeElement.textContent).toContain('Producto · Variante');
    expect(fixture.nativeElement.textContent).toContain('Sin stock');

    component.removeUnavailable('variant-id');
    fixture.detectChanges();
    expect(cart.items()).toHaveLength(0);
  });

  it('shows reduced stock and allows the user to adjust the requested quantity', () => {
    component.checkout();
    const reserve = http.expectOne(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    reserve.flush(
      {
        code: 'OUT_OF_STOCK',
        details: { variantId: 'variant-id', requested: 3, available: 1 },
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(component.hasInvalidAvailability()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Pediste 3 unidades, pero ahora quedan 1.');
    expect(fixture.nativeElement.textContent).toContain('Solo quedan 1');

    component.adjustToAvailable('variant-id', 1);
    fixture.detectChanges();
    expect(cart.items()[0].quantity).toBe(1);
    expect(component.hasInvalidAvailability()).toBe(false);
    expect(component.stockIssue()).toBeNull();
  });

  it('falls back to the generic message when the reported variant is not in the cart', () => {
    component.checkout();
    const reserve = http.expectOne(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    reserve.flush(
      {
        code: 'OUT_OF_STOCK',
        details: { variantId: 'other-variant', requested: 1, available: 0 },
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(component.stockIssue()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Algunos productos cambiaron de disponibilidad',
    );
  });

  it('does not reserve when the name is empty or whitespace only', () => {
    component.customer.name = '   ';
    component.checkout();
    http.expectNone(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    expect(component.customerError()).toBe('Ingresá tu nombre y apellido.');
  });

  it('does not reserve with an invalid email or missing phone', () => {
    component.customer.email = 'no-es-email';
    component.checkout();
    http.expectNone(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    expect(component.customerError()).toBe('Ingresá un email válido.');

    component.customer.email = 'ada@example.com';
    component.customer.phone = '   ';
    component.checkout();
    http.expectNone(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    expect(component.customerError()).toBe('Ingresá un teléfono o WhatsApp.');
  });

  it('trims customer data in the reserve payload and never persists it in the cart', () => {
    component.customer = {
      name: ' Ada Lovelace ',
      email: ' ada@example.com ',
      phone: ' 249 400 0000 ',
      note: ' retiro por la tarde ',
    };
    component.checkout();
    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/checkout/reserve`);
    expect(request.request.body).toEqual({
      items: [{ variantId: 'variant-id', quantity: 2 }],
      customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '249 400 0000' },
      fulfillment: { method: 'PICKUP', note: 'retiro por la tarde' },
    });
    const persistedCart = localStorage.getItem('gatarsis.shop.cart.v1') ?? '';
    expect(persistedCart).not.toContain('Ada Lovelace');
    expect(persistedCart).not.toContain('ada@example.com');
    request.flush({ code: 'OUT_OF_STOCK' }, { status: 409, statusText: 'Conflict' });
  });
});
