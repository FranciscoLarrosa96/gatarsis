import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, expand, finalize, forkJoin, reduce } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import {
  AdminFlatPage,
  AdminInventoryItem,
  AdminOrderDetail,
  AdminOrderManualPaymentMethod,
  AdminProductListItem,
  AdminProductVariant,
} from '../core/admin.models';
import { formatArsFromCents } from '../core/admin-formatters';
import { AdminDialogDirective } from '../shared/admin-dialog.directive';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, AdminDialogDirective],
  templateUrl: './admin-manual-sale.component.html',
  styleUrls: ['./admin-pages.css', './admin-manual-sale.component.css'],
})
export class AdminManualSaleComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<AdminProductListItem[]>([]);
  readonly inventory = signal<AdminInventoryItem[]>([]);
  readonly quantities = signal<Record<string, number>>({});
  readonly search = signal('');
  readonly loading = signal(false);
  readonly catalogError = signal(false);
  readonly submitting = signal(false);
  readonly confirming = signal(false);
  readonly error = signal('');
  readonly success = signal<AdminOrderDetail | null>(null);
  customer = { name: '', phone: '', email: '' };
  paymentMethod: AdminOrderManualPaymentMethod = 'CASH';
  note = '';
  paymentReceived = false;
  readonly money = formatArsFromCents;
  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('es-AR');
    return this.products().filter(
      (p) =>
        p.active &&
        (!query ||
          [
            p.name,
            ...p.variants
              .filter((v) => v.active)
              .map((v) => v.name + ' ' + this.variantLabel(v) + ' ' + v.sku),
          ]
            .join(' ')
            .toLocaleLowerCase('es-AR')
            .includes(query)),
    );
  });
  readonly lines = computed(() =>
    Object.entries(this.quantities()).map(([variantId, quantity]) => {
      const product = this.products().find((p) => p.variants.some((v) => v.id === variantId));
      const variant = product?.variants.find((v) => v.id === variantId);
      const stock = this.stock(variantId);
      return {
        variantId,
        quantity,
        product,
        variant,
        stock,
        valid:
          !!product?.active &&
          !!variant?.active &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= stock,
        total: quantity * (variant?.priceInCents ?? 0),
      };
    }),
  );
  readonly total = computed(() => this.lines().reduce((sum, line) => sum + line.total, 0));
  readonly valid = computed(
    () =>
      !this.loading() &&
      !this.catalogError() &&
      this.lines().length > 0 &&
      this.lines().every((line) => line.valid),
  );

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.catalogError.set(false);
    forkJoin({
      products: allPages((page) => this.api.products({ page, pageSize: 100, active: true })),
      inventory: allPages((page) => this.api.inventory({ page, pageSize: 100, active: true })),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.products.set(result.products);
          this.inventory.set(result.inventory);
        },
        error: () => this.catalogError.set(true),
      });
  }

  stock(id: string): number {
    const item = this.inventory().find((i) => i.variantId === id && i.active);
    return Math.max(0, item?.availableStock ?? 0);
  }

  variantLabel(v: AdminProductVariant): string {
    return (
      [
        v.model || v.attributes?.['model'],
        v.color || v.attributes?.['color'],
        v.size || v.attributes?.['size'],
      ]
        .map((value, index) => (value ? ['Modelo: ', 'Color: ', 'Talle: '][index] + value : ''))
        .filter(Boolean)
        .join(' · ') || v.name
    );
  }

  changeQuantity(id: string, quantity: number): void {
    if (this.submitting() || this.confirming() || this.loading()) return;
    if (quantity <= 0) {
      this.remove(id);
      return;
    }
    const product = this.products().find(
      (p) => p.active && p.variants.some((v) => v.id === id && v.active),
    );
    if (!product || !Number.isInteger(quantity) || quantity > this.stock(id)) return;
    this.quantities.update((current) => ({ ...current, [id]: quantity }));
  }

  remove(id: string): void {
    if (this.submitting() || this.confirming()) return;
    this.quantities.update((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  customerValid(): boolean {
    return (
      !!this.customer.name.trim() &&
      (!this.customer.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.customer.email.trim()))
    );
  }

  review(): void {
    if (this.valid() && this.customerValid() && this.paymentReceived && this.methodValid()) {
      this.error.set('');
      this.confirming.set(true);
    }
  }

  closeConfirmation(): void {
    if (!this.submitting()) this.confirming.set(false);
  }
  methodLabel(): string {
    return { CASH: 'Efectivo', TRANSFER: 'Transferencia', OTHER: 'Otro' }[this.paymentMethod];
  }
  private methodValid(): boolean {
    return ['CASH', 'TRANSFER', 'OTHER'].includes(this.paymentMethod);
  }

  submit(): void {
    if (
      !this.confirming() ||
      this.submitting() ||
      !this.valid() ||
      !this.customerValid() ||
      !this.paymentReceived ||
      !this.methodValid()
    )
      return;
    this.submitting.set(true);
    this.error.set('');
    this.api
      .createManualOrder({
        customer: {
          name: this.customer.name.trim(),
          phone: this.customer.phone.trim() || null,
          email: this.customer.email.trim() || null,
        },
        paymentMethod: this.paymentMethod,
        items: this.lines().map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        ...(this.note.trim() ? { note: this.note.trim() } : {}),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.success.set(result);
          this.confirming.set(false);
          this.quantities.set({});
        },
        error: (error: unknown) => {
          const code = error instanceof HttpErrorResponse ? error.error?.code : '';
          this.error.set(
            code === 'INSUFFICIENT_STOCK' || code === 'STOCK_INSUFFICIENT'
              ? 'Ya no hay stock suficiente para esta venta. Revisá las cantidades con el stock actualizado.'
              : [
                    'VARIANT_NOT_FOUND',
                    'VARIANT_INACTIVE',
                    'PRODUCT_INACTIVE',
                    'PRODUCT_NOT_FOUND',
                  ].includes(code)
                ? 'Este producto ya no está disponible. Revisá los productos seleccionados.'
                : 'No pudimos registrar la venta. Intentá nuevamente.',
          );
          this.confirming.set(false);
          this.loadCatalog();
        },
      });
  }

  reset(): void {
    this.success.set(null);
    this.customer = { name: '', phone: '', email: '' };
    this.paymentMethod = 'CASH';
    this.note = '';
    this.paymentReceived = false;
    this.search.set('');
    this.error.set('');
    this.loadCatalog();
  }
}

// Both admin endpoints use flat pagination. Fetch every page so variants never
// appear out of stock merely because their inventory row is on another page.
function allPages<T>(fetch: (page: number) => Observable<AdminFlatPage<T>>): Observable<T[]> {
  return fetch(1).pipe(
    expand((page) => (page.page * page.pageSize < page.total ? fetch(page.page + 1) : EMPTY)),
    reduce((items, page) => [...items, ...page.items], [] as T[]),
  );
}
