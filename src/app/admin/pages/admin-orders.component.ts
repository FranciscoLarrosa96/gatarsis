import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminDatePickerDirective } from '../shared/admin-date-picker.directive';
import { AdminCopyIdComponent } from '../shared/admin-copy-id.component';
import { formatAdminDate, formatArsFromCents, orderStatusLabel } from '../core/admin-formatters';
import { adminErrorMessage } from '../core/admin-domain-error';
import { AdminApiService } from '../core/admin-api.service';
import { AdminOrderDetail, AdminOrderListItem, AdminOrderStatus } from '../core/admin.models';

@Component({
  standalone: true,
  imports: [FormsModule, AdminDatePickerDirective, AdminCopyIdComponent],
  template: `
    <div class="page order-page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Ventas</p>
          <h1>{{ detail() ? 'Pedido #' + short(detail()!.order.id) : 'Pedidos' }}</h1>
          <p class="page-description">
            Seguimiento de reservas, pagos y estados del flujo de compra.
          </p>
        </div>
        @if (detail()) {
          <button class="button button-secondary" type="button" (click)="backToList()">
            Volver a pedidos
          </button>
        }
      </header>

      @if (detail(); as orderDetail) {
        <section class="detail-hero">
          <div>
            <span class="badge status-{{ orderDetail.order.status.toLowerCase() }}">
              {{ statusLabel(orderDetail.order.status) }}
            </span>
            <h2>{{ money(orderDetail.order.totalInCents) }}</h2>
            <p>{{ orderContext(orderDetail) }}</p>
            <small class="muted">{{
              orderDetail.items.length || orderDetail.fulfillment ? 'Tienda' : 'Origen no informado'
            }}</small>
          </div>
          <dl class="detail-facts">
            <div>
              <dt>ID pedido</dt>
              <dd><app-admin-copy-id [value]="orderDetail.order.id" label="ID del pedido" /></dd>
            </div>
            <div>
              <dt>Pagado</dt>
              <dd>{{ date(orderDetail.order.paidAt) }}</dd>
            </div>
            <div>
              <dt>Vencimiento de reserva</dt>
              <dd>{{ date(orderDetail.order.reservationExpiresAt) }}</dd>
            </div>
            <div>
              <dt>Creado</dt>
              <dd>{{ date(orderDetail.order.createdAt) }}</dd>
            </div>
          </dl>
        </section>
        @if (message()) {
          <p class="feedback error" role="alert">{{ message() }}</p>
        }

        <section class="content-grid two-columns">
          <article class="panel">
            <div class="section-heading inline-heading">
              <div>
                <h2>Items</h2>
                <p>
                  {{
                    orderDetail.items.length
                      ? orderDetail.items.length + ' producto(s) dentro del pedido.'
                      : 'El contrato no informa productos ni una participación en rifa.'
                  }}
                </p>
              </div>
            </div>
            <div class="item-list">
              @for (item of orderDetail.items; track item.id) {
                <div class="item-row">
                  <div>
                    <strong>{{ item.productNameSnapshot }}</strong>
                    <span>{{ item.variantNameSnapshot }} · {{ item.skuSnapshot }}</span>
                  </div>
                  <div class="item-money">
                    <span>{{ item.quantity }} × {{ money(item.unitPriceInCents) }}</span>
                    <strong>{{ money(item.lineTotalInCents) }}</strong>
                  </div>
                </div>
              } @empty {
                <p class="muted">
                  Sin items informados. Esto no permite determinar el origen del pedido.
                </p>
              }
            </div>
          </article>

          <article class="panel">
            <div class="section-heading inline-heading">
              <div>
                <h2>Pagos</h2>
                <p>Preferencia y pagos asociados al pedido.</p>
              </div>
            </div>
            @if (orderDetail.paymentPreference) {
              <div class="compact-fact">
                <span>Preference ID</span>
                <code>{{
                  orderDetail.paymentPreference.providerPreferenceId || 'Sin provider ID'
                }}</code>
              </div>
            }
            <div class="item-list">
              @for (payment of orderDetail.payments; track payment.id) {
                <div class="item-row">
                  <div>
                    <app-admin-copy-id
                      [value]="payment.providerPaymentId"
                      label="Payment ID de Mercado Pago"
                    />
                    <span>{{ payment.processingStatus }} · {{ date(payment.dateApproved) }}</span>
                  </div>
                  <div class="item-money">
                    <strong>{{ money(payment.transactionAmountInCents) }}</strong>
                  </div>
                </div>
              } @empty {
                <p class="muted">
                  {{
                    orderDetail.order.status === 'EXPIRED' && !orderDetail.order.paidAt
                      ? 'Reserva vencida sin pago registrado.'
                      : 'Sin pagos asociados informados.'
                  }}
                </p>
              }
            </div>
          </article>

          <article class="panel">
            <div class="section-heading inline-heading">
              <div>
                <h2>Entrega</h2>
                <p>Coordinación de retiro del pedido.</p>
              </div>
            </div>
            @if (orderDetail.fulfillment; as fulfillment) {
              @if (orderDetail.order.status === 'REFUNDED') {
                <p class="feedback">Pedido reembolsado</p>
              }
              <div class="item-list">
                <div class="compact-fact">
                  <span>Método</span
                  ><strong>{{ fulfillmentMethodLabel(fulfillment.method) }}</strong>
                </div>
                <div class="compact-fact">
                  <span>Estado</span
                  ><strong>{{ fulfillmentStatusLabel(fulfillment.status) }}</strong>
                </div>
                <div class="compact-fact">
                  <span>Cliente</span><strong>{{ fulfillment.customer.name }}</strong>
                </div>
                <div class="compact-fact">
                  <span>Contacto</span
                  ><strong
                    >{{ fulfillment.customer.email }} · {{ fulfillment.customer.phone }}</strong
                  >
                </div>
                <div class="compact-fact">
                  <span>Nota del cliente</span
                  ><strong>{{ fulfillment.customerNote || '—' }}</strong>
                </div>
                <div class="compact-fact">
                  <span>Nota interna</span><strong>{{ fulfillment.adminNote || '—' }}</strong>
                </div>
                @if (fulfillment.readyAt) {
                  <div class="compact-fact">
                    <span>Listo para retirar</span><strong>{{ date(fulfillment.readyAt) }}</strong>
                  </div>
                }
                @if (fulfillment.completedAt) {
                  <div class="compact-fact">
                    <span>Entregado</span><strong>{{ date(fulfillment.completedAt) }}</strong>
                  </div>
                }
              </div>
              @if (canMarkReady(orderDetail)) {
                <button
                  class="button button-primary"
                  type="button"
                  [disabled]="mutationLoading()"
                  (click)="updateFulfillment('READY_FOR_PICKUP')"
                >
                  Marcar listo para retirar
                </button>
              }
              @if (canMarkCompleted(orderDetail)) {
                <button
                  class="button button-primary"
                  type="button"
                  [disabled]="mutationLoading()"
                  (click)="updateFulfillment('COMPLETED')"
                >
                  Marcar como entregado
                </button>
              }
            } @else {
              <p class="muted">
                No hay datos de entrega informados para este pedido. No se puede inferir si
                corresponde a una compra de tienda o a una rifa.
              </p>
            }
          </article>
        </section>
      } @else {
        <section class="filters filter-panel">
          <label>
            Estado
            <select [(ngModel)]="status" (ngModelChange)="load()">
              <option value="">Todos</option>
              <option value="AWAITING_PAYMENT">Esperando pago</option>
              <option value="PAYMENT_PENDING">Pago pendiente</option>
              <option value="PAID">Pagado</option>
              <option value="EXPIRED">Vencido</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="REFUNDED">Reembolsado</option>
            </select>
          </label>
          <label>
            Desde
            <input
              appAdminDatePicker
              [dateValue]="dateFrom"
              (dateValueChange)="setDateFrom($event)"
              placeholder="Elegir fecha"
            />
          </label>
          <label>
            Hasta
            <input
              appAdminDatePicker
              [dateValue]="dateTo"
              (dateValueChange)="setDateTo($event)"
              placeholder="Elegir fecha"
            />
          </label>
          <label
            >Pedido<input
              [(ngModel)]="orderId"
              (ngModelChange)="load()"
              placeholder="UUID o prefijo"
          /></label>
          <label
            >Pago MP<input
              [(ngModel)]="providerPaymentId"
              (ngModelChange)="load()"
              placeholder="Payment ID"
          /></label>
          @if (hasFilters()) {
            <button class="button button-quiet" type="button" (click)="clearFilters()">
              Limpiar
            </button>
          }
        </section>

        @if (loading()) {
          <div class="skeleton">Cargando pedidos...</div>
        } @else if (error()) {
          <div class="state">
            <p>{{ message() }}</p>
            <button class="button button-primary" type="button" (click)="load()">Reintentar</button>
          </div>
        } @else if (orders().length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th class="numeric">Importe</th>
                  <th class="numeric">Items</th>
                  <th>Creado</th>
                  <th>Pagado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr>
                    <td>
                      <button class="row-link" type="button" (click)="show(order.id)">
                        <code [title]="order.id">#{{ short(order.id) }}</code>
                      </button>
                    </td>
                    <td>
                      <span class="badge status-{{ order.status.toLowerCase() }}">
                        {{ statusLabel(order.status) }}
                      </span>
                    </td>
                    <td class="numeric">{{ money(order.totalInCents) }}</td>
                    <td class="numeric">{{ order.itemsCount }}</td>
                    <td class="date-cell">{{ date(order.createdAt) }}</td>
                    <td class="date-cell">{{ date(order.paidAt) }}</td>
                    <td>
                      <div class="table-actions">
                        <button type="button" (click)="show(order.id)">Ver</button>
                        <app-admin-copy-id
                          [value]="order.id"
                          [showValue]="false"
                          label="ID del pedido"
                        />
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="state"><p>No hay pedidos con estos filtros.</p></div>
        }
      }
    </div>
  `,
  styleUrls: ['./admin-pages.css', './admin-commerce.component.css'],
})
export class AdminOrdersComponent implements OnInit {
  readonly orders = signal<AdminOrderListItem[]>([]);
  readonly detail = signal<AdminOrderDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly message = signal('');
  readonly mutationLoading = signal(false);
  status: '' | AdminOrderStatus = '';
  dateFrom = '';
  dateTo = '';
  orderId = '';
  providerPaymentId = '';

