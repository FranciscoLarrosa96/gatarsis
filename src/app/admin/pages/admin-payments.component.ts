import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminCopyIdComponent } from '../shared/admin-copy-id.component';
import { AdminDialogDirective } from '../shared/admin-dialog.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  formatAdminDate,
  formatArsFromCents,
  orderStatusLabel,
  paymentProcessingStatusLabel,
  providerStatusLabel,
} from '../core/admin-formatters';
import { adminErrorCode, adminErrorMessage } from '../core/admin-domain-error';
import { AdminApiService } from '../core/admin-api.service';
import {
  AdminPaymentDetailResponse,
  AdminPaymentListItem,
  AdminPaymentProcessingStatus,
  AdminRefundOperation,
} from '../core/admin.models';

@Component({
  standalone: true,
  imports: [FormsModule, AdminCopyIdComponent, AdminDialogDirective],
  template: `
    <div class="page payment-page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Cobros</p>
          <h1>{{ detail() ? 'Pago' : reviewMode ? 'Pagos para revisar' : 'Pagos' }}</h1>
          <p class="page-description">
            Conciliación entre Gatarsis, Mercado Pago y el estado del pedido.
          </p>
        </div>
        @if (detail()) {
          <button class="button button-secondary" type="button" (click)="backToList()">
            Volver a pagos
          </button>
        }
      </header>

      @if (message() && !error()) {
        <p class="feedback success">{{ message() }}</p>
      }

      @if (detail(); as paymentDetail) {
        <section class="detail-hero">
          <div>
            <span
              class="badge status-{{
                isRefunded(paymentDetail)
                  ? 'refunded'
                  : paymentDetail.payment.providerStatus.toLowerCase()
              }}"
            >
              {{
                isRefunded(paymentDetail)
                  ? 'Reembolsado'
                  : providerLabel(paymentDetail.payment.providerStatus)
              }}
            </span>
            <h2>{{ money(paymentDetail.payment.transactionAmountInCents) }}</h2>
            <p>Creado {{ date(paymentDetail.payment.createdAt) }}</p>
            <p class="muted">
              Procesamiento: {{ processingLabel(paymentDetail.payment.processingStatus) }}
              <code>{{ paymentDetail.payment.processingStatus }}</code>
            </p>
            <small class="muted">Aprobado {{ date(paymentDetail.payment.dateApproved) }}</small>
          </div>
          <dl class="detail-facts">
            <div>
              <dt>ID local Gatarsis</dt>
              <dd>
                <app-admin-copy-id [value]="paymentDetail.payment.id" label="ID local del pago" />
              </dd>
            </div>
            <div>
              <dt>Mercado Pago Payment ID</dt>
              <dd>
                <app-admin-copy-id
                  [value]="paymentDetail.payment.providerPaymentId"
                  label="Payment ID de Mercado Pago"
                />
              </dd>
            </div>
            <div>
              <dt>Pedido</dt>
              <dd>
                <app-admin-copy-id [value]="paymentDetail.payment.orderId" label="ID del pedido" />
              </dd>
            </div>
          </dl>
          @if (canRefund(paymentDetail)) {
            <button
              class="button button-primary"
              type="button"
              (click)="openRefund(paymentDetail.payment)"
            >
              Reembolsar
            </button>
          } @else if (isRefunded(paymentDetail)) {
            <span class="refund-note refund-note--ok refund-note--standalone"
              >Reembolso completado</span
            >
          }
        </section>

        <section class="content-grid two-columns">
          <article class="panel">
            <h2>Pedido vinculado</h2>
            @if (paymentDetail.order) {
              <div class="item-row">
                <div>
                  <strong>#{{ paymentDetail.order.id.slice(0, 8) }}</strong>
                  <span
                    >{{ statusLabel(paymentDetail.order.status) }} ·
                    {{ date(paymentDetail.order.createdAt) }}</span
                  >
                </div>
                <strong>{{ money(paymentDetail.order.totalInCents) }}</strong>
              </div>
            } @else {
              <p class="muted">El backend no devolvió un pedido asociado.</p>
            }
          </article>

          <article class="panel">
            <h2>Reembolso</h2>
            @if (paymentDetail.refund; as refund) {
              <dl class="compact-list">
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <code>{{ refund.status }}</code>
                    @if (refund.status === 'SUCCEEDED') {
                      <span class="refund-note refund-note--ok"
                        >Reembolso completado correctamente</span
                      >
                    } @else if (refund.status === 'REQUIRES_REVIEW') {
                      <span class="refund-note refund-note--review">Requiere revisión manual</span>
                    } @else if (refund.status === 'FAILED') {
                      <span class="refund-note refund-note--fail">El reembolso falló</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt>Provider Refund ID</dt>
                  <dd>
                    @if (refund.providerRefundId) {
                      <app-admin-copy-id
                        [value]="refund.providerRefundId"
                        label="Refund ID de Mercado Pago"
                      />
                    } @else {
                      No informado
                    }
                  </dd>
                </div>
                <div>
                  <dt>ID local del reembolso</dt>
                  <dd><app-admin-copy-id [value]="refund.id" label="ID del reembolso" /></dd>
                </div>
                <div>
                  <dt>Importe</dt>
                  <dd class="numeric">{{ money(refund.amountInCents) }}</dd>
                </div>
                <div>
                  <dt>Solicitado</dt>
                  <dd>{{ date(refund.createdAt) }}</dd>
                </div>
                <div>
                  <dt>Completado</dt>
                  <dd>{{ date(refund.completedAt) }}</dd>
                </div>
              </dl>
            } @else {
              <p class="muted">Sin reembolso registrado.</p>
            }
          </article>
        </section>
        <section class="panel">
          <h2>Conciliación y revisión</h2>
          <dl class="detail-facts">
            <div>
              <dt>Estado MP / detalle</dt>
              <dd>
                <code
                  >{{ paymentDetail.payment.providerStatus }} /
                  {{ paymentDetail.payment.providerStatusDetail || '—' }}</code
                >
              </dd>
            </div>
            <div>
              <dt>Procesamiento interno</dt>
              <dd>
                <code>{{ paymentDetail.payment.processingStatus }}</code>
              </dd>
            </div>
            <div>
              <dt>Motivo de revisión</dt>
              <dd>{{ paymentDetail.payment.reviewReason || 'Sin motivo informado' }}</dd>
            </div>
            <div>
              <dt>Resolución</dt>
              <dd>
                <code>{{ paymentDetail.payment.reviewResolution || '—' }}</code> ·
                {{ date(paymentDetail.payment.reviewResolvedAt) }}
              </dd>
            </div>
            <div>
              <dt>Nota interna</dt>
              <dd>{{ paymentDetail.payment.reviewNote || 'Sin nota informada' }}</dd>
            </div>
            @if (paymentDetail.payment.reviewResolvedByAdminId) {
              <div>
                <dt>Resuelto por</dt>
                <dd>
                  <app-admin-copy-id
                    [value]="paymentDetail.payment.reviewResolvedByAdminId"
                    label="ID del administrador"
                  />
                </dd>
              </div>
            }
          </dl>
        </section>
      } @else {
        @if (!reviewMode) {
          <section class="filters filter-panel">
            <label>
              Procesamiento
              <select [(ngModel)]="processingStatus" (ngModelChange)="load()">
                <option value="">Todos</option>
                <option value="RECEIVED">Recibido</option>
                <option value="RECORDED">Registrado</option>
                <option value="APPLIED">Aplicado</option>
                <option value="REQUIRES_REVIEW">Requiere revisión</option>
              </select>
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
            @if (processingStatus || orderId || providerPaymentId) {
              <button class="button button-quiet" type="button" (click)="clearFilters()">
                Limpiar
              </button>
            }
          </section>
        }

        @if (loading()) {
          <div class="skeleton">Cargando pagos...</div>
        } @else if (error()) {
          <div class="state">
            <p>{{ message() }}</p>
            <button type="button" class="button button-primary" (click)="load()">Reintentar</button>
          </div>
        } @else if (payments().length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pago MP</th>
                  <th>Pedido</th>
                  <th>Estado MP</th>
                  <th>Procesamiento</th>
                  <th class="numeric">Importe</th>
                  <th>Aprobado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (payment of payments(); track payment.id) {
                  <tr>
                    <td>
                      <code>{{ payment.providerPaymentId }}</code>
                    </td>
                    <td>
                      <code>{{ payment.orderId.slice(0, 8) }}</code>
                    </td>
                    <td>
                      <span class="badge status-{{ payment.providerStatus.toLowerCase() }}">{{
                        providerLabel(payment.providerStatus)
                      }}</span>
                    </td>
                    <td>
                      <span
                        class="technical-status"
                        [class.needs-review]="payment.processingStatus === 'REQUIRES_REVIEW'"
                      >
                        {{ processingLabel(payment.processingStatus) }}
                      </span>
                      <small class="technical-enum">{{ payment.processingStatus }}</small>
                    </td>
                    <td class="numeric">{{ money(payment.transactionAmountInCents) }}</td>
                    <td class="date-cell">{{ date(payment.dateApproved) }}</td>
                    <td>
                      <div class="table-actions">
                        <button type="button" (click)="show(payment.id)">Ver</button>
                        @if (reviewMode) {
                          <button type="button" (click)="resolve(payment)">Resolver</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="state">
            <p>
              {{
                reviewMode
                  ? 'No hay pagos que requieran revisión manual.'
                  : 'No hay pagos para los filtros actuales.'
              }}
            </p>
          </div>
        }
      }

      @if (refund()) {
        <div class="dialog-backdrop">
          <form
            appAdminDialog
            (dialogDismiss)="!busy() && refund.set(null)"
            class="dialog refund-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Reembolsar pago"
            (ngSubmit)="sendRefund()"
          >
            <header>
              <div>
                <p class="eyebrow">Operación sensible</p>
                <h2>Reembolsar pago</h2>
              </div>
              <button
                class="close-button"
                type="button"
                (click)="refund.set(null)"
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <dl class="compact-list">
              <div>
                <dt>Pago MP</dt>
                <dd>{{ refund()!.providerPaymentId }}</dd>
              </div>
              <div>
                <dt>Pedido</dt>
                <dd>#{{ refund()!.orderId.slice(0, 8) }}</dd>
              </div>
              <div>
                <dt>Importe</dt>
                <dd>{{ money(refund()!.transactionAmountInCents) }}</dd>
              </div>
            </dl>
            <p class="warning-note">
              El dinero se devuelve por Mercado Pago. Para compras de rifa, si el reembolso se
              completa y la rifa continúa abierta, los números volverán a quedar disponibles. Para
              pedidos que no son de rifa, el stock no se repone automáticamente.
            </p>
            <label>Motivo<textarea name="reason" [(ngModel)]="reason" required></textarea></label>
            <label>
              Confirmación
              <input
                name="confirmation"
                [(ngModel)]="confirmation"
                required
                placeholder="Escribí REEMBOLSAR"
              />
            </label>
            @if (message()) {
              <p class="feedback error" aria-live="polite">{{ message() }}</p>
            }
            <div class="actions">
              <button class="button button-quiet" type="button" (click)="refund.set(null)">
                Cancelar
              </button>
              <button
                class="button button-primary"
                [disabled]="confirmation !== 'REEMBOLSAR' || !reason.trim() || busy()"
              >
                {{
                  busy()
                    ? 'Procesando...'
                    : 'Reembolsar ' + money(refund()!.transactionAmountInCents)
                }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styleUrls: ['./admin-pages.css', './admin-commerce.component.css'],
})
export class AdminPaymentsComponent implements OnInit {
  readonly payments = signal<AdminPaymentListItem[]>([]);
  readonly detail = signal<AdminPaymentDetailResponse | null>(null);
  readonly refund = signal<AdminPaymentListItem | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal(false);
  readonly message = signal('');
  reviewMode = false;
  processingStatus: '' | AdminPaymentProcessingStatus = '';
  orderId = '';
  providerPaymentId = '';
  reason = '';
  confirmation = '';

  constructor(
    private readonly api: AdminApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('paymentId');
    this.reviewMode = this.route.snapshot.url.some((segment) => segment.path === 'review');
    if (id) this.show(id);
    else this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const request = this.reviewMode
      ? this.api.review({ page: 1, pageSize: 50 })
      : this.api.payments({
          processingStatus: this.processingStatus || undefined,
          orderId: this.orderId || undefined,
          providerPaymentId: this.providerPaymentId || undefined,
          page: 1,
          pageSize: 50,
        });
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.payments.set(response.items),
      error: (error: unknown) => {
        this.error.set(true);
        this.message.set(adminErrorMessage(error, 'No pudimos cargar los pagos.'));
      },
    });
  }

  show(id: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .payment(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error: unknown) => {
          this.error.set(true);
          this.message.set(adminErrorMessage(error, 'No pudimos cargar el pago.'));
        },
      });
  }

  backToList(): void {
    this.detail.set(null);
    void this.router.navigate(['/admin/payments']);
    this.load();
  }

  resolve(payment: AdminPaymentListItem): void {
    const manual = confirm('¿Completaste una investigación manual para este pago?');
    const note = prompt('Nota de resolución (obligatoria):');
    if (!note?.trim()) return;
    this.api
      .resolveReview(payment.id, {
        resolution: manual ? 'MANUAL_INVESTIGATION_COMPLETE' : 'ACKNOWLEDGED_NO_ACTION',
        note,
      })
      .subscribe({
        next: () => {
          this.message.set('Revisión resuelta.');
          this.load();
        },
        error: (error: unknown) => {
          this.message.set(
            adminErrorCode(error) === 'PAYMENT_REVIEW_NOT_ALLOWED'
              ? 'Este caso ya fue resuelto o ya no requiere revisión.'
              : adminErrorMessage(error, 'No pudimos resolver el review.'),
          );
          this.load();
        },
      });
  }

  openRefund(payment: AdminPaymentListItem): void {
    this.refund.set(payment);
    this.reason = '';
    this.confirmation = '';
    this.message.set('');
  }

  sendRefund(): void {
    const payment = this.refund();
    if (!payment) return;
    this.busy.set(true);
    this.api
      .refund(payment.id, { reason: this.reason, confirmation: 'REEMBOLSAR' }, crypto.randomUUID())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.refund.set(null);
          this.message.set(this.refundResultMessage(result));
          if (this.detail()?.payment.id === payment.id) this.show(payment.id);
          else this.load();
        },
        error: (error: unknown) =>
          this.message.set(
            adminErrorMessage(
              error,
              'No pudimos confirmar el resultado del reembolso. No vuelvas a enviarlo inmediatamente. El backend verificará el estado con el proveedor.',
            ),
          ),
      });
  }

  isRefunded(detail: AdminPaymentDetailResponse): boolean {
    return (
      detail.refund?.status === 'SUCCEEDED' ||
      detail.order?.status === 'REFUNDED' ||
      detail.payment.providerStatus === 'refunded'
    );
  }

  canRefund(detail: AdminPaymentDetailResponse): boolean {
    return (
      detail.payment.processingStatus === 'APPLIED' &&
      detail.order?.status === 'PAID' &&
      !this.isRefunded(detail)
    );
  }

  private refundResultMessage(result: AdminRefundOperation): string {
    if (result.status === 'SUCCEEDED') return 'Reembolso completado correctamente.';
    if (result.status === 'REQUIRES_REVIEW') {
      return 'El reembolso quedó en revisión. Confirmá el estado antes de intentar otra acción.';
    }
    if (result.status === 'FAILED')
      return 'El reembolso falló. Revisá el estado antes de reintentar.';
    return 'Refund solicitado. Revisá el estado antes de realizar otra acción.';
  }

  clearFilters(): void {
    this.processingStatus = '';
    this.orderId = '';
    this.providerPaymentId = '';
    this.load();
  }

  money(value: number): string {
    return formatArsFromCents(value);
  }

  date(value: string | null): string {
    return formatAdminDate(value);
  }

  processingLabel(value: string): string {
    return paymentProcessingStatusLabel(value);
  }

  providerLabel(value: string): string {
    return providerStatusLabel(value);
  }

  statusLabel(value: string): string {
    return orderStatusLabel(value);
  }
}
