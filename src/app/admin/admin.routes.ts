import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { AdminShellComponent } from './layout/admin-shell.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin-products.component').then((m) => m.AdminProductsComponent),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./pages/admin-product-editor.component').then(
            (m) => m.AdminProductEditorComponent,
          ),
      },
      {
        path: 'products/:productId',
        loadComponent: () =>
          import('./pages/admin-product-editor.component').then(
            (m) => m.AdminProductEditorComponent,
          ),
        canDeactivate: [(component: AdminProductEditorComponent) => component.canLeave()],
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/admin-inventory.component').then((m) => m.AdminInventoryComponent),
      },
      {
        path: 'inventory/:variantId',
        loadComponent: () =>
          import('./pages/admin-inventory.component').then((m) => m.AdminInventoryComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/admin-orders.component').then((m) => m.AdminOrdersComponent),
      },
      {
        path: 'orders/:orderId',
        loadComponent: () =>
          import('./pages/admin-orders.component').then((m) => m.AdminOrdersComponent),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/admin-payments.component').then((m) => m.AdminPaymentsComponent),
      },
      {
        path: 'payments/review',
        loadComponent: () =>
          import('./pages/admin-payments.component').then((m) => m.AdminPaymentsComponent),
      },
      {
        path: 'payments/:paymentId',
        loadComponent: () =>
          import('./pages/admin-payments.component').then((m) => m.AdminPaymentsComponent),
      },
      {
        path: 'raffles',
        loadComponent: () =>
          import('./pages/admin-raffles.component').then((m) => m.AdminRafflesComponent),
      },
      {
        path: 'raffles/new',
        loadComponent: () =>
          import('./pages/admin-raffle-editor.component').then(
            (m) => m.AdminRaffleEditorComponent,
          ),
        canDeactivate: [(component: AdminRaffleEditorComponent) => component.canLeave()],
      },
      {
        path: 'raffles/:raffleId',
        loadComponent: () =>
          import('./pages/admin-raffle-editor.component').then(
            (m) => m.AdminRaffleEditorComponent,
          ),
        canDeactivate: [(component: AdminRaffleEditorComponent) => component.canLeave()],
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./pages/admin-audit.component').then((m) => m.AdminAuditComponent),
      },
    ],
  },
];

// Kept as an interface so the route can protect unsaved product edits without coupling to implementation details.
interface AdminProductEditorComponent {
  canLeave(): boolean;
}

interface AdminRaffleEditorComponent {
  canLeave(): boolean;
}
