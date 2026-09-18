import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, forkJoin } from 'rxjs';

import { AdminApiService } from '../core/admin-api.service';
import { adminErrorMessage } from '../core/admin-domain-error';
import {
  AdminRaffleDetail,
  AdminRaffleListItem,
  AdminRaffleNumber,
  AdminRafflePurchase,
  AdminRafflePurchaseDetail,
  AdminRaffleStatus,
  CreateAdminRaffleRequest,
} from '../core/admin-raffle.models';
import {
  auditActionLabel,
  formatAdminDate,
  formatArsFromCents,
  rafflePurchaseStatusLabel,
  raffleStatusLabel,
  providerStatusLabel,
} from '../core/admin-formatters';
import { AdminDatePickerDirective } from '../shared/admin-date-picker.directive';
import { AdminCopyIdComponent } from '../shared/admin-copy-id.component';
import { AdminDialogDirective } from '../shared/admin-dialog.directive';

interface RaffleFormModel {
  title: string;
  prizeName: string;
  description: string;
  imageUrl: string;
  price: string;
  drawAt: string;
}

type LifecycleAction = 'publish' | 'pause' | 'resume' | 'close';
type ConfirmationKind = 'close' | 'draw';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    AdminDatePickerDirective,
    AdminCopyIdComponent,
    AdminDialogDirective,
  ],
  template: `
    <div class="page raffle-admin-page">
      <nav class="breadcrumb">
        <a routerLink="/admin/raffles">Rifas</a><span>/</span>
        <span>{{ id ? raffle()?.title || 'Detalle' : 'Nueva rifa' }}</span>
      </nav>

      <header class="page-heading">
        <div>
          <p class="eyebrow">Rifas solidarias</p>
          <h1>{{ id ? raffle()?.title || 'Cargando rifa...' : 'Nueva rifa' }}</h1>
          <p class="page-description">
            {{
              id ? raffle()?.prizeName : 'Prepará el premio y la información que verá el público.'
            }}
          </p>
        </div>
        @if (raffle(); as current) {
          <div class="actions raffle-actions">
            <span class="badge status-{{ current.status.toLowerCase() }}">{{
              statusLabel(current.status)
            }}</span>
            @if (current.status === 'DRAFT') {
              <button
                class="button button-primary"
                type="button"
                [disabled]="mutating() || dirty"
                (click)="runAction('publish')"
              >
                Activar rifa
              </button>
            }
            @if (current.status === 'ACTIVE') {
              <button
                class="button button-secondary"
                type="button"
                [disabled]="mutating()"
                (click)="runAction('pause')"
              >
                Pausar
              </button>
              <button
                class="button button-danger"
                type="button"
                [disabled]="mutating()"
                (click)="requestClose()"
              >
                Cerrar venta
              </button>
            }
            @if (current.status === 'PAUSED') {
              <button
                class="button button-primary"
                type="button"
                [disabled]="mutating()"
                (click)="runAction('resume')"
              >
                Reanudar
              </button>
              <button
                class="button button-danger"
                type="button"
                [disabled]="mutating()"
                (click)="requestClose()"
              >
                Cerrar venta
              </button>
            }
          </div>
        }
      </header>

      @if (notice()) {
        <p class="feedback" [class]="'feedback ' + noticeKind()" aria-live="polite">
          {{ notice() }}
        </p>
      }

      @if (loading()) {
        <div class="skeleton">Cargando información de la rifa...</div>
      } @else if (loadError()) {
        <div class="state">
          <p>{{ notice() || 'No pudimos cargar la rifa.' }}</p>
          <button class="button button-primary" type="button" (click)="load()">Reintentar</button>
        </div>
      } @else {
        @if (!id || raffle()?.status === 'DRAFT') {
          <form #raffleForm="ngForm" class="editor" (ngSubmit)="save()">
            <section class="editor-section raffle-editor-grid">
              <div>
                <div class="section-heading">
                  <h2>Información pública</h2>
                  <p>Sólo puede editarse mientras la rifa está en borrador.</p>
                </div>
                <div class="form-grid raffle-form-grid">
                  <label>
                    Título
                    <input
                      name="title"
                      required
                      maxlength="160"
                      [(ngModel)]="model.title"
                      (ngModelChange)="markDirty()"
                      placeholder="Rifa solidaria"
                    />
                  </label>
                  <label>
                    Premio
                    <input
                      name="prizeName"
                      required
                      maxlength="160"
                      [(ngModel)]="model.prizeName"
                      (ngModelChange)="markDirty()"
                      placeholder="Air Fryer Zenith"
                    />
                  </label>
                  <label class="wide">
                    Descripción
                    <textarea
                      name="description"
                      maxlength="2000"
                      [(ngModel)]="model.description"
                      (ngModelChange)="markDirty()"
                      placeholder="Contá para qué rescates será destinada esta ayuda."
                    ></textarea>
                  </label>
                  <label class="wide">
                    Imagen del premio (HTTPS)
                    <input
                      name="imageUrl"
                      type="url"
                      pattern="https://.*"
                      maxlength="2048"
                      [(ngModel)]="model.imageUrl"
                      (ngModelChange)="imageFailed.set(false); markDirty()"
                      placeholder="https://res.cloudinary.com/..."
                    />
                  </label>
                  <label>
                    Precio por número (ARS)
                    <input
                      name="price"
                      required
                      inputmode="decimal"
                      pattern="[0-9]+([.,][0-9]{1,2})?"
                      [(ngModel)]="model.price"
                      (ngModelChange)="markDirty()"
                      placeholder="5000"
                    />
                  </label>
                  <label>
                    Fecha prevista de cierre/sorteo
                    <input
                      name="drawAt"
                      type="text"
                      appAdminDatePicker
                      [includeTime]="true"
                      [dateValue]="model.drawAt"
                      (dateValueChange)="model.drawAt = $event; markDirty()"
                      placeholder="Elegí fecha y hora"
                    />
                  </label>
                </div>
                <div class="raffle-fixed-rules">
                  <div>
                    <span>Numeración</span><strong>00–99</strong
                    ><small>Se crean exactamente 100 números.</small>
                  </div>
                  <div>
                    <span>Inicio</span><strong>Al activar</strong
                    ><small>La fecha real queda registrada en el historial.</small>
                  </div>
                  <div>
                    <span>Cierre</span><strong>Manual</strong
                    ><small>La fecha prevista no ejecuta acciones automáticas.</small>
                  </div>
                </div>
                <div class="section-actions">
                  <button
                    class="button button-primary"
                    [disabled]="raffleForm.invalid || saving() || !validPrice()"
                  >
                    {{ saving() ? 'Guardando...' : id ? 'Guardar cambios' : 'Crear borrador' }}
                  </button>
                </div>
              </div>
              <aside class="raffle-image-preview">
                @if (model.imageUrl && !imageFailed()) {
                  <img
                    [src]="model.imageUrl"
                    [alt]="model.prizeName || 'Vista previa del premio'"
                    (error)="imageFailed.set(true)"
                  />
                } @else {
                  <span>{{
                    imageFailed() ? 'No pudimos cargar esa imagen.' : 'Vista previa del premio'
                  }}</span>
                }
              </aside>
            </section>
          </form>
        }

        @if (raffle(); as current) {
          <section class="raffle-metrics" aria-label="Métricas de la rifa">
            <article>
              <span>Recaudado neto</span><strong>{{ money(current.stats.revenueInCents) }}</strong
              ><small>Órdenes pagadas; excluye reembolsos</small>
            </article>
            <article>
              <span>Vendidos</span><strong>{{ current.stats.sold }}</strong
              ><small>de {{ current.stats.totalNumbers }} números</small>
              <progress
                [value]="current.stats.sold"
                [max]="current.stats.totalNumbers"
                aria-label="Números vendidos sobre el total"
              ></progress>
            </article>
            <article>
              <span>Reservados</span><strong>{{ current.stats.reserved }}</strong
              ><small>{{ current.stats.activeReservations }} reservas activas</small>
            </article>
            <article>
              <span>Disponibles</span><strong>{{ current.stats.available }}</strong
              ><small>{{ current.stats.paidPurchases }} compras pagadas</small>
            </article>
          </section>

          <section class="panel raffle-operational-facts">
            <div>
              <span>Creada</span><strong>{{ date(current.createdAt) }}</strong>
            </div>
            <div>
              <span>Inicio real</span><strong>{{ lifecycleDate('RAFFLE_ACTIVATED') }}</strong>
            </div>
            <div>
              <span>Cierre real</span><strong>{{ lifecycleDate('RAFFLE_CLOSED') }}</strong>
            </div>
            <div>
              <span>Sorteo previsto</span><strong>{{ date(current.drawAt) }}</strong>
            </div>
            <div><span>Rango</span><strong>00–99</strong></div>
            @if (current.status === 'DRAWN') {
              <div class="winner-fact">
                <span>Ganador</span><strong>{{ numberLabel(current.winningNumber!) }}</strong>
              </div>
            }
          </section>

          <section class="panel">
            <div class="section-heading inline-heading">
              <div>
                <h2>Números 00–99</h2>
                <p>Seleccioná un número para ver su compra, pago y datos de contacto.</p>
              </div>
              <div class="number-legend" aria-label="Referencias">
                <span><i class="is-available"></i>Disponible</span>
                <span><i class="is-reserved"></i>Reservado</span>
                <span><i class="is-sold"></i>Vendido</span>
                <span><i class="is-winner">★</i>Ganador</span>
              </div>
            </div>
            <div class="admin-number-grid">
              @for (item of numbers(); track item.number) {
                <button
                  type="button"
                  class="admin-number status-{{ item.status.toLowerCase() }}"
                  [class.is-winner]="current.winningNumber === item.number"
                  [class.is-inspected]="
                    inspectedNumber()?.number === item.number ||
                    purchaseDetail()?.numbers?.includes(item.number)
                  "
                  [attr.aria-label]="numberAriaLabel(item, current)"
                  [attr.aria-pressed]="selectedWinningNumber() === item.number"
                  (click)="inspectNumber(item)"
                >
                  {{ numberLabel(item.number) }}
                  @if (current.winningNumber === item.number) {
                    <span aria-hidden="true">★</span>
                  }
                </button>
              }
            </div>
          </section>

          @if (current.status === 'CLOSED') {
            <section class="editor-section danger-zone raffle-draw-panel">
              <div class="section-heading">
                <h2>Registrar ganador</h2>
                <p>El sorteo es manual. Sólo podés elegir números vendidos con pago confirmado.</p>
              </div>
              @if (current.stats.reserved || current.stats.activeReservations) {
                <p class="feedback error">
                  Todavía hay reservas o pagos pendientes. Esperá a que se resuelvan antes de
                  sortear.
                </p>
              }
              <label>
                Número ganador
                <select
                  [ngModel]="selectedWinningNumber()"
                  (ngModelChange)="selectedWinningNumber.set($event)"
                  name="winningNumber"
                >
                  <option [ngValue]="null">Elegir número pagado...</option>
                  @for (number of eligibleWinningNumbers(); track number) {
                    <option [ngValue]="number">{{ numberLabel(number) }}</option>
                  }
                </select>
              </label>
              <button
                class="button button-danger"
                type="button"
                [disabled]="
                  selectedWinningNumber() === null ||
                  current.stats.reserved > 0 ||
                  current.stats.activeReservations > 0 ||
                  mutating()
                "
                (click)="requestDraw()"
              >
                Confirmar número ganador
              </button>
            </section>
          }

          <section class="panel">
            <div class="section-heading inline-heading">
              <div>
                <h2>Compras</h2>
                <p>{{ purchases().length }} registros cargados.</p>
              </div>
              <button class="button button-secondary" type="button" (click)="loadOperationalData()">
                Actualizar
              </button>
            </div>
            @if (purchases().length) {
              <div class="table-wrap inline-table">
                <table>
                  <thead>
                    <tr>
                      <th>Comprador</th>
                      <th>Números</th>
                      <th>Estado</th>
                      <th class="numeric">Total</th>
                      <th>Creada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (purchase of purchases(); track purchase.rafflePurchaseId) {
                      <tr>
                        <td>
                          <strong>{{ purchase.buyerName }}</strong
                          ><br /><span class="muted">{{ purchase.buyerEmail }}</span>
                        </td>
                        <td>
                          <code>{{ numbersLabel(purchase.numbers) }}</code>
                        </td>
                        <td>
                          <span class="badge status-{{ purchase.status.toLowerCase() }}">{{
                            purchaseStatusLabel(purchase.status)
                          }}</span>
                        </td>
                        <td class="numeric">{{ money(purchase.totalInCents) }}</td>
                        <td class="date-cell">{{ date(purchase.createdAt) }}</td>
                        <td>
                          <button type="button" (click)="showPurchase(purchase)">
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="empty compact">Todavía no hay compras para esta rifa.</p>
            }
          </section>

          <section class="panel raffle-history">
            <div class="section-heading">
              <h2>Historial</h2>
              <p>Acciones administrativas auditadas por el backend.</p>
            </div>
            @for (event of current.history; track event.id) {
              <article>
                <span>{{ date(event.createdAt) }}</span
                ><strong>{{ auditLabel(event.action) }}</strong
                ><code>{{ event.adminUserId ? event.adminUserId.slice(0, 8) : 'sistema' }}</code>
              </article>
            } @empty {
              <p class="muted">Sin actividad registrada.</p>
            }
          </section>
        }
      }

      @if (inspectedNumber(); as item) {
        <div class="dialog-backdrop" (click)="inspectedNumber.set(null)">
          <section
            class="dialog number-detail-dialog"
            appAdminDialog
            (dialogDismiss)="inspectedNumber.set(null)"
            role="dialog"
            aria-modal="true"
            aria-labelledby="number-dialog-title"
            (click)="$event.stopPropagation()"
          >
            <header>
              <div>
                <p class="eyebrow">Número</p>
                <h2 id="number-dialog-title">{{ numberLabel(item.number) }}</h2>
              </div>
              <button
                class="close-button"
                type="button"
                aria-label="Cerrar"
                (click)="inspectedNumber.set(null)"
              >
                ×
              </button>
            </header>
            <span class="badge status-{{ item.status.toLowerCase() }}">{{
              numberStatusLabel(item)
            }}</span>
            @if (item.buyer) {
              <dl class="raffle-detail-list">
                <div>
                  <dt>Comprador</dt>
                  <dd>{{ item.buyer.name }}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a [href]="'mailto:' + item.buyer.email">{{ item.buyer.email }}</a>
                  </dd>
                </div>
                <div>
                  <dt>WhatsApp</dt>
                  <dd>
                    <a [href]="'tel:' + item.buyer.phone">{{ item.buyer.phone }}</a>
                  </dd>
                </div>
                <div>
                  <dt>Reserva hasta</dt>
                  <dd>{{ date(item.reservedUntil) }}</dd>
                </div>
                <div>
                  <dt>Vendido</dt>
                  <dd>{{ date(item.soldAt) }}</dd>
                </div>
                <div>
                  <dt>Orden</dt>
                  <dd>
                    <code>{{ item.order?.id || '—' }}</code>
                  </dd>
                </div>
                <div>
                  <dt>Pago</dt>
                  <dd>{{ item.payment?.processingStatus || '—' }}</dd>
                </div>
              </dl>
              @if (item.rafflePurchaseId) {
                <button
                  class="button button-primary"
                  type="button"
                  (click)="showPurchaseById(item.rafflePurchaseId)"
                >
                  Ver compra completa
                </button>
              }
            } @else {
              <p class="muted">Este número no tiene comprador asociado.</p>
            }
          </section>
        </div>
      }

      @if (purchaseDetail(); as purchase) {
        <div class="dialog-backdrop" (click)="purchaseDetail.set(null)">
          <section
            class="dialog wide-dialog purchase-dialog"
            appAdminDialog
            (dialogDismiss)="purchaseDetail.set(null)"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-dialog-title"
            (click)="$event.stopPropagation()"
          >
            <header>
              <div>
                <h2 id="purchase-dialog-title">Compra {{ numbersLabel(purchase.numbers) }}</h2>
                <span class="badge status-{{ purchase.status.toLowerCase() }}">{{
                  purchaseStatusLabel(purchase.status)
                }}</span>
              </div>
              <button
                class="close-button"
                type="button"
                aria-label="Cerrar"
                (click)="purchaseDetail.set(null)"
              >
                ×
              </button>
            </header>
            <div class="purchase-detail-grid">
              <section>
                <h3>Comprador y contacto</h3>
                <dl class="raffle-detail-list">
                  <div>
                    <dt>Nombre</dt>
                    <dd>{{ purchase.buyerName }}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a [href]="'mailto:' + purchase.buyerEmail">{{ purchase.buyerEmail }}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>
                      <a [href]="'tel:' + purchase.buyerPhone">{{ purchase.buyerPhone }}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{{ money(purchase.totalInCents) }}</dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3>Compra y pago</h3>
                <dl class="raffle-detail-list payment-facts">
                  <div>
                    <dt>Compra ID</dt>
                    <dd>
                      <app-admin-copy-id
                        [value]="purchase.rafflePurchaseId"
                        label="ID de compra de rifa"
                      />
                    </dd>
                  </div>
                  <div class="wide">
                    <dt>Creada / pagada</dt>
                    <dd>{{ date(purchase.createdAt) }} / {{ date(purchase.paidAt) }}</dd>
                  </div>
                  <div>
                    <dt>Orden</dt>
                    <dd>
                      <app-admin-copy-id [value]="purchase.orderId" label="ID del pedido" />
                      <small class="technical-enum">{{ purchase.orderStatus }}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Reserva</dt>
                    <dd>{{ date(purchase.reservationExpiresAt) }}</dd>
                  </div>
                  <div>
                    <dt>Pago</dt>
                    <dd>
                      @if (purchase.payment; as payment) {
                        <span
                          class="badge status-{{ payment.providerStatus.toLowerCase() }}"
                          [title]="payment.providerStatus"
                          >{{ providerLabel(payment.providerStatus) }}</span
                        >
                      } @else {
                        No informado
                      }
                    </dd>
                  </div>
                  @if (purchase.payment; as payment) {
                    <div>
                      <dt>Payment ID MP</dt>
                      <dd>
                        <app-admin-copy-id [value]="payment.providerPaymentId" label="Payment ID" />
                      </dd>
                    </div>
                    <div>
                      <dt>Pago ID local</dt>
                      <dd><app-admin-copy-id [value]="payment.id" label="ID local del pago" /></dd>
                    </div>
                    <div>
                      <dt>Procesamiento</dt>
                      <dd>
                        <code>{{ payment.processingStatus }}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Revisión</dt>
                      <dd>{{ payment.reviewReason || 'Sin motivo informado' }}</dd>
                    </div>
                    <div>
                      <dt>Importe / moneda</dt>
                      <dd>
                        {{ money(payment.transactionAmountInCents) }} · {{ payment.currencyId }}
                      </dd>
                    </div>
                    <div class="wide">
                      <dt>Pago creado / aprobado / actualizado</dt>
                      <dd>
                        {{ date(payment.dateCreated) }} / {{ date(payment.dateApproved) }} /
                        {{ date(payment.dateLastUpdated) }}
                      </dd>
                    </div>
                  } @else {
                    <div>
                      <dt>Pago asociado</dt>
                      <dd>No hay un pago informado para esta compra.</dd>
                    </div>
                  }
                  @if (purchase.preference; as preference) {
                    <div>
                      <dt>Preferencia local</dt>
                      <dd>
                        <app-admin-copy-id
                          [value]="preference.id"
                          label="ID local de preferencia"
                        />
                      </dd>
                    </div>
                    @if (preference.providerPreferenceId) {
                      <div>
                        <dt>Preferencia MP</dt>
                        <dd>
                          <app-admin-copy-id
                            [value]="preference.providerPreferenceId"
                            label="Preference ID"
                          />
                        </dd>
                      </div>
                    }
                    <div>
                      <dt>Estado de preferencia</dt>
                      <dd>
                        <code>{{ preference.status }}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Preferencia creada / lista / actualizada</dt>
                      <dd>
                        {{ date(preference.createdAt) }} / {{ date(preference.readyAt) }} /
                        {{ date(preference.updatedAt) }}
                      </dd>
                    </div>
                    <div>
                      <dt>Último error</dt>
                      <dd>
                        <code>{{ preference.lastErrorCode || '—' }}</code> ·
                        {{ date(preference.lastErrorAt) }}
                      </dd>
                    </div>
                  }
                  <div>
                    <dt>Reembolsos</dt>
                    <dd>{{ purchase.refunds.length }}</dd>
                  </div>
                </dl>
              </section>
              @for (refund of purchase.refunds; track refund.id) {
                <section>
                  <h3>Reembolso · {{ refund.status }}</h3>
                  <dl class="raffle-detail-list">
                    <div>
                      <dt>ID local</dt>
                      <dd><app-admin-copy-id [value]="refund.id" label="ID de reembolso" /></dd>
                    </div>
                    @if (refund.providerRefundId) {
                      <div>
                        <dt>Refund ID MP</dt>
                        <dd>
                          <app-admin-copy-id [value]="refund.providerRefundId" label="Refund ID" />
                        </dd>
                      </div>
                    }
                    <div>
                      <dt>Importe</dt>
                      <dd>{{ money(refund.amountInCents) }}</dd>
                    </div>
                    <div>
                      <dt>Creado / completado / actualizado</dt>
                      <dd>
                        {{ date(refund.createdAt) }} / {{ date(refund.completedAt) }} /
                        {{ date(refund.updatedAt) }}
                      </dd>
                    </div>
                  </dl>
                </section>
              }
            </div>
          </section>
        </div>
      }

      @if (confirmation()) {
        <div class="dialog-backdrop">
          <section
            class="dialog"
            role="alertdialog"
            appAdminDialog
            (dialogDismiss)="!mutating() && confirmation.set(null)"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <header>
              <h2 id="confirm-title">
                {{ confirmation() === 'close' ? 'Cerrar la venta' : 'Confirmar ganador' }}
              </h2>
            </header>
            <p>{{ confirmationText() }}</p>
            <div class="actions">
              <button
                class="button button-secondary"
                type="button"
                [disabled]="mutating()"
                (click)="confirmation.set(null)"
              >
                Cancelar
              </button>
              <button
                class="button button-danger"
                type="button"
                [disabled]="mutating()"
                (click)="confirmDangerousAction()"
              >
                {{ mutating() ? 'Procesando...' : 'Confirmar' }}
              </button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styleUrls: ['./admin-pages.css', './admin-raffles.css'],
})
export class AdminRaffleEditorComponent implements OnInit {
  readonly providerLabel = providerStatusLabel;
  readonly raffle = signal<AdminRaffleDetail | null>(null);
  readonly numbers = signal<AdminRaffleNumber[]>([]);
  readonly purchases = signal<AdminRafflePurchase[]>([]);
  readonly inspectedNumber = signal<AdminRaffleNumber | null>(null);
  readonly purchaseDetail = signal<AdminRafflePurchaseDetail | null>(null);
  readonly selectedWinningNumber = signal<number | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly mutating = signal(false);
  readonly notice = signal('');
  readonly noticeKind = signal<'success' | 'error' | 'info'>('info');
  readonly imageFailed = signal(false);
  readonly confirmation = signal<ConfirmationKind | null>(null);
  readonly eligibleWinningNumbers = computed(() =>
    this.numbers()
      .filter((item) => item.status === 'SOLD' && item.order?.status === 'PAID')
      .map((item) => item.number),
  );

  readonly id: string | null;
  dirty = false;
  model: RaffleFormModel = emptyModel();

  constructor(
    private readonly api: AdminApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.id = this.route.snapshot.paramMap.get('raffleId');
  }

  ngOnInit(): void {
    this.load();
  }

  canLeave(): boolean {
    return !this.dirty || window.confirm('Hay cambios sin guardar. ¿Querés salir igualmente?');
  }

  load(): void {
    if (!this.id) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      raffle: this.api.raffle(this.id),
      numbers: this.api.raffleNumbers(this.id),
      purchases: this.api.rafflePurchases(this.id, { page: 1, pageSize: 100 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ raffle, numbers, purchases }) => {
          this.raffle.set(raffle);
          this.numbers.set(numbers);
          this.purchases.set(purchases.items);
          this.model = toFormModel(raffle);
          this.dirty = false;
        },
        error: (error: unknown) => {
          this.loadError.set(true);
          this.showError(error, 'No pudimos cargar la rifa.');
        },
      });
  }

  loadOperationalData(): void {
    if (!this.id || this.loading()) return;
    this.loading.set(true);
    forkJoin({
      raffle: this.api.raffle(this.id),
      numbers: this.api.raffleNumbers(this.id),
      purchases: this.api.rafflePurchases(this.id, { page: 1, pageSize: 100 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ raffle, numbers, purchases }) => {
          this.raffle.set(raffle);
          this.numbers.set(numbers);
          this.purchases.set(purchases.items);
          this.showNotice('Datos actualizados.', 'success');
        },
        error: (error: unknown) => this.showError(error, 'No pudimos actualizar los datos.'),
      });
  }

  save(): void {
    if (this.saving() || !this.validPrice()) return;
    const body = this.requestBody();
    this.saving.set(true);
    const request = this.id ? this.api.updateRaffle(this.id, body) : this.api.createRaffle(body);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (raffle) => {
        this.dirty = false;
        if (!this.id) {
          void this.router.navigate(['/admin/raffles', raffle.id]);
          return;
        }
        this.showNotice('Guardamos los cambios de la rifa.', 'success');
        this.load();
      },
      error: (error: unknown) => this.showError(error, 'No pudimos guardar la rifa.'),
    });
  }

  runAction(action: LifecycleAction): void {
    if (!this.id || this.mutating()) return;
    this.mutating.set(true);
    const request: Observable<AdminRaffleListItem> = {
      publish: this.api.publishRaffle(this.id),
      pause: this.api.pauseRaffle(this.id),
      resume: this.api.resumeRaffle(this.id),
      close: this.api.closeRaffle(this.id),
    }[action];
    request.pipe(finalize(() => this.mutating.set(false))).subscribe({
      next: () => {
        this.confirmation.set(null);
        this.showNotice(actionSuccessMessage(action), 'success');
        this.load();
      },
      error: (error: unknown) => {
        this.confirmation.set(null);
        this.showError(error, 'No pudimos cambiar el estado de la rifa.');
      },
    });
  }

  requestClose(): void {
    this.confirmation.set('close');
  }

  requestDraw(): void {
    if (this.selectedWinningNumber() === null) return;
    this.confirmation.set('draw');
  }

  confirmDangerousAction(): void {
    if (this.confirmation() === 'close') {
      this.runAction('close');
      return;
    }
    const winner = this.selectedWinningNumber();
    if (!this.id || winner === null || this.mutating()) return;
    this.mutating.set(true);
    this.api
      .drawRaffle(this.id, winner)
      .pipe(finalize(() => this.mutating.set(false)))
      .subscribe({
        next: () => {
          this.confirmation.set(null);
          this.showNotice(
            `El número ${this.numberLabel(winner)} quedó registrado como ganador.`,
            'success',
          );
          this.load();
        },
        error: (error: unknown) => {
          this.confirmation.set(null);
          this.showError(error, 'No pudimos registrar el ganador.');
          this.loadOperationalData();
        },
      });
  }

  inspectNumber(item: AdminRaffleNumber): void {
    this.inspectedNumber.set(item);
    if (this.raffle()?.status === 'CLOSED' && this.isEligibleWinner(item)) {
      this.selectedWinningNumber.set(item.number);
    }
  }

  showPurchase(purchase: AdminRafflePurchase): void {
    this.showPurchaseById(purchase.rafflePurchaseId);
  }

  showPurchaseById(purchaseId: string): void {
    if (!this.id) return;
    this.inspectedNumber.set(null);
    this.api.rafflePurchase(this.id, purchaseId).subscribe({
      next: (detail) => this.purchaseDetail.set(detail),
      error: (error: unknown) => this.showError(error, 'No pudimos cargar la compra.'),
    });
  }

  confirmationText(): string {
    if (this.confirmation() === 'close') {
      return 'La rifa dejará de aceptar nuevas reservas. Las reservas y pagos ya iniciados continuarán normalmente. Esta acción no puede deshacerse.';
    }
    return `Vas a registrar el número ${this.numberLabel(this.selectedWinningNumber()!)} como ganador. Después del sorteo no se puede cambiar.`;
  }

  markDirty(): void {
    this.dirty = true;
  }

  validPrice(): boolean {
    const value = Number(this.model.price.replace(',', '.'));
    return Number.isFinite(value) && value > 0;
  }

  statusLabel(status: AdminRaffleStatus): string {
    return raffleStatusLabel(status);
  }

  purchaseStatusLabel(status: string): string {
    return rafflePurchaseStatusLabel(status);
  }

  numberStatusLabel(item: AdminRaffleNumber): string {
    if (this.raffle()?.winningNumber === item.number) return 'Ganador';
    return { AVAILABLE: 'Disponible', RESERVED: 'Reservado', SOLD: 'Vendido' }[item.status];
  }

  numberAriaLabel(item: AdminRaffleNumber, raffle: AdminRaffleDetail): string {
    const buyer = item.buyer ? `, comprador ${item.buyer.name}` : '';
    const status =
      raffle.winningNumber === item.number ? 'ganador' : this.numberStatusLabel(item).toLowerCase();
    return `Número ${this.numberLabel(item.number)}, ${status}${buyer}`;
  }

  numberLabel(number: number): string {
    return number.toString().padStart(2, '0');
  }

  numbersLabel(numbers: number[]): string {
    return numbers.map((number) => this.numberLabel(number)).join(' · ');
  }

  isEligibleWinner(item: AdminRaffleNumber): boolean {
    return item.status === 'SOLD' && item.order?.status === 'PAID';
  }

  lifecycleDate(action: string): string {
    const event = this.raffle()?.history.find((item) => item.action === action);
    return this.date(event?.createdAt ?? null);
  }

  auditLabel(action: string): string {
    return auditActionLabel(action);
  }

  money(value: number): string {
    return formatArsFromCents(value);
  }

  date(value: string | null): string {
    return formatAdminDate(value);
  }

  private requestBody(): CreateAdminRaffleRequest {
    return {
      title: this.model.title.trim(),
      prizeName: this.model.prizeName.trim(),
      description: this.model.description.trim() || null,
      imageUrl: this.model.imageUrl.trim() || null,
      priceInCents: Math.round(Number(this.model.price.replace(',', '.')) * 100),
      drawAt: this.model.drawAt ? new Date(this.model.drawAt).toISOString() : null,
    };
  }

  private showNotice(message: string, kind: 'success' | 'error' | 'info'): void {
    this.notice.set(message);
    this.noticeKind.set(kind);
  }

  private showError(error: unknown, fallback: string): void {
    this.showNotice(adminErrorMessage(error, fallback), 'error');
  }
}

function emptyModel(): RaffleFormModel {
  return {
    title: 'Rifa solidaria',
    prizeName: '',
    description: '',
    imageUrl: '',
    price: '',
    drawAt: '',
  };
}

function toFormModel(raffle: AdminRaffleDetail): RaffleFormModel {
  return {
    title: raffle.title,
    prizeName: raffle.prizeName,
    description: raffle.description ?? '',
    imageUrl: raffle.imageUrl ?? '',
    price: (raffle.priceInCents / 100).toString(),
    drawAt: toLocalDateTime(raffle.drawAt),
  };
}

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function actionSuccessMessage(action: LifecycleAction): string {
  return {
    publish: 'La rifa está activa y ya aparece en /rifa.',
    pause: 'La rifa quedó pausada. No acepta nuevas reservas.',
    resume: 'La rifa volvió a estar activa.',
    close: 'La venta quedó cerrada. Las operaciones iniciadas siguen su curso.',
  }[action];
}
