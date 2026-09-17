import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PUBLIC_API_BASE_URL } from '../../core/commerce.models';
import { CartStore } from '../../core/cart.store';
import { RaffleCheckoutStore } from '../../../raffle/core/raffle-checkout.store';
import { CheckoutStatusPageComponent } from './checkout-status-page.component';

const orderId = 'd7f5ff29-2c18-4e3b-b635-630eda25b5d8';
const statusUrl = PUBLIC_API_BASE_URL + '/orders/' + orderId + '/status';
const POLLING_INTERVAL_MS = 5_000;
const POLLING_TIMEOUT_MS = 120_000;
const rafflePurchaseId = '8d91f074-d466-4df0-9198-c11636786592';
const raffleId = '49de99a5-a861-4fd0-a3c4-c0d53dca616d';

describe('CheckoutStatusPageComponent payment safety', () => {
  let fixture: ComponentFixture<CheckoutStatusPageComponent>;
  let component: CheckoutStatusPageComponent;
  let http: HttpTestingController;
  let cart: CartStore;

  afterEach(() => {
    fixture?.destroy();
    http?.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(['awaiting_payment', 'payment_pending'] as const)(
    'keeps polling after more than five %s responses',
    (status) => {
      vi.useFakeTimers();
      setup('checkout/pending', { external_reference: orderId, status: 'approved' });
      flushStatus(status);

      for (let request = 0; request < 6; request += 1) {
        vi.advanceTimersByTime(POLLING_INTERVAL_MS);
        flushStatus(status);
      }

      expect(component.isPending()).toBe(true);
      expect(component.pollingTimedOut()).toBe(false);
      expect(cart.checkoutContext()?.status).toBe(
        status === 'awaiting_payment' ? 'AWAITING_PAYMENT' : 'PAYMENT_PENDING',
      );
    },
  );

  it('updates to paid from a later poll without reloading the page', () => {
    vi.useFakeTimers();
    setup('checkout/pending', { external_reference: orderId });
    flushStatus('awaiting_payment');

    vi.advanceTimersByTime(POLLING_INTERVAL_MS);
    flushStatus('paid');
    fixture.detectChanges();

    expect(component.title()).toBe('Pago confirmado');
    expect(cart.items()).toEqual([]);
    expect(cart.checkoutContext()).toBeNull();
    vi.advanceTimersByTime(POLLING_INTERVAL_MS * 2);
    http.expectNone(statusUrl);
  });

  it('clears cart and checkout context exactly once after paid', () => {
    const clearCart = vi.spyOn(CartStore.prototype, 'clear');
    const clearContext = vi.spyOn(CartStore.prototype, 'clearCheckoutContext');
    try {
      setup('checkout/success', { external_reference: orderId });
      flushStatus('paid');

      expect(clearCart).toHaveBeenCalledTimes(1);
      expect(clearContext).toHaveBeenCalledTimes(1);
    } finally {
      clearCart.mockRestore();
      clearContext.mockRestore();
    }
  });

  it.each(['expired', 'cancelled', 'refunded'] as const)(
    'stops polling and releases checkout context after %s',
    (status) => {
      vi.useFakeTimers();
      setup('checkout/pending', { external_reference: orderId });
      flushStatus(status);

      expect(cart.checkoutContext()).toBeNull();
      expect(cart.items()).toHaveLength(1);
      vi.advanceTimersByTime(POLLING_INTERVAL_MS * 2);
      http.expectNone(statusUrl);
    },
  );

  it('does not trust success query params when backend remains pending', () => {
    setup('checkout/success', { external_reference: orderId, status: 'approved' });
    flushStatus('awaiting_payment');

    expect(component.title()).not.toBe('Pago confirmado');
    expect(cart.items()).toHaveLength(1);
  });

  it('continues polling after a temporary status error', () => {
    vi.useFakeTimers();
    setup('checkout/pending', { external_reference: orderId });
    http.expectOne(statusUrl).flush(null, { status: 503, statusText: 'Unavailable' });

    vi.advanceTimersByTime(POLLING_INTERVAL_MS);
    flushStatus('paid');

    expect(component.title()).toBe('Pago confirmado');
    expect(cart.items()).toEqual([]);
  });

  it('stops automatic polling after two minutes and offers one safe status check', () => {
    vi.useFakeTimers();
    setup('checkout/pending', { external_reference: orderId });
    flushStatus('payment_pending');

    for (
      let elapsed = POLLING_INTERVAL_MS;
      elapsed < POLLING_TIMEOUT_MS;
      elapsed += POLLING_INTERVAL_MS
    ) {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS);
      flushStatus('payment_pending');
    }
    vi.advanceTimersByTime(POLLING_INTERVAL_MS);
    fixture.detectChanges();

    expect(component.pollingTimedOut()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'La confirmación está demorando más de lo habitual',
    );
    expect(fixture.nativeElement.textContent).toContain('Consultar estado');
    http.expectNone(statusUrl);
  });

  it('uses only one GET when the user consults after the timeout', () => {
    vi.useFakeTimers();
    setup('checkout/pending', { external_reference: orderId });
    flushStatus('awaiting_payment');

    for (
      let elapsed = POLLING_INTERVAL_MS;
      elapsed < POLLING_TIMEOUT_MS;
      elapsed += POLLING_INTERVAL_MS
    ) {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS);
      flushStatus('awaiting_payment');
    }
    vi.advanceTimersByTime(POLLING_INTERVAL_MS);

    component.consult();
    const request = http.expectOne(statusUrl);
    expect(request.request.method).toBe('GET');
    request.flush({ orderId, status: 'payment_pending' });
    http.expectNone(
      (pendingRequest) =>
        pendingRequest.url.includes('preference') || pendingRequest.url.includes('reserve'),
    );
  });

  it('cancels polling when the component is destroyed', () => {
    vi.useFakeTimers();
    setup('checkout/pending', { external_reference: orderId });
    flushStatus('awaiting_payment');

    fixture.destroy();
    vi.advanceTimersByTime(POLLING_INTERVAL_MS * 2);
    http.expectNone(statusUrl);
  });

  it.each(['success', 'pending', 'failure'] as const)(
    'redirects an old raffle %s return only when its order matches legacy context',
    (kind) => {
      const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
      setup(`checkout/${kind}`, { external_reference: orderId, payment_id: '123' }, orderId);

      expect(navigate).toHaveBeenCalledWith([`/rifa/checkout/${kind}`], {
        queryParams: { rafflePurchaseId },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      http.expectNone((request) => request.url.includes('/orders/'));
    },
  );

  it('keeps shop returns in the shop flow when unrelated raffle context exists', () => {
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    setup(
      'checkout/success',
      { external_reference: orderId },
      '6392488e-8ad6-469a-8e0b-3a51c41592bd',
    );
    flushStatus('paid');

    expect(navigate).not.toHaveBeenCalled();
    expect(component.orderId()).toBe(orderId);
    expect(component.title()).toBe('Pago confirmado');
  });

  it('does not redirect a generic return without an order reference just because raffle storage exists', () => {
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    setup('checkout/success', {}, orderId);

    expect(navigate).not.toHaveBeenCalled();
    http.expectNone((request) => request.url.includes('/orders/'));
  });

  it('does not match external_reference against the stored raffle purchase ID', () => {
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    setup('checkout/success', { external_reference: rafflePurchaseId }, orderId);
    http.expectOne(`${PUBLIC_API_BASE_URL}/orders/${rafflePurchaseId}/status`).flush({
      orderId: rafflePurchaseId,
      status: 'paid',
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  function setup(path: string, query: Record<string, string>, legacyRaffleOrderId?: string): void {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CheckoutStatusPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(query), routeConfig: { path } },
          },
        },
      ],
    });

    if (legacyRaffleOrderId) {
      sessionStorage.setItem(
        'gatarsis.raffle.checkout.v1',
        JSON.stringify({
          rafflePurchaseId,
          orderId: legacyRaffleOrderId,
          raffleId,
          numbers: [7],
          status: 'RESERVED',
          updatedAt: new Date().toISOString(),
        }),
      );
    }
    TestBed.inject(RaffleCheckoutStore);
    fixture = TestBed.createComponent(CheckoutStatusPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartStore);
    cart.add({
      variantId: 'variant-id',
      productId: 'product-id',
      productSlug: 'producto',
      productName: 'Producto',
      variantName: 'Variante',
      sku: 'SKU',
      unitPriceInCents: 100,
      quantity: 1,
      availableStock: 1,
      imageUrl: null,
    });
    fixture.detectChanges();
  }

  function flushStatus(status: string): void {
    http.expectOne(statusUrl).flush({ orderId, status });
  }
});
