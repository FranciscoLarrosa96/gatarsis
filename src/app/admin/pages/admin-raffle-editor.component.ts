import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, forkJoin } from 'rxjs';

import { AdminApiService } from '../core/admin-api.service';
import { adminErrorMessage } from '../core/admin-domain-error';
import {
  AdminManualRafflePaymentMethod,
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
  imageUrls: string[];
  price: string;
  drawAt: string;
}

interface ManualSaleFormModel {
  buyerName: string;
  email: string;
  whatsapp: string;
  paymentMethod: AdminManualRafflePaymentMethod;
  note: string;
}

type LifecycleAction = 'publish' | 'pause' | 'resume' | 'close';
type ConfirmationKind = 'close' | 'draw';
const MAX_NUMBERS_PER_PURCHASE = 10;
const MAX_RAFFLE_IMAGES = 8;

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
                class="button button-primary"
                type="button"
                [disabled]="mutating() || current.stats.available === 0"
                (click)="openManualSale()"
              >
                Registrar venta manual
              </button>
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
                <section class="raffle-admin-images" aria-labelledby="raffle-images-title">
                  <div class="section-heading inline-heading">
                    <div>
                      <h3 id="raffle-images-title">Imágenes del premio</h3>
                      <p>
                        La primera imagen se usa como portada del premio. Máximo
                        {{ maxRaffleImages }}.
                      </p>
                    </div>
                    <button
                      class="button button-secondary"
                      type="button"
                      [disabled]="model.imageUrls.length >= maxRaffleImages"
                      (click)="addRaffleImage()"
                    >
                      + Agregar imagen
                    </button>
                  </div>

                  <div class="raffle-image-list">
                    @for (url of model.imageUrls; track $index; let index = $index) {
                      <article class="raffle-image-row">
                        <div class="raffle-image-preview">
                          @if (url && !raffleImageError(url) && !imagePreviewFailed(index)) {
                            <img
                              [src]="url"
                              [alt]="'Vista previa de la imagen ' + (index + 1)"
                              (load)="clearImagePreviewFailure(index)"
                              (error)="markImagePreviewFailed(index)"
                            />
                          } @else {
                            <span>{{
                              imagePreviewFailed(index) ? 'No pudimos cargarla' : 'Sin preview'
                            }}</span>
                          }
                        </div>
                        <label>
                          <span class="raffle-image-label">
                            Foto {{ index + 1 }}
                            @if (index === 0) {
                              <strong>Principal</strong>
                            }
                          </span>
                          <input
                            [name]="'imageUrl-' + index"
                            type="url"
                            required
                            maxlength="2048"
                            [(ngModel)]="model.imageUrls[index]"
                            (ngModelChange)="onRaffleImageChanged(index)"
                            placeholder="https://res.cloudinary.com/..."
                          />
                          @if (raffleImageError(url); as error) {
                            <small class="field-error">{{ error }}</small>
                          } @else if (duplicateRaffleImage(index)) {
                            <small class="field-error">Esta imagen ya está incluida.</small>
                          } @else if (imagePreviewFailed(index)) {
                            <small class="field-error"
                              >La URL es válida, pero la imagen no respondió.</small
                            >
                          }
                        </label>
                        <div class="raffle-image-actions" aria-label="Ordenar imagen">
                          <button
                            type="button"
                            title="Mover hacia arriba"
                            [disabled]="index === 0"
                            (click)="moveRaffleImage(index, -1)"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title="Mover hacia abajo"
                            [disabled]="index === model.imageUrls.length - 1"
                            (click)="moveRaffleImage(index, 1)"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            class="remove-image"
                            title="Quitar imagen"
                            [disabled]="model.imageUrls.length === 1"
                            (click)="removeRaffleImage(index)"
                          >
                            Quitar
                          </button>
                        </div>
                      </article>
                    }
                  </div>
                </section>
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
                    [disabled]="raffleForm.invalid || saving() || !validPrice() || !validImages()"
                  >
                    {{ saving() ? 'Guardando...' : id ? 'Guardar cambios' : 'Crear borrador' }}
                  </button>
                </div>
              </div>
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
                          @if (purchase.paymentSource === 'MANUAL') {
                            <small class="manual-purchase-origin">
                              Venta manual ·
                              {{
                                manualPaymentMethodLabel(purchase.manualPaymentMethod || 'OTHER')
                              }}
                            </small>
                          }
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
                @if (manualPurchaseForNumber(item); as manualPurchase) {
                  <div>
                    <dt>Origen</dt>
                    <dd><strong>Venta manual</strong></dd>
                  </div>
                  <div>
                    <dt>Medio</dt>
                    <dd>
                      {{ manualPaymentMethodLabel(manualPurchase.manualPaymentMethod || 'OTHER') }}
                    </dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{{ money(manualPurchase.totalInCents) }}</dd>
                  </div>
                  @if (manualPurchase.manualSaleNote) {
                    <div>
                      <dt>Nota</dt>
                      <dd>{{ manualPurchase.manualSaleNote }}</dd>
                    </div>
                  }
                }
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
                @if (purchase.paymentSource === 'MANUAL') {
                  <span class="manual-purchase-origin">
                    Venta manual ·
                    {{ manualPaymentMethodLabel(purchase.manualPaymentMethod || 'OTHER') }}
                  </span>
                }
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
            <div class="purchase-body">
              <div class="purchase-summary">
                <section class="purchase-buyer">
                  <h3>Comprador</h3>
                  <p class="buyer-name">{{ purchase.buyerName }}</p>
                  <div class="buyer-contacts">
                    <a class="contact-chip" [href]="'mailto:' + purchase.buyerEmail">{{
                      purchase.buyerEmail
                    }}</a>
                    <a class="contact-chip" [href]="'tel:' + purchase.buyerPhone">{{
                      purchase.buyerPhone
                    }}</a>
                  </div>
                </section>
                <section class="purchase-total">
                  <h3>Total</h3>
                  <p class="total-amount">{{ money(purchase.totalInCents) }}</p>
                  @if (purchase.payment; as payment) {
                    <span
                      class="badge status-{{ payment.providerStatus.toLowerCase() }}"
                      [title]="payment.providerStatus"
                      >Pago {{ providerLabel(payment.providerStatus).toLowerCase() }}</span
                    >
                  } @else {
                    @if (purchase.paymentSource === 'MANUAL') {
                      <span class="manual-purchase-origin">Sin pago de Mercado Pago</span>
                    } @else {
                      <span class="muted">Sin pago informado</span>
                    }
                  }
                </section>
              </div>

              <ol class="purchase-timeline" aria-label="Cronología de la compra">
                <li>
                  <span>Creada</span><strong>{{ date(purchase.createdAt) }}</strong>
                </li>
                <li>
                  <span>Pagada</span><strong>{{ date(purchase.paidAt) }}</strong>
                </li>
                <li>
                  <span>Reserva vence</span
                  ><strong>{{ date(purchase.reservationExpiresAt) }}</strong>
                </li>
              </ol>

              @if (purchase.refunds.length) {
                <section class="purchase-block">
                  <h3>Reembolsos ({{ purchase.refunds.length }})</h3>
                  <ul class="refund-list">
                    @for (refund of purchase.refunds; track refund.id) {
                      <li>
                        <div class="refund-head">
                          <span class="badge status-{{ refund.status.toLowerCase() }}">{{
                            refund.status
                          }}</span>
                          <strong>{{ money(refund.amountInCents) }}</strong>
                          <span class="muted">{{
                            date(refund.completedAt ?? refund.createdAt)
                          }}</span>
                        </div>
                        <dl class="id-list">
                          <div>
                            <dt>ID local</dt>
                            <dd>
                              <app-admin-copy-id [value]="refund.id" label="ID de reembolso" />
                            </dd>
                          </div>
                          @if (refund.providerRefundId) {
                            <div>
                              <dt>Refund ID MP</dt>
                              <dd>
                                <app-admin-copy-id
                                  [value]="refund.providerRefundId"
                                  label="Refund ID"
                                />
                              </dd>
                            </div>
                          }
                        </dl>
                      </li>
                    }
                  </ul>
                </section>
              }

              <details class="purchase-block" open>
                <summary>Pago y orden</summary>
                <dl class="id-list">
                  <div>
                    <dt>Compra ID</dt>
                    <dd>
                      <app-admin-copy-id
                        [value]="purchase.rafflePurchaseId"
                        label="ID de compra de rifa"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Orden</dt>
                    <dd>
                      <app-admin-copy-id [value]="purchase.orderId" label="ID del pedido" />
                      <small class="technical-enum">{{ purchase.orderStatus }}</small>
                    </dd>
                  </div>
                  @if (purchase.paymentSource === 'MANUAL') {
                    <div>
                      <dt>Origen</dt>
                      <dd>Venta manual</dd>
                    </div>
                    <div>
                      <dt>Medio</dt>
                      <dd>
                        {{ manualPaymentMethodLabel(purchase.manualPaymentMethod || 'OTHER') }}
                      </dd>
                    </div>
                    @if (purchase.manualSaleNote) {
                      <div>
                        <dt>Nota</dt>
                        <dd>{{ purchase.manualSaleNote }}</dd>
                      </div>
                    }
                  }
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
                      <dt>Importe / moneda</dt>
                      <dd>
                        {{ money(payment.transactionAmountInCents) }} · {{ payment.currencyId }}
                      </dd>
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
                      <dt>Creado</dt>
                      <dd>{{ date(payment.dateCreated) }}</dd>
                    </div>
                    <div>
                      <dt>Aprobado</dt>
                      <dd>{{ date(payment.dateApproved) }}</dd>
                    </div>
                    <div>
                      <dt>Actualizado</dt>
                      <dd>{{ date(payment.dateLastUpdated) }}</dd>
                    </div>
                  }
                </dl>
              </details>

              @if (purchase.preference; as preference) {
                <details class="purchase-block">
                  <summary>Preferencia de Mercado Pago</summary>
                  <dl class="id-list">
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
                      <dt>Estado</dt>
                      <dd>
                        <code>{{ preference.status }}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Creada</dt>
                      <dd>{{ date(preference.createdAt) }}</dd>
                    </div>
                    <div>
                      <dt>Lista</dt>
                      <dd>{{ date(preference.readyAt) }}</dd>
                    </div>
                    <div>
                      <dt>Actualizada</dt>
                      <dd>{{ date(preference.updatedAt) }}</dd>
                    </div>
                    <div>
                      <dt>Último error</dt>
                      <dd>
                        <code>{{ preference.lastErrorCode || '—' }}</code>
                        @if (preference.lastErrorAt) {
                          · {{ date(preference.lastErrorAt) }}
                        }
                      </dd>
                    </div>
                  </dl>
                </details>
              }
            </div>
          </section>
        </div>
      }

      @if (manualSaleOpen()) {
        <div class="dialog-backdrop" (click)="closeManualSale()">
          <section
            class="dialog wide-dialog manual-sale-dialog"
            appAdminDialog
            (dialogDismiss)="closeManualSale()"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-sale-title"
            (click)="$event.stopPropagation()"
          >
            <header>
              <div>
                <p class="eyebrow">Venta fuera de la web</p>
                <h2 id="manual-sale-title">
                  {{ manualSaleConfirming() ? 'Confirmar venta manual' : 'Registrar venta manual' }}
                </h2>
              </div>
              <button
                class="close-button"
                type="button"
                aria-label="Cerrar"
                [disabled]="manualSaleSubmitting()"
                (click)="closeManualSale()"
              >
                ×
              </button>
            </header>

            @if (manualSaleConfirming()) {
              <div class="manual-sale-confirmation">
                <div class="manual-sale-summary" aria-label="Resumen de la venta manual">
                  <div>
                    <span>Números</span>
                    <strong>{{ numbersLabel(selectedManualNumbers()) }}</strong>
                  </div>
                  <div>
                    <span>Comprador</span>
                    <strong>{{ manualSaleModel.buyerName }}</strong>
                  </div>
                  <div>
                    <span>Medio</span>
                    <strong>{{ manualPaymentMethodLabel(manualSaleModel.paymentMethod) }}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{{ money(manualSaleTotal()) }}</strong>
                  </div>
                </div>
                <p class="manual-sale-warning">
                  Vas a registrar como vendidos los números
                  <strong>{{ readableNumbersLabel(selectedManualNumbers()) }}</strong> por
                  <strong>{{ money(manualSaleTotal()) }}</strong> mediante
                  {{ manualPaymentMethodLabel(manualSaleModel.paymentMethod).toLowerCase() }}.
                </p>
                <p class="muted">
                  Esta operación quedará registrada como una venta manual y no generará un pago de
                  Mercado Pago.
                </p>
                @if (manualSaleError()) {
                  <p class="feedback error" role="alert">{{ manualSaleError() }}</p>
                }
                <div class="actions manual-sale-actions">
                  <button
                    class="button button-secondary"
                    type="button"
                    [disabled]="manualSaleSubmitting()"
                    (click)="manualSaleConfirming.set(false)"
                  >
                    Volver
                  </button>
                  <button
                    class="button button-primary"
                    type="button"
                    [disabled]="manualSaleSubmitting()"
                    (click)="submitManualSale()"
                  >
                    {{ manualSaleSubmitting() ? 'Registrando...' : 'Registrar venta' }}
                  </button>
                </div>
              </div>
            } @else {
              <form
                #manualSaleForm="ngForm"
                class="manual-sale-form"
                (ngSubmit)="reviewManualSale()"
              >
                <section class="manual-number-picker">
                  <div class="section-heading inline-heading">
                    <div>
                      <h3>Números disponibles *</h3>
                      <p>
                        Elegí hasta {{ maxNumbersPerPurchase }}. Sólo se muestran los que siguen
                        disponibles.
                      </p>
                    </div>
                    <strong class="manual-selection-count">
                      {{ selectedManualNumbers().length }}/{{ maxNumbersPerPurchase }}
                    </strong>
                  </div>
                  @if (availableManualSaleNumbers().length) {
                    <div class="admin-number-grid manual-number-grid">
                      @for (item of availableManualSaleNumbers(); track item.number) {
                        <button
                          type="button"
                          class="admin-number"
                          [class.is-selected]="isManualNumberSelected(item.number)"
                          [attr.aria-pressed]="isManualNumberSelected(item.number)"
                          [attr.aria-label]="'Número ' + numberLabel(item.number)"
                          (click)="toggleManualNumber(item.number)"
                        >
                          {{ numberLabel(item.number) }}
                        </button>
                      }
                    </div>
                  } @else {
                    <p class="empty compact">No quedan números disponibles.</p>
                  }
                  @if (manualNumberError()) {
                    <small class="field-error" role="alert">{{ manualNumberError() }}</small>
                  }
                </section>

                <div class="form-grid manual-buyer-grid">
                  <label>
                    Nombre *
                    <input
                      name="manualBuyerName"
                      required
                      maxlength="120"
                      [(ngModel)]="manualSaleModel.buyerName"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      name="manualBuyerEmail"
                      type="email"
                      maxlength="180"
                      [(ngModel)]="manualSaleModel.email"
                    />
                  </label>
                  <label>
                    WhatsApp / teléfono
                    <input
                      name="manualBuyerWhatsapp"
                      type="tel"
                      maxlength="40"
                      [(ngModel)]="manualSaleModel.whatsapp"
                    />
                  </label>
                  <label>
                    Medio de pago *
                    <select
                      name="manualPaymentMethod"
                      required
                      [(ngModel)]="manualSaleModel.paymentMethod"
                    >
                      <option value="CASH">Efectivo</option>
                      <option value="TRANSFER">Transferencia</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </label>
                  <label class="manual-note-field">
                    Referencia / nota
                    <textarea
                      name="manualSaleNote"
                      rows="3"
                      maxlength="500"
                      [(ngModel)]="manualSaleModel.note"
                    ></textarea>
                  </label>
                </div>

                <div class="manual-sale-total">
                  <span>Importe calculado</span>
                  <strong>{{ money(manualSaleTotal()) }}</strong>
                  <small>
                    {{ selectedManualNumbers().length }} ×
                    {{ money(raffle()?.priceInCents || 0) }}
                  </small>
                </div>
                @if (manualSaleError()) {
                  <p class="feedback error" role="alert">{{ manualSaleError() }}</p>
                }
                <div class="actions manual-sale-actions">
                  <button class="button button-secondary" type="button" (click)="closeManualSale()">
                    Cancelar
                  </button>
                  <button
                    class="button button-primary"
                    type="submit"
                    [disabled]="
                      manualSaleForm.invalid ||
                      selectedManualNumbers().length === 0 ||
                      selectedManualNumbers().length > maxNumbersPerPurchase
                    "
                  >
                    Revisar venta
                  </button>
                </div>
              </form>
            }
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
  readonly imagePreviewFailures = signal<ReadonlySet<number>>(new Set());
  readonly confirmation = signal<ConfirmationKind | null>(null);
  readonly manualSaleOpen = signal(false);
  readonly manualSaleConfirming = signal(false);
  readonly manualSaleSubmitting = signal(false);
  readonly manualSaleError = signal('');
  readonly manualNumberError = signal('');
  readonly selectedManualNumbers = signal<number[]>([]);
  readonly maxNumbersPerPurchase = MAX_NUMBERS_PER_PURCHASE;
  readonly maxRaffleImages = MAX_RAFFLE_IMAGES;
  readonly availableManualSaleNumbers = computed(() =>
    this.numbers().filter((item) => item.status === 'AVAILABLE'),
  );
  readonly manualSaleTotal = computed(
    () => this.selectedManualNumbers().length * (this.raffle()?.priceInCents ?? 0),
  );
  readonly eligibleWinningNumbers = computed(() =>
    this.numbers()
      .filter((item) => item.status === 'SOLD' && item.order?.status === 'PAID')
      .map((item) => item.number),
  );

  readonly id: string | null;
  dirty = false;
  model: RaffleFormModel = emptyModel();
  manualSaleModel: ManualSaleFormModel = emptyManualSaleModel();
  private manualSaleIdempotencyKey = '';

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

  loadOperationalData(showSuccessNotice = true): void {
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
          if (showSuccessNotice) this.showNotice('Datos actualizados.', 'success');
        },
        error: (error: unknown) => this.showError(error, 'No pudimos actualizar los datos.'),
      });
  }

  save(): void {
    if (this.saving() || !this.validPrice() || !this.validImages()) return;
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

  openManualSale(): void {
    if (this.raffle()?.status !== 'ACTIVE') return;
    this.manualSaleModel = emptyManualSaleModel();
    this.selectedManualNumbers.set([]);
    this.manualSaleError.set('');
    this.manualNumberError.set('');
    this.manualSaleConfirming.set(false);
    this.manualSaleIdempotencyKey = crypto.randomUUID();
    this.manualSaleOpen.set(true);
  }

  closeManualSale(): void {
    if (this.manualSaleSubmitting()) return;
    this.manualSaleOpen.set(false);
    this.manualSaleConfirming.set(false);
    this.manualSaleError.set('');
  }

  isManualNumberSelected(number: number): boolean {
    return this.selectedManualNumbers().includes(number);
  }

  toggleManualNumber(number: number): void {
    const selected = this.selectedManualNumbers();
    if (selected.includes(number)) {
      this.selectedManualNumbers.set(selected.filter((item) => item !== number));
      this.manualNumberError.set('');
      return;
    }
    if (selected.length >= MAX_NUMBERS_PER_PURCHASE) {
      this.manualNumberError.set(
        `Podés registrar hasta ${MAX_NUMBERS_PER_PURCHASE} números por venta.`,
      );
      return;
    }
    this.selectedManualNumbers.set([...selected, number].sort((a, b) => a - b));
    this.manualNumberError.set('');
  }

  reviewManualSale(): void {
    if (!this.selectedManualNumbers().length) {
      this.manualNumberError.set('Elegí al menos un número disponible.');
      return;
    }
    if (!this.manualSaleModel.buyerName.trim()) return;
    this.manualSaleError.set('');
    this.manualSaleConfirming.set(true);
  }

  submitManualSale(): void {
    if (
      !this.id ||
      this.manualSaleSubmitting() ||
      this.raffle()?.status !== 'ACTIVE' ||
      !this.selectedManualNumbers().length ||
      !this.manualSaleModel.buyerName.trim()
    ) {
      return;
    }

    const body = {
      numbers: this.selectedManualNumbers(),
      buyer: {
        name: this.manualSaleModel.buyerName.trim(),
        ...(this.manualSaleModel.email.trim() ? { email: this.manualSaleModel.email.trim() } : {}),
        ...(this.manualSaleModel.whatsapp.trim()
          ? { whatsapp: this.manualSaleModel.whatsapp.trim() }
          : {}),
      },
      paymentMethod: this.manualSaleModel.paymentMethod,
      ...(this.manualSaleModel.note.trim() ? { note: this.manualSaleModel.note.trim() } : {}),
      idempotencyKey: this.manualSaleIdempotencyKey,
    };

    this.manualSaleSubmitting.set(true);
    this.manualSaleError.set('');
    this.api
      .createManualRaffleSale(this.id, body)
      .pipe(finalize(() => this.manualSaleSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.manualSaleOpen.set(false);
          this.manualSaleConfirming.set(false);
          this.showNotice('Venta manual registrada correctamente.', 'success');
          this.loadOperationalData(false);
        },
        error: (error: unknown) => {
          this.manualSaleError.set(
            adminErrorMessage(
              error,
              'No pudimos registrar la venta. Verificá que todos los números sigan disponibles.',
            ),
          );
          this.refreshManualAvailability();
        },
      });
  }

  manualPaymentMethodLabel(method: AdminManualRafflePaymentMethod): string {
    return { CASH: 'Efectivo', TRANSFER: 'Transferencia', OTHER: 'Otro' }[method];
  }

  readableNumbersLabel(numbers: number[]): string {
    if (numbers.length < 2) return this.numberLabel(numbers[0]);
    const labels = numbers.map((number) => this.numberLabel(number));
    return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`;
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

  manualPurchaseForNumber(item: AdminRaffleNumber): AdminRafflePurchase | null {
    if (!item.rafflePurchaseId) return null;
    return (
      this.purchases().find(
        (purchase) =>
          purchase.rafflePurchaseId === item.rafflePurchaseId &&
          purchase.paymentSource === 'MANUAL',
      ) ?? null
    );
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

  validImages(): boolean {
    return (
      this.model.imageUrls.length > 0 &&
      this.model.imageUrls.length <= MAX_RAFFLE_IMAGES &&
      this.model.imageUrls.every((url) => !this.raffleImageError(url)) &&
      normalizedAdminImageUrls(this.model.imageUrls).length === this.model.imageUrls.length
    );
  }

  duplicateRaffleImage(index: number): boolean {
    const url = this.model.imageUrls[index]?.trim();
    return (
      !!url &&
      this.model.imageUrls.some(
        (candidate, candidateIndex) => candidateIndex !== index && candidate.trim() === url,
      )
    );
  }

  raffleImageError(url: string): string | null {
    const value = url.trim();
    if (!value) return 'Ingresá una URL para esta imagen.';
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' ? null : 'La imagen debe usar una URL HTTPS.';
    } catch {
      return 'Ingresá una URL válida.';
    }
  }

  addRaffleImage(): void {
    if (this.model.imageUrls.length >= MAX_RAFFLE_IMAGES) return;
    this.model.imageUrls.push('');
    this.markDirty();
  }

  removeRaffleImage(index: number): void {
    if (this.model.imageUrls.length === 1) return;
    this.model.imageUrls.splice(index, 1);
    this.imagePreviewFailures.set(new Set());
    this.markDirty();
  }

  moveRaffleImage(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.model.imageUrls.length) return;
    [this.model.imageUrls[index], this.model.imageUrls[target]] = [
      this.model.imageUrls[target],
      this.model.imageUrls[index],
    ];
    this.imagePreviewFailures.set(new Set());
    this.markDirty();
  }

  onRaffleImageChanged(index: number): void {
    this.imagePreviewFailures.update((failed) => {
      const next = new Set(failed);
      next.delete(index);
      return next;
    });
    this.markDirty();
  }

  imagePreviewFailed(index: number): boolean {
    return this.imagePreviewFailures().has(index);
  }

  markImagePreviewFailed(index: number): void {
    this.imagePreviewFailures.update((failed) => new Set(failed).add(index));
  }

  clearImagePreviewFailure(index: number): void {
    this.imagePreviewFailures.update((failed) => {
      const next = new Set(failed);
      next.delete(index);
      return next;
    });
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
      imageUrls: normalizedAdminImageUrls(this.model.imageUrls),
      priceInCents: Math.round(Number(this.model.price.replace(',', '.')) * 100),
      drawAt: this.model.drawAt ? new Date(this.model.drawAt).toISOString() : null,
    };
  }

  private refreshManualAvailability(): void {
    if (!this.id) return;
    this.api.raffleNumbers(this.id).subscribe({
      next: (numbers) => {
        this.numbers.set(numbers);
        const available = new Set(
          numbers.filter((item) => item.status === 'AVAILABLE').map((item) => item.number),
        );
        const selected = this.selectedManualNumbers();
        const stillAvailable = selected.filter((number) => available.has(number));
        this.selectedManualNumbers.set(stillAvailable);
        if (stillAvailable.length !== selected.length) {
          this.manualSaleConfirming.set(false);
          this.manualNumberError.set(
            'Actualizamos la grilla: uno o más números ya no están disponibles.',
          );
        }
      },
    });
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
    imageUrls: [''],
    price: '',
    drawAt: '',
  };
}

function emptyManualSaleModel(): ManualSaleFormModel {
  return {
    buyerName: '',
    email: '',
    whatsapp: '',
    paymentMethod: 'CASH',
    note: '',
  };
}

function toFormModel(raffle: AdminRaffleDetail): RaffleFormModel {
  return {
    title: raffle.title,
    prizeName: raffle.prizeName,
    description: raffle.description ?? '',
    imageUrls: raffleImageUrlsForForm(raffle),
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

function normalizedAdminImageUrls(urls: string[]): string[] {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}

function raffleImageUrlsForForm(raffle: AdminRaffleDetail): string[] {
  const urls = normalizedAdminImageUrls(
    raffle.imageUrls?.length ? raffle.imageUrls : raffle.imageUrl ? [raffle.imageUrl] : [],
  );
  return urls.length ? urls : [''];
}

function actionSuccessMessage(action: LifecycleAction): string {
  return {
    publish: 'La rifa está activa y ya aparece en /rifa.',
    pause: 'La rifa quedó pausada. No acepta nuevas reservas.',
    resume: 'La rifa volvió a estar activa.',
    close: 'La venta quedó cerrada. Las operaciones iniciadas siguen su curso.',
  }[action];
}
