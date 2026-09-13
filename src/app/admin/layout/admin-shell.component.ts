import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthStore } from '../core/admin-auth.store';

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<div class="admin-shell" [class.drawer-open]="drawerOpen()">
    <aside aria-label="Administración">
      <a class="admin-brand" routerLink="/admin/dashboard" (click)="closeDrawer()"
        ><span class="brand-mark">Gatarsis</span><span class="brand-sub">Ficha de administración</span></a
      >
      <nav class="chart-rack" aria-label="Secciones">
        <a routerLink="/admin/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Resumen</a>
        <a routerLink="/admin/products" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Productos</a>
        <a routerLink="/admin/inventory" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Stock</a>
        <a routerLink="/admin/orders" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Pedidos</a>
        <a routerLink="/admin/payments" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Pagos</a>
        <a routerLink="/admin/raffles" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Rifas</a>
        <a routerLink="/admin/audit" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="closeDrawer()">Auditoría</a>
      </nav>
      <div class="account">
        <span class="account-role">Administrador</span>
        <span class="account-email">{{ auth.admin()?.email }}</span>
        <button class="link-button" (click)="logout()">Cerrar sesión</button>
      </div>
    </aside>
    <main>
      <header>
        <button class="menu-button" type="button" (click)="drawerOpen.set(!drawerOpen())" [attr.aria-expanded]="drawerOpen()" aria-controls="admin-navigation">Menú</button>
        <p>Gatarsis · Backoffice</p>
      </header>
      <section class="admin-content"><router-outlet /></section>
    </main>
  </div>`,
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent { readonly drawerOpen = signal(false); constructor(readonly auth: AdminAuthStore) {} closeDrawer(): void { this.drawerOpen.set(false); } logout(): void { this.auth.logout(); } }
