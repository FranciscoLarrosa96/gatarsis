import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminPaginatedResponse,
} from '../core/admin.models';
import { formatAdminDate, formatArsFromCents, orderStatusLabel } from '../core/admin-formatters';

type StatusFilter = '' | 'PAID' | 'PENDING' | 'REFUNDED' | 'EXPIRED' | 'REVIEW';
type KindFilter = '' | 'MERCH' | 'RAFFLE';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page simple-payments">
      <header class="page-heading">
        <div>
          <h1>{{ selected() ? 'Detalle del pago' : 'Pagos' }}</h1>
          <p class="page-description">
            {{ selected() ? 'Resumen claro de la compra y el pago.' : 'Compras y pagos recientes.' }}
          </p>
        </div>
        @if (selected()) {
          <button class="button button-secondary" type="button" (click)="closeDetail()">
            Volver a pagos
          </button>
        } @else {
          <button class="button button-secondary refresh-button" type="button" [disabled]="loading()" (click)="load()">
            Actualizar
          </button>
        }
      </header>

      @if (selected(); as order) {
        <article class="simple-detail">
          <div class="simple-detail__status">
            <span class="badge status-{{ badgeClass(order) }}">{{ statusLabel(order) }}</span>
            @if (kindLabel(order)) { <span class="kind-badge">{{ kindLabel(order) }}</span> }
          </div>
          <h2>{{ order.customer?.name || 'Comprador sin datos' }}</h2>
          <p class="purchase-heading">Compró: {{ purchaseTitle(order) }}</p>
          @if (order.kind === 'MERCH') {
            <ul class="purchase-items">
              @for (item of order.items || []; track $index) { <li>{{ itemLabel(item) }}</li> }
              @empty { <li>Compra</li> }
            </ul>
          } @else if (order.kind === 'RAFFLE' && order.raffle; as raffle) {
            @if (raffle.numbers.length) {
              <p class="raffle-count">{{ raffle.numbers.length }} números</p>
              <p class="raffle-numbers">{{ numberSummary(raffle.numbers, true) }}</p>
            }
          } @else if (order.items?.length) {
            <ul class="purchase-items">
              @for (item of order.items; track $index) { <li>{{ itemLabel(item) }}</li> }
            </ul>
          }
          <dl class="simple-detail__facts">
            <div><dt>Total</dt><dd class="amount">{{ money(order.totalInCents) }}</dd></div>
            <div><dt>Fecha</dt><dd>{{ date(order.paidAt || order.createdAt) }}</dd></div>
            @if (order.customer?.phone) { <div><dt>Teléfono</dt><dd>{{ order.customer?.phone }}</dd></div> }
            @if (order.customer?.email) { <div><dt>Email</dt><dd class="breakable">{{ order.customer?.email }}</dd></div> }
          </dl>
          @if (detailLoading()) {
            <p class="muted" role="status">Cargando información del pedido…</p>
          } @else if (detailError()) {
            <p class="detail-note" role="status">El resumen está disponible. No pudimos cargar la información técnica.</p>
          } @else if (detail(); as info) {
            <details class="technical-info">
              <summary>Ver información técnica</summary>
              <dl>
                <div><dt>Pedido</dt><dd>{{ info.order.id }}</dd></div>
                @if (info.paymentPreference?.providerPreferenceId) {
                  <div><dt>Preferencia</dt><dd>{{ info.paymentPreference?.providerPreferenceId }}</dd></div>
                }
                @for (payment of info.payments; track payment.id) {
                  <div><dt>Pago de Mercado Pago</dt><dd>{{ payment.providerPaymentId }}</dd></div>
                  <div><dt>Procesamiento</dt><dd>{{ payment.processingStatus }}</dd></div>
                }
              </dl>
            </details>
          }
        </article>
      } @else {
        <section class="payment-filters" aria-label="Filtros de pagos">
          <label class="search-field">
            Buscar por nombre, email o teléfono
            <input type="search" [ngModel]="search" (ngModelChange)="search = $event" placeholder="Ej.: María o 11 5555..." autocomplete="off" />
          </label>
          <label>Estado
            <select [ngModel]="statusFilter" (ngModelChange)="statusFilter = $event">
              <option value="">Todos</option><option value="PAID">Pagados</option>
              <option value="PENDING">Pendientes</option><option value="REFUNDED">Reembolsados</option>
              <option value="EXPIRED">Vencidos</option><option value="REVIEW">Revisión</option>
            </select>
          </label>
          <label>Tipo
            <select [ngModel]="kindFilter" (ngModelChange)="kindFilter = $event">
              <option value="">Todos</option><option value="MERCH">Tienda</option><option value="RAFFLE">Rifa</option>
            </select>
          </label>
          @if (hasFilters()) {
            <button class="button button-quiet clear-button" type="button" (click)="clearFilters()">Limpiar filtros</button>
          }
        </section>

        @if (loading()) {
          <div class="payment-skeletons" role="status" aria-label="Cargando pagos">
            <div class="payment-skeleton"></div><div class="payment-skeleton"></div><div class="payment-skeleton"></div>
          </div>
        } @else if (error()) {
          <section class="payment-state" role="alert">
            <p>No pudimos cargar los pagos.</p>
            <button class="button button-primary" type="button" (click)="load()">Reintentar</button>
          </section>
        } @else if (filteredOrders().length) {
          <p class="page-hint">
            Página {{ pagination().page }} de {{ pagination().totalPages || 1 }} · más recientes primero.
            La búsqueda y los filtros se aplican a esta página.
          </p>
          <div class="mobile-payment-list" aria-label="Pagos en tarjetas">
            @for (order of filteredOrders(); track order.id) {
              <article class="payment-card">
                <div class="payment-card__top">
                  <span class="badge status-{{ badgeClass(order) }}">{{ statusLabel(order) }}</span>
                  @if (kindLabel(order)) { <span class="kind-badge">{{ kindLabel(order) }}</span> }
                </div>
                <h2>{{ order.customer?.name || 'Comprador sin datos' }}</h2>
                <p class="purchase-heading">{{ purchaseTitle(order) }}</p>
                @if (order.kind === 'MERCH' || (order.kind !== 'RAFFLE' && order.items?.length)) {
                  @if (order.items?.length) {
                    <ul class="purchase-items">
                      @for (item of order.items.slice(0, 3); track $index) { <li>{{ itemLabel(item) }}</li> }
                    </ul>
                    @if ((order.items?.length || 0) > 3) { <small class="muted">+ {{ order.items!.length - 3 }} productos más</small> }
                  }
                } @else if (order.kind === 'RAFFLE' && order.raffle; as raffle) {
                  <p class="raffle-count">{{ raffle.numbers.length || order.itemsCount }} números</p>
                  @if (raffle.numbers.length) {
                    <p class="raffle-numbers">{{ numberSummary(raffle.numbers, expandedNumbers() === order.id) }}</p>
                    @if (raffle.numbers.length > 6) {
                      <button class="text-button" type="button" (click)="toggleNumbers(order.id)">
                        {{ expandedNumbers() === order.id ? 'Ver menos' : 'Ver todos' }}
                      </button>
                    }
                  }
                }
                @if (order.customer?.phone || order.customer?.email) {
                  <p class="contact-line">
                    {{ order.customer?.phone }}{{ order.customer?.phone && order.customer?.email ? ' · ' : '' }}{{ order.customer?.email }}
                  </p>
                }
                <div class="payment-card__bottom">
                  <strong class="amount">{{ money(order.totalInCents) }}</strong>
                  <time [attr.datetime]="order.paidAt || order.createdAt">{{ date(order.paidAt || order.createdAt) }}</time>
                </div>
                <button class="button button-primary detail-button" type="button" (click)="showDetail(order)">Ver detalle</button>
              </article>
            }
          </div>
          <div class="desktop-payment-table">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Compra</th><th>Estado</th><th class="numeric">Total</th><th>Acción</th></tr></thead>
                <tbody>
                  @for (order of filteredOrders(); track order.id) {
                    <tr>
                      <td>{{ date(order.paidAt || order.createdAt) }}</td><td>{{ order.customer?.name || 'Comprador sin datos' }}</td>
                      <td>{{ kindLabel(order) || 'Compra' }}</td><td>{{ purchaseTitle(order) }}</td>
                      <td><span class="badge status-{{ badgeClass(order) }}">{{ statusLabel(order) }}</span></td>
                      <td class="numeric">{{ money(order.totalInCents) }}</td>
                      <td><button class="button button-secondary" type="button" (click)="showDetail(order)">Ver</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          <nav class="page-controls" aria-label="Paginación de pagos">
            <button class="button button-secondary" type="button" [disabled]="pagination().page <= 1" (click)="load(pagination().page - 1)">Anterior</button>
            <span>Página {{ pagination().page }} de {{ pagination().totalPages || 1 }}</span>
            <button class="button button-secondary" type="button" [disabled]="pagination().page >= pagination().totalPages" (click)="load(pagination().page + 1)">Siguiente</button>
          </nav>
        } @else {
          <section class="payment-state">
            <p>{{ hasFilters() ? 'No encontramos pagos con estos filtros.' : 'Todavía no hay pagos para mostrar.' }}</p>
            @if (hasFilters()) { <button class="button button-secondary" type="button" (click)="clearFilters()">Limpiar filtros</button> }
          </section>
        }
      }
    </div>
  `,
  styleUrls: ['./admin-pages.css', './admin-simple-payments.component.css'],
})
export class AdminSimplePaymentsComponent implements OnInit {
  readonly orders = signal<AdminOrderListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selected = signal<AdminOrderListItem | null>(null);
  readonly detail = signal<AdminOrderDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal(false);
  readonly expandedNumbers = signal<string | null>(null);
  readonly pagination = signal({ page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
  filteredOrders(): AdminOrderListItem[] {
    const query = this.search.trim().toLocaleLowerCase('es-AR');
    return [...this.orders()]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((order) => {
        const haystack = [order.customer?.name, order.customer?.email, order.customer?.phone]
          .filter(Boolean).join(' ').toLocaleLowerCase('es-AR');
        return (!query || haystack.includes(query)) &&
          (!this.kindFilter || order.kind === this.kindFilter) &&
          this.matchesStatus(order, this.statusFilter);
      });
  }
  search = '';
  statusFilter: StatusFilter = '';
  kindFilter: KindFilter = '';

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void { this.load(); }

  load(page = 1): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.orders({ page, pageSize: 50, sort: 'createdAt:desc' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: AdminPaginatedResponse<AdminOrderListItem>) => {
          this.orders.set(response.items);
          this.pagination.set(response.pagination);
        },
        error: () => this.error.set(true),
      });
  }

  showDetail(order: AdminOrderListItem): void {
    this.selected.set(order);
    this.detail.set(null);
    this.detailError.set(false);
    this.detailLoading.set(true);
    this.api.order(order.id).pipe(finalize(() => this.detailLoading.set(false))).subscribe({
      next: (detail) => this.detail.set(detail),
      error: () => this.detailError.set(true),
    });
  }

  closeDetail(): void { this.selected.set(null); this.detail.set(null); }
  clearFilters(): void { this.search = ''; this.statusFilter = ''; this.kindFilter = ''; }
  hasFilters(): boolean { return Boolean(this.search.trim() || this.statusFilter || this.kindFilter); }
  kindLabel(order: AdminOrderListItem): string {
    if (order.kind === 'MERCH') return 'TIENDA';
    if (order.kind === 'RAFFLE') return 'RIFA';
    return '';
  }
  purchaseTitle(order: AdminOrderListItem): string {
    if (order.kind === 'RAFFLE') return order.raffle?.title || 'Rifa solidaria';
    if (order.kind === 'MERCH') {
      const count = order.itemsCount || 0;
      return count ? count + (count === 1 ? ' producto' : ' productos') : 'Compra de tienda';
    }
    return 'Compra';
  }
  itemLabel(item: { label: string; quantity: number }): string {
    return (item.quantity > 1 ? item.quantity + ' × ' : '') + item.label;
  }
  numberSummary(numbers: number[], expanded: boolean): string {
    const visible = expanded ? numbers : numbers.slice(0, 6);
    const summary = visible.map((number) => String(number).padStart(2, '0')).join(' · ');
    return !expanded && numbers.length > 6 ? summary + '…' : summary;
  }
  toggleNumbers(orderId: string): void {
    this.expandedNumbers.set(this.expandedNumbers() === orderId ? null : orderId);
  }
  statusLabel(order: AdminOrderListItem): string {
    return order.paymentProcessingStatus === 'REQUIRES_REVIEW'
      ? 'Requiere revisión' : orderStatusLabel(order.status);
  }
  badgeClass(order: AdminOrderListItem): string {
    return order.paymentProcessingStatus === 'REQUIRES_REVIEW'
      ? 'requires_review' : order.status.toLowerCase();
  }
  money(value: number): string { return formatArsFromCents(value); }
  date(value: string | null): string { return formatAdminDate(value).replace(',', ' ·'); }

  private matchesStatus(order: AdminOrderListItem, filter: StatusFilter): boolean {
    if (!filter) return true;
    if (filter === 'REVIEW') return order.paymentProcessingStatus === 'REQUIRES_REVIEW';
    if (filter === 'PAID') return order.status === 'PAID' && order.paymentProcessingStatus !== 'REQUIRES_REVIEW';
    if (filter === 'PENDING') return order.status === 'AWAITING_PAYMENT' || order.status === 'PAYMENT_PENDING';
    if (filter === 'REFUNDED') return order.status === 'REFUNDED';
    return order.status === 'EXPIRED';
  }
}