  constructor(
    private readonly api: AdminApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('orderId');
    if (id) this.show(id);
    else this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .orders({
        status: this.status || undefined,
        dateFrom: this.dateFrom || undefined,
        dateTo: this.dateTo || undefined,
        orderId: this.orderId || undefined,
        providerPaymentId: this.providerPaymentId || undefined,
        page: 1,
        pageSize: 50,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.orders.set(response.items),
        error: (error: unknown) => {
          this.error.set(true);
          this.message.set(adminErrorMessage(error, 'No pudimos cargar los pedidos.'));
        },
      });
  }

  clearFilters(): void {
    this.status = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.orderId = '';
    this.providerPaymentId = '';
    this.load();
  }

  setDateFrom(value: string): void {
    this.dateFrom = value;
    this.load();
  }

  setDateTo(value: string): void {
    this.dateTo = value;
    this.load();
  }

  backToList(): void {
    this.detail.set(null);
    void this.router.navigate(['/admin/orders']);
    this.load();
  }

  hasFilters(): boolean {
    return !!(
      this.status ||
      this.dateFrom ||
      this.dateTo ||
      this.orderId ||
      this.providerPaymentId
    );
  }

  show(id: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.message.set('');
    this.api
      .order(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error: unknown) => {
          this.error.set(true);
          this.message.set(adminErrorMessage(error, 'No pudimos cargar el pedido.'));
        },
      });
  }

  short(id: string): string {
    return id.slice(0, 8);
  }

  orderContext(detail: AdminOrderDetail): string {
    if (detail.order.status === 'EXPIRED' && !detail.order.paidAt)
      return 'Reserva vencida sin pago registrado.';
    if (detail.order.status === 'REFUNDED')
      return 'Pedido reembolsado. Consultá los pagos asociados para ver el detalle.';
    if (detail.order.status === 'PAID')
      return 'Pago confirmado · seguimiento operativo del pedido.';
    return 'Seguimiento de la reserva y sus pagos asociados.';
  }

  money(value: number): string {
    return formatArsFromCents(value);
  }

  date(value: string | null): string {
    return formatAdminDate(value);
  }

  statusLabel(value: string): string {
    return orderStatusLabel(value);
  }

  fulfillmentMethodLabel(method: string): string {
    return method === 'PICKUP' ? 'Retiro coordinado' : method;
  }

  fulfillmentStatusLabel(status: string): string {
    return (
      {
        PENDING: 'Pendiente de preparación',
        READY_FOR_PICKUP: 'Listo para retirar',
        COMPLETED: 'Entregado',
      }[status] ?? status
    );
  }

  canMarkReady(detail: AdminOrderDetail): boolean {
    return detail.order.status === 'PAID' && detail.fulfillment?.status === 'PENDING';
  }

  canMarkCompleted(detail: AdminOrderDetail): boolean {
    return detail.order.status !== 'REFUNDED' && detail.fulfillment?.status === 'READY_FOR_PICKUP';
  }

  updateFulfillment(status: 'READY_FOR_PICKUP' | 'COMPLETED'): void {
    const detail = this.detail();
    if (!detail || this.mutationLoading()) return;
    const confirmation =
      status === 'READY_FOR_PICKUP'
        ? '¿Marcar este pedido como listo para retirar?'
        : '¿Confirmar que el pedido fue entregado?';
    if (!window.confirm(confirmation)) return;

    this.message.set('');
    this.mutationLoading.set(true);
    this.api
      .updateFulfillment(detail.order.id, { status })
      .pipe(finalize(() => this.mutationLoading.set(false)))
      .subscribe({
        next: () => this.show(detail.order.id),
        error: (error: unknown) =>
          this.message.set(adminErrorMessage(error, 'No pudimos actualizar la entrega.')),
      });
  }
}
