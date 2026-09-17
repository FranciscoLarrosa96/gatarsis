import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AdminApiService } from '../core/admin-api.service';
import { AdminRaffleListItem, AdminRaffleStatus } from '../core/admin-raffle.models';
import { formatAdminDate, formatArsFromCents, raffleStatusLabel } from '../core/admin-formatters';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page raffle-admin-page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Recaudación</p>
          <h1>Rifas solidarias</h1>
          <p class="page-description">Creá, publicá y seguí cada rifa desde un único lugar.</p>
        </div>
        <a class="button button-primary" routerLink="/admin/raffles/new">Nueva rifa</a>
      </header>

      <section class="raffle-overview" aria-label="Resumen de rifas">
        <article>
          <span>Activa</span>
          <strong>{{ statusCount('ACTIVE') }}</strong>
          <small>Máximo permitido: 1</small>
        </article>
        <article>
          <span>Borradores</span>
          <strong>{{ statusCount('DRAFT') }}</strong>
          <small>Listos para preparar</small>
        </article>
        <article>
          <span>Pausadas</span>
          <strong>{{ statusCount('PAUSED') }}</strong>
          <small>Sin nuevas reservas</small>
        </article>
        <article>
          <span>Finalizadas</span>
          <strong>{{ statusCount('CLOSED') + statusCount('DRAWN') }}</strong>
          <small>Cerradas o sorteadas</small>
        </article>
      </section>

      <section class="filters filter-panel">
        <label>
          Buscar
          <input [(ngModel)]="search" placeholder="Título o premio..." />
        </label>
        <label>
          Estado
          <select [(ngModel)]="status">
            <option value="">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activa</option>
            <option value="PAUSED">Pausada</option>
            <option value="CLOSED">Cerrada</option>
            <option value="DRAWN">Sorteada</option>
          </select>
        </label>
        @if (search || status) {
          <button class="button button-quiet" type="button" (click)="search = ''; status = ''">
            Limpiar
          </button>
        }
      </section>

      @if (loading()) {
        <div class="skeleton">Cargando rifas...</div>
      } @else if (error()) {
        <div class="state">
          <p>No pudimos cargar las rifas.</p>
          <button class="button button-primary" type="button" (click)="load()">Reintentar</button>
        </div>
      } @else if (filteredRaffles().length) {
        <div class="table-wrap">
          <table class="raffle-list-table">
            <thead>
              <tr>
                <th>Rifa / premio</th>
                <th>Estado</th>
                <th class="numeric">Por número</th>
                <th>Sorteo previsto</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (raffle of filteredRaffles(); track raffle.id) {
                <tr>
                  <td>
                    <div class="raffle-table-title">
                      @if (raffle.imageUrl) {
                        <img [src]="raffle.imageUrl" [alt]="raffle.prizeName" />
                      }
                      <div>
                        <strong>{{ raffle.title }}</strong
                        ><span class="muted">{{ raffle.prizeName }}</span
                        ><code [title]="raffle.id">{{ raffle.id.slice(0, 8) }}</code>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge status-{{ raffle.status.toLowerCase() }}">{{
                      statusLabel(raffle.status)
                    }}</span>
                  </td>
                  <td class="numeric">{{ money(raffle.priceInCents) }}</td>
                  <td class="date-cell">{{ date(raffle.drawAt) }}</td>
                  <td class="date-cell">{{ date(raffle.createdAt) }}</td>
                  <td>
                    <div class="table-actions">
                      <a [routerLink]="['/admin/raffles', raffle.id]">
                        {{ raffle.status === 'DRAFT' ? 'Editar y preparar' : 'Gestionar' }}
                      </a>
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
              raffles().length
                ? 'No hay rifas con esos filtros.'
                : 'Todavía no creaste ninguna rifa.'
            }}
          </p>
          @if (!raffles().length) {
            <a class="button button-primary" routerLink="/admin/raffles/new">Crear primera rifa</a>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./admin-pages.css', './admin-raffles.css'],
})
export class AdminRafflesComponent implements OnInit {
  readonly raffles = signal<AdminRaffleListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  search = '';
  status: '' | AdminRaffleStatus = '';

  filteredRaffles(): AdminRaffleListItem[] {
    const search = this.search.trim().toLocaleLowerCase('es');
    return this.raffles().filter(
      (raffle) =>
        (!this.status || raffle.status === this.status) &&
        (!search ||
          raffle.title.toLocaleLowerCase('es').includes(search) ||
          raffle.prizeName.toLocaleLowerCase('es').includes(search)),
    );
  }

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .raffles({ page: 1, pageSize: 100 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.raffles.set(response.items),
        error: () => this.error.set(true),
      });
  }

  statusCount(status: AdminRaffleStatus): number {
    return this.raffles().filter((raffle) => raffle.status === status).length;
  }

  statusLabel(status: AdminRaffleStatus): string {
    return raffleStatusLabel(status);
  }

  money(value: number): string {
    return formatArsFromCents(value);
  }

  date(value: string | null): string {
    return formatAdminDate(value);
  }
}
