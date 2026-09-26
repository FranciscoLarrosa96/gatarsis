import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

import { AdminApiService } from '../../admin/core/admin-api.service';
import { adminErrorCode, adminErrorMessage } from '../../admin/core/admin-domain-error';
import {
  AdminRaffleDetail,
  AdminRaffleListItem,
  AdminRaffleNumber,
  AdminRafflePurchase,
} from '../../admin/core/admin-raffle.models';

type DrawStep = 'SELECT' | 'PREPARE' | 'CONFIRM' | 'DRAWING' | 'RESULT';
type ExternalStep = 'CLOSED' | 'FORM' | 'CONFIRM';

@Component({
  selector: 'app-draw-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './draw-page.component.html',
  styleUrl: './draw-page.component.css',
})
export class DrawPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private animationTimer: ReturnType<typeof setInterval> | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  readonly raffles = signal<AdminRaffleListItem[]>([]);
  readonly raffle = signal<AdminRaffleDetail | null>(null);
  readonly numbers = signal<AdminRaffleNumber[]>([]);
  readonly purchases = signal<AdminRafflePurchase[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly step = signal<DrawStep>('SELECT');
  readonly externalStep = signal<ExternalStep>('CLOSED');
  readonly participantsOpen = signal(false);
  readonly animatedNumber = signal<number | null>(null);
  readonly drawMethod = signal<'AUTOMATIC' | 'EXTERNAL' | null>(null);
  readonly externalWinningNumber = signal<number | null>(null);
  externalNote = '';

  readonly eligibleNumbers = computed(() =>
    this.numbers()
      .filter((item) => item.status === 'SOLD' && item.order?.status === 'PAID')
      .sort((left, right) => left.number - right.number),
  );
  readonly pendingPurchases = computed(
    () =>
      this.purchases().filter(
        (item) =>
          item.status === 'RESERVED' ||
          item.status === 'PAYMENT_PENDING' ||
          item.status === 'REQUIRES_REVIEW' ||
          item.orderStatus === 'AWAITING_PAYMENT' ||
          item.orderStatus === 'PAYMENT_PENDING',
      ).length,
  );
  readonly readinessIssues = computed(() => {
    const current = this.raffle();
    if (!current) return [];
    const issues: string[] = [];
    if (current.status !== 'CLOSED') {
      issues.push(
        current.status === 'ACTIVE'
          ? 'La venta todavía está abierta.'
          : current.status === 'PAUSED'
            ? 'La rifa está pausada; debe cerrarse desde el administrador.'
            : 'La rifa no está cerrada.',
      );
    }
    if (!this.eligibleNumbers().length) issues.push('Todavía no hay participantes pagos.');
    if (current.stats.activeReservations > 0)
      issues.push(`Hay ${current.stats.activeReservations} reservas activas.`);
    if (this.pendingPurchases() > 0)
      issues.push(`Hay ${this.pendingPurchases()} pagos u órdenes pendientes.`);
    return issues;
  });
  readonly ready = computed(
    () => this.raffle()?.status === 'CLOSED' && this.readinessIssues().length === 0,
  );
  readonly winnerNumber = computed(() => this.raffle()?.winningNumber ?? this.animatedNumber());
  readonly winner = computed(() => {
    const winningNumber = this.winnerNumber();
    return winningNumber === null
      ? null
      : (this.numbers().find((item) => item.number === winningNumber) ?? null);
  });
  readonly availableRaffles = computed(() =>
    this.raffles().filter((item) => item.status !== 'DRAFT' && item.status !== 'DRAWN'),
  );
  readonly completedRaffles = computed(() =>
    this.raffles().filter((item) => item.status === 'DRAWN'),
  );

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const raffleId = params.get('raffleId');
      raffleId ? this.loadRaffle(raffleId) : this.loadRaffles();
    });
  }

  ngOnDestroy(): void {
    this.clearAnimation();
  }

  selectRaffle(raffleId: string): void {
    void this.router.navigate(['/sortear', raffleId]);
  }

  prepare(): void {
    if (this.raffle()?.status === 'DRAWN') this.step.set('RESULT');
    else this.step.set('PREPARE');
  }

  requestAutomaticDraw(): void {
    if (this.ready()) this.step.set('CONFIRM');
  }

  confirmAutomaticDraw(): void {
    const current = this.raffle();
    if (!current || this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);
    this.api
      .runRaffleDraw(current.id, { method: 'AUTOMATIC' })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result) => {
          if (result.winningNumber === null) {
            this.error.set('El servidor no devolvió un número ganador.');
            return;
          }
          this.raffle.set({ ...current, ...result });
          this.drawMethod.set('AUTOMATIC');
          this.startReveal(result.winningNumber);
        },
        error: (error: unknown) => this.handleDrawError(error, current.id),
      });
  }

  openExternal(): void {
    if (!this.ready()) return;
    this.externalWinningNumber.set(null);
    this.externalNote = '';
    this.externalStep.set('FORM');
  }

  reviewExternal(): void {
    if (this.externalWinningNumber() !== null) this.externalStep.set('CONFIRM');
  }

  confirmExternal(): void {
    const current = this.raffle();
    const winningNumber = this.externalWinningNumber();
    if (!current || winningNumber === null || this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);
    this.api
      .runRaffleDraw(current.id, {
        method: 'EXTERNAL',
        winningNumber,
        ...(this.externalNote.trim() ? { note: this.externalNote.trim() } : {}),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result) => {
          this.raffle.set({ ...current, ...result, winningNumber });
          this.drawMethod.set('EXTERNAL');
          this.animatedNumber.set(winningNumber);
          this.externalStep.set('CLOSED');
          this.step.set('RESULT');
        },
        error: (error: unknown) => this.handleDrawError(error, current.id),
      });
  }

  closeExternal(): void {
    this.externalStep.set('CLOSED');
  }

  finish(): void {
    void this.router.navigate(['/sortear']);
  }

  async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  numberLabel(value: number | null): string {
    return value === null ? '—' : value.toString().padStart(2, '0');
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
      value / 100,
    );
  }

  date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(value),
        )
      : '—';
  }

  buyerName(number: AdminRaffleNumber | null): string {
    if (!number) return 'Participante';
    const purchase = this.purchases().find(
      (item) => item.rafflePurchaseId === number.rafflePurchaseId,
    );
    return number.buyer?.name || purchase?.buyerName || 'Participante';
  }

  winnerForExternal(): AdminRaffleNumber | null {
    const number = this.externalWinningNumber();
    return number === null
      ? null
      : (this.eligibleNumbers().find((item) => item.number === number) ?? null);
  }

  private loadRaffles(): void {
    this.resetView();
    this.api.raffles({ page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.raffles.set(
          [...response.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las rifas. Intentá nuevamente.');
        this.loading.set(false);
      },
    });
  }

  private loadRaffle(raffleId: string, concurrencyMessage = ''): void {
    this.clearAnimation();
    this.loading.set(true);
    this.error.set(concurrencyMessage);
    forkJoin({
      raffle: this.api.raffle(raffleId),
      numbers: this.api.raffleNumbers(raffleId),
      purchases: this.api.rafflePurchases(raffleId, { page: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ raffle, numbers, purchases }) => {
        this.raffle.set(raffle);
        this.numbers.set(numbers);
        this.purchases.set(purchases.items);
        this.drawMethod.set(drawMethodFrom(raffle));
        this.animatedNumber.set(raffle.winningNumber);
        this.step.set(raffle.status === 'DRAWN' ? 'RESULT' : 'PREPARE');
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(adminErrorMessage(error, 'No pudimos cargar esta rifa.'));
        this.loading.set(false);
      },
    });
  }

  private startReveal(winningNumber: number): void {
    const eligible = this.eligibleNumbers().map((item) => item.number);
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.step.set('DRAWING');
    this.animatedNumber.set(eligible[0] ?? winningNumber);
    if (reduced) {
      this.revealTimer = setTimeout(() => this.completeReveal(winningNumber), 180);
      return;
    }
    let tick = 0;
    this.animationTimer = setInterval(() => {
      this.animatedNumber.set(eligible[(tick * 7 + 3) % eligible.length] ?? winningNumber);
      tick += 1;
    }, 90);
    this.revealTimer = setTimeout(() => this.completeReveal(winningNumber), 3600);
  }

  private completeReveal(winningNumber: number): void {
    this.clearAnimation();
    this.animatedNumber.set(winningNumber);
    this.step.set('RESULT');
  }

  private handleDrawError(error: unknown, raffleId: string): void {
    if (adminErrorCode(error) === 'RAFFLE_ALREADY_DRAWN') {
      this.loadRaffle(raffleId, 'Esta rifa ya fue sorteada. Mostramos el resultado registrado.');
      return;
    }
    this.error.set(adminErrorMessage(error, 'No pudimos registrar el sorteo. Intentá nuevamente.'));
  }

  private resetView(): void {
    this.clearAnimation();
    this.raffle.set(null);
    this.numbers.set([]);
    this.purchases.set([]);
    this.step.set('SELECT');
    this.loading.set(true);
    this.error.set('');
  }

  private clearAnimation(): void {
    if (this.animationTimer) clearInterval(this.animationTimer);
    if (this.revealTimer) clearTimeout(this.revealTimer);
    this.animationTimer = null;
    this.revealTimer = null;
  }
}

function drawMethodFrom(raffle: AdminRaffleDetail): 'AUTOMATIC' | 'EXTERNAL' | null {
  const event = raffle.history.find((item) => item.action === 'RAFFLE_DRAWN');
  const method = event?.metadata?.['drawMethod'];
  return method === 'AUTOMATIC' || method === 'EXTERNAL' ? method : null;
}
