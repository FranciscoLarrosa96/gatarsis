import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthStore } from '../core/admin-auth.store';
import { AdminThemeService } from '../core/admin-theme.service';
import { AdminThemeToggleComponent } from '../shared/admin-theme-toggle.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}
interface NavGroup {
  title: string;
  items: readonly NavItem[];
}

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AdminThemeToggleComponent],
  template: `<div
    class="admin-shell"
    [attr.data-theme]="theme.preference()"
    [class.drawer-open]="drawerOpen()"
    (keydown.escape)="closeDrawer()"
  >
    <aside aria-label="Administración">
      <a class="admin-brand" routerLink="/admin/dashboard" (click)="closeDrawer()"
        ><span class="brand-mark">Gatarsis</span
        ><span class="brand-sub">Ficha de administración</span></a
      >
      <nav id="admin-navigation" class="chart-rack" aria-label="Secciones">
        @for (group of navGroups; track $index) {
          @if (group.title) {
            <span class="nav-section">{{ group.title }}</span>
          }
          @for (item of group.items; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              (click)="closeDrawer()"
              ><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path [attr.d]="item.icon" /></svg
              >{{ item.label }}</a
            >
          }
        }
      </nav>
      <div class="account">
        <span class="account-role">Administrador</span>
        <span class="account-email">{{ auth.admin()?.email }}</span>
        <button class="link-button" (click)="logout()">Cerrar sesión</button>
      </div>
    </aside>
    @if (drawerOpen()) {
      <button
        class="drawer-dismiss"
        type="button"
        aria-label="Cerrar menú"
        (click)="closeDrawer()"
      ></button>
    }
    <main>
      <header>
        <button
          class="menu-button"
          type="button"
          (click)="drawerOpen.set(!drawerOpen())"
          [attr.aria-expanded]="drawerOpen()"
          aria-controls="admin-navigation"
        >
          Menú
        </button>
        <p>Gatarsis · Backoffice</p>
        <app-admin-theme-toggle />
      </header>
      <section class="admin-content"><router-outlet /></section>
    </main>
  </div>`,
  styleUrls: ['../shared/admin-tokens.css', './admin-shell.component.css'],
})
export class AdminShellComponent {
  readonly drawerOpen = signal(false);
  readonly navGroups: readonly NavGroup[] = [
    {
      title: '',
      items: [
        {
          path: '/admin/dashboard',
          label: 'Resumen',
          icon: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
        },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        {
          path: '/admin/products',
          label: 'Productos',
          icon: 'M21 8l-9-5-9 5v8l9 5 9-5z M3.3 7.5l8.7 5 8.7-5 M12 22V12.5',
        },
        {
          path: '/admin/inventory',
          label: 'Stock',
          icon: 'M12 2L2 7l10 5 10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
        },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        {
          path: '/admin/orders',
          label: 'Pedidos',
          icon: 'M9 3h6v3H9z M8 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2 M9 12h6 M9 16h4',
        },
        {
          path: '/admin/payments',
          label: 'Pagos',
          icon: 'M3 6h18v12H3z M3 10h18 M7 15h3',
        },
        {
          path: '/admin/raffles',
          label: 'Rifas',
          icon: 'M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6z M14 5v3 M14 11v2 M14 16v3',
        },
      ],
    },
    {
      title: 'Control',
      items: [
        {
          path: '/admin/audit',
          label: 'Auditoría',
          icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
        },
      ],
    },
  ];
  constructor(
    readonly auth: AdminAuthStore,
    readonly theme: AdminThemeService,
  ) {}
  closeDrawer(): void {
    this.drawerOpen.set(false);
  }
  logout(): void {
    this.auth.logout();
  }
}
